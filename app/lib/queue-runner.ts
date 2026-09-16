/**
 * The queue runner (STORY_041): submits the next due requests to the model server while it accepts them. Called from
 * the routes the UI polls anyway (the sidebar's history list, a task page's status, the queue page) — no process of
 * its own, nothing to keep alive; a timed request therefore goes on the first poll after its time. One run at a time.
 */
import { readFileSync } from "node:fs";
import { historyStore } from "./history-store";
import { isTerminal, type CreateJobResponse, type JobStatusResponse } from "./job-api";
import { forward } from "./model-client";
import { due, getQueued, markSubmitted, removeQueued, waiting, type QueueEntry } from "./queue-store";
import { referenceFilePath } from "./uploads";

export type Submit = (entry: QueueEntry) => Promise<Response>;
/** BUG_009: ask the model server about a job it knows under `upstreamId` (its `GET /jobs/:id`). */
export type Refresh = (upstreamId: string) => Promise<Response>;

/**
 * BUG_009: how long a source's last heard status counts as fresh. A page watching a job polls it every 1–5 s and
 * writes what it hears; the runner asks the model server itself only about a source nobody has heard from for this
 * long, so a watched job costs no extra request and an unwatched one is asked once per ticker tick (30 s).
 * QUEUE_SOURCE_STALE_MS overrides it (the gate's Playwright server sets 3 s; the integration tests 0).
 */
export const DEFAULT_SOURCE_STALE_MS = 10_000;
export function sourceStaleMs(): number {
  const raw = process.env["QUEUE_SOURCE_STALE_MS"];
  const parsed = raw === undefined || raw === "" ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SOURCE_STALE_MS;
}

/**
 * What the model server is sent for a queued request: JSON without images, multipart with them, never our own fields.
 * BUG_007: a source is named by the server's own job id (the source may itself have gone through the queue).
 */
export function upstreamFields(request: QueueEntry["request"]): Record<string, string | number> {
  return {
    prompt: request.prompt,
    ratio: request.ratio,
    resolution: request.resolution,
    durationSeconds: request.durationSeconds,
    model: request.model,
    ...(request.continueFrom === undefined ? {} : { continueFrom: upstreamJobId(request.continueFrom) }),
    ...(request.overlapFrames === undefined ? {} : { overlapFrames: request.overlapFrames }),
  };
}

export const submitToModel: Submit = (entry) => {
  const path = entry.request.script === undefined ? "/jobs" : `/jobs?script=${encodeURIComponent(entry.request.script)}`;
  const fields = upstreamFields(entry.request);
  if (entry.referenceFiles.length === 0) return forward(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fields) });
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));
  for (const ref of entry.referenceFiles) form.append("referenceImage", new File([new Uint8Array(readFileSync(referenceFilePath(entry.id, ref)))], ref.name, { type: ref.type }), ref.name);
  return forward(path, { method: "POST", body: form });
};

/** STORY_043: what an extension's source is up to — "done", still "pending", or "gone" (failed, cancelled, forgotten). */
export function sourceState(id: string): "done" | "pending" | "gone" {
  const entry = historyStore().get(id);
  if (!entry) return "gone";
  if (entry.status === "done") return "done";
  if (entry.status === "failed" || entry.status === "cancelled") return "gone";
  return "pending";
}

export const refreshFromModel: Refresh = (upstreamId) => forward(`/jobs/${encodeURIComponent(upstreamId)}`);

/**
 * BUG_009: the runner learns that a source finished only from history, and only a page's poll wrote it — with every
 * tab closed a waiting extension never went. So before deciding what is due, ask the model server about every source
 * a waiting extension depends on — once per source per run; only sources that were submitted, are not terminal in
 * history and have not been heard from within `staleMs` — and record the answer through the same path the task page's
 * poll uses. A 404 means the server no longer knows the job: the source is failed in history with that message, and
 * `submitDue` then fails its extensions with "its source did not finish". Anything else (unreachable, a non-JSON
 * body) leaves history as it was — the line waits, as it does for a submit that cannot be made. Returns how many
 * sources were asked.
 */
