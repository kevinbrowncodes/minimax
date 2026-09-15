/** STORY_006 integration lane: the adapter against the fake ComfyUI (test/fake-comfy.ts), in-process. */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startFakeComfy, startFakeComfyOn, type FakeComfy } from "../test/fake-comfy.ts";
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
    expect(submitted?.graph["cond"]?.inputs).toMatchObject({ width: 1344, height: 768, length: 124 });
    // STORY_020: the model gets MiniMax's format around the owner's words (text-only: no instruction line)
    expect(String(submitted?.graph["cond"]?.inputs["prompt"])).toMatch(/^integrated_multimodal_description: \[Shot 1\] Live-action\. The camera holds a perfectly static shot throughout the entire 5\.17-second duration: .* A small paper boat\n\noverall_soundscape: /);
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

  it("serves the marked copy with ?watermark=1 — made once, its own size and ranges, x-watermark: 1 — and the clean file without (STORY_034)", async () => {
    await adapter?.close();
    let runs = 0;
    adapter = await startAdapter({
      watermarkDir: path.join(dir, "adapter", "watermarked"),
      watermark: (from, to) => {
        runs += 1;
        writeFileSync(to, Buffer.concat([readFileSync(from), Buffer.from("MARK")]));
        return Promise.resolve();
      },
    });
    const id = await create();
    await waitFor(id, (s) => s["status"] === "done");
    const fixture = readFileSync(path.join(FIXTURES, "fixture.mp4"));
    const marked = await api(`/jobs/${id}/result?watermark=1`);
    expect(marked.status).toBe(200);
    expect(marked.headers.get("x-watermark")).toBe("1");
    expect(marked.headers.get("content-type")).toBe("video/mp4");
    expect(Number(marked.headers.get("content-length"))).toBe(fixture.length + 4);
    expect(Buffer.from(await marked.arrayBuffer()).subarray(-4).toString()).toBe("MARK");
    expect(existsSync(path.join(dir, "adapter", "watermarked", `${id}.mp4`))).toBe(true);
    const ranged = await api(`/jobs/${id}/result?watermark=1`, { headers: { range: "bytes=0-9" } });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toBe(`bytes 0-9/${String(fixture.length + 4)}`);
    expect(ranged.headers.get("x-watermark")).toBe("1");
    expect(runs).toBe(1);
    const clean = await api(`/jobs/${id}/result`);
    expect(clean.headers.get("x-watermark")).toBeNull();
    expect(Number(clean.headers.get("content-length"))).toBe(fixture.length);
    expect(Buffer.from(await clean.arrayBuffer()).equals(fixture)).toBe(true); // the original is untouched
  });

  it("answers 500 watermark_failed when ffmpeg fails, and the clean result still serves (STORY_034)", async () => {
    await adapter?.close();
    adapter = await startAdapter({ watermarkDir: path.join(dir, "adapter", "watermarked"), watermark: () => Promise.reject(new Error("ffmpeg exited 1")) });
    const id = await create();
    await waitFor(id, (s) => s["status"] === "done");
    const failed = await api(`/jobs/${id}/result?watermark=1`);
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ error: { code: "watermark_failed" } });
    expect((await api(`/jobs/${id}/result`)).status).toBe(200);
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
    // STORY_020: first + last frame → MiniMax's FL2VA alignment line first, then the format around the owner's words
    expect(String(graph?.["cond"]?.inputs["prompt"])).toMatch(/^How the reference pictures align with the target video — Picture 1 \(from Shot 1\) aligns with the 0\.00-second mark of the target video; Picture 2 \(from Shot 1\) aligns with the 5\.17-second mark of the target video\.\n\nintegrated_multimodal_description: \[Shot 1\] Live-action\./);
    await waitFor(id, (s) => s["status"] === "done");
  });

  it("reports where the shot changed from the frame-change measure, [] for a held shot, and omits it when the measure is missing (STORY_020)", async () => {
    // the fake's default series is a held shot
    const held = await waitFor(await create(), (s) => s["status"] === "done");
    expect((held["result"] as { cuts: unknown }).cuts).toEqual([]);
    expect(fake.prompts[0]?.graph["changes"]).toEqual({ class_type: "MiniMaxLocalFrameChanges", inputs: { images: ["decode_video", 0] } });
    // a hard cut at frame 142: the border jumps by 50 and every one-second comparison straddling it is 50
    const step = Array.from({ length: 299 }, (_, j) => (j === 141 ? 50 : 1));
    const second = Array.from({ length: 276 }, (_, i) => (i >= 118 && i < 142 ? 50 : 4));
    fake.frameChanges = { frames: 300, span: 24, step, second };
    const cut = await waitFor(await create({ ...valid, durationSeconds: 12 }), (s) => s["status"] === "done");
    expect((cut["result"] as { cuts: unknown }).cuts).toEqual([{ frame: 142, seconds: 5.92 }]);
    // no measure in the history at all: still done, no cuts key
    fake.frameChanges = undefined;
    const none = await waitFor(await create(), (s) => s["status"] === "done");
    expect(none["result"]).not.toHaveProperty("cuts");
    // malformed text: the same
    fake.frameChanges = "not json";
    const bad = await waitFor(await create(), (s) => s["status"] === "done");
    expect(bad["result"]).not.toHaveProperty("cuts");
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
    expect(((await down.json()) as { error: { message: string } }).error.message).toMatch(/ComfyUI is not running on the Spark/);
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

  it("keeps a job open across an adapter restart while ComfyUI still lists it (BUG_002)", async () => {
    fake.behaviour = "hold";
    const id = await create();
    await adapter?.close();
    adapter = await startAdapter();
    await sleep(120);
    expect((await status(id))["status"]).toBe("queued");
    fake.behaviour = "success";
    fake.completeHeld(fake.prompts.at(-1)?.id ?? "");
    expect((await waitFor(id, (s) => s["status"] === "done"))["progress"]).toBe(100);
  });

  it("never fails a job ComfyUI still lists, whatever its age; orphans are failed after orphanTimeoutMs; the cap is last resort (BUG_002)", async () => {
    // held = queued in ComfyUI's queue_pending: older than any timeout, still not failed
    await adapter?.close();
    adapter = await startAdapter({ jobTimeoutMs: 100_000, orphanTimeoutMs: 120 });
    fake.behaviour = "hold";
    const held = await create();
    await sleep(400);
    expect((await status(held))["status"]).toBe("queued");
    // running and reporting progress past what the old one-hour default would have allowed (scaled down): still running
    fake.behaviour = "success";
    fake.completeHeld(fake.prompts.at(-1)?.id ?? "");
    await waitFor(held, (s) => s["status"] === "done");
    // an orphan: ComfyUI dropped the prompt from its queue without writing history
    fake.behaviour = "hold";
    const orphan = await create();
    fake.dropHeld(fake.prompts.at(-1)?.id ?? "");
    const failed = await waitFor(orphan, (s) => s["status"] === "failed");
    expect(failed).toMatchObject({ error: { code: "generation_failed", message: expect.stringContaining("ComfyUI no longer has this job") as string } });
    // the last-resort cap still applies to a job ComfyUI lists forever
    await adapter.close();
    adapter = await startAdapter({ jobTimeoutMs: 150, orphanTimeoutMs: 100_000 });
    const forever = await create();
    const capped = await waitFor(forever, (s) => s["status"] === "failed");
    expect(capped).toMatchObject({ error: { code: "generation_failed", message: expect.stringContaining("exceeded") as string } });
    await api(`/jobs/${forever}`, { method: "DELETE" }).catch(() => undefined);
  });

  it("after a restart, an open job ComfyUI no longer has is failed; one whose history shows it finished is done (BUG_002: a listed one stays open)", async () => {
    fake.behaviour = "hold";
    const lost = await create();
    const finished = await create();
    const lostPrompt = fake.prompts[0];
    const finishedPrompt = fake.prompts[1];
    if (!lostPrompt || !finishedPrompt) throw new Error("no prompts");
    const store = path.join(dir, "adapter", "jobs.json");
    await adapter?.close();
    adapter = undefined;
    fake.dropHeld(lostPrompt.id); // ComfyUI restarted too: the prompt is gone from its queue and has no history
    fake.completeHeld(finishedPrompt.id);
    adapter = await startAdapter({ storeFile: store });
    expect(await status(lost)).toMatchObject({ status: "failed", error: { message: expect.stringContaining("adapter restarted") as string } });
    expect(await status(finished)).toMatchObject({ status: "done", result: { width: 1344 } });
  });

  it("serves capabilities and health while ComfyUI is down, refuses jobs with the start command, and recovers when it appears (BUG_001)", async () => {
    await adapter?.close();
    await fake.close();
    const port = Number(fake.url.split(":")[2]);
    const alone = createAdapterServer({ comfyUrl: fake.url, outputDir: path.join(dir, "output"), graphTemplate: template, storeFile: path.join(dir, "adapter", "jobs-alone.json"), pollIntervalMs: 40, log: () => undefined, startupWaitMs: 0 });
    base = `http://127.0.0.1:${String(await alone.start(0, "127.0.0.1"))}`;
    adapter = alone;
    expect(await (await api("/capabilities")).json()).toMatchObject({ resolutions: ["768P"] });
    expect(await (await api("/health")).json()).toMatchObject({ ok: true, comfyui: { reachable: false, nodesVerified: false } });
    const refused = await json("/jobs", valid);
    expect(refused.status).toBe(503);
    expect(((await refused.json()) as { error: { message: string } }).error.message).toMatch(/ComfyUI is not running on the Spark — start it with spark\/comfyui\/run.sh/);
    // ComfyUI comes up on the same port: the next create verifies the nodes and goes through
    fake = await startFakeComfyOn(port, { outputDir: path.join(dir, "output"), fixturesDir: FIXTURES });
    const id = await create();
    await waitFor(id, (s) => s["status"] === "done");
    expect(await (await api("/health")).json()).toMatchObject({ comfyui: { reachable: true, nodesVerified: true } });
  });

  it("refuses jobs while ComfyUI lacks a node class the graph needs, and says which", async () => {
    await adapter?.close();
    adapter = undefined;
    const lacking = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES, omitClasses: ["ImageFromBatch"] });
    const partial = createAdapterServer({ comfyUrl: lacking.url, outputDir: dir, graphTemplate: template, log: () => undefined, startupWaitMs: 0 });
    await partial.start(0, "127.0.0.1");
    base = `http://127.0.0.1:${String((partial.server.address() as { port: number }).port)}`;
    const res = await json("/jobs", valid);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { message: string } }).error.message).toMatch(/lacks node classes .*ImageFromBatch/);
    expect(await (await api("/health")).json()).toMatchObject({ comfyui: { reachable: true, nodesVerified: false } });
    await partial.close();
    await lacking.close();
  });
});

