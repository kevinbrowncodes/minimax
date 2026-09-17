/**
 * The Inbox's events (STORY_033): the reference's Inbox is its product messages and was empty every time, so ours is the
 * job log — every terminal history entry yields one event, a finished job with a measured shot change a second. Pure.
 */
import { recentLabel } from "./recents";
import type { RecentEntry } from "./route-title";
import { shotChangeNotice } from "./shot-change";
import { formatDoneAt } from "./task-view";

export const INBOX_TABS = ["All", "Updates", "Messages"] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export type InboxKind = "ready" | "cut" | "failed" | "refused" | "cancelled" | "agent-refused" | "agent-failed";

/** STORY_050: a director run that ended without a prompt (`GET /api/agent/runs`) — the Messages tab's first content. */
export interface AgentRunEvent {
  readonly id: string;
  readonly at: string;
  readonly skill: string;
  readonly skillName?: string;
  readonly notes: string;
  readonly outcome: "refusal" | "error";
  readonly message: string;
  readonly openedAt?: string;
}

export interface InboxEvent {
  readonly id: string;
  /** The task the event belongs to; absent for an agent run, which has `runId` instead. */
  readonly taskId?: string;
  readonly runId?: string;
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

/** "26-09-17-0312" — the stamp a run is named by, the way recents are (CHORE_008's minute). */
function runStamp(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const two = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
}

/** Every terminal entry's events and every agent run's, newest first (a job's "ready" before its "shot changed" — they share a time). */
export function eventsFor(entries: readonly RecentEntry[], runs: readonly AgentRunEvent[] = []): readonly InboxEvent[] {
  const events: InboxEvent[] = [];
  for (const run of runs) {
    const notes = run.notes.trim().replace(/\s+/g, " ");
    const cut = notes.length > 48 ? `${notes.slice(0, 49).replace(/\s+\S*$/, "")}…` : notes; // at a word boundary, as titleFor cuts
    const title = `${run.skillName ?? run.skill} — ${notes === "" ? "(no notes)" : cut}`;
    events.push({ id: `run:${run.id}`, runId: run.id, kind: run.outcome === "refusal" ? "agent-refused" : "agent-failed", text: run.outcome === "refusal" ? "The director declined" : "The agent run failed", stamp: runStamp(run.at), title, at: run.at, tab: "Messages", ...(run.openedAt === undefined ? {} : { openedAt: run.openedAt }) });
  }
  for (const entry of entries) {
    const at = entry.finishedAt ?? entry.createdAt;
    if (at === undefined) continue;
    const base = { taskId: entry.id, stamp: recentLabel(entry), title: entry.title, at, tab: "Updates" as const, ...(entry.openedAt === undefined ? {} : { openedAt: entry.openedAt }) };
    if (entry.status === "done") {
      events.push({ ...base, id: `${entry.id}:ready`, kind: "ready", text: "Your video is ready" });
      // STORY_046: only a warning is news — a framing move the prompt asked for makes no event
      const notice = shotChangeNotice(entry.result?.cuts, entry.result?.camera);
      const first = notice?.tone === "warning" ? notice.seconds[0] : undefined;
      if (first !== undefined) events.push({ ...base, id: `${entry.id}:cut`, kind: "cut", text: `The shot changed at ${clock(first)}` });
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
