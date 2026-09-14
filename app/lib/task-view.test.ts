import { describe, expect, it } from "vitest";
import { initialJob, reduceJob } from "./job-status";
import { formatDoneAt, processedSeconds, resultLine } from "./task-view";

describe("processedSeconds (STORY_023): the Processed row's number", () => {
  it("counts whole seconds from creation to the finish, or to now while the job runs; never negative", () => {
    const now = new Date("2026-09-12T18:00:20.400Z");
    expect(processedSeconds({ createdAt: "2026-09-12T18:00:00Z", finishedAt: "2026-09-12T18:00:19.6Z" }, now)).toBe(20);
    expect(processedSeconds({ createdAt: "2026-09-12T18:00:00Z" }, now)).toBe(20);
    expect(processedSeconds({ createdAt: "2026-09-12T18:00:30Z", finishedAt: "2026-09-12T18:00:00Z" }, now)).toBe(0);
    expect(processedSeconds({ createdAt: "not a date" }, now)).toBe(0);
  });
});

describe("formatDoneAt (STORY_023): the time under the agent's message", () => {
  it("reads like the reference's 'Sep 12, 15:41' in local time, and is empty for a bad date", () => {
    const local = new Date("2026-09-12T15:41:00");
    expect(formatDoneAt(local.toISOString())).toBe("Sep 12, 15:41");
    expect(formatDoneAt(new Date("2026-01-03T09:05:00").toISOString())).toBe("Jan 3, 09:05");
    expect(formatDoneAt("nope")).toBe("");
  });
});

describe("resultLine (STORY_023): the agent's one line for a finished job", () => {
  it("states the duration, the frame size and the file size; nothing before the job is done", () => {
    const done = reduceJob(initialJob("j1"), { type: "status", response: { id: "j1", status: "done", progress: 100, result: { url: "/r", posterUrl: "/p", mimeType: "video/mp4", durationSeconds: 5.04, width: 1344, height: 768, sizeBytes: 1_258_291 } } });
    expect(resultLine(done)).toBe("Done — 5.0 s · 1344×768 · 1.2 MB");
    const small = reduceJob(initialJob("j1"), { type: "status", response: { id: "j1", status: "done", progress: 100, result: { url: "/r", posterUrl: "/p", mimeType: "video/mp4", durationSeconds: 2, width: 320, height: 180, sizeBytes: 40_157 } } });
    expect(resultLine(small)).toBe("Done — 2.0 s · 320×180 · 39 KB");
    expect(resultLine(reduceJob(initialJob("j1"), { type: "status", response: { id: "j1", status: "running", progress: 40 } }))).toBe("");
  });
});
