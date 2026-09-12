import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CAPABILITIES, DEFAULT_FIXTURES_DIR, createStubServer, type StubServer } from "./server.ts";

const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5 };
let stub: StubServer;
let base: string;

const api = (p: string, init?: RequestInit) => fetch(`${base}${p}`, init);
const json = (p: string, body: unknown, headers: Record<string, string> = {}) =>
  api(p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
async function create(script?: string, body: unknown = valid): Promise<string> {
  const res = await json(`/jobs${script ? `?script=${script}` : ""}`, body);
  expect(res.status).toBe(202);
  const data = (await res.json()) as { id: string; status: string; progress: number };
  expect(data).toMatchObject({ status: "queued", progress: 0 });
  return data.id;
}
async function status(id: string): Promise<Record<string, unknown>> {
  const res = await api(`/jobs/${id}`);
  expect(res.status).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  base = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => stub.close());
beforeEach(() => { stub.reset(); });

describe("contract: create and poll", () => {
  it("walks the default script queued → running 33 → running 66 → done with a result", async () => {
    const id = await create();
    expect(await status(id)).toMatchObject({ id, status: "running", progress: 33, request: { ...valid, model: "minimax-h3", referenceImages: 0 } });
    expect(await status(id)).toMatchObject({ status: "running", progress: 66 });
    const done = await status(id);
    expect(done).toMatchObject({ status: "done", progress: 100, result: { url: `/jobs/${id}/result`, posterUrl: `/jobs/${id}/poster`, mimeType: "video/mp4", width: 320, height: 180 } });
    expect(await status(id)).toMatchObject({ status: "done" });
  });

  it("fails-after-2-polls ends failed with generation_failed; moderated fails on the first poll", async () => {
    const a = await create("fails-after-2-polls");
    await status(a);
    expect(await status(a)).toMatchObject({ status: "failed", error: { code: "generation_failed" } });
    const b = await create("moderated");
    expect(await status(b)).toMatchObject({ status: "failed", progress: 0, error: { code: "moderated" } });
  });

  it("selects the script from the X-Stub-Script header too, and rejects an unknown script", async () => {
    const res = await json("/jobs", valid, { "x-stub-script": "done-after-1-poll" });
    const { id } = (await res.json()) as { id: string };
    expect(await status(id)).toMatchObject({ status: "done" });
    const bad = await json("/jobs?script=nope", valid);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: "validation", field: "script" } });
  });
});

describe("contract: cancel", () => {
  it("cancel-midway stays running until DELETE, then is cancelled, and a second DELETE is 409", async () => {
    const id = await create("cancel-midway");
    for (let i = 0; i < 5; i++) expect((await status(id))["status"]).toBe("running");
    const cancel = await api(`/jobs/${id}`, { method: "DELETE" });
    expect(cancel.status).toBe(202);
    expect(await cancel.json()).toMatchObject({ id, status: "cancelled", progress: 50 });
    expect(await status(id)).toMatchObject({ status: "cancelled", progress: 50 });
    const again = await api(`/jobs/${id}`, { method: "DELETE" });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: "already_terminal" } });
  });
});

