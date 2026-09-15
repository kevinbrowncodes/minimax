/**
 * The Inbox's events (STORY_033): the reference's Inbox is its product messages and was empty every time, so ours is the
 * job log — every terminal history entry yields one event, a finished job with a measured shot change a second. Pure.
 */
import { recentLabel } from "./recents";
import type { RecentEntry } from "./route-title";
import { formatDoneAt } from "./task-view";

export const INBOX_TABS = ["All", "Updates", "Messages"] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export type InboxKind = "ready" | "cut" | "failed" | "refused" | "cancelled";

export interface InboxEvent {
  readonly id: string;
  readonly taskId: string;
  readonly kind: InboxKind;
  /** "Your video is ready", "The shot changed at 00:11", … */
  readonly text: string;
  /** The task, named as the sidebar names it (CHORE_008): the creation stamp and the title. */
  readonly stamp: string;
  readonly title: string;
  /** When it happened (the job's finish), ISO. */
  readonly at: string;
  /** When the task was last opened: opening a task reads its events (the sidebar dot's rule). */
  readonly openedAt?: string;
  /** Updates = the job events; Messages = chats (STORY_037), none yet. */
  readonly tab: Exclude<InboxTab, "All">;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** Every terminal entry's events, newest first (a job's "ready" before its "shot changed" — they share a time). */
export function eventsFor(entries: readonly RecentEntry[]): readonly InboxEvent[] {
  const events: InboxEvent[] = [];
  for (const entry of entries) {
    const at = entry.finishedAt ?? entry.createdAt;
    if (at === undefined) continue;
    const base = { taskId: entry.id, stamp: recentLabel(entry), title: entry.title, at, tab: "Updates" as const, ...(entry.openedAt === undefined ? {} : { openedAt: entry.openedAt }) };
    if (entry.status === "done") {
      events.push({ ...base, id: `${entry.id}:ready`, kind: "ready", text: "Your video is ready" });
      const cut = entry.result?.cuts?.[0];
      if (cut) events.push({ ...base, id: `${entry.id}:cut`, kind: "cut", text: `The shot changed at ${clock(cut.seconds)}` });
    } else if (entry.status === "failed") {
      const refused = entry.error?.code === "moderated";
      events.push({ ...base, id: `${entry.id}:${refused ? "refused" : "failed"}`, kind: refused ? "refused" : "failed", text: refused ? "The prompt was refused" : "Generation failed" });
    } else if (entry.status === "cancelled") {
      events.push({ ...base, id: `${entry.id}:cancelled`, kind: "cancelled", text: `Cancelled at ${String(Math.round(entry.progress ?? 0))} %` });
    }
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Read when Read all was pressed after it, or the task was opened after it. */
export function isEventRead(event: InboxEvent, readAt: string | undefined): boolean {
  const at = Date.parse(event.at);
  if (readAt !== undefined && Date.parse(readAt) >= at) return true;
  return event.openedAt !== undefined && Date.parse(event.openedAt) >= at;
}

export function unreadCount(events: readonly InboxEvent[], readAt: string | undefined): number {
  return events.filter((e) => !isEventRead(e, readAt)).length;
}

export function tabFilter(events: readonly InboxEvent[], tab: InboxTab): readonly InboxEvent[] {
  return tab === "All" ? events : events.filter((e) => e.tab === tab);
}

/** "12:41" today, "Sep 14, 22:58" otherwise (the task page's own stamp), local time. */
export function formatEventTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : formatDoneAt(iso);
}
