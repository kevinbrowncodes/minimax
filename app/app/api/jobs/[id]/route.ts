import { historyStore } from "@/lib/history-store";
import type { JobStatusResponse } from "@/lib/job-api";
import { forward, guarded, relayJson } from "@/lib/model-client";
import { submitDue, upstreamJobId } from "@/lib/queue-runner";
import { getQueued, removeQueued } from "@/lib/queue-store";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/**
 * GET /api/jobs/:id — status; every answer is recorded into history so a reopened page shows the last known state.
 * STORY_041: a request still waiting in the app's queue answers `queued` with its position (and advances the line
 * first); one that was submitted is asked of the model server under the id it got there, answered under ours.
 */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    await submitDue();
    const queued = getQueued(id);
    if (queued && queued.jobId === undefined) return Response.json({ id, status: "queued", progress: 0, position: queued.position, ...(queued.notBefore === undefined ? {} : { notBefore: queued.notBefore }) });
    const upstream = upstreamJobId(id);
    const response = await forward(`/jobs/${encodeURIComponent(upstream)}`);
    if (response.status !== 200) return relayJson(response);
    const body = { ...((await response.json()) as JobStatusResponse), id };
    historyStore().recordStatus(id, body);
    return Response.json(body);
  });
}

/** DELETE /api/jobs/:id — cancel; history is marked cancelled from the 202 on. A waiting request leaves the queue instead. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const queued = getQueued(id);
    if (queued && queued.jobId === undefined) {
      removeQueued(id);
      historyStore().recordStatus(id, { id, status: "cancelled", progress: 0 });
      return Response.json({ id, status: "cancelled", progress: 0 }, { status: 202 });
    }
    const upstream = upstreamJobId(id);
    const response = await forward(`/jobs/${encodeURIComponent(upstream)}`, { method: "DELETE" });
    if (response.status !== 202) return relayJson(response);
    const body = (await response.json()) as JobStatusResponse;
    historyStore().recordStatus(id, { id, status: "cancelled", progress: body.progress });
    return Response.json({ ...body, id }, { status: 202 });
  });
}
