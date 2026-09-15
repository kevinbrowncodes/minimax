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
  it("names the pages behind the sidebar (STORY_025; Plugins is the Management page since STORY_026)", () => {
    expect(topBarFor("/plugins", recents)).toEqual({ kind: "page", page: "plugins" });
    expect(topBarFor("/scheduled", recents)).toEqual({ kind: "other" }); // STORY_026 removed Scheduled
    expect(topBarFor("/connect-mobile", recents)).toEqual({ kind: "other" }); // CHORE_010 removed Connect mobile
    for (const path of ["/max-hermes", "/max-claw"]) expect(topBarFor(path, recents)).toEqual({ kind: "other" }); // STORY_028
  });
});

describe("activeRow and isUnread", () => {
  it("names the active sidebar row", () => {
    expect(activeRow("/")).toBe("new-task");
    expect(activeRow("/assets")).toBe("assets");
    expect(activeRow("/task/j%201")).toBe("task:j 1");
    expect(activeRow("/nope")).toBeUndefined();
    // STORY_025: the pages behind the sidebar light their row; Manage lights Plugins
    expect(activeRow("/plugins")).toBe("plugins");
    expect(activeRow("/scheduled")).toBeUndefined();
    expect(activeRow("/connect-mobile")).toBeUndefined(); // CHORE_010
    for (const path of ["/max-hermes", "/max-claw"]) expect(activeRow(path)).toBeUndefined(); // STORY_028
  });
  it("shows the dot only for a finished job not opened since", () => {
    expect(isUnread({ id: "a", title: "a" })).toBe(false);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z" })).toBe(true);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T17:00:00Z" })).toBe(true);
    expect(isUnread({ id: "a", title: "a", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T18:30:00Z" })).toBe(false);
  });
});

describe("the project page (STORY_031)", () => {
  it("is the active row of its project and has no top bar title of its own", () => {
    expect(activeRow("/project/p%201")).toBe("project:p 1");
    expect(topBarFor("/project/p1", [])).toEqual({ kind: "other" });
  });
});
