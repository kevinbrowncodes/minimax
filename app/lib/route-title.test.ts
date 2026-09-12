import { describe, expect, it } from "vitest";
import { activeRow, isUnread, topBarFor } from "./route-title";

const recents = [{ id: "j1", title: "Paper boat on rain puddle", finishedAt: "2026-09-12T18:00:00Z" }];

describe("topBarFor", () => {
  it("maps the three routes and falls back for a task not in history", () => {
    expect(topBarFor("/", recents)).toEqual({ kind: "home" });
    expect(topBarFor("/assets", recents)).toEqual({ kind: "assets" });
    expect(topBarFor("/task/j1", recents)).toEqual({ kind: "task", title: "Paper boat on rain puddle" });
    expect(topBarFor("/task/unknown", recents)).toEqual({ kind: "task", title: "Unnamed Session" });
    expect(topBarFor("/elsewhere", recents)).toEqual({ kind: "other" });
  });
});

describe("activeRow and isUnread", () => {
  it("names the active sidebar row", () => {
    expect(activeRow("/")).toBe("new-task");
    expect(activeRow("/assets")).toBe("assets");
    expect(activeRow("/task/j%201")).toBe("task:j 1");
    expect(activeRow("/nope")).toBeUndefined();
  });
  it("shows the dot only for a finished job not opened since", () => {
    expect(isUnread({ id: "a", title: "a" })).toBe(false);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z" })).toBe(true);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T17:00:00Z" })).toBe(true);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T18:30:00Z" })).toBe(false);
  });
});
