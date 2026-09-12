/** Pure helpers for the capture run: names, dates, manifest entries. */

export const WIDE = 1440;
export const NARROW = 390;

const STATE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function screenshotFile(state: string, width: number): string {
  if (!STATE_NAME.test(state)) throw new Error(`state name must be kebab-case [a-z0-9-]: "${state}"`);
  if (!Number.isInteger(width) || width <= 0) throw new Error(`width must be a positive integer: ${width}`);
  return `${state}@${width}.png`;
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
  file: string;
  path: string;
  capturedAt: string;
  reachedBy: ReachedBy;
  note?: string;
};

export function manifestEntry(input: {
  state: string;
  width: number;
  url: string;
  capturedAt: Date;
  reachedBy: ReachedBy;
  note?: string;
}): ManifestEntry {
  const entry: ManifestEntry = {
    state: input.state,
    width: input.width,
    file: screenshotFile(input.state, input.width),
    path: pathOnly(input.url),
    capturedAt: input.capturedAt.toISOString(),
    reachedBy: input.reachedBy,
  };
  if (input.note) entry.note = input.note;
  return entry;
}