describe("extensions (STORY_017: native masked continuation)", () => {
  const isDone = (s: Record<string, unknown>) => s["status"] === "done";
  const finish = async (body: unknown = valid): Promise<string> => {
    const id = await create(body);
    await waitFor(id, isDone);
    return id;
  };
  const errorOf = async (res: Response): Promise<{ code: string; field?: string; message: string }> => ((await res.json()) as { error: { code: string; field?: string; message: string } }).error;

  it("extends a done job on FL2VA: the source's last 39 frames become the new clip's head, the overlap is echoed, the joined length reported", async () => {
    const src = await finish(); // the fixture job: 5 s → 124 frames
    expect((await status(src))["result"]).toMatchObject({ frames: 124, durationSeconds: 5.167 });
    const ext = await create({ ...valid, durationSeconds: 10, continueFrom: src });
    const first = await status(ext);
    expect(first["request"]).toMatchObject({ continueFrom: src, durationSeconds: 10, overlapFrames: 39, overlap: { frames: 39, seconds: 1.625 } });
    expect(typeof (first["request"] as { seed: unknown }).seed).toBe("number");
    const graph = fake.prompts[1]?.graph;
    expect(graph?.["unet"]?.inputs["unet_name"]).toBe("minimax_h3_fl2va_int8_convrot.safetensors");
    expect(graph?.["source_video"]?.inputs["file"]).toBe(`video/job-${src}_00001_.mp4 [output]`);
    expect(graph?.["tail_frames"]?.inputs).toMatchObject({ batch_index: 85, length: 39 });
    expect(graph?.["canvas"]?.inputs).toMatchObject({ length: 294 });
    expect(graph?.["mask_keep_batch"]?.inputs).toMatchObject({ amount: 12 });
    expect(graph?.["latent"]?.class_type).toBe("LTXVConcatAVLatent");
    expect(graph?.["sample"]?.inputs["latent_image"]).toEqual(["latent", 0]);
    expect(graph?.["cond"]?.class_type).toBe("MiniMaxH3ImageToVideo");
    expect(graph?.["cond"]?.inputs).not.toHaveProperty("first_frame");
    expect(graph?.["guide"]).toBeUndefined();
    // STORY_020: the extension's prompt is MiniMax's format with no instruction line (the preserved head is not a Picture)
    expect(String(graph?.["cond"]?.inputs["prompt"])).toMatch(/^integrated_multimodal_description: \[Shot 1\] Live-action\. The camera holds a perfectly static shot throughout the entire 12\.25-second duration/);
    expect(String(graph?.["cond"]?.inputs["prompt"])).toContain("already in frame at the start stay exactly as they are for the whole video and the action continues without interruption. A small paper boat");
    expect(String(graph?.["cond"]?.inputs["prompt"])).toMatch(/\n\noverall_soundscape: .*\n\nnon_diegetic_music: /);
    // …and the fresh text-only source got the format without an instruction line and without a Picture clause
    const sourcePrompt = String(fake.prompts[0]?.graph["cond"]?.inputs["prompt"]);
    expect(sourcePrompt).toMatch(/^integrated_multimodal_description: \[Shot 1\] Live-action\. The camera holds a perfectly static shot throughout the entire 5\.17-second duration/);
    expect(sourcePrompt).not.toContain("<Picture 1>");
    const done = await waitFor(ext, isDone);
    expect(done["result"]).toMatchObject({ frames: 379, durationSeconds: 15.792, width: 1344, height: 768 });
    // BUG_003: the result is the save node's file, not the LoadVideo preview of the source that ComfyUI lists first
    expect(adapter?.store.get(ext)?.result?.video.filename).toBe(`job-${ext}_00001_.mp4`);
    expect(adapter?.store.get(ext)?.result?.poster?.filename).toBe(`job-${ext}_poster_00001_.png`);
    // extending the extension reads the joined frames; a 56-frame overlap
    const ext2 = await create({ ...valid, durationSeconds: 10, continueFrom: ext, overlapFrames: 56 });
    expect((await status(ext2))["request"]).toMatchObject({ overlapFrames: 56, overlap: { frames: 56, seconds: 2.333 } });
    expect(fake.prompts[2]?.graph["tail_frames"]?.inputs).toMatchObject({ batch_index: 379 - 56, length: 56 });
    expect(fake.prompts[2]?.graph["canvas"]?.inputs).toMatchObject({ length: 311 });
    expect((await waitFor(ext2, isDone))["result"]).toMatchObject({ frames: 634 });
  });

  it("a given seed is the graph's noise seed and is echoed; without one a seed is drawn and echoed", async () => {
    const id = await create({ ...valid, seed: 123 });
    expect(fake.prompts[0]?.graph["noise"]?.inputs["noise_seed"]).toBe(123);
    expect((await status(id))["request"]).toMatchObject({ seed: 123 });
    await waitFor(id, isDone);
    const other = await create();
    const seed = ((await status(other))["request"] as { seed: number }).seed;
    expect(Number.isInteger(seed)).toBe(true);
    expect(fake.prompts[1]?.graph["noise"]?.inputs["noise_seed"]).toBe(seed);
    await waitFor(other, isDone);
  });

  it("refuses an unknown, unfinished, deleted or mismatched source and an out-of-range step or overlap, without submitting anything", async () => {
    const src = await finish();
    const cases: [Record<string, unknown>, string, string][] = [
      [{ ...valid, durationSeconds: 10, continueFrom: "nope" }, "validation", "continueFrom"],
      [{ ...valid, durationSeconds: 10, continueFrom: src, ratio: "9:16" }, "validation", "ratio"],
      [{ ...valid, durationSeconds: 15, continueFrom: src }, "unsupported_option", "durationSeconds"],
      [{ ...valid, durationSeconds: 14, continueFrom: src, overlapFrames: 39 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, durationSeconds: 10, continueFrom: src, overlapFrames: 30 }, "unsupported_option", "overlapFrames"],
      [{ ...valid, durationSeconds: 10, continueFrom: src, contextSeconds: 5 }, "validation", "contextSeconds"],
    ];
    for (const [body, code, field] of cases) {
      const res = await json("/jobs", body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(await errorOf(res)).toMatchObject({ code, field });
    }
    fake.behaviour = "hold";
    const held = await create();
    const unfinished = await json("/jobs", { ...valid, durationSeconds: 10, continueFrom: held });
    expect(unfinished.status).toBe(400);
    expect(await errorOf(unfinished)).toMatchObject({ code: "validation", field: "continueFrom" });
    await api(`/jobs/${held}`, { method: "DELETE" });
    fake.behaviour = "success";
    rmSync(path.join(dir, "output", "video", `job-${src}_00001_.mp4`));
    const gone = await json("/jobs", { ...valid, durationSeconds: 10, continueFrom: src });
    expect(gone.status).toBe(400);
    expect((await errorOf(gone)).message).toMatch(/gone from ComfyUI's output directory/);
    expect(fake.prompts).toHaveLength(2); // the source and the held job only
  });

  it("refuses to extend a source longer than 30 s", async () => {
    let id = await finish(); // 124 frames
    for (const frames of [379, 634, 889]) {
      id = await finish({ ...valid, durationSeconds: 10, continueFrom: id });
      expect((await status(id))["result"]).toMatchObject({ frames });
    }
    const res = await json("/jobs", { ...valid, durationSeconds: 10, continueFrom: id }); // 889 frames = 37 s
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatchObject({ code: "unsupported_option", field: "continueFrom", message: expect.stringContaining("up to 30 s") as string });
  });

  it("needs only the FL2VA checkpoint: health reports what ComfyUI lists, and an extension is accepted without Ref2VA", async () => {
    await adapter?.close();
    await fake.close();
    fake = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES, unets: ["minimax_h3_fl2va_int8_convrot.safetensors"] });
    adapter = await startAdapter();
    const health = (await (await api("/health")).json()) as { comfyui: { checkpoints: unknown } };
    expect(health.comfyui.checkpoints).toEqual({ fl2va: true, ref2va: false });
    const src = await finish();
    const ext = await create({ ...valid, durationSeconds: 10, continueFrom: src });
    expect((await waitFor(ext, isDone))["result"]).toMatchObject({ frames: 379 });
  });

  it("refuses every job while ComfyUI lacks a node class the extension graph needs, and says so", async () => {
    await adapter?.close();
    await fake.close();
    fake = await startFakeComfy({ outputDir: path.join(dir, "output"), fixturesDir: FIXTURES, omitClasses: ["LTXVConcatAVLatent"] });
    adapter = await startAdapter();
    const res = await json("/jobs", valid);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).message).toMatch(/LTXVConcatAVLatent/);
  });
});
