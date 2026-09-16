import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { historyStore } from "./history-store";
import type { JobStatusResponse } from "./job-api";
import { DEFAULT_SOURCE_STALE_MS, refreshPendingSources, sourceStaleMs, sourceState, submitDue, upstreamFields, upstreamJobId } from "./queue-runner";
import { enqueue, listQueue, waiting, type QueueEntry } from "./queue-store";

let dir = "";
const request = { prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", projectId: "p1", script: "done-after-1-poll" };
const params = { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "runner-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  for (const id of ["a", "b", "c"]) historyStore().create({ id, prompt: `${id} boat`, params, referenceImages: 0 });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the queue runner (STORY_041)", () => {
  it("sends the model server only its own fields, naming a source by the server's job id (BUG_007)", () => {
    expect(upstreamFields(request)).toEqual({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" });
    expect(upstreamFields({ ...request, continueFrom: "src", overlapFrames: 39 })).toMatchObject({ continueFrom: "src", overlapFrames: 39 }); // a source created directly keeps its id
    historyStore().patch("a", { jobId: "job-a" });
    expect(upstreamFields({ ...request, continueFrom: "a" })).toMatchObject({ continueFrom: "job-a" }); // a source that went through the queue is named by the server's id
  });

  it("submits the due requests in line order, stops at busy, skips a timed one, and records the model server's id", async () => {
    enqueue({ id: "a", request, referenceFiles: [] });
    enqueue({ id: "b", request, referenceFiles: [], notBefore: "2026-09-16T06:00:00.000Z" });
    enqueue({ id: "c", request, referenceFiles: [] });
    const sent: string[] = [];
    let accepts = 1;
    const submit = vi.fn((entry: { id: string }) => {
      sent.push(entry.id);
      if (accepts > 0) {
        accepts -= 1;
        return Promise.resolve(json({ id: `job-${entry.id}`, status: "queued", progress: 0 }, 202));
      }
      return Promise.resolve(json({ error: { code: "busy", message: "full" } }, 503));
    });
    expect(await submitDue({ now: new Date("2026-09-15T18:00:00.000Z"), submit })).toBe(1);
    expect(sent).toEqual(["a", "c"]); // b is timed: skipped, c tried next, refused as busy, the line waits
    expect(waiting().map((e) => e.id)).toEqual(["b", "c"]);
    expect(historyStore().get("a")).toMatchObject({ jobId: "job-a", status: "queued" });
    expect(upstreamJobId("a")).toBe("job-a");
    expect(upstreamJobId("c")).toBe("c");
    accepts = 5;
    expect(await submitDue({ now: new Date("2026-09-16T07:00:00.000Z"), submit })).toBe(2);
    expect(waiting()).toEqual([]);
    expect(listQueue().every((e) => e.jobId !== undefined)).toBe(true);
  });

  it("holds an extension while its source runs, submits it with the mapped id once done, and fails it with the reason when the source fails (STORY_043)", async () => {
    // b extends a; c is a fresh request behind them
    enqueue({ id: "b", request: { ...request, continueFrom: "a", overlapFrames: 39 }, referenceFiles: [] });
    enqueue({ id: "c", request, referenceFiles: [] });
    historyStore().patch("a", { status: "running", progress: 40, jobId: "job-a" });
    expect(sourceState("a")).toBe("pending");
    const sent: string[] = [];
    const submit = vi.fn((entry: QueueEntry) => {
      sent.push(`${entry.id}${entry.request.continueFrom === undefined ? "" : `←${String(upstreamFields(entry.request)["continueFrom"])}`}`);
      return Promise.resolve(json({ id: `job-${entry.id}`, status: "queued", progress: 0 }, 202));
    });
    // BUG_009: the runner would ask the server about a itself; here the server still says running, and a page's poll writes done below
    const refresh = vi.fn(() => Promise.resolve(json({ id: "job-a", status: "running", progress: 40 }, 200)));
    expect(await submitDue({ submit, refresh })).toBe(1);
    expect(sent).toEqual(["c"]); // b waits for a; c went past it
    expect(waiting().map((e) => e.id)).toEqual(["b"]);
    historyStore().recordStatus("a", { id: "a", status: "done", progress: 100, result: { url: "/jobs/a/result", posterUrl: "/jobs/a/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1, height: 1, sizeBytes: 1 } });
    expect(sourceState("a")).toBe("done");
    expect(await submitDue({ submit, refresh })).toBe(1);
    expect(sent).toEqual(["c", "b←job-a"]); // the source's real job id (BUG_007)
    expect(waiting()).toEqual([]);
    // a source that fails takes its extension out of the line with the reason
    historyStore().create({ id: "s", prompt: "s boat", params, referenceImages: 0 });
    historyStore().create({ id: "e", prompt: "e boat", params, referenceImages: 0 });
    enqueue({ id: "e", request: { ...request, continueFrom: "s" }, referenceFiles: [] });
    historyStore().recordStatus("s", { id: "s", status: "failed", progress: 10, error: { code: "generation_failed", message: "boom" } });
    expect(sourceState("s")).toBe("gone");
    expect(sourceState("never")).toBe("gone");
    expect(await submitDue({ submit, refresh })).toBe(0);
    expect(waiting()).toEqual([]);
    expect(historyStore().get("e")).toMatchObject({ status: "failed", error: { code: "source_failed", message: "its source did not finish" } });
  });

  it("asks the model server about a waiting extension's source and submits the extension once it answers done, with no page having polled (BUG_009)", async () => {
    // b extends a, which was submitted (job-a) and last heard running; nothing polls a
    enqueue({ id: "b", request: { ...request, continueFrom: "a", overlapFrames: 39 }, referenceFiles: [] });
    historyStore().patch("a", { status: "running", progress: 40, jobId: "job-a" });
    const sent: string[] = [];
    const submit = vi.fn((entry: QueueEntry) => {
      sent.push(`${entry.id}${entry.request.continueFrom === undefined ? "" : `←${String(upstreamFields(entry.request)["continueFrom"])}`}`);
      return Promise.resolve(json({ id: `job-${entry.id}`, status: "queued", progress: 0 }, 202));
    });
    const asked: string[] = [];
    let answer: JobStatusResponse = { id: "job-a", status: "running", progress: 70 };
    const refresh = vi.fn((upstreamId: string) => {
      asked.push(upstreamId);
      return Promise.resolve(json(answer, 200));
    });
    // still running: asked under the server's id, recorded, not submitted
    expect(await submitDue({ submit, refresh, staleMs: 0 })).toBe(0);
    expect(asked).toEqual(["job-a"]);
    expect(historyStore().get("a")).toMatchObject({ status: "running", progress: 70 });
    expect(sent).toEqual([]);
    expect(waiting().map((e) => e.id)).toEqual(["b"]);
    // done: recorded through the same path as a page's poll (the result kept), and the extension goes in the same run
    answer = { id: "job-a", status: "done", progress: 100, result: { url: "/jobs/job-a/result", posterUrl: "/jobs/job-a/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1, height: 1, sizeBytes: 1 } };
    expect(await submitDue({ submit, refresh, staleMs: 0 })).toBe(1);
    expect(asked).toEqual(["job-a", "job-a"]);
    expect(historyStore().get("a")).toMatchObject({ id: "a", status: "done", result: { durationSeconds: 5 } });
    expect(sent).toEqual(["b←job-a"]);
    expect(waiting()).toEqual([]);
    // settled sources are never asked again
    expect(await submitDue({ submit, refresh, staleMs: 0 })).toBe(0);
    expect(asked).toHaveLength(2);
  });

  it("asks only about sources nobody has heard from lately, never about fresh requests, settled sources or ones still in the line; a 404 fails the source and its extension (BUG_009)", async () => {
    historyStore().create({ id: "d", prompt: "d boat", params, referenceImages: 0 });
    historyStore().create({ id: "e", prompt: "e boat", params, referenceImages: 0 });
    historyStore().create({ id: "f", prompt: "f boat", params, referenceImages: 0 });
    // a: running, heard from just now (a page is watching it); b: waiting in the line itself; c: done; d, e: running, unheard
    historyStore().recordStatus("a", { id: "a", status: "running", progress: 10 });
    enqueue({ id: "b", request, referenceFiles: [] });
    historyStore().recordStatus("c", { id: "c", status: "done", progress: 100 });
    historyStore().patch("d", { status: "running", progress: 5, jobId: "job-d" });
    historyStore().patch("e", { status: "running", progress: 5 }); // created directly: known upstream under its own id
    enqueue({ id: "x1", request: { ...request, continueFrom: "a" }, referenceFiles: [] });
    enqueue({ id: "x2", request: { ...request, continueFrom: "b" }, referenceFiles: [] });
    enqueue({ id: "x3", request: { ...request, continueFrom: "c" }, referenceFiles: [] });
    enqueue({ id: "x4", request: { ...request, continueFrom: "d" }, referenceFiles: [] });
    enqueue({ id: "x5", request: { ...request, continueFrom: "d" }, referenceFiles: [] }); // a second extension of d: one question, not two
    enqueue({ id: "x6", request: { ...request, continueFrom: "e" }, referenceFiles: [] });
    enqueue({ id: "f", request, referenceFiles: [], notBefore: "2030-01-01T00:00:00.000Z" }); // no source at all
    for (const id of ["x1", "x2", "x3", "x4", "x5", "x6"]) historyStore().create({ id, prompt: `${id} boat`, params, referenceImages: 0 });
    const asked: string[] = [];
    const refresh = vi.fn((upstreamId: string) => {
      asked.push(upstreamId);
      return Promise.resolve(upstreamId === "e" ? json({ error: { code: "not_found", message: "no job e" } }, 404) : json({ id: upstreamId, status: "running", progress: 50 }, 200));
    });
    const submit = vi.fn(() => Promise.resolve(json({ error: { code: "busy", message: "full" } }, 503)));
    expect(await refreshPendingSources({ refresh, staleMs: 10_000 })).toBe(2);
    expect(asked.sort()).toEqual(["e", "job-d"]); // a is fresh, b is in the line, c is done, f has no source, d once
    expect(historyStore().get("d")).toMatchObject({ status: "running", progress: 50 });
    expect(historyStore().get("e")).toMatchObject({ status: "failed", error: { code: "not_found" } });
    // the run then fails e's extension with the reason and leaves the rest waiting
    await submitDue({ submit, refresh, staleMs: 10_000 });
    expect(historyStore().get("x6")).toMatchObject({ status: "failed", error: { code: "source_failed", message: "its source did not finish" } });
    expect(waiting().map((e) => e.id)).toEqual(["b", "x1", "x2", "x3", "x4", "x5", "f"]);
    // an unreachable server (a rejected refresh, or a 502) leaves history as it was
    asked.length = 0;
    const down = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(await refreshPendingSources({ refresh: down, staleMs: 0 })).toBe(0);
    const gateway = vi.fn(() => Promise.resolve(json({ error: { code: "unreachable", message: "down" } }, 502)));
    expect(await refreshPendingSources({ refresh: gateway, staleMs: 0 })).toBe(2);
    expect(historyStore().get("a")).toMatchObject({ status: "running", progress: 10 });
    expect(historyStore().get("d")).toMatchObject({ status: "running", progress: 50 });
    // the staleness threshold: the default, the env override, a bad value
    expect(sourceStaleMs()).toBe(DEFAULT_SOURCE_STALE_MS);
    process.env["QUEUE_SOURCE_STALE_MS"] = "3000";
    expect(sourceStaleMs()).toBe(3000);
    process.env["QUEUE_SOURCE_STALE_MS"] = "soon";
    expect(sourceStaleMs()).toBe(DEFAULT_SOURCE_STALE_MS);
    delete process.env["QUEUE_SOURCE_STALE_MS"];
  });

  it("fails a request the server refuses for a reason of its own, leaves the line on unreachable, and runs once at a time", async () => {
    enqueue({ id: "a", request, referenceFiles: [] });
    enqueue({ id: "b", request, referenceFiles: [] });
    // a is refused for its own reason (it leaves the line, the runner moves on); b then meets a busy server (the line waits)
    const refuse = vi.fn((entry: { id: string }) => Promise.resolve(entry.id === "a" ? json({ error: { code: "validation", message: "prompt is empty" } }, 400) : json({ error: { code: "busy", message: "full" } }, 503)));
    expect(await submitDue({ submit: refuse })).toBe(0);
    expect(refuse).toHaveBeenCalledTimes(2);
    expect(historyStore().get("a")).toMatchObject({ status: "failed", error: { code: "validation", message: "prompt is empty" } });
    expect(waiting().map((e) => e.id)).toEqual(["b"]); // a left the line; b still waits
    const down = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(await submitDue({ submit: down })).toBe(0);
    expect(waiting().map((e) => e.id)).toEqual(["b"]); // unreachable: the line waits
    let resolve: ((value: Response) => void) | undefined;
    const slow = vi.fn(() => new Promise<Response>((r) => { resolve = r; }));
    const first = submitDue({ submit: slow });
    const second = submitDue({ submit: slow });
    expect(second).toBe(first); // the same run, not a second
    await vi.waitFor(() => { expect(slow).toHaveBeenCalledTimes(1); }); // BUG_009: the run hears from the server about pending sources before it submits
    resolve?.(json({ id: "job-b", status: "queued", progress: 0 }, 202));
    expect(await first).toBe(1);
    expect(slow).toHaveBeenCalledTimes(1);
  });
});
