/**
 * What the Scheduled page shows (STORY_041): the queue's waiting rows, the jobs running on the model server, and the
 * last day's finished ones, drawn from the queue list and the history list. Pure.
 */
import type { RecentEntry } from "./route-title";
import { formatDoneAt } from "./task-view";

export interface QueueRow {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly createdAt: string;
  readonly notBefore?: string;
  readonly referenceImages: number;
  readonly projectId?: string;
}

export const SCHEDULE_FILTERS = ["All", "Waiting", "Running", "Done", "Failed"] as const;
export type ScheduleFilter = (typeof SCHEDULE_FILTERS)[number];

export interface ScheduleSections {
  /** The model server's open jobs: submitted from the queue or sent directly. */
  readonly running: readonly RecentEntry[];
  readonly waiting: readonly QueueRow[];
  /** Finished in the last 24 h. */
  readonly done: readonly RecentEntry[];
  readonly failed: readonly RecentEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function scheduleSections(queue: readonly QueueRow[], history: readonly RecentEntry[], now: Date = new Date()): ScheduleSections {
  const waitingIds = new Set(queue.map((q) => q.id));
  const recent = (e: RecentEntry): boolean => e.finishedAt !== undefined && now.getTime() - Date.parse(e.finishedAt) <= DAY_MS;
  return {
    running: history.filter((e) => (e.status === "queued" || e.status === "running") && !waitingIds.has(e.id)),
    waiting: queue,
    done: history.filter((e) => e.status === "done" && recent(e)),
    failed: history.filter((e) => (e.status === "failed" || e.status === "cancelled") && recent(e)),
  };
}

/** The search narrows every section by title; the filter keeps one section (All keeps them all). */
export function filterSections(sections: ScheduleSections, query: string, filter: ScheduleFilter): ScheduleSections {
  const q = query.trim().toLowerCase();
  const matches = (title: string): boolean => q === "" || title.toLowerCase().includes(q);
  const keep = (name: ScheduleFilter): boolean => filter === "All" || filter === name;
  return {
    running: keep("Running") ? sections.running.filter((e) => matches(e.title)) : [],
    waiting: keep("Waiting") ? sections.waiting.filter((e) => matches(e.title)) : [],
    done: keep("Done") ? sections.done.filter((e) => matches(e.title)) : [],
    failed: keep("Failed") ? sections.failed.filter((e) => matches(e.title)) : [],
  };
}

export function isEmpty(sections: ScheduleSections): boolean {
  return sections.running.length + sections.waiting.length + sections.done.length + sections.failed.length === 0;
}

/** "Not before 02:00" today, "Not before Sep 16, 02:00" another day; "" without a time. */
export function formatNotBefore(iso: string | undefined, now: Date = new Date()): string {
  if (iso === undefined) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? `Not before ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : `Not before ${formatDoneAt(iso)}`;
}

/** The value a `datetime-local` input shows for an ISO time (local, minutes). */
export function toLocalInput(iso: string | undefined): string {
  if (iso === undefined) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface ModelState {
  readonly adapter: boolean;
  readonly comfyui: boolean;
}

/** CHORE_011: the line above the sections when the line cannot move — the composer's BUG_001 words for the adapter, ours for the model. */
export function modelNotice(model: ModelState | undefined): string | undefined {
  if (model === undefined) return undefined;
  if (!model.adapter) return "The Spark's adapter is not reachable — on the Spark, run spark/comfyui/run.sh; the line waits.";
  if (!model.comfyui) return "The Spark's model is not running — the line waits; start it with spark/comfyui/run.sh.";
  return undefined;
}

/** The running row's word: "Queued" while the model server has not started it, "Generating 41 %" after. */
export function runningLabel(entry: Pick<RecentEntry, "status" | "progress">): string {
  return entry.status === "running" ? `Generating ${String(entry.progress ?? 0)} %` : "Queued";
}
