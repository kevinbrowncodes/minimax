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

/**
 * CHORE_008: a Recents row is named by the minute the task was created, in the browser's local time — `26-09-14-1200`
 * for 14 September 2026 at 12:00 — because scripts start alike and first words cannot tell chain segments apart.
 * Undefined when the entry has no usable createdAt (an older store), and the row falls back to the title.
 */
export function stampFor(createdAt: string | undefined): string | undefined {
  if (createdAt === undefined) return undefined;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return undefined;
  const two = (n: number): string => String(n).padStart(2, "0");
  return `${two(d.getFullYear() % 100)}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
}

/** The visible label of a Recents row: the creation stamp, else the title. */
export function recentLabel(entry: { readonly title: string; readonly createdAt?: string }): string {
  return stampFor(entry.createdAt) ?? entry.title;
}

/** The accessible name of a Recents row: "<stamp>, <title>" so a reader gets both and search-by-title still lands. */
export function recentName(entry: { readonly title: string; readonly createdAt?: string }): string {
  const stamp = stampFor(entry.createdAt);
  return stamp === undefined ? entry.title : `${stamp}, ${entry.title}`;
}

/** STORY_029: the rows of the Pinned section — the pinned entries, newest pin first (the reference's `pinned-items-order`). */
export function pinnedRecents<T extends { readonly id: string; readonly pinned?: boolean; readonly pinnedAt?: string }>(entries: readonly T[]): readonly T[] {
  return entries.filter((e) => e.pinned === true).sort((a, b) => Date.parse(b.pinnedAt ?? "") - Date.parse(a.pinnedAt ?? ""));
}

/** STORY_030: what Recents, the Pinned section and Search list — every entry that is not archived. */
export function activeRecents<T extends { readonly id: string; readonly archived?: boolean }>(entries: readonly T[]): readonly T[] {
  return entries.filter((e) => e.archived !== true);
}

/** STORY_030: Settings › Archived tasks — the archived entries, newest archive first (the reference's `archived-items`). */
export function archivedRecents<T extends { readonly id: string; readonly archived?: boolean; readonly archivedAt?: string }>(entries: readonly T[]): readonly T[] {
  return entries.filter((e) => e.archived === true).sort((a, b) => Date.parse(b.archivedAt ?? "") - Date.parse(a.archivedAt ?? ""));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Sep 15, 2026, 12:11 PM" — the archive time as the reference writes it (behaviour-recents-archive-03-archived-tasks), local time. */
export function formatArchivedAt(iso: string | undefined): string {
  if (iso === undefined) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${MONTHS[date.getMonth()] ?? ""} ${String(date.getDate())}, ${String(date.getFullYear())}, ${String(twelve)}:${String(date.getMinutes()).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}
