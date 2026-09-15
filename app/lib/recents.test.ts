import { describe, expect, it } from "vitest";
import { RECENTS_VISIBLE, activeRecents, archivedRecents, formatArchivedAt, groupByAge, groupByProject, hasMoreRecents, pinnedRecents, searchRecents, tasksOf, visibleRecents, recentLabel, recentName, stampFor } from "./recents";

const entry = (id: string, title: string, finishedAt?: string) => ({ id, title, finishedAt });

describe("recents (STORY_021)", () => {
  it("shows six rows, then all after Show more", () => {
    const entries = Array.from({ length: 9 }, (_, i) => entry(`j${String(i)}`, `Title ${String(i)}`));
    expect(visibleRecents(entries, false)).toHaveLength(RECENTS_VISIBLE);
    expect(visibleRecents(entries, true)).toHaveLength(9);
    expect(hasMoreRecents(entries)).toBe(true);
    expect(hasMoreRecents(entries.slice(0, 6))).toBe(false);
  });

  it("searches titles case-insensitively and keeps everything for an empty query", () => {
    const entries = [entry("a", "Paper boat on rain puddle"), entry("b", "Single candle on wooden table")];
    expect(searchRecents(entries, "").map((e) => e.id)).toEqual(["a", "b"]);
    expect(searchRecents(entries, "  PAPER ").map((e) => e.id)).toEqual(["a"]);
    expect(searchRecents(entries, "table").map((e) => e.id)).toEqual(["b"]);
    expect(searchRecents(entries, "nothing")).toEqual([]);
  });

  it("groups by age around the clock: within seven days (or unfinished) first, older second, empty groups omitted", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    const entries = [
      entry("new", "New", "2026-09-13T12:00:00Z"),
      entry("edge", "Edge", "2026-09-07T12:00:00Z"),
      entry("old", "Old", "2026-09-07T11:59:59Z"),
      entry("running", "Running"),
    ];
    const groups = groupByAge(entries, now);
    expect(groups.map((g) => `${g.label}: ${g.entries.map((e) => e.id).join(",")}`)).toEqual(["Previous 7 days: new,edge,running", "Older: old"]);
    expect(groupByAge([entry("x", "X", "2026-01-01T00:00:00Z")], now).map((g) => g.label)).toEqual(["Older"]);
    expect(groupByAge([], now)).toEqual([]);
  });
});

describe("pinnedRecents (STORY_029)", () => {
  it("keeps the pinned rows only, newest pin first, and leaves the input alone", () => {
    const entries = [
      { ...entry("a", "A"), pinned: true, pinnedAt: "2026-09-15T10:00:00Z" },
      { ...entry("b", "B"), pinned: false, pinnedAt: "2026-09-15T12:00:00Z" },
      { ...entry("c", "C"), pinned: true, pinnedAt: "2026-09-15T11:00:00Z" },
      entry("d", "D"),
    ];
    expect(pinnedRecents(entries).map((e) => e.id)).toEqual(["c", "a"]);
    expect(entries.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    expect(pinnedRecents([])).toEqual([]);
  });
});

describe("archived entries (STORY_030)", () => {
  it("activeRecents drops the archived rows; archivedRecents keeps them newest archive first; neither touches the input", () => {
    const entries = [
      { ...entry("a", "A"), archived: true, archivedAt: "2026-09-15T10:00:00Z" },
      { ...entry("b", "B"), archived: false },
      { ...entry("c", "C"), archived: true, archivedAt: "2026-09-15T11:00:00Z" },
      entry("d", "D"),
    ];
    expect(activeRecents(entries).map((e) => e.id)).toEqual(["b", "d"]);
    expect(archivedRecents(entries).map((e) => e.id)).toEqual(["c", "a"]);
    expect(entries.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    expect(activeRecents([])).toEqual([]);
    expect(archivedRecents([])).toEqual([]);
  });

  it("formatArchivedAt writes the reference's 'Sep 15, 2026, 12:11 PM' in local time, twelve-hour, and nothing for a missing or broken stamp", () => {
    expect(formatArchivedAt(new Date(2026, 8, 15, 12, 11).toISOString())).toBe("Sep 15, 2026, 12:11 PM");
    expect(formatArchivedAt(new Date(2026, 0, 3, 0, 5).toISOString())).toBe("Jan 3, 2026, 12:05 AM");
    expect(formatArchivedAt(new Date(2027, 11, 31, 13, 7).toISOString())).toBe("Dec 31, 2027, 1:07 PM");
    expect(formatArchivedAt(undefined)).toBe("");
    expect(formatArchivedAt("not a date")).toBe("");
  });
});

describe("projects (STORY_031)", () => {
  const entries = [
    { ...entry("a", "A"), projectId: "p1" },
    { ...entry("b", "B"), projectId: "p1", archived: true },
    { ...entry("c", "C") },
    { ...entry("d", "D"), projectId: "gone" },
    { ...entry("e", "E"), projectId: "p2" },
  ];
  const projects = [{ id: "p1", name: "My film" }, { id: "p2", name: "Second" }, { id: "p3", name: "Empty" }];

  it("tasksOf lists a project's active tasks in order", () => {
    expect(tasksOf(entries, "p1").map((e) => e.id)).toEqual(["a"]);
    expect(tasksOf(entries, "p3")).toEqual([]);
  });

  it("groupByProject puts No project first (including a project that no longer exists), then the projects in order, omitting empty ones", () => {
    const groups = groupByProject(entries, projects);
    expect(groups.map((g) => `${g.name}: ${g.entries.map((e) => e.id).join(",")}`)).toEqual(["No project: c,d", "My film: a,b", "Second: e"]);
    expect(groups[0]?.id).toBeUndefined();
    expect(groupByProject(entries.slice(0, 1), projects).map((g) => g.name)).toEqual(["My film"]);
    expect(groupByProject([], projects)).toEqual([]);
  });
});

describe("Recents rows named by creation minute (CHORE_008)", () => {
  it("stampFor is YY-MM-DD-HHMM in local time, zero-padded, across midnight and the year roll-over", () => {
    expect(stampFor(new Date(2026, 8, 14, 12, 0).toISOString())).toBe("26-09-14-1200");
    expect(stampFor(new Date(2026, 0, 1, 0, 5).toISOString())).toBe("26-01-01-0005");
    expect(stampFor(new Date(2029, 11, 31, 23, 59).toISOString())).toBe("29-12-31-2359");
  });
  it("falls back to the title when createdAt is missing or unreadable, and names the row with both", () => {
    expect(stampFor(undefined)).toBeUndefined();
    expect(stampFor("not a date")).toBeUndefined();
    const created = new Date(2026, 8, 14, 18, 30).toISOString();
    expect(recentLabel({ title: "[0:00-0:03] From his standing stance", createdAt: created })).toBe("26-09-14-1830");
    expect(recentLabel({ title: "A boat" })).toBe("A boat");
    expect(recentName({ title: "A boat", createdAt: created })).toBe("26-09-14-1830, A boat");
    expect(recentName({ title: "A boat" })).toBe("A boat");
  });
});
