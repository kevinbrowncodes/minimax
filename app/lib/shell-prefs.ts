/**
 * What the shell remembers per browser (STORY_021): which sidebar sections are folded, whether the sidebar is collapsed
 * to its rail, and which one-off cards were dismissed. Pure reducer + a storage adapter, like lib/theme.ts. The
 * defaults are the reference's on 2026-09-14: Projects folded, Recents open, the sidebar expanded, the cards shown.
 */

/** STORY_028 removed the More section; a stored `folded.more` is ignored. STORY_029 added the Pinned section (open by default). */
export type Section = "pinned" | "projects" | "recents";

export interface ShellPrefs {
  readonly folded: Readonly<Record<Section, boolean>>;
  readonly collapsed: boolean;
  readonly guideDismissed: boolean;
  readonly promoDismissed: boolean;
}

export const SHELL_PREFS_KEY = "minimax-local.shell";

export const DEFAULT_SHELL_PREFS: ShellPrefs = {
  folded: { pinned: false, projects: true, recents: false },
  collapsed: false,
  guideDismissed: false,
  promoDismissed: false,
};

export type ShellPrefsAction =
  | { readonly type: "toggle-section"; readonly section: Section }
  | { readonly type: "set-collapsed"; readonly collapsed: boolean }
  | { readonly type: "dismiss-guide" }
  | { readonly type: "dismiss-promo" };

export function reduceShellPrefs(prefs: ShellPrefs, action: ShellPrefsAction): ShellPrefs {
  switch (action.type) {
    case "toggle-section":
      return { ...prefs, folded: { ...prefs.folded, [action.section]: !prefs.folded[action.section] } };
    case "set-collapsed":
      return { ...prefs, collapsed: action.collapsed };
    case "dismiss-guide":
      return { ...prefs, guideDismissed: true };
    case "dismiss-promo":
      return { ...prefs, promoDismissed: true };
  }
}

/** A stored value is merged over the defaults field by field, so a partial or foreign value can never break the shell. */
export function parseShellPrefs(raw: string | null | undefined): ShellPrefs {
  if (!raw) return DEFAULT_SHELL_PREFS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SHELL_PREFS;
    const v = value as Record<string, unknown>;
    const folded = typeof v["folded"] === "object" && v["folded"] !== null ? (v["folded"] as Record<string, unknown>) : {};
    const bool = (x: unknown, fallback: boolean) => (typeof x === "boolean" ? x : fallback);
    return {
      folded: {
        pinned: bool(folded["pinned"], DEFAULT_SHELL_PREFS.folded.pinned),
        projects: bool(folded["projects"], DEFAULT_SHELL_PREFS.folded.projects),
        recents: bool(folded["recents"], DEFAULT_SHELL_PREFS.folded.recents),
      },
      collapsed: bool(v["collapsed"], false),
      guideDismissed: bool(v["guideDismissed"], false),
      promoDismissed: bool(v["promoDismissed"], false),
    };
  } catch {
    return DEFAULT_SHELL_PREFS;
  }
}

export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readShellPrefs(storage: PrefsStorage | null | undefined): ShellPrefs {
  try {
    return parseShellPrefs(storage?.getItem(SHELL_PREFS_KEY));
  } catch {
    return DEFAULT_SHELL_PREFS;
  }
}

export function writeShellPrefs(storage: PrefsStorage | null | undefined, prefs: ShellPrefs): void {
  try {
    storage?.setItem(SHELL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // no storage: the preference still holds for this page
  }
}