describe("contract: result and poster", () => {
  it("serves the fixture bytes with content headers, honours a Range request, and refuses before done", async () => {
    const id = await create("done-after-1-poll");
    const early = await api(`/jobs/${id}/result`);
    expect(early.status).toBe(409);
    await status(id);
    const res = await api(`/jobs/${id}/result`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    const bytes = Buffer.from(await res.arrayBuffer());
    const fixture = readFileSync(path.join(DEFAULT_FIXTURES_DIR, "fixture.mp4"));
    expect(bytes.equals(fixture)).toBe(true);
    expect(Number(res.headers.get("content-length"))).toBe(fixture.length);
    const ranged = await api(`/jobs/${id}/result`, { headers: { range: "bytes=0-99" } });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toBe(`bytes 0-99/${String(fixture.length)}`);
    expect((await ranged.arrayBuffer()).byteLength).toBe(100);
    const poster = await api(`/jobs/${id}/poster`);
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toBe("image/png");
    expect((await poster.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });
});

describe("contract: uploads", () => {
  const png = () => new Blob([readFileSync(path.join(DEFAULT_FIXTURES_DIR, "fixture-reference.png"))], { type: "image/png" });
  const form = (files: Blob[] = [png()], names = ["first.png"]) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(valid)) f.set(k, String(v));
    files.forEach((file, i) => { f.append("referenceImage", file, names[i] ?? `f${String(i)}.png`); });
    return f;
  };

  it("records what a multipart job was sent, sha256 included", async () => {
    const res = await api("/jobs", { method: "POST", body: form() });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    const received = (await (await api(`/__stub/jobs/${id}/received`)).json()) as { request: { referenceImages: number }; uploads: { filename: string; sha256: string; size: number }[] };
    expect(received.request.referenceImages).toBe(1);
    const fixture = readFileSync(path.join(DEFAULT_FIXTURES_DIR, "fixture-reference.png"));
    const { createHash } = await import("node:crypto");
    expect(received.uploads).toEqual([{ filename: "first.png", contentType: "image/png", size: fixture.length, sha256: createHash("sha256").update(fixture).digest("hex") }]);
  });

  it("rejects-upload answers 400 for a job with an image; a third image and a gif are refused", async () => {
    const rejected = await api("/jobs?script=rejects-upload", { method: "POST", body: form() });
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({ error: { code: "validation", field: "referenceImage" } });
    const three = await api("/jobs", { method: "POST", body: form([png(), png(), png()], ["a.png", "b.png", "c.png"]) });
    expect(three.status).toBe(400);
    const gif = await api("/jobs", { method: "POST", body: form([new Blob([Buffer.from("GIF89a")], { type: "image/gif" })], ["x.gif"]) });
    expect(gif.status).toBe(400);
    expect(await gif.json()).toMatchObject({ error: { field: "referenceImage" } });
  });
});

describe("contract: validation, capabilities, health, hooks", () => {
  it("validates the request per the contract", async () => {
    const cases: [Record<string, unknown>, string, string][] = [
      [{ ...valid, prompt: "  " }, "validation", "prompt"],
      [{ ...valid, ratio: "2:1" }, "unsupported_option", "ratio"],
      [{ ...valid, resolution: "2K" }, "unsupported_option", "resolution"],
      [{ ...valid, durationSeconds: 3 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, durationSeconds: 5.5 }, "validation", "durationSeconds"],
      [{ ...valid, model: "hailuo-2.3" }, "unsupported_option", "model"],
    ];
    for (const [body, code, field] of cases) {
      const res = await json("/jobs", body);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: { code, field } });
    }
    const wrongType = await api("/jobs", { method: "POST", headers: { "content-type": "text/plain" }, body: "hi" });
    expect(wrongType.status).toBe(415);
  });

  it("answers capabilities and health, 404s unknown ids and routes, and reset forgets jobs", async () => {
    expect(await (await api("/capabilities")).json()).toEqual(CAPABILITIES);
    expect(await (await api("/health")).json()).toMatchObject({ ok: true, server: "stub" });
    expect((await api("/jobs/does-not-exist")).status).toBe(404);
    expect((await api("/nope")).status).toBe(404);
    const id = await create();
    expect(((await (await api("/__stub/jobs")).json()) as { jobs: unknown[] }).jobs).toHaveLength(1);
    expect((await api("/__stub/reset", { method: "POST" })).status).toBe(200);
    expect((await api(`/jobs/${id}`)).status).toBe(404);
  });

  it("requires the bearer token when the server is configured with a key", async () => {
    const secured = createStubServer({ fixture: "webm", apiKey: "secret" });
    const port = await secured.listen(0);
    try {
      const noAuth = await fetch(`http://127.0.0.1:${String(port)}/capabilities`);
      expect(noAuth.status).toBe(401);
      expect(await noAuth.json()).toMatchObject({ error: { code: "unauthorized" } });
      const ok = await fetch(`http://127.0.0.1:${String(port)}/health`, { headers: { authorization: "Bearer secret" } });
      expect(ok.status).toBe(200);
      const hooks = await fetch(`http://127.0.0.1:${String(port)}/__stub/jobs`);
      expect(hooks.status).toBe(200);
    } finally {
      await secured.close();
    }
  });
});
