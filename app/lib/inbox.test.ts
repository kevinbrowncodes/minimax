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
