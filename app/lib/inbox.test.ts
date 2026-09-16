import { describe, expect, it } from "vitest";
import { eventsFor, formatEventTime, isEventRead, tabFilter, unreadCount } from "./inbox";
import type { RecentEntry } from "./route-title";

const at = (h: number, m: number) => new Date(2026, 8, 15, h, m).toISOString();
const entries: RecentEntry[] = [
  { id: "d", title: "Paper boat on rain puddle", createdAt: at(12, 24), finishedAt: at(12, 41), status: "done", progress: 100, result: { url: "/jobs/d/result", posterUrl: "/jobs/d/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1344, height: 768, sizeBytes: 1, cuts: [{ frame: 270, seconds: 11.25 }] } },
  { id: "f", title: "Failed one", createdAt: at(22, 50), finishedAt: at(22, 58), status: "failed", progress: 40, error: { code: "generation_failed", message: "boom" } },
  { id: "m", title: "Refused one", createdAt: at(9, 0), finishedAt: at(9, 1), status: "failed", progress: 0, error: { code: "moderated", message: "no" } },
  { id: "c", title: "Cancelled one", createdAt: at(10, 0), finishedAt: at(10, 5), status: "cancelled", progress: 41 },
  { id: "r", title: "Still running", createdAt: at(13, 0), status: "running", progress: 33 },
  { id: "q", title: "Queued", createdAt: at(13, 5), status: "queued", progress: 0 },
  { id: "o", title: "Opened after", createdAt: at(8, 0), finishedAt: at(8, 10), openedAt: at(8, 30), status: "done", progress: 100, result: { url: "/jobs/o/result", posterUrl: "/jobs/o/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1, height: 1, sizeBytes: 1 } },
];

describe("the Inbox's events (STORY_033)", () => {
  it("yields one event per terminal entry, a second for a shot change, with the reference-like wording, newest first, ready before its cut", () => {
    const events = eventsFor(entries);
    expect(events.map((e) => `${e.id} ${e.text}`)).toEqual([
      "f:failed Generation failed",
      "d:ready Your video is ready",
      "d:cut The shot changed at 00:11",
      "c:cancelled Cancelled at 41 %",
      "m:refused The prompt was refused",
      "o:ready Your video is ready",
    ]);
    const ready = events[1];
    expect(ready).toMatchObject({ taskId: "d", stamp: "26-09-15-1224", title: "Paper boat on rain puddle", at: at(12, 41), tab: "Updates", kind: "ready" });
    expect(events.every((e) => e.tab === "Updates")).toBe(true);
    expect(eventsFor([])).toEqual([]);
  });

  it("an event is read after Read all or after its task was opened; the count and the tabs follow", () => {
    const events = eventsFor(entries);
    expect(unreadCount(events, undefined)).toBe(5); // "Opened after" was opened past its finish
    expect(unreadCount(events, at(12, 41))).toBe(1); // only the 22:58 failure is newer
    expect(unreadCount(events, at(23, 0))).toBe(0);
    const opened = events.find((e) => e.taskId === "o");
    expect(opened && isEventRead(opened, undefined)).toBe(true);
    expect(tabFilter(events, "All")).toHaveLength(6);
    expect(tabFilter(events, "Updates")).toHaveLength(6);
    expect(tabFilter(events, "Messages")).toEqual([]);
  });

  it("formatEventTime is the clock today and the dated stamp otherwise", () => {
    const now = new Date(2026, 8, 15, 18, 0);
    expect(formatEventTime(at(12, 41), now)).toBe("12:41");
    expect(formatEventTime(at(9, 5), now)).toBe("09:05");
    expect(formatEventTime(new Date(2026, 8, 14, 22, 58).toISOString(), now)).toBe("Sep 14, 22:58");
    expect(formatEventTime("nope", now)).toBe("");
  });
});

describe("the Inbox's events (STORY_046): a framing move the prompt asked for is not news", () => {
  const result = { url: "/jobs/x/result", posterUrl: "/jobs/x/poster", mimeType: "video/mp4", durationSeconds: 10, width: 1344, height: 768, sizeBytes: 1 };
  const framing = [{ frame: 24, seconds: 1, kind: "framing" as const }, { frame: 100, seconds: 4.17, kind: "framing" as const }];
  it("a moving camera with framing events only makes the ready event alone; a cut inside the move, or framing on a static camera, makes the cut event too", () => {
    const moved: RecentEntry = { id: "h", title: "Handheld", createdAt: at(14, 0), finishedAt: at(14, 50), status: "done", progress: 100, result: { ...result, cuts: framing, camera: "moving" } };
    expect(eventsFor([moved]).map((e) => e.id)).toEqual(["h:ready"]);
    const cutIn: RecentEntry = { ...moved, id: "k", result: { ...result, cuts: [...framing, { frame: 142, seconds: 5.92, kind: "cut" }], camera: "moving" } };
    expect(eventsFor([cutIn]).map((e) => `${e.id} ${e.text}`)).toEqual(["k:ready Your video is ready", "k:cut The shot changed at 00:05"]);
    const wandered: RecentEntry = { ...moved, id: "s", result: { ...result, cuts: framing, camera: "static" } };
    expect(eventsFor([wandered]).map((e) => `${e.id} ${e.text}`)).toEqual(["s:ready Your video is ready", "s:cut The shot changed at 00:01"]);
  });
});
