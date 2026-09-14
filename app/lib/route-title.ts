/** What the top bar shows for a path (STORY_012): the reference shows nothing on Assets, a title on a task, icons on home. */
export interface RecentEntry {
  readonly id: string;
  readonly title: string;
  /** CHORE_008: when the task was created — Recents rows are named by this minute. Absent on an entry from an older store. */
  readonly createdAt?: string;
  readonly finishedAt?: string;
  readonly openedAt?: string;
}
export type TopBar = { readonly kind: "home" } | { readonly kind: "assets" } | { readonly kind: "task"; readonly title: string } | { readonly kind: "other" };

export function topBarFor(pathname: string, recents: readonly RecentEntry[]): TopBar {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/assets" || pathname.startsWith("/assets/")) return { kind: "assets" };
  const task = /^\/task\/([^/]+)/.exec(pathname);
  if (task) {
    const id = decodeURIComponent(task[1] ?? "");
    return { kind: "task", title: recents.find((r) => r.id === id)?.title ?? "Unnamed Session" };
  }
  return { kind: "other" };
}

/** The unread dot: the job finished and the page has not been opened since. */
export function isUnread(entry: RecentEntry): boolean {
  if (entry.finishedAt === undefined) return false;
  if (entry.openedAt === undefined) return true;
  return Date.parse(entry.openedAt) < Date.parse(entry.finishedAt);
}

export function activeRow(pathname: string): "new-task" | "assets" | `task:${string}` | undefined {
  if (pathname === "/") return "new-task";
  if (pathname === "/assets" || pathname.startsWith("/assets/")) return "assets";
  const task = /^\/task\/([^/]+)/.exec(pathname);
  if (task) return `task:${decodeURIComponent(task[1] ?? "")}`;
  return undefined;
}
