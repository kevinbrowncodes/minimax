import { markAgentRunOpened } from "@/lib/agent-run-store";
import { errorResponse, guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** PATCH /api/agent/runs/:id { openedAt? } — the owner opened the run's Inbox row (STORY_049; read by STORY_050). */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // an empty body stamps now
    }
    const openedAt = typeof body === "object" && body !== null && typeof (body as Record<string, unknown>)["openedAt"] === "string" ? ((body as Record<string, unknown>)["openedAt"] as string) : undefined;
    if (openedAt !== undefined && Number.isNaN(Date.parse(openedAt))) return errorResponse({ status: 400, code: "validation", message: "openedAt must be an ISO date", field: "openedAt" });
    const run = markAgentRunOpened(id, openedAt);
    if (run === undefined) return errorResponse({ status: 404, code: "not_found", message: "no such agent run" });
    return Response.json(run);
  });
}
