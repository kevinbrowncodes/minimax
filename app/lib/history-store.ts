/**
 * The history store (STORY_014): every job the UI created, as a JSON file with atomic writes. Server-side only.
 * Entries are read from disk on every call (the file is small and one Next process writes it), so a reopened page
 * and the sidebar always see the latest state. HISTORY_FILE names the file; the app container mounts /data for it.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { JobError, JobResult, JobStatus, JobStatusResponse, Overlap } from "./job-api";

export interface HistoryParams {
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  /** STORY_017: the requested overlap of an extension, kept so Retry re-posts it. */
  readonly overlapFrames?: number;
}
/** STORY_032: a reference image kept with the job — `n` is its upload ordinal (the route's key), `file` its name on disk. */
export interface ReferenceFile {
  readonly n: number;
  readonly name: string;
  readonly file: string;
  readonly size: number;
  readonly type: string;
}
export interface HistoryEntry {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly params: HistoryParams;
  readonly referenceImages: number;
  /** STORY_016: the finished job this one continues (title as it was when the extension was created). */
  readonly continuesFrom?: { readonly id: string; readonly title: string; readonly durationSeconds?: number };
  /** STORY_017: what the server carried into the new clip, from the first status that carried it. */
  readonly overlap?: Overlap;
  readonly createdAt: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly finishedAt?: string;
  readonly openedAt?: string;
  /** STORY_029: pinned rows sit in the sidebar's Pinned section, newest pin first. */
  readonly pinned?: boolean;
  readonly pinnedAt?: string;
  /** STORY_030: archived rows leave Recents and Search and live under Settings › Archived tasks, newest archive first. */
  readonly archived?: boolean;
  readonly archivedAt?: string;
  /** STORY_031: the project the task was started in or moved to (`lib/project-store`); absent = No project. */
  readonly projectId?: string;
  /** STORY_032: Assets › Star. */
  readonly starred?: boolean;
  /** STORY_032: the reference images attached to the job, kept under `uploads/<id>/` beside the history file. */
  readonly referenceFiles?: readonly ReferenceFile[];
  /** STORY_041: a request that waited in the app's queue keeps its id; once submitted, the model server's job id lives here. */
  readonly jobId?: string;
  readonly error?: JobError;
  readonly result?: JobResult;
}
export type HistoryPatch = Partial<Pick<HistoryEntry, "status" | "progress" | "finishedAt" | "openedAt" | "error" | "result" | "title" | "overlap" | "pinned" | "pinnedAt" | "archived" | "archivedAt" | "projectId" | "starred" | "referenceFiles" | "jobId" | "prompt" | "params" | "referenceImages">>;

const TERMINAL: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);
const TITLE_MAX = 48;

/** The first 48 characters of the prompt at a word boundary, with an ellipsis when cut. */
export function titleFor(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (clean.length <= TITLE_MAX) return clean || "Unnamed Session";
  const cut = clean.slice(0, TITLE_MAX + 1);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 24 ? cut.slice(0, boundary) : clean.slice(0, TITLE_MAX)).trimEnd()}…`;
}

export class HistoryStore {
  readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  #read(): HistoryEntry[] {
    let text: string;
    try {
      text = readFileSync(this.file, "utf8");
    } catch {
      return [];
    }
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  }

  #write(entries: readonly HistoryEntry[]): void {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${String(process.pid)}.tmp`;
    writeFileSync(tmp, JSON.stringify(entries, null, 2));
    renameSync(tmp, this.file);
  }

  /** Newest first. */
  list(): readonly HistoryEntry[] {
    return [...this.#read()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  get(id: string): HistoryEntry | undefined {
    return this.#read().find((e) => e.id === id);
  }

  create(input: Omit<HistoryEntry, "title" | "createdAt" | "status" | "progress"> & { readonly createdAt?: string }): HistoryEntry {
    const entries = this.#read();
    const entry: HistoryEntry = { ...input, title: titleFor(input.prompt), createdAt: input.createdAt ?? new Date().toISOString(), status: "queued", progress: 0 };
    this.#write([...entries.filter((e) => e.id !== entry.id), entry]);
    return entry;
  }

  patch(id: string, patch: HistoryPatch): HistoryEntry | undefined {
    const entries = this.#read();
    const index = entries.findIndex((e) => e.id === id);
    const current = entries[index];
    if (index === -1 || !current) return undefined;
    const next: HistoryEntry = { ...current, ...patch, ...(patch.prompt !== undefined && patch.title === undefined ? { title: titleFor(patch.prompt) } : {}) };
    entries[index] = next;
    this.#write(entries);
    return next;
  }

  /** Record a status response from the generation server; sets finishedAt the first time a terminal status arrives. */
  recordStatus(id: string, status: JobStatusResponse): HistoryEntry | undefined {
    const current = this.get(id);
    if (!current) return undefined;
    if (TERMINAL.has(current.status)) return current;
    const terminal = TERMINAL.has(status.status);
    return this.patch(id, {
      status: status.status,
      progress: Math.max(current.progress, status.progress),
      ...(status.error ? { error: status.error } : {}),
      ...(status.result ? { result: status.result } : {}),
      ...(status.request?.overlap && !current.overlap ? { overlap: status.request.overlap } : {}),
      ...(terminal && current.finishedAt === undefined ? { finishedAt: new Date().toISOString() } : {}),
    });
  }

  remove(id: string): boolean {
    const entries = this.#read();
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return false;
    this.#write(next);
    return true;
  }
  /** STORY_031: a deleted project's tasks stay, unassigned — one write; returns how many entries it touched. */
  unassignProject(projectId: string): number {
    const entries = this.#read();
    let touched = 0;
    const next = entries.map((e) => {
      if (e.projectId !== projectId) return e;
      touched += 1;
      const rest: HistoryEntry = { ...e };
      delete (rest as { projectId?: string }).projectId;
      return rest;
    });
    if (touched > 0) this.#write(next);
    return touched;
  }
  /** STORY_030: Archived tasks › Delete all — one write; returns how many entries went. */
  removeMany(ids: readonly string[]): number {
    const gone = new Set(ids);
    const entries = this.#read();
    const next = entries.filter((e) => !gone.has(e.id));
    if (next.length !== entries.length) this.#write(next);
    return entries.length - next.length;
  }
}

let shared: HistoryStore | undefined;
/** The process-wide store at HISTORY_FILE (default: a file in the OS temp dir, for the gate and dev). */
export function historyStore(): HistoryStore {
  const file = process.env["HISTORY_FILE"] ?? path.join(tmpdir(), "minimax-history.json");
  if (!shared || shared.file !== file) shared = new HistoryStore(file);
  return shared;
}
