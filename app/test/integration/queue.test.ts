/** STORY_041 integration lane: a request the model server refuses as busy waits in the app's queue, is submitted when a slot frees, keeps its id; timed, edited, moved, removed. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as listHistory } from "@/app/api/history/route";
import { DELETE as cancelJob, GET as getJob } from "@/app/api/jobs/[id]/route";
import { POST as retryChain } from "@/app/api/jobs/[id]/retry-chain/route";
import { GET as getHistoryEntry } from "@/app/api/history/[id]/route";
import { GET as getChain } from "@/app/api/history/[id]/chain/route";
import { GET as getResult } from "@/app/api/jobs/[id]/result/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { DELETE as removeQueued, GET as getQueued, PATCH as patchQueued } from "@/app/api/queue/[id]/route";
import { GET as listQueue } from "@/app/api/queue/route";
import type { HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse, JobStatusResponse } from "@/lib/job-api";
import { upstreamJobId } from "@/lib/queue-runner";

let stub: StubServer;
let stubUrl = "";
let dir = "";
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (p: string, body: unknown, method = "POST") => new Request(`http://app${p}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
type Queued = { id: string; status: string; progress: number; position?: number; notBefore?: string };
const status = async (id: string): Promise<Queued & Partial<JobStatusResponse>> => (await (await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id))).json()) as Queued & Partial<JobStatusResponse>;
const line = async (): Promise<{ id: string; position: number; title: string; notBefore?: string }[]> => ((await (await listQueue()).json()) as { entries: { id: string; position: number; title: string; notBefore?: string }[] }).entries;
const stubReceived = async (id: string): Promise<{ request: Record<string, unknown> }> => (await (await fetch(`${stubUrl}/__stub/jobs/${upstreamJobId(id)}/received`)).json()) as { request: Record<string, unknown> };
const stubJobs = async (): Promise<{ id: string; status: string }[]> => ((await (await fetch(`${stubUrl}/__stub/jobs`)).json()) as { jobs: { id: string; status: string }[] }).jobs;

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
  process.env["MODEL_BASE_URL"] = stubUrl;
  process.env["QUEUE_SOURCE_STALE_MS"] = "0"; // BUG_009: the runner asks the stub about a pending source on every run here
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
  delete process.env["QUEUE_SOURCE_STALE_MS"];
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

  it("an extension of a clip still running is queued, waits for it, and goes with the stub's id once it is done; a cancelled source fails its extension; an unknown source is refused (STORY_043)", async () => {
    // the source runs slowly on the stub; its extension is posted at once
    const src = (await (await createJob(jsonRequest("/api/jobs?script=slow-done-after-10-polls", valid))).json()) as CreateJobResponse;
    expect(src.status).toBe("queued");
    const ext = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "And on", continueFrom: src.id, overlapFrames: 39 }));
    expect(ext.status).toBe(202);
    const extBody = (await ext.json()) as Queued;
    expect(extBody).toMatchObject({ status: "queued", position: 1 });
    expect((await stubJobs()).map((j) => j.id)).toEqual([src.id]); // the extension never reached the server
    const rows = await line();
    expect(rows).toHaveLength(1);
    expect((rows[0] as { continueFrom?: { id: string; title: string } }).continueFrom).toMatchObject({ id: src.id, title: "A small paper boat" });
    expect(((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === extBody.id)?.continuesFrom).toMatchObject({ id: src.id, title: "A small paper boat" });
    // polls while the source runs never submit it
    await status(src.id);
    await listHistory();
    expect(await line()).toHaveLength(1);
    // the source done → the next list poll submits the extension, naming the stub's job (the source was created directly, so its id is the stub's)
    let s = await status(src.id);
    for (let i = 0; i < 12 && s.status !== "done"; i += 1) s = await status(src.id);
    expect(s.status).toBe("done");
    await listHistory();
    expect(await line()).toEqual([]);
    const extEntry = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === extBody.id);
    expect(extEntry?.jobId).toBeDefined();
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${extEntry?.jobId ?? ""}/received`)).json()) as { request: { continueFrom?: string; overlapFrames?: number } };
    expect(received.request).toMatchObject({ continueFrom: src.id, overlapFrames: 39 });
    // a cancelled source takes its queued extension out of the line with the reason
    const src2 = (await (await createJob(jsonRequest("/api/jobs?script=slow-done-after-10-polls", { ...valid, prompt: "Doomed" }))).json()) as CreateJobResponse;
    const ext2 = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Never", continueFrom: src2.id }))).json()) as Queued;
    expect((await cancelJob(new Request(`http://app/api/jobs/${src2.id}`, { method: "DELETE" }), ctx(src2.id))).status).toBe(202);
    await listHistory();
    expect(await line()).toEqual([]);
    expect(((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === ext2.id)).toMatchObject({ status: "failed", error: { code: "source_failed" } });
    // an unknown source goes up and the server refuses it, as before
    expect((await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, continueFrom: "nope" }))).status).toBe(400);
  });

  it("a waiting extension goes once its source is done although nothing polled the source: the runner asks the stub itself (BUG_009)", async () => {
    // the source is created directly (its id is the stub's); the stub answers done on its second status request
    const src = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid))).json()) as CreateJobResponse;
    expect(src.status).toBe("queued");
    const ext = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "And on", continueFrom: src.id, overlapFrames: 39 }))).json()) as Queued;
    expect(ext).toMatchObject({ status: "queued", position: 1 });
    expect((await stubJobs()).map((j) => j.id)).toEqual([src.id]);
    // from here no GET /api/jobs/:id is made — the list polls run the runner, which asks the stub about the source itself
    let rows = await line();
    for (let i = 0; i < 4 && rows.length > 0; i += 1) rows = await line();
    expect(rows).toEqual([]);
    const entries = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries;
    expect(entries.find((e) => e.id === src.id)).toMatchObject({ status: "done" }); // heard by the runner, recorded as a page's poll would
    const extEntry = entries.find((e) => e.id === ext.id);
    expect(extEntry?.status).toBe("queued");
    expect(extEntry?.jobId).toBeDefined();
    expect((await stubJobs()).map((j) => j.id)).toEqual([src.id, extEntry?.jobId ?? ""]); // one create for the extension, once
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${extEntry?.jobId ?? ""}/received`)).json()) as { request: { continueFrom?: string; overlapFrames?: number } };
    expect(received.request).toMatchObject({ continueFrom: src.id, overlapFrames: 39 });
    // a source the stub no longer knows: the runner fails the source and the extension leaves the line with the reason
    const lost = (await (await createJob(jsonRequest("/api/jobs?script=slow-done-after-10-polls", { ...valid, prompt: "Lost" }))).json()) as CreateJobResponse;
    const orphan = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Orphan", continueFrom: lost.id }))).json()) as Queued;
    expect(await line()).toHaveLength(1);
    stub.reset(); // the stub forgets every job: the source now answers 404
    await line();
    expect(await line()).toEqual([]);
    const after = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries;
    expect(after.find((e) => e.id === lost.id)).toMatchObject({ status: "failed", error: { code: "not_found" } });
    expect(after.find((e) => e.id === orphan.id)).toMatchObject({ status: "failed", error: { code: "source_failed", message: "its source did not finish" } });
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

  it("Retry chain (STORY_056): redraws a cut segment as an extension of its source and re-queues the segment waiting behind it on the redraw, cancelling the old one; a done later segment is left; the history entry lists what continues from it", async () => {
    // segment 1 done; segment 2 runs slowly and will report a cut; segment 3 waits in the line for it
    const s1 = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid))).json()) as CreateJobResponse;
    let st = await status(s1.id);
    for (let i = 0; i < 4 && st.status !== "done"; i += 1) st = await status(s1.id);
    expect(st.status).toBe("done");
    const s2 = (await (await createJob(jsonRequest("/api/jobs?script=slow-done-after-10-polls", { ...valid, prompt: "Segment two", durationSeconds: 10, continueFrom: s1.id, overlapFrames: 39, endAnchor: "source-last-frame" }))).json()) as CreateJobResponse;
    const s3 = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, prompt: "Segment three", durationSeconds: 10, continueFrom: s2.id, overlapFrames: 39, endAnchor: "source-last-frame" }))).json()) as Queued;
    expect(s3).toMatchObject({ status: "queued", position: 1 });
    // GET /api/history/:id answers chainAfter, transitively, in chain order
    const one = (await (await getHistoryEntry(new Request(`http://app/api/history/${s1.id}`), ctx(s1.id))).json()) as { chainAfter: { id: string; title: string; status: string }[] };
    expect(one.chainAfter.map((e) => e.id)).toEqual([s2.id, s3.id]);
    const two = (await (await getHistoryEntry(new Request(`http://app/api/history/${s2.id}`), ctx(s2.id))).json()) as { chainAfter: { id: string }[] };
    expect(two.chainAfter.map((e) => e.id)).toEqual([s3.id]);
    // STORY_057: the whole chain from any of its segments, each with its outcome — segment 3 waiting on segment 2
    const chainFrom3 = (await (await getChain(new Request(`http://app/api/history/${s3.id}/chain`), ctx(s3.id))).json()) as { segments: { id: string; index: number; outcome: string }[] };
    expect(chainFrom3.segments.map((x) => [x.index, x.id, x.outcome])).toEqual([[1, s1.id, "done"], [2, s2.id, "queued"], [3, s3.id, "waiting"]]);
    // Retry chain on segment 2: the old segment 3 leaves the line cancelled, the redraw goes up as an extension of segment 1, the new segment 3 waits on the redraw
    const res = await retryChain(new Request(`http://app/api/jobs/${s2.id}/retry-chain?script=slow-done-after-10-polls`, { method: "POST" }), ctx(s2.id)); // the redraw runs slowly, so the new segment 3 is seen waiting
    expect(res.status).toBe(202);
    const body = (await res.json()) as { id: string; rechained: string[]; refused?: unknown };
    expect(body.rechained).toHaveLength(1);
    expect(body.refused).toBeUndefined();
    const entries = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries;
    expect(entries.find((e) => e.id === s3.id)?.status).toBe("cancelled");
    const redraw = entries.find((e) => e.id === body.id);
    expect(redraw).toMatchObject({ prompt: "Segment two", continuesFrom: { id: s1.id }, params: { durationSeconds: 10, overlapFrames: 39, endAnchor: "source-last-frame" } }); // STORY_061: redrawn pinned, as stored
    expect((await stubReceived(body.id)).request).toMatchObject({ endAnchor: "source-last-frame" });
    const newThree = entries.find((e) => e.id === body.rechained[0]);
    expect(newThree).toMatchObject({ prompt: "Segment three", status: "queued", continuesFrom: { id: body.id }, params: { endAnchor: "source-last-frame" } });
    expect((await line()).map((e) => e.id)).toEqual([body.rechained[0]]);
    // STORY_057: from the redraw's page the chain is 1 → the old segment 2 (still a link until it is cancelled) → the redraw → the new 3; the old 3 is no row
    const chainFromRedraw = (await (await getChain(new Request(`http://app/api/history/${body.id}/chain`), ctx(body.id))).json()) as { segments: { id: string; outcome: string }[] };
    expect(chainFromRedraw.segments.map((x) => x.id)).toEqual([s1.id, s2.id, body.id, body.rechained[0]]);
    expect(chainFromRedraw.segments.map((x) => x.outcome).slice(0, 2)).toEqual(["done", "queued"]);
    expect(["queued", "running"]).toContain(chainFromRedraw.segments[2]?.outcome); // the slow redraw, as far as the stub has stepped it
    expect(chainFromRedraw.segments[3]?.outcome).toBe("waiting");
    expect((await getChain(new Request("http://app/api/history/nope/chain"), ctx("nope"))).status).toBe(404);
    // the redraw went to the stub with no seed of ours and the source's id; the old segment 3 never did
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${body.id}/received`)).json()) as { request: { continueFrom?: string; overlapFrames?: number; seed?: unknown } };
    expect(received.request).toMatchObject({ continueFrom: s1.id, overlapFrames: 39 });
    expect((await stubJobs()).map((j) => j.id)).not.toContain(s3.id);
    // the redraw done → the new segment 3 goes, as STORY_043's line makes it
    st = await status(body.id);
    for (let i = 0; i < 14 && st.status !== "done"; i += 1) st = await status(body.id);
    expect(st.status).toBe("done");
    await listHistory();
    expect(await line()).toEqual([]);
    const sent = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === body.rechained[0]);
    expect(sent?.jobId).toBeDefined();
    const three = (await (await fetch(`${stubUrl}/__stub/jobs/${sent?.jobId ?? ""}/received`)).json()) as { request: { continueFrom?: string } };
    expect(three.request.continueFrom).toBe(body.id);
    // a later segment that is done is left as it is: with the old, slow segment 2 cancelled (its branch gone), Retry chain on segment 1
    // re-posts the redraw and the new segment 3 behind a fresh segment 1 without touching the done ones
    expect((await cancelJob(new Request(`http://app/api/jobs/${s2.id}`, { method: "DELETE" }), ctx(s2.id))).status).toBe(202);
    const again = (await (await retryChain(new Request(`http://app/api/jobs/${s1.id}/retry-chain?script=done-after-1-poll`, { method: "POST" }), ctx(s1.id))).json()) as { id: string; rechained: string[] };
    expect(again.rechained).toHaveLength(2);
    const after = ((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries;
    expect(after.find((e) => e.id === body.id)?.status).toBe("done"); // left
    expect(after.find((e) => e.id === again.rechained[0])?.continuesFrom?.id).toBe(again.id);
    expect(after.find((e) => e.id === again.rechained[1])?.continuesFrom?.id).toBe(again.rechained[0]);
    for (const id of [again.id, ...again.rechained]) await cancelJob(new Request(`http://app/api/jobs/${id}`, { method: "DELETE" }), ctx(id)).catch(() => undefined);
  });
});
