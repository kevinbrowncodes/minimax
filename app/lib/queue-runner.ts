/**
 * The queue runner (STORY_041): submits the next due requests to the model server while it accepts them. Called from
 * the routes the UI polls anyway (the sidebar's history list, a task page's status, the queue page) — no process of
 * its own, nothing to keep alive; a timed request therefore goes on the first poll after its time. One run at a time.
 */
import { readFileSync } from "node:fs";
import { historyStore } from "./history-store";
import type { CreateJobResponse } from "./job-api";
import { forward } from "./model-client";
import { due, markSubmitted, removeQueued, type QueueEntry } from "./queue-store";
import { referenceFilePath } from "./uploads";

export type Submit = (entry: QueueEntry) => Promise<Response>;

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

let running: Promise<number> | undefined;

/**
 * Submit every due request in line order until the server answers busy (or is unreachable). A request the server
 * refuses for any other reason is failed in history with the server's message and leaves the line. Returns how many
 * were submitted.
 */
export function submitDue(options: { readonly now?: Date; readonly submit?: Submit } = {}): Promise<number> {
  if (running) return running;
  const run = (async () => {
    const submit = options.submit ?? submitToModel;
    let count = 0;
    for (const entry of due(options.now)) {
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
