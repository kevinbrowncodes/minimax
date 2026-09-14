/**
 * STORY_009 integration lane: the app's route handlers against the stub generation server, in-process.
 * Each test sets MODEL_BASE_URL to the stub's random port; the handlers read it through lib/config on every call.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getCapabilities } from "@/app/api/capabilities/route";
import { DELETE as cancelJob, GET as getJob } from "@/app/api/jobs/[id]/route";
import { GET as getPoster } from "@/app/api/jobs/[id]/poster/route";
import { GET as getResult } from "@/app/api/jobs/[id]/result/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { historyStore } from "@/lib/history-store";
import type { ApiError, Capabilities, CreateJobResponse, JobStatusResponse } from "@/lib/job-api";

const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5 };
let stub: StubServer;
let stubUrl: string;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (path: string, body: unknown) =>
  new Request(`http://app${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function create(script?: string): Promise<string> {
  const res = await createJob(jsonRequest(`/api/jobs${script ? `?script=${script}` : ""}`, valid));
  expect(res.status).toBe(202);
  const body = (await res.json()) as CreateJobResponse;
  expect(body.status).toBe("queued");
  return body.id;
}
async function status(id: string): Promise<JobStatusResponse> {
  const res = await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id));
  expect(res.status).toBe(200);
  return (await res.json()) as JobStatusResponse;
}
async function stubReceived(id: string): Promise<{ request: Record<string, unknown>; uploads: { filename: string; sha256: string }[] }> {
  return (await (await fetch(`${stubUrl}/__stub/jobs/${id}/received`)).json()) as { request: Record<string, unknown>; uploads: { filename: string; sha256: string }[] };
}

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => stub.close());
beforeEach(() => {
  process.env["MODEL_BASE_URL"] = stubUrl;
  delete process.env["MODEL_API_KEY"];
  stub.reset();
});
afterEach(() => {
  delete process.env["MODEL_BASE_URL"];
});

describe("create → status → result through the app's routes", () => {
  it("creates with the default script and polls to done with the contract's result", async () => {
    const id = await create();
    expect(await status(id)).toMatchObject({ status: "running", progress: 33 });
    expect(await status(id)).toMatchObject({ status: "running", progress: 66 });
    const done = await status(id);
    expect(done).toMatchObject({ status: "done", progress: 100, result: { url: `/jobs/${id}/result`, mimeType: "video/mp4", width: 320, height: 180 } });
  });

  it("surfaces failed with the code, and moderated as code moderated", async () => {
    const a = await create("fails-after-2-polls");
    await status(a);
    expect(await status(a)).toMatchObject({ status: "failed", error: { code: "generation_failed" } });
    const b = await create("moderated");
    expect(await status(b)).toMatchObject({ status: "failed", error: { code: "moderated" } });
  });

  it("cancels a running job, and a second cancel is 409", async () => {
    const id = await create("cancel-midway");
    await status(id);
    const res = await cancelJob(new Request(`http://app/api/jobs/${id}`, { method: "DELETE" }), ctx(id));
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ id, status: "cancelled" });
    const again = await cancelJob(new Request(`http://app/api/jobs/${id}`, { method: "DELETE" }), ctx(id));
    expect(again.status).toBe(409);
    expect(((await again.json()) as ApiError).error.code).toBe("already_terminal");
  });

  it("streams the result bytes equal to the fixture, answers a Range request with 206, and serves the poster", async () => {
    const id = await create("done-after-1-poll");
    await status(id);
    const res = await getResult(new Request(`http://app/api/jobs/${id}/result`), ctx(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.equals(readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture.mp4`))).toBe(true);
    const ranged = await getResult(new Request(`http://app/api/jobs/${id}/result`, { headers: { range: "bytes=0-99" } }), ctx(id));
    expect(ranged.status).toBe(206);
    expect((await ranged.arrayBuffer()).byteLength).toBe(100);
    expect(ranged.headers.get("content-range")).toMatch(/^bytes 0-99\//);
    // BUG_004: the file is named by the server — inline for the player, attachment with ?download — with the history title
    expect(res.headers.get("content-disposition")).toBe(`inline; filename="A small paper boat.mp4"; filename*=UTF-8''A%20small%20paper%20boat.mp4`);
    expect(ranged.headers.get("content-disposition")).toMatch(/^inline; /);
    const save = await getResult(new Request(`http://app/api/jobs/${id}/result?download`), ctx(id));
    expect(save.status).toBe(200);
    expect(save.headers.get("content-disposition")).toMatch(/^attachment; filename="A small paper boat\.mp4"/);
    historyStore().remove(id);
    const unknown = await getResult(new Request(`http://app/api/jobs/${id}/result`), ctx(id));
    expect(unknown.headers.get("content-disposition")).toMatch(/^inline; filename="video\.mp4"/);
    const poster = await getPoster(new Request(`http://app/api/jobs/${id}/poster`), ctx(id));
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toBe("image/png");
    const notDone = await create("cancel-midway");
    const early = await getResult(new Request(`http://app/api/jobs/${notDone}/result`), ctx(notDone));
    expect(early.status).toBe(409);
  });
});

describe("uploads", () => {
  const png = () => new File([readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture-reference.png`)], "ref.png", { type: "image/png" });
  const multipart = (files: File[]) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(valid)) form.set(k, String(v));
    for (const f of files) form.append("referenceImage", f);
    return new Request("http://app/api/jobs", { method: "POST", body: form });
  };

  it("forwards a reference image and the stub records the same sha256", async () => {
    const res = await createJob(multipart([png()]));
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as CreateJobResponse;
    const received = await stubReceived(id);
    const sha = createHash("sha256").update(readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture-reference.png`)).digest("hex");
    expect(received.uploads).toEqual([expect.objectContaining({ filename: "ref.png", sha256: sha })]);
  });

  it("refuses a gif before it reaches the stub", async () => {
    const res = await createJob(multipart([new File([Buffer.from("GIF89a")], "x.gif", { type: "image/gif" })]));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).error).toMatchObject({ code: "validation", field: "referenceImage" });
    const jobs = (await (await fetch(`${stubUrl}/__stub/jobs`)).json()) as { jobs: unknown[] };
    expect(jobs.jobs).toHaveLength(0);
  });

  it("answers 415 for an unsupported request body", async () => {
    const res = await createJob(new Request("http://app/api/jobs", { method: "POST", headers: { "content-type": "text/plain" }, body: "hi" }));
    expect(res.status).toBe(415);
  });
});

describe("config, auth and errors", () => {
  it("relays the stub's validation errors with their status and field", async () => {
    const res = await createJob(jsonRequest("/api/jobs", { ...valid, resolution: "2K" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).error).toMatchObject({ code: "unsupported_option", field: "resolution" });
  });

  it("sends the bearer token when MODEL_API_KEY is set", async () => {
    const secured = createStubServer({ fixture: "mp4", apiKey: "secret" });
    const port = await secured.listen(0);
    try {
      process.env["MODEL_BASE_URL"] = `http://127.0.0.1:${String(port)}`;
      const denied = await getCapabilities();
      expect(denied.status).toBe(401);
      process.env["MODEL_API_KEY"] = "secret";
      const ok = await getCapabilities();
      expect(ok.status).toBe(200);
      expect(((await ok.json()) as Capabilities).resolutions).toEqual(["768P"]);
    } finally {
      await secured.close();
    }
  });

  it("returns 404 for an unknown id, 500 naming MODEL_BASE_URL when it is unset, and 502 unreachable when the server is down", async () => {
    const missing = await getJob(new Request("http://app/api/jobs/nope"), ctx("nope"));
    expect(missing.status).toBe(404);
    delete process.env["MODEL_BASE_URL"];
    const unset = await createJob(jsonRequest("/api/jobs", valid));
    expect(unset.status).toBe(500);
    const body = (await unset.json()) as ApiError;
    expect(body.error.code).toBe("config");
    expect(body.error.message).toMatch(/MODEL_BASE_URL/);
    expect(JSON.stringify(body)).not.toMatch(/at .*\.ts:\d+/);
    process.env["MODEL_BASE_URL"] = "http://127.0.0.1:9";
    const down = await getCapabilities();
    expect(down.status).toBe(502);
    expect(((await down.json()) as ApiError).error.code).toBe("unreachable");
  });
});

describe("extensions (STORY_016)", () => {
  it("records continuesFrom with the source's title and length, relays the stub's echo, records what was fed, and the stub receives the request", async () => {
    const src = await create("done-after-1-poll");
    await status(src);
    const res = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, durationSeconds: 10, continueFrom: src, contextSeconds: 2 }));
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as CreateJobResponse;
    const entry = historyStore().get(id);
    expect(entry).toMatchObject({ continuesFrom: { id: src, title: "A small paper boat", durationSeconds: 2 }, params: { durationSeconds: 10, contextSeconds: 2 } });
    expect(entry?.contextFed).toBeUndefined();
    const s = await status(id);
    expect(s.request).toMatchObject({ continueFrom: src, contextSeconds: 2, contextFed: { frames: 56, seconds: 2.333 } });
    expect(historyStore().get(id)?.contextFed).toEqual({ frames: 56, seconds: 2.333 });
    expect((await stubReceived(id)).request).toMatchObject({ continueFrom: src, contextSeconds: 2, durationSeconds: 10 });
  });

  it("a refused continueFrom relays the stub's 400 and writes no history entry; capabilities relay the extension limits", async () => {
    const before = historyStore().list().length;
    const res = await createJob(jsonRequest("/api/jobs", { ...valid, durationSeconds: 10, continueFrom: "nope" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).error).toMatchObject({ code: "validation", field: "continueFrom" });
    expect(historyStore().list().length).toBe(before);
    const caps = (await (await getCapabilities()).json()) as Capabilities;
    expect(caps.extension).toEqual({ durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, contextSeconds: { min: 2, max: 15, default: 5 }, maxSourceSeconds: 30 });
  });
});
