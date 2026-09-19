/**
 * The app's own queue (STORY_041): requests the model server refused as busy, or the owner timed, kept in order in
 * `queue.json` beside the history file (/data in the container) until the runner submits them. Server-side only.
 * An entry keeps the history entry's id; `jobId` appears once submitted (the runner sets it; the entry then leaves the
 * waiting list and the history entry follows the real job).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore, type ReferenceFile } from "./history-store";

export interface QueuedRequest {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  readonly continueFrom?: string;
  readonly overlapFrames?: number;
  /** STORY_061 */
  readonly endAnchor?: string;
  readonly projectId?: string;
  /** The stub's script, forwarded as it was on the original URL (the gate); the adapter ignores it. */
  readonly script?: string;
}

export interface QueueEntry {
  readonly id: string;
  readonly request: QueuedRequest;
  readonly referenceFiles: readonly ReferenceFile[];
  readonly createdAt: string;
  /** Not submitted before this (ISO); absent = the next free slot. */
  readonly notBefore?: string;
  /** Set when submitted; the entry is then no longer waiting. */
  readonly jobId?: string;
  readonly submittedAt?: string;
}

export function queueFile(): string {
  return path.join(path.dirname(historyStore().file), "queue.json");
}

function read(): QueueEntry[] {
  let text: string;
  try {
    text = readFileSync(queueFile(), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as QueueEntry[]).filter((e) => typeof e.id === "string" && typeof e.request === "object") : [];
  } catch {
    return [];
  }
}

function write(entries: readonly QueueEntry[]): void {
  const file = queueFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(entries, null, 2));
  renameSync(tmp, file);
}

/** Every entry, waiting ones in line order first, then the submitted ones (kept until their job is forgotten). */
export function listQueue(): readonly QueueEntry[] {
  return read();
}

/** The waiting entries in line order; `position` is 1-based. */
export function waiting(): readonly (QueueEntry & { readonly position: number })[] {
  return read().filter((e) => e.jobId === undefined).map((e, i) => ({ ...e, position: i + 1 }));
}

export function getQueued(id: string): (QueueEntry & { readonly position: number }) | undefined {
  return waiting().find((e) => e.id === id) ?? (() => {
    const e = read().find((x) => x.id === id);
    return e ? { ...e, position: 0 } : undefined;
  })();
}

export function enqueue(entry: Omit<QueueEntry, "createdAt"> & { readonly createdAt?: string }): QueueEntry & { readonly position: number } {
  const entries = read().filter((e) => e.id !== entry.id);
  const next: QueueEntry = { createdAt: new Date().toISOString(), ...entry };
  write([...entries, next]);
  const position = waiting().findIndex((e) => e.id === next.id) + 1;
  return { ...next, position };
}

/** Rewrite a waiting entry in place (Edit): the same slot, the same run-at unless given. */
export function replaceQueued(id: string, patch: Partial<Pick<QueueEntry, "request" | "referenceFiles" | "notBefore">>): QueueEntry | undefined {
  const entries = read();
  const index = entries.findIndex((e) => e.id === id && e.jobId === undefined);
  const current = entries[index];
  if (index === -1 || !current) return undefined;
  const next: QueueEntry = { ...current, ...patch };
  entries[index] = next;
  write(entries);
  return next;
}

/** Move a waiting entry one slot up or down among the waiting ones. */
export function moveQueued(id: string, direction: "up" | "down"): boolean {
  const entries = read();
  const waitingIds = entries.filter((e) => e.jobId === undefined).map((e) => e.id);
  const i = waitingIds.indexOf(id);
  if (i === -1) return false;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= waitingIds.length) return false;
  const a = entries.findIndex((e) => e.id === waitingIds[i]);
  const b = entries.findIndex((e) => e.id === waitingIds[j]);
  const ea = entries[a];
  const eb = entries[b];
  if (!ea || !eb) return false;
  entries[a] = eb;
  entries[b] = ea;
  write(entries);
  return true;
}

export function setNotBefore(id: string, notBefore: string | undefined): QueueEntry | undefined {
  const entries = read();
  const index = entries.findIndex((e) => e.id === id && e.jobId === undefined);
  const current = entries[index];
  if (index === -1 || !current) return undefined;
  const next: QueueEntry = { ...current };
  if (notBefore === undefined) delete (next as { notBefore?: string }).notBefore;
  else (next as { notBefore?: string }).notBefore = notBefore;
  entries[index] = next;
  write(entries);
  return next;
}

export function markSubmitted(id: string, jobId: string, at = new Date().toISOString()): QueueEntry | undefined {
  const entries = read();
  const index = entries.findIndex((e) => e.id === id);
  const current = entries[index];
  if (index === -1 || !current) return undefined;
  const next: QueueEntry = { ...current, jobId, submittedAt: at };
  entries[index] = next;
  write(entries);
  return next;
}

export function removeQueued(id: string): boolean {
  const entries = read();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  write(next);
  return true;
}

/**
 * The waiting entries whose time has come, in line order (a timed one is skipped, never blocking the rest). STORY_043:
 * an extension is due only when its source is done — `isSourceDone(id)` says; without it a source counts as done.
 */
export function due(now: Date = new Date(), isSourceDone: (id: string) => boolean = () => true): readonly QueueEntry[] {
  return read().filter((e) => e.jobId === undefined && (e.notBefore === undefined || Date.parse(e.notBefore) <= now.getTime()) && (e.request.continueFrom === undefined || isSourceDone(e.request.continueFrom)));
}
