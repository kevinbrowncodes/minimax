import { describe, expect, it } from "vitest";
import { RECENTS_VISIBLE, groupByAge, hasMoreRecents, searchRecents, visibleRecents } from "./recents";

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
