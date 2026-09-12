/** STORY_006 integration lane: the adapter against the fake ComfyUI (test/fake-comfy.ts), in-process. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startFakeComfy, type FakeComfy } from "../test/fake-comfy.ts";
import type { Graph } from "./mapping.ts";
import { createAdapterServer, type AdapterOptions, type AdapterServer } from "./server.ts";

const FIXTURES = path.resolve(import.meta.dirname, "../../../tools/stub-generation-server/fixtures");
const template = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../comfyui/h3_t2v_prompt.json"), "utf8")) as Graph;
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5 };

let dir: string;
let fake: FakeComfy;
let adapter: AdapterServer | undefined;
let base: string;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const api = (p: string, init?: RequestInit) => fetch(`${base}${p}`, init);
const json = (p: string, body: unknown, headers: Record<string, string> = {}) =>
  api(p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
async function create(body: unknown = valid): Promise<string> {
  const res = await json("/jobs", body);
  expect(res.status).toBe(202);
  const data = (await res.json()) as { id: string; status: string };
  expect(data.status).toBe("queued");
  return data.id;
}
async function status(id: string): Promise<Record<string, unknown>> {
  const res = await api(`/jobs/${id}`);
  expect(res.status).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}
async function waitFor(id: string, predicate: (s: Record<string, unknown>) => boolean, timeoutMs = 5000): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  for (;;) {
    const s = await status(id);
    if (predicate(s)) return s;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timed out waiting for job ${id}: ${JSON.stringify(s)}`);
    await sleep(15);
  }
}
async function startAdapter(over: Partial<AdapterOptions> = {}): Promise<AdapterServer> {
  const server = createAdapterServer({
    comfyUrl: fake.url,
    outputDir: path.join(dir, "output"),
    graphTemplate: template,
    storeFile: path.join(dir, "adapter", "jobs.json"),
    pollIntervalMs: 40,
    silenceLimit: 3,
    startupWaitMs: 0,
    log: () => undefined,
    ...over,
  });
  base = `http://127.0.0.1:${String(await server.start(0, "127.0.0.1"))}`;
  return server;
}

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "adapter-it-"));
  fake = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES });
  adapter = await startAdapter();
});
afterEach(async () => {
  await adapter?.close();
  adapter = undefined;
  await fake.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("create → status → result", () => {
  it("submits the graph to ComfyUI, reports rising progress from the websocket, and finishes done with the result and poster", async () => {
    const id = await create();
    const running = await waitFor(id, (s) => s["status"] === "running" && (s["progress"] as number) >= 5);
    expect(running["progress"]).toBeGreaterThanOrEqual(5);
    const done = await waitFor(id, (s) => s["status"] === "done");
    expect(done).toMatchObject({ progress: 100, result: { url: `/jobs/${id}/result`, posterUrl: `/jobs/${id}/poster`, mimeType: "video/mp4", durationSeconds: 5.167, width: 1344, height: 768 } });
    const submitted = fake.prompts[0];
    expect(submitted?.graph["cond"]?.inputs).toMatchObject({ prompt: "A small paper boat", width: 1344, height: 768, length: 124 });
    expect(submitted?.graph["save"]?.inputs["filename_prefix"]).toBe(`video/job-${id}`);
    const res = await api(`/jobs/${id}/result`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    const fixture = readFileSync(path.join(FIXTURES, "fixture.mp4"));
    expect(Buffer.from(await res.arrayBuffer()).equals(fixture)).toBe(true);
    expect((done["result"] as { sizeBytes: number }).sizeBytes).toBe(fixture.length);
    const ranged = await api(`/jobs/${id}/result`, { headers: { range: "bytes=0-99" } });
    expect(ranged.status).toBe(206);
    expect((await ranged.arrayBuffer()).byteLength).toBe(100);
    const poster = await api(`/jobs/${id}/poster`);
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toBe("image/png");
  });

  it("refuses the result before the job is done and 404s an unknown job", async () => {
    fake.behaviour = "hold";
    const id = await create();
    expect((await api(`/jobs/${id}/result`)).status).toBe(409);
    expect((await api("/jobs/nope")).status).toBe(404);
    await api(`/jobs/${id}`, { method: "DELETE" });
  });

  it("reports a ComfyUI execution error as failed/generation_failed with the message", async () => {
    fake.behaviour = "error";
    const id = await create();
    const failed = await waitFor(id, (s) => s["status"] === "failed");
    expect(failed).toMatchObject({ error: { code: "generation_failed", message: expect.stringContaining("CUDA out of memory") as string } });
  });

  it("uploads reference images to ComfyUI and wires them into the graph", async () => {
    const form = new FormData();
    for (const [k, v] of Object.entries(valid)) form.set(k, String(v));
    const png = readFileSync(path.join(FIXTURES, "fixture-reference.png"));
    form.append("referenceImage", new Blob([png], { type: "image/png" }), "first.png");
    form.append("referenceImage", new Blob([png], { type: "image/png" }), "last.png");
    const res = await api("/jobs", { method: "POST", body: form });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    expect(fake.uploads).toHaveLength(2);
    const graph = fake.prompts[0]?.graph;
    expect(graph?.["first_frame"]).toMatchObject({ class_type: "LoadImage", inputs: { image: fake.uploads[0]?.name } });
    expect(graph?.["last_frame"]).toMatchObject({ class_type: "LoadImage", inputs: { image: fake.uploads[1]?.name } });
    expect(graph?.["cond"]?.inputs).toMatchObject({ first_frame: ["first_frame", 0], last_frame: ["last_frame", 0] });
    await waitFor(id, (s) => s["status"] === "done");
  });
});

describe("cancel", () => {
  it("cancels a queued job through the queue and a running job through interrupt; a second cancel is 409", async () => {
    fake.behaviour = "hold";
    const queued = await create();
    const res = await api(`/jobs/${queued}`, { method: "DELETE" });
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ id: queued, status: "cancelled" });
    await sleep(60);
    expect(fake.calls).toContain("POST /queue");
    expect(fake.calls).not.toContain("POST /interrupt");
    expect((await api(`/jobs/${queued}`, { method: "DELETE" })).status).toBe(409);

    fake.behaviour = "hang";
    const running = await create();
    await waitFor(running, (s) => s["status"] === "running");
    const cancel = await api(`/jobs/${running}`, { method: "DELETE" });
    expect(cancel.status).toBe(202);
    await sleep(60);
    expect(fake.calls).toContain("POST /interrupt");
    expect(await status(running)).toMatchObject({ status: "cancelled" });
  });
});

describe("validation, auth, busy, health", () => {
  it("answers the contract's validation codes without touching ComfyUI", async () => {
    const before = fake.prompts.length;
    for (const [body, code, field] of [
      [{ ...valid, resolution: "2K" }, "unsupported_option", "resolution"],
      [{ ...valid, durationSeconds: 3 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, model: "hailuo-2.3" }, "unsupported_option", "model"],
      [{ ...valid, prompt: "" }, "validation", "prompt"],
    ] as const) {
      const res = await json("/jobs", body);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: { code, field } });
    }
    expect((await api("/jobs", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" })).status).toBe(415);
    expect(fake.prompts.length).toBe(before);
    expect(await (await api("/capabilities")).json()).toMatchObject({ resolutions: ["768P"] });
    expect(await (await api("/health")).json()).toMatchObject({ ok: true, server: "adapter" });
  });

  it("requires the bearer token when configured", async () => {
    await adapter?.close();
    adapter = await startAdapter({ apiKey: "secret", storeFile: path.join(dir, "adapter", "jobs-auth.json") });
    expect((await api("/capabilities")).status).toBe(401);
    expect((await api("/health", { headers: { authorization: "Bearer secret" } })).status).toBe(200);
  });

  it("answers 503 busy when the open-job limit is reached and when ComfyUI rejects the submit", async () => {
    await adapter?.close();
    adapter = await startAdapter({ maxOpenJobs: 1, storeFile: path.join(dir, "adapter", "jobs-busy.json") });
    fake.behaviour = "hold";
    const first = await create();
    const second = await json("/jobs", valid);
    expect(second.status).toBe(503);
    expect(await second.json()).toMatchObject({ error: { code: "busy" } });
    await api(`/jobs/${first}`, { method: "DELETE" });
    await fake.close();
    const down = await json("/jobs", valid);
    expect(down.status).toBe(503);
    expect(((await down.json()) as { error: { message: string } }).error.message).toMatch(/could not accept/);
    fake = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES });
  });
});

describe("resilience", () => {
  it("finishes a job whose history appears only after execution_success (ComfyUI's real ordering)", async () => {
    await fake.close();
    fake = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES, historyDelayMs: 1200 });
    await adapter?.close();
    adapter = await startAdapter({ storeFile: path.join(dir, "adapter", "jobs-race.json") });
    const id = await create();
    const done = await waitFor(id, (s) => s["status"] === "done", 8000);
    expect(done).toMatchObject({ progress: 100, result: { width: 1344 } });
  });

  it("fails a job when ComfyUI stops answering history polls", async () => {
    fake.behaviour = "hang";
    const id = await create();
    await waitFor(id, (s) => s["status"] === "running");
    fake.historyStatus = 500;
    const failed = await waitFor(id, (s) => s["status"] === "failed");
    expect((failed["error"] as { message: string }).message).toMatch(/stopped answering/);
  });

  it("fails a job that exceeds the job timeout", async () => {
    await adapter?.close();
    adapter = await startAdapter({ jobTimeoutMs: 100, storeFile: path.join(dir, "adapter", "jobs-timeout.json") });
    fake.behaviour = "hang";
    const id = await create();
    const failed = await waitFor(id, (s) => s["status"] === "failed");
    expect((failed["error"] as { message: string }).message).toMatch(/exceeded/);
  });

  it("after a restart, an open job is failed unless ComfyUI's history shows it finished", async () => {
    fake.behaviour = "hold";
    const held = await create();
    const finished = await create();
    const finishedPrompt = fake.prompts[1];
    if (!finishedPrompt) throw new Error("no second prompt");
    const store = path.join(dir, "adapter", "jobs.json");
    await adapter?.close();
    adapter = undefined;
    fake.completeHeld(finishedPrompt.id);
    adapter = await startAdapter({ storeFile: store });
    expect(await status(held)).toMatchObject({ status: "failed", error: { message: expect.stringContaining("adapter restarted") as string } });
    expect(await status(finished)).toMatchObject({ status: "done", result: { width: 1344 } });
  });

  it("refuses to start when ComfyUI lacks a node class the graph needs", async () => {
    await adapter?.close();
    adapter = undefined;
    const broken = createAdapterServer({ comfyUrl: "http://127.0.0.1:9", outputDir: dir, graphTemplate: template, log: () => undefined, startupWaitMs: 0 });
    await expect(broken.start(0, "127.0.0.1")).rejects.toThrow(/unreachable/);
    const partial = createAdapterServer({ comfyUrl: fake.url, outputDir: dir, graphTemplate: { unet: { class_type: "X", inputs: {} } }, log: () => undefined, verifyNodes: false, startupWaitMs: 0 });
    await partial.start(0, "127.0.0.1");
    base = `http://127.0.0.1:${String((partial.server.address() as { port: number }).port)}`;
    const res = await json("/jobs", valid);
    expect(res.status).toBe(503);
    await partial.close();
  });
});
