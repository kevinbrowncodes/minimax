import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SHELL_PREFS, SHELL_PREFS_KEY } from "./shell-prefs";
import { dispatchShellPrefs, getServerShellPrefs, getShellPrefs, resetShellPrefsStore, subscribeShellPrefs } from "./shell-prefs-store";

afterEach(() => {
  localStorage.clear();
  resetShellPrefsStore();
});

describe("the shell preferences store (BUG_005)", () => {
  it("serves the defaults to the server, reads the storage once on the client, and keeps the same object until a dispatch", () => {
    localStorage.setItem(SHELL_PREFS_KEY, JSON.stringify({ ...DEFAULT_SHELL_PREFS, folded: { projects: false, recents: false } }));
    expect(getServerShellPrefs()).toBe(DEFAULT_SHELL_PREFS);
    const first = getShellPrefs();
    expect(first.folded.projects).toBe(false);
    localStorage.setItem(SHELL_PREFS_KEY, JSON.stringify(DEFAULT_SHELL_PREFS)); // a later external write is not re-read
    expect(getShellPrefs()).toBe(first);
  });

  it("dispatches through the reducer, writes the storage and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeShellPrefs(listener);
    dispatchShellPrefs({ type: "set-collapsed", collapsed: true });
    expect(getShellPrefs().collapsed).toBe(true);
    expect(JSON.parse(localStorage.getItem(SHELL_PREFS_KEY) ?? "{}")).toMatchObject({ collapsed: true });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    dispatchShellPrefs({ type: "set-collapsed", collapsed: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
