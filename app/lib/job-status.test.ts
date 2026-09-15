import { describe, expect, it } from "vitest";
import type { JobStatusResponse } from "./job-api";
import { initialJob, reduceJob } from "./job-status";

const res = (over: Partial<JobStatusResponse>): JobStatusResponse => ({ id: "j1", status: "running", progress: 0, ...over });
const status = (over: Partial<JobStatusResponse>) => ({ type: "status" as const, response: res(over) });

describe("the queue's position (STORY_041)", () => {
  it("is carried by a queued status and dropped once the job runs", () => {
    const waiting = reduceJob(initialJob("q1"), { type: "status", response: { id: "q1", status: "queued", progress: 0, position: 3 } });
    expect(waiting.position).toBe(3);
    expect(reduceJob(waiting, { type: "status", response: { id: "q1", status: "running", progress: 10 } }).position).toBeUndefined();
  });
});

describe("reduceJob", () => {
  it("walks queued → running → done and pins progress to 100 on done", () => {
    let s = initialJob("j1");
    s = reduceJob(s, status({ status: "running", progress: 33 }));
    expect(s).toMatchObject({ status: "running", progress: 33 });
    s = reduceJob(s, status({ status: "done", progress: 90, result: { url: "/api/jobs/j1/result", posterUrl: "/api/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 2, width: 320, height: 180, sizeBytes: 1 } }));
    expect(s.status).toBe("done");
    expect(s.progress).toBe(100);
    expect(s.result?.url).toBe("/api/jobs/j1/result");
  });

  it("ignores every update after a terminal state", () => {
    const done = reduceJob(initialJob("j1"), status({ status: "done", progress: 100 }));
    expect(reduceJob(done, status({ status: "running", progress: 10 }))).toBe(done);
    expect(reduceJob(done, { type: "cancel-requested" })).toBe(done);
    const failed = reduceJob(initialJob("j1"), status({ status: "failed", progress: 40, error: { code: "moderated", message: "no" } }));
    expect(failed.error?.code).toBe("moderated");
    expect(reduceJob(failed, status({ status: "done", progress: 100 }))).toBe(failed);
  });

  it("never lets progress go backwards and clamps out-of-range values", () => {
    let s = reduceJob(initialJob("j1"), status({ progress: 66 }));
    s = reduceJob(s, status({ progress: 33 }));
    expect(s.progress).toBe(66);
    expect(reduceJob(initialJob("j1"), status({ progress: 250 })).progress).toBe(100);
    expect(reduceJob(initialJob("j1"), status({ progress: -5 })).progress).toBe(0);
    expect(reduceJob(initialJob("j1"), status({ progress: Number.NaN })).progress).toBe(0);
  });

  it("remembers a cancel request until the server confirms, and clears it on any terminal state", () => {
    let s = reduceJob(initialJob("j1"), { type: "cancel-requested" });
    expect(s.cancelRequested).toBe(true);
    s = reduceJob(s, status({ status: "running", progress: 50 }));
    expect(s.cancelRequested).toBe(true);
    s = reduceJob(s, status({ status: "cancelled", progress: 50 }));
    expect(s).toMatchObject({ status: "cancelled", cancelRequested: false });
  });

  it("ignores a response for a different job id", () => {
    const s = initialJob("j1");
    expect(reduceJob(s, status({ id: "other", status: "done", progress: 100 }))).toBe(s);
  });
});
