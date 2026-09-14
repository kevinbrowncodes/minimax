import type { HistoryEntry } from "./history-store";
import type { JobSnapshot } from "./job-status";

/**
 * The task page's derived text (STORY_023; task-page@1440): the "Processed N s" row, the timestamp under the agent's
 * message ("Sep 12, 15:41"), and the agent's one-line result. Pure, so the jsdom tests can pin the wording.
 */

/** Seconds the job took, from its creation to its finish (or to now while it runs); never negative, whole seconds. */
export function processedSeconds(entry: Pick<HistoryEntry, "createdAt" | "finishedAt">, now: Date): number {
  const start = Date.parse(entry.createdAt);
  const end = entry.finishedAt === undefined ? now.getTime() : Date.parse(entry.finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Sep 12, 15:41" — the reference's timestamp under a message (task-page@1440), in the browser's local time. */
export function formatDoneAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${MONTHS[date.getMonth()] ?? ""} ${String(date.getDate())}, ${hh}:${mm}`;
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${String(Math.round(bytes / 1024))} KB`;
}

/** The agent's line for a finished job: "Done — 5.0 s · 1344×768 · 1.2 MB" (the reference's agent writes prose; ours states the file). */
export function resultLine(job: JobSnapshot): string {
  const r = job.result;
  if (job.status !== "done" || !r) return "";
  return `Done — ${r.durationSeconds.toFixed(1)} s · ${String(r.width)}×${String(r.height)} · ${formatBytes(r.sizeBytes)}`;
}
