import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_PREFS, SHELL_PREFS_KEY, parseShellPrefs, readShellPrefs, reduceShellPrefs, writeShellPrefs } from "./shell-prefs";

describe("shell preferences (STORY_021)", () => {
  it("defaults to the reference's 2026-09-14 state: Projects folded, Recents open, Pinned open (STORY_029), expanded, cards shown (no More since STORY_028)", () => {
    expect(DEFAULT_SHELL_PREFS).toEqual({ folded: { pinned: false, projects: true, recents: false }, collapsed: false, guideDismissed: false });
  });

  it("toggles a section, sets the rail, and dismisses each card once", () => {
    let p = reduceShellPrefs(DEFAULT_SHELL_PREFS, { type: "toggle-section", section: "projects" });
    expect(p.folded.projects).toBe(false);
    p = reduceShellPrefs(p, { type: "toggle-section", section: "projects" });
    expect(p.folded.projects).toBe(true);
    p = reduceShellPrefs(p, { type: "set-collapsed", collapsed: true });
    expect(p.collapsed).toBe(true);
    p = reduceShellPrefs(p, { type: "dismiss-guide" });
    expect(p.guideDismissed).toBe(true);
    expect(p).not.toHaveProperty("promoDismissed"); // STORY_058: the promo card is gone, its preference with it
    expect(DEFAULT_SHELL_PREFS.collapsed).toBe(false); // the reducer never mutates
  });

  it("remembers the Inbox's Read all stamp (STORY_033) and drops one that is not a date", () => {
    const read = reduceShellPrefs(DEFAULT_SHELL_PREFS, { type: "inbox-read", at: "2026-09-15T12:41:00.000Z" });
    expect(read.inboxReadAt).toBe("2026-09-15T12:41:00.000Z");
    expect(parseShellPrefs(JSON.stringify(read)).inboxReadAt).toBe("2026-09-15T12:41:00.000Z");
    expect(parseShellPrefs('{"inboxReadAt":"not a date"}').inboxReadAt).toBeUndefined();
    expect(parseShellPrefs('{"inboxReadAt":42}').inboxReadAt).toBeUndefined();
  });

  it("merges a stored value over the defaults field by field and ignores garbage", () => {
    expect(parseShellPrefs(null)).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs("not json")).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs('"a string"')).toEqual(DEFAULT_SHELL_PREFS);
    expect(parseShellPrefs('{"collapsed":true,"folded":{"projects":false}}')).toEqual({ ...DEFAULT_SHELL_PREFS, collapsed: true, folded: { pinned: false, projects: false, recents: false } });
    expect(parseShellPrefs('{"folded":{"pinned":true}}').folded.pinned).toBe(true); // STORY_029
    expect(parseShellPrefs('{"folded":{"more":false}}')).toEqual(DEFAULT_SHELL_PREFS); // STORY_028: an old stored More fold is ignored
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
