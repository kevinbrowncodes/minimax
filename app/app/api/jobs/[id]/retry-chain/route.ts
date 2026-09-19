import { POST as postJob } from "@/app/api/jobs/route";
import { cancelJob } from "@/lib/cancel-job";
import { historyStore, type HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";
import { errorResponse, guarded } from "@/lib/model-client";
import { referenceFilePath } from "@/lib/uploads";
import { readFileSync } from "node:fs";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/**
 * A segment's request again, through the jobs route itself (never a second path): an extension as JSON with its new
 * source; a fresh clip as multipart with the reference images read back from disk — the one thing the task page's
 * plain Retry cannot do. `?script=` is the e2e lane's, forwarded.
 */
async function repost(entry: HistoryEntry, continueFrom: string | undefined, script: string | null): Promise<{ readonly ok: true; readonly id: string } | { readonly ok: false; readonly response: Response }> {
  const url = `http://app/api/jobs${script === null ? "" : `?script=${encodeURIComponent(script)}`}`;
  const { overlapFrames, endAnchor, ...params } = entry.params;
  const fields: Record<string, unknown> = { prompt: entry.prompt, ...params, ...(continueFrom === undefined || overlapFrames === undefined ? {} : { overlapFrames }), ...(continueFrom === undefined || endAnchor === undefined ? {} : { endAnchor }), ...(entry.projectId === undefined ? {} : { projectId: entry.projectId }) };
  let request: Request;
  if (continueFrom !== undefined) {
    request = new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fields, continueFrom }) });
  } else {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, String(value));
    for (const ref of entry.referenceFiles ?? []) {
      try {
        form.append("referenceImage", new File([readFileSync(referenceFilePath(entry.id, ref))], ref.name, { type: ref.type }), ref.name);
      } catch {
        // a reference file that is gone: the request goes without it, as the entry would be shown without its tile
      }
    }
    request = new Request(url, { method: "POST", body: form });
  }
  const response = await postJob(request);
  if (response.status !== 202) return { ok: false, response };
  return { ok: true, id: ((await response.json()) as CreateJobResponse).id };
}

/**
 * POST /api/jobs/:id/retry-chain (STORY_056): redraw this segment — the same request, no seed, an extension of its own
 * source — and re-queue every segment that continued from it, in order, each as an extension of the id just answered,
 * so they wait in the line as STORY_043 makes them. A later segment still waiting or running is cancelled first (its
 * entry stays, cancelled); one that is done is left as it is. A refusal mid-way stops the sequence: the answer carries
 * the ids so far and the refusal (STORY_044's rule).
 */
export function POST(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const script = new URL(request.url).searchParams.get("script");
    const store = historyStore();
    const entry = store.get(id);
    if (!entry) return errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
    const after = store.chainAfter(id);
    for (const later of after) {
      if (later.status === "queued" || later.status === "running") await cancelJob(later.id);
    }
    const redraw = await repost(entry, entry.continuesFrom?.id, script);
    if (!redraw.ok) return redraw.response;
    const rechained: string[] = [];
    let source = redraw.id;
    for (const [index, later] of after.entries()) {
      const next = await repost(later, source, script);
      if (!next.ok) {
        let refusal: { message?: string } = {};
        try {
          refusal = ((await next.response.json()) as { error?: { message?: string } }).error ?? {};
        } catch {
          // the status is the message then
        }
        return Response.json({ id: redraw.id, rechained, refused: { segment: index + 1, message: refusal.message ?? `the server answered ${String(next.response.status)}` } }, { status: 202 });
      }
      rechained.push(next.id);
      source = next.id;
    }
    return Response.json({ id: redraw.id, rechained }, { status: 202 });
  });
}
