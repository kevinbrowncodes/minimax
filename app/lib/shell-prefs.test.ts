import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_PREFS, SHELL_PREFS_KEY, parseShellPrefs, readShellPrefs, reduceShellPrefs, writeShellPrefs } from "./shell-prefs";

describe("shell preferences (STORY_021)", () => {
  it("defaults to the reference's 2026-09-14 state: More and Projects folded, Recents open, expanded, cards shown", () => {
    expect(DEFAULT_SHELL_PREFS).toEqual({ folded: { more: true, projects: true, recents: false }, collapsed: false, guideDismissed: false, promoDismissed: false });
  });

  it("toggles a section, sets the rail, and dismisses each card once", () => {
    let p = reduceShellPrefs(DEFAULT_SHELL_PREFS, { type: "toggle-section", section: "more" });
    expect(p.folded.more).toBe(false);
    p = reduceShellPrefs(p, { type: "toggle-section", section: "more" });
    expect(p.folded.more).toBe(true);
    p = reduceShellPrefs(p, { type: "set-collapsed", collapsed: true });
    expect(p.collapsed).toBe(true);
    p = reduceShellPrefs(p, { type: "dismiss-guide" });
    p = reduceShellPrefs(p, { type: "dismiss-promo" });
    expect(p.guideDismissed).toBe(true);
    expect(p.promoDismissed).toBe(true);
    expect(DEFAULT_SHELL_PREFS.collapsed).toBe(false); // the reducer never mutates
  });

  it("merges a stored value over the defaults field by field and ignores garbage", () => {
    expect(parseShellPrefs(null)).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs("not json")).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs('"a string"')).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs('{"collapsed":true,"folded":{"more":false}}')).toEqual({ ...DEFAULT_SHELL_PREFS, collapsed: true, folded: { more: false, projects: true, recents: false } });
    expect(parseShellPrefs('{"collapsed":"yes","folded":{"recents":1}}')).toEqual(DEFAULT_SHELL_PREFS);
  });

  it("round-trips through storage and survives a throwing one", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    writeShellPrefs(storage, { ...DEFAULT_SHELL_PREFS, collapsed: true });
    expect(store.has(SHELL_PREFS_KEY)).toBe(true);
    expect(readShellPrefs(storage).collapsed).toBe(true);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readShellPrefs(broken)).toEqual(DEFAULT_SHELL_PREFS);
    expect(() => { writeShellPrefs(broken, DEFAULT_SHELL_PREFS); }).not.toThrow();
    expect(readShellPrefs(null)).toEqual(DEFAULT_SHELL_PREFS);
  });
});
