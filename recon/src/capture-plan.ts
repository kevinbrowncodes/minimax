/** Pure helpers for the capture run: names, dates, themes, passes, manifest entries. */

export const WIDE = 1440;
export const NARROW = 390;

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"];

const STATE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * `<state>@<width>.png`; a dark capture inserts `-dark` before the `@` (STORY_018), so the theme is never part of the
 * state name itself — a name ending in `-dark` is refused rather than doubled.
 */
export function screenshotFile(state: string, width: number, theme: Theme = "light"): string {
  if (!STATE_NAME.test(state)) throw new Error(`state name must be kebab-case [a-z0-9-]: "${state}"`);
  if (/-dark$/.test(state)) throw new Error(`the theme is a parameter, not part of the state name: "${state}"`);
  if (!Number.isInteger(width) || width <= 0) throw new Error(`width must be a positive integer: ${width}`);
  return `${state}${theme === "dark" ? "-dark" : ""}@${width}.png`;
}

/** Narrow states carry a `narrow-` prefix in their name (the 2026-09-12 convention); wide states are bare. */
export function stateName(base: string, width: number): string {
  return width === NARROW ? `narrow-${base}` : base;
}

export type Pass = { width: number; theme: Theme };

/** The four passes of a full capture, ordered to switch the theme as few times as possible. */
export const PASSES: readonly Pass[] = [
  { width: WIDE, theme: "light" },
  { width: WIDE, theme: "dark" },
  { width: NARROW, theme: "dark" },
  { width: NARROW, theme: "light" },
];

/** Every file the given states produce across the passes; throws when two would collide. */
export function passFiles(states: readonly string[], passes: readonly Pass[] = PASSES): string[] {
  const files: string[] = [];
  const seen = new Set<string>();
  for (const pass of passes) {
    for (const base of states) {
      const file = screenshotFile(stateName(base, pass.width), pass.width, pass.theme);
      if (seen.has(file)) throw new Error(`duplicate capture file: ${file}`);
      seen.add(file);
      files.push(file);
    }
  }
  return files;
}

export function parseThemeArg(args: string[]): readonly Theme[] {
  const i = args.indexOf("--theme");
  const value = i >= 0 ? (args[i + 1] ?? "") : "";
  if (value === "" || value === "both") return THEMES;
  if (value === "light" || value === "dark") return [value];
  throw new Error(`unknown --theme "${value}" (use light, dark or both)`);
}

export function parseWidthArg(args: string[]): readonly number[] {
  const i = args.indexOf("--width");
  const value = i >= 0 ? (args[i + 1] ?? "") : "";
  if (value === "" || value === "both") return [WIDE, NARROW];
  if (value === String(WIDE)) return [WIDE];
  if (value === String(NARROW)) return [NARROW];
  throw new Error(`unknown --width "${value}" (use ${WIDE}, ${NARROW} or both)`);
}

/** The passes a run performs, in PASSES order, restricted to the themes and widths asked for. */
export function selectPasses(themes: readonly Theme[], widths: readonly number[]): Pass[] {
  return PASSES.filter((p) => themes.includes(p.theme) && widths.includes(p.width));
}

/** The Recents row a run reopens (`--session <regex>`); defaults to the 2026-09-12 job that finished ("paper boat"). */
export function parseSessionArgFrom(args: string[]): RegExp {
  const i = args.indexOf("--session");
  const value = i >= 0 ? args[i + 1] : undefined;
  return new RegExp(value && value.trim() ? value : "paper boat", "i");
}

/** Local calendar date as YYYY-MM-DD (the capture directory name). */
export function dateStamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The path of a URL with no query string and no hash — the only part of a URL a manifest may carry. */
export function pathOnly(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

export type ReachedBy = "auto" | "owner";

export type ManifestEntry = {
  state: string;
  width: number;
  theme: Theme;
  file: string;
  path: string;
  capturedAt: string;
  reachedBy: ReachedBy;
  note?: string;
};

export function manifestEntry(input: {
  state: string;
  width: number;
  theme?: Theme;
  url: string;
  capturedAt: Date;
  reachedBy: ReachedBy;
  note?: string;
}): ManifestEntry {
  const theme = input.theme ?? "light";
  const entry: ManifestEntry = {
    state: input.state,
    width: input.width,
    theme,
    file: screenshotFile(input.state, input.width, theme),
    path: pathOnly(input.url),
    capturedAt: input.capturedAt.toISOString(),
    reachedBy: input.reachedBy,
  };
  if (input.note) entry.note = input.note;
  return entry;
}

/** A page's own outcome when a control is clicked (STORY_018's inventory line): where it went, what it opened, or nothing. */
export type ClickOutcome = "navigates" | "opens-dialog" | "opens-menu" | "opens-new-tab" | "nothing";

export function classifyClick(input: { pathBefore: string; pathAfter: string; dialogVisible: boolean; menuVisible: boolean; newTab: boolean }): ClickOutcome {
  if (input.newTab) return "opens-new-tab";
  if (input.pathAfter !== input.pathBefore) return "navigates";
  if (input.dialogVisible) return "opens-dialog";
  if (input.menuVisible) return "opens-menu";
  return "nothing";
}

/** Relative luminance of an `rgb(r, g, b)` / `rgba(...)` string (sRGB, 0 = black, 1 = white); null when unparsable. */
export function luminance(color: string): number | null {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (!m) return null;
  const channel = (v: string) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(m[1]!) + 0.7152 * channel(m[2]!) + 0.0722 * channel(m[3]!);
}

/** A page reads as dark when its body background is closer to black than to white. */
export function isDarkBackground(color: string): boolean | null {
  const l = luminance(color);
  return l === null ? null : l < 0.5;
}
