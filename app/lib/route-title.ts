import type { JobError, JobResult, JobStatus } from "./job-api";

/** What the top bar shows for a path (STORY_012): the reference shows nothing on Assets, a title on a task, icons on home. */
export interface RecentEntry {
  readonly id: string;
  readonly title: string;
  /** CHORE_008: when the task was created — Recents rows are named by this minute. Absent on an entry from an older store. */
  readonly createdAt?: string;
  readonly finishedAt?: string;
  readonly openedAt?: string;
  /** STORY_029: in the Pinned section. */
  readonly pinned?: boolean;
  readonly pinnedAt?: string;
  /** STORY_030: out of Recents, under Settings › Archived tasks. */
  readonly archived?: boolean;
  readonly archivedAt?: string;
  /** STORY_031: the project the task belongs to. */
  readonly projectId?: string;
  /** STORY_033: the job's outcome, from which the Inbox draws its events (the list is the history store's entries). */
  readonly status?: JobStatus;
  readonly progress?: number;
  readonly error?: JobError;
  readonly result?: JobResult;
}
export type TopBar = { readonly kind: "home" } | { readonly kind: "assets" } | { readonly kind: "task"; readonly title: string } | { readonly kind: "page"; readonly page: ReferencePage } | { readonly kind: "other" };

/** The pages behind the sidebar (STORY_025): each is a route of ours rendering the reference's page, inert. */
export const REFERENCE_PAGES = {
  "/skills": "skills", // STORY_059: the Management page (Plugins) became Skills
  "/scheduled": "scheduled", // STORY_041: back, with our meaning (the queue)
} as const;
export type ReferencePage = (typeof REFERENCE_PAGES)[keyof typeof REFERENCE_PAGES];

function referencePageFor(pathname: string): ReferencePage | undefined {
  return (REFERENCE_PAGES as Record<string, ReferencePage | undefined>)[pathname];
}

export function topBarFor(pathname: string, recents: readonly RecentEntry[]): TopBar {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/assets" || pathname.startsWith("/assets/")) return { kind: "assets" };
  const page = referencePageFor(pathname);
  if (page) return { kind: "page", page };
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

export type ActiveRow = "new-task" | "assets" | "skills" | "scheduled" | `task:${string}` | `project:${string}`;

export function activeRow(pathname: string): ActiveRow | undefined {
  if (pathname === "/") return "new-task";
  if (pathname === "/assets" || pathname.startsWith("/assets/")) return "assets";
  const page = referencePageFor(pathname);
  if (page) return page;
  const task = /^\/task\/([^/]+)/.exec(pathname);
  if (task) return `task:${decodeURIComponent(task[1] ?? "")}`;
  const project = /^\/project\/([^/]+)/.exec(pathname);
  if (project) return `project:${decodeURIComponent(project[1] ?? "")}`; // STORY_031
  return undefined;
}