export async function refreshPendingSources(options: { readonly refresh?: Refresh; readonly staleMs?: number; readonly now?: Date } = {}): Promise<number> {
  const refresh = options.refresh ?? refreshFromModel;
  const staleMs = options.staleMs ?? sourceStaleMs();
  const now = (options.now ?? new Date()).getTime();
  const sources = new Set<string>();
  for (const entry of waiting()) {
    const id = entry.request.continueFrom;
    if (id === undefined || sources.has(id)) continue;
    const source = historyStore().get(id);
    if (!source || isTerminal(source.status)) continue; // gone, or settled: nothing to ask
    const queued = getQueued(id);
    if (queued !== undefined && queued.jobId === undefined) continue; // still waiting in the line itself: not submitted yet
    if (source.statusAt !== undefined && now - Date.parse(source.statusAt) < staleMs) continue; // a page is watching it
    sources.add(id);
  }
  let asked = 0;
  for (const id of sources) {
    let response: Response;
    try {
      response = await refresh(upstreamJobId(id));
    } catch {
      continue;
    }
    asked += 1;
    if (response.status === 404) {
      historyStore().recordStatus(id, { id, status: "failed", progress: 0, error: { code: "not_found", message: "the generation server no longer knows this job" } });
      continue;
    }
    if (response.status !== 200) continue;
    try {
      const body = (await response.json()) as JobStatusResponse;
      historyStore().recordStatus(id, { ...body, id });
    } catch {
      // not the contract's JSON: leave history as it was
    }
  }
  return asked;
}

let running: Promise<number> | undefined;

/**
 * Submit every due request in line order until the server answers busy (or is unreachable). A request the server
 * refuses for any other reason is failed in history with the server's message and leaves the line. Returns how many
 * were submitted.
 */
export function submitDue(options: { readonly now?: Date; readonly submit?: Submit; readonly refresh?: Refresh; readonly staleMs?: number } = {}): Promise<number> {
  if (running) return running;
  const run = (async () => {
    const submit = options.submit ?? submitToModel;
    // BUG_009: hear from the model server about the sources the line waits on, browser or no browser
    await refreshPendingSources({ ...(options.refresh === undefined ? {} : { refresh: options.refresh }), ...(options.staleMs === undefined ? {} : { staleMs: options.staleMs }), ...(options.now === undefined ? {} : { now: options.now }) });
    let count = 0;
    // STORY_043: an extension whose source will never finish leaves the line with the reason
    for (const entry of waiting()) {
      if (entry.request.continueFrom !== undefined && sourceState(entry.request.continueFrom) === "gone") {
        historyStore().recordStatus(entry.id, { id: entry.id, status: "failed", progress: 0, error: { code: "source_failed", message: "its source did not finish" } });
        removeQueued(entry.id);
      }
    }
    for (const entry of due(options.now, (id) => sourceState(id) === "done")) {
      let response: Response;
      try {
        response = await submit(entry);
      } catch {
        break;
      }
      if (response.status === 202) {
        const body = (await response.json()) as CreateJobResponse;
        markSubmitted(entry.id, body.id);
        historyStore().patch(entry.id, { jobId: body.id, status: "queued", progress: 0 });
        count += 1;
        continue;
      }
      let message = `the generation server answered ${String(response.status)}`;
      let code = "generation_failed";
      try {
        const body = (await response.json()) as { error?: { code?: string; message?: string } };
        code = body.error?.code ?? code;
        message = body.error?.message ?? message;
      } catch {
        // the status line is the message
      }
      if (code === "busy" || code === "unreachable" || response.status === 502 || response.status === 503) break; // the line waits
      historyStore().recordStatus(entry.id, { id: entry.id, status: "failed", progress: 0, error: { code, message } });
      removeQueued(entry.id);
    }
    return count;
  })().finally(() => {
    running = undefined;
  });
  running = run;
  return run;
}

/** The model server's id for a history id: the job it became, or the id itself for a job created directly. */
export function upstreamJobId(id: string): string {
  return historyStore().get(id)?.jobId ?? id;
}
