import { historyStore } from "@/lib/history-store";
import type { JobStatusResponse } from "@/lib/job-api";
import { forward, guarded, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/jobs/:id — status; every answer is recorded into history so a reopened page shows the last known state. */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const response = await forward(`/jobs/${encodeURIComponent(id)}`);
    if (response.status !== 200) return relayJson(response);
    const body = (await response.json()) as JobStatusResponse;
    historyStore().recordStatus(id, body);
    return Response.json(body);
  });
}

/** DELETE /api/jobs/:id — cancel; history is marked cancelled from the 202 on. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const response = await forward(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.status !== 202) return relayJson(response);
    const body = (await response.json()) as JobStatusResponse;
    historyStore().recordStatus(id, { id, status: "cancelled", progress: body.progress });
    return Response.json(body, { status: 202 });
  });
}
