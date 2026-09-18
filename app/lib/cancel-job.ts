/**
 * Cancel a job (STORY_014's DELETE /api/jobs/:id, shared with STORY_056's Retry chain): a request still waiting in the
 * app's line leaves it; one the model server has is cancelled there. History is marked cancelled either way.
 */
import { historyStore } from "./history-store";
import type { JobStatusResponse } from "./job-api";
import { forward, relayJson } from "./model-client";
import { upstreamJobId } from "./queue-runner";
import { getQueued, removeQueued } from "./queue-store";

export async function cancelJob(id: string): Promise<Response> {
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
}
