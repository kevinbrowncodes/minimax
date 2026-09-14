import type { RecentEntry } from "./route-title";

/**
 * The Recents list's behaviour (STORY_021, from recents-show-more@1440 and page-search@1440): six rows then "Show more",
 * a live title search, and the Search dialog's grouping by age. Pure functions over the history entries the shell holds.
 */

export const RECENTS_VISIBLE = 6;

export function visibleRecents<T>(entries: readonly T[], showAll: boolean): readonly T[] {
  return showAll ? entries : entries.slice(0, RECENTS_VISIBLE);
}

export function hasMoreRecents(entries: readonly unknown[]): boolean {
  return entries.length > RECENTS_VISIBLE;
}

/** Case-insensitive, whitespace-trimmed match on the title; an empty query keeps everything. */
export function searchRecents<T extends { readonly title: string }>(entries: readonly T[], query: string): readonly T[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.title.toLocaleLowerCase().includes(q));
}

export type AgeGroup = "Previous 7 days" | "Older";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The Search dialog's group labels: "Previous 7 days" for a job finished within the last week (or not finished yet), else "Older". */
export function groupByAge<T extends { readonly finishedAt?: string }>(entries: readonly T[], now: Date): readonly { readonly label: AgeGroup; readonly entries: readonly T[] }[] {
  const recent: T[] = [];
  const older: T[] = [];
  for (const e of entries) {
    const finished = e.finishedAt === undefined ? Number.NaN : Date.parse(e.finishedAt);
    if (Number.isNaN(finished) || now.getTime() - finished <= WEEK_MS) recent.push(e);
    else older.push(e);
  }
  const groups: { label: AgeGroup; entries: T[] }[] = [];
  if (recent.length) groups.push({ label: "Previous 7 days", entries: recent });
  if (older.length) groups.push({ label: "Older", entries: older });
  return groups;
}

export type { RecentEntry };
