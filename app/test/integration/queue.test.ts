/** STORY_041 integration lane: a request the model server refuses as busy waits in the app's queue, is submitted when a slot frees, keeps its id; timed, edited, moved, removed. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as listHistory } from "@/app/api/history/route";
import { DELETE as cancelJob, GET as getJob } from "@/app/api/jobs/[id]/route";
import { GET as getResult } from "@/app/api/jobs/[id]/result/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { DELETE as removeQueued, GET as getQueued, PATCH as patchQueued } from "@/app/api/queue/[id]/route";
import { GET as listQueue } from "@/app/api/queue/route";
import type { HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse, JobStatusResponse } from "@/lib/job-api";

let stub: StubServer;
let stubUrl = "";
let dir = "";
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (p: string, body: unknown, method = "POST") => new Request(`http://app${p}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
type Queued = { id: string; status: string; progress: number; position?: number; notBefore?: string };
const status = async (id: string): Promise<Queued & Partial<JobStatusResponse>> => (await (await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id))).json()) as Queued & Partial<JobStatusResponse>;
const line = async (): Promise<{ id: string; position: number; title: string; notBefore?: string }[]> => ((await (await listQueue()).json()) as { entries: { id: string; position: number; title: string; notBefore?: string }[] }).entries;
const stubJobs = async (): Promise<{ id: string; status: string }[]> => ((await (await fetch(`${stubUrl}/__stub/jobs`)).json()) as { jobs: { id: string; status: string }[] }).jobs;

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
  process.env["MODEL_BASE_URL"] = stubUrl;
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "queue-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  stub.reset();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the queue through the app's routes", () => {
  it("a busy server puts the request in the line with its position; a poll after the server frees submits it under the same id, through to the result", async () => {
    stub.setBusy(true);
    const res = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid));
    expect(res.status).toBe(202);
    const first = (await res.json()) as Queued;
    expect(first).toMatchObject({ status: "queued", progress: 0, position: 1 });
    const second = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Second in line" }))).json()) as Queued;
    expect(second.position).toBe(2);
    expect(await stubJobs()).toEqual([]); // nothing reached the server
    expect((await line()).map((e) => `${String(e.position)} ${e.title}`)).toEqual(["1 A small paper boat", "2 Second in line"]);
    // CHORE_011: the stub's health has no comfyui field, so the model counts as reachable; a server that cannot be reached is neither
    expect(((await (await listQueue()).json()) as { model: unknown }).model).toEqual({ adapter: true, comfyui: true });
    const was = process.env["MODEL_BASE_URL"];
    process.env["MODEL_BASE_URL"] = "http://127.0.0.1:1";
    expect(((await (await listQueue()).json()) as { model: unknown }).model).toEqual({ adapter: false, comfyui: false });
    process.env["MODEL_BASE_URL"] = was;
    expect(await status(first.id)).toMatchObject({ id: first.id, status: "queued", position: 1 }); // the task page's poll while waiting
    const history = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries;
    expect(history.map((e) => e.id)).toEqual([second.id, first.id]);
    expect(history.every((e) => e.status === "queued")).toBe(true);
    stub.setBusy(false);
    // the next poll of the list advances the line: both go (the stub accepts any number)
    await listHistory();
    expect(await line()).toEqual([]);
    const jobs = await stubJobs();
    expect(jobs).toHaveLength(2);
    const submitted = (await (await listHistory()).json()) as { entries: HistoryEntry[] };
    const entry = submitted.entries.find((e) => e.id === first.id);
    expect(entry?.jobId).toBeDefined();
    expect(entry?.jobId).not.toBe(first.id); // the model server's own id, kept beside ours
    // the status, the result: under our id, from the server's job
    let last = await status(first.id);
    for (let i = 0; i < 5 && last.status !== "done"; i += 1) last = await status(first.id);
    expect(last).toMatchObject({ id: first.id, status: "done" });
    expect(last.position).toBeUndefined();
    const result = await getResult(new Request(`http://app/api/jobs/${first.id}/result`), ctx(first.id));
    expect(result.status).toBe(200);
    expect(Buffer.from(await result.arrayBuffer()).equals(readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture.mp4`))).toBe(true);
    expect(submitted.entries.find((e) => e.id === first.id)?.title).toBe("A small paper boat");
    // BUG_007: an extension of the queued job names it by our id; the stub receives its own id; history keeps ours
    const extended = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "And on", continueFrom: first.id, overlapFrames: 39 }));
    expect(extended.status).toBe(202);
    const ext = (await extended.json()) as CreateJobResponse;
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${ext.id}/received`)).json()) as { request: { continueFrom?: string } };
    expect(received.request.continueFrom).toBe(entry?.jobId);
    expect(received.request.continueFrom).not.toBe(first.id);
    const extEntry = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === ext.id);
    expect(extEntry?.continuesFrom?.id).toBe(first.id);
    // the same through the queue: an extension queued while the stub is busy is submitted with the mapped id
    stub.setBusy(true);
    const queuedExt = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "And on again", continueFrom: first.id, overlapFrames: 39 }))).json()) as Queued;
    expect(queuedExt.position).toBe(1);
    stub.setBusy(false);
    await listHistory();
    const qe = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === queuedExt.id);
    const receivedQ = (await (await fetch(`${stubUrl}/__stub/jobs/${qe?.jobId ?? ""}/received`)).json()) as { request: { continueFrom?: string } };
    expect(receivedQ.request.continueFrom).toBe(entry?.jobId);
  });

  it("a timed request waits even when the server is free, does not block the line, and goes when its time is cleared; the images travel with it", async () => {
    const png = new File([readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture-reference.png`)], "ref.png", { type: "image/png" });
    const form = new FormData();
    for (const [k, v] of Object.entries({ ...valid, notBefore: "2999-01-01T00:00:00.000Z" })) form.set(k, String(v));
    form.append("referenceImage", png);
    const timed = (await (await createJob(new Request("http://app/api/jobs?script=done-after-1-poll", { method: "POST", body: form }))).json()) as Queued;
    expect(timed).toMatchObject({ status: "queued", position: 1 });
    expect(existsSync(path.join(dir, "uploads", timed.id, "1-ref.png"))).toBe(true);
    const detail = (await (await getQueued(new Request(`http://app/api/queue/${timed.id}`), ctx(timed.id))).json()) as { request: { prompt: string }; notBefore: string | null; images: { name: string; url: string }[] };
    expect(detail.request.prompt).toBe(valid.prompt);
    expect(detail.notBefore).toBe("2999-01-01T00:00:00.000Z");
    expect(detail.images).toEqual([{ n: 1, name: "ref.png", type: "image/png", url: `/api/history/${timed.id}/reference/1` }]);
    const now = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Right away" }))).json()) as CreateJobResponse;
    expect(now.status).toBe("queued");
    await listHistory();
    expect((await stubJobs()).map((j) => j.id)).toEqual([now.id]); // the untimed one went straight to the server; the timed one waits
    expect((await line()).map((e) => e.id)).toEqual([timed.id]);
    expect((await patchQueued(jsonRequest(`/api/queue/${timed.id}`, { notBefore: "not a date" }, "PATCH"), ctx(timed.id))).status).toBe(400);
    expect(await (await patchQueued(jsonRequest(`/api/queue/${timed.id}`, { notBefore: null }, "PATCH"), ctx(timed.id))).json()).toEqual({ id: timed.id, notBefore: null });
    await listHistory();
    expect(await line()).toEqual([]);
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${(await stubJobs()).find((j) => j.id !== now.id)?.id ?? ""}/received`)).json()) as { uploads: { filename: string }[] };
    expect(received.uploads.map((u) => u.filename)).toEqual(["ref.png"]); // the image reached the server when its turn came
  });

  it("move, Edit (replaces, in place, position and time kept), Remove, cancel of a waiting one; a submitted one can no longer be edited or removed", async () => {
    stub.setBusy(true);
    const a = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "First" }))).json()) as Queued;
    const b = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Second", notBefore: "2999-01-01T00:00:00.000Z" }))).json()) as Queued;
    const c = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Third" }))).json()) as Queued;
    expect(await (await patchQueued(jsonRequest(`/api/queue/${c.id}`, { move: "up" }, "PATCH"), ctx(c.id))).json()).toEqual({ id: c.id, position: 2 });
    expect((await line()).map((e) => e.title)).toEqual(["First", "Third", "Second"]);
    expect((await patchQueued(jsonRequest(`/api/queue/${a.id}`, { move: "sideways" }, "PATCH"), ctx(a.id))).status).toBe(400);
    // Edit: the same slot and run-at, a new prompt and duration; the history entry's title follows
    const edited = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Second, edited", durationSeconds: 8, replaces: b.id }));
    expect(edited.status).toBe(202);
    expect(await edited.json()).toMatchObject({ id: b.id, status: "queued", position: 3, replaced: true });
    expect((await line()).map((e) => `${e.title}${e.notBefore === undefined ? "" : " @"}`)).toEqual(["First", "Third", "Second, edited @"]);
    expect(((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === b.id)).toMatchObject({ title: "Second, edited", params: { durationSeconds: 8 } });
    expect((await createJob(jsonRequest("/api/jobs", { ...valid, replaces: "nope" }))).status).toBe(404);
    // Remove: the entry, its history and its files go; the server is never asked
    expect((await removeQueued(new Request(`http://app/api/queue/${c.id}`, { method: "DELETE" }), ctx(c.id))).status).toBe(204);
    expect((await removeQueued(new Request(`http://app/api/queue/${c.id}`, { method: "DELETE" }), ctx(c.id))).status).toBe(404);
    expect(((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.map((e) => e.id).sort()).toEqual([a.id, b.id].sort()); // c is gone; a and b share a creation millisecond, so their order is not asserted
    // cancel of a waiting one from its task page: cancelled in history, out of the line
    const cancelled = await cancelJob(new Request(`http://app/api/jobs/${b.id}`, { method: "DELETE" }), ctx(b.id));
    expect(cancelled.status).toBe(202);
    expect(await cancelled.json()).toEqual({ id: b.id, status: "cancelled", progress: 0 });
    expect((await line()).map((e) => e.id)).toEqual([a.id]);
    expect(await stubJobs()).toEqual([]);
    // once submitted, Edit and Remove are refused
    stub.setBusy(false);
    await listHistory();
    expect((await line())).toEqual([]);
    expect((await createJob(jsonRequest("/api/jobs", { ...valid, replaces: a.id }))).status).toBe(409);
    expect((await removeQueued(new Request(`http://app/api/queue/${a.id}`, { method: "DELETE" }), ctx(a.id))).status).toBe(409);
    expect((await getQueued(new Request(`http://app/api/queue/${a.id}`), ctx(a.id))).status).toBe(404);
  });
});
