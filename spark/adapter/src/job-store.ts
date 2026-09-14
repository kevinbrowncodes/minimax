/**
 * The adapter's job table (STORY_006): the contract's status machine plus JSON persistence so jobs survive a restart.
 * queued → running → done | failed | cancelled; terminal states absorb; progress never decreases.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobRequest } from "./capabilities.ts";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export interface JobError {
  readonly code: "moderated" | "generation_failed";
  readonly message: string;
}
export interface OutputFile {
  readonly filename: string;
  readonly subfolder: string;
}
export interface JobResultFiles {
  readonly video: OutputFile;
  readonly poster?: OutputFile;
  readonly mimeType: string;
  /** Frames in the clip on the 24 fps grid; an extension's is the source's plus the new ones (STORY_016). */
  readonly frames?: number;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  /** STORY_020: where the shot changed (cuts.ts); absent when the measure was unavailable, [] when none. */
  readonly cuts?: readonly { readonly frame: number; readonly seconds: number }[];
}
export interface Job {
  readonly id: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly request: JobRequest;
  readonly promptId?: string;
  readonly error?: JobError;
  readonly result?: JobResultFiles;
}

const TERMINAL: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);
export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}

export class JobStore {
  readonly #jobs = new Map<string, Job>();
  readonly #file: string | undefined;

  constructor(file?: string) {
    this.#file = file;
    if (file !== undefined) this.#load(file);
  }

  #load(file: string): void {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      return; // first start
    }
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error(`${file} is not a job list`);
    for (const job of parsed as Job[]) this.#jobs.set(job.id, job);
  }

  #save(): void {
    if (this.#file === undefined) return;
    mkdirSync(path.dirname(this.#file), { recursive: true });
    const tmp = `${this.#file}.tmp`;
    writeFileSync(tmp, JSON.stringify([...this.#jobs.values()], null, 2));
    renameSync(tmp, this.#file);
  }

  get(id: string): Job | undefined {
    return this.#jobs.get(id);
  }
  list(): readonly Job[] {
    return [...this.#jobs.values()];
  }
  open(): readonly Job[] {
    return this.list().filter((j) => !isTerminal(j.status));
  }

  create(id: string, request: JobRequest, now = new Date()): Job {
    const at = now.toISOString();
    const job: Job = { id, status: "queued", progress: 0, createdAt: at, updatedAt: at, request };
    this.#jobs.set(id, job);
    this.#save();
    return job;
  }

  /** Apply a change; terminal jobs never change; progress never goes backwards. Returns the stored job. */
  update(id: string, patch: Partial<Pick<Job, "status" | "progress" | "promptId" | "error" | "result" | "request">>, now = new Date()): Job {
    const job = this.#jobs.get(id);
    if (!job) throw new Error(`no job ${id}`);
    if (isTerminal(job.status)) return job;
    const status = patch.status ?? job.status;
    const rawProgress = patch.progress ?? job.progress;
    const progress = status === "done" ? 100 : Math.max(job.progress, Math.min(100, Math.max(0, Math.floor(rawProgress))));
    const next: Job = {
      ...job,
      status,
      progress,
      updatedAt: now.toISOString(),
      ...(patch.request === undefined ? {} : { request: patch.request }),
      ...(patch.promptId === undefined ? {} : { promptId: patch.promptId }),
      ...(patch.error === undefined ? {} : { error: patch.error }),
      ...(patch.result === undefined ? {} : { result: patch.result }),
    };
    this.#jobs.set(id, next);
    this.#save();
    return next;
  }
}
