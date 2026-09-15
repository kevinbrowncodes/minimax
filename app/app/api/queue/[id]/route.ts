import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { getQueued, moveQueued, removeQueued, setNotBefore } from "@/lib/queue-store";
import { referenceUrl } from "@/lib/assets-filter";
import { removeUploads } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/queue/:id — a waiting request as sent, for Edit (STORY_041): the fields, the images' URLs, the run-at. */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const entry = getQueued(id);
    if (!entry || entry.jobId !== undefined) return errorResponse({ status: 404, code: "not_found", message: `no waiting request ${id}` });
    return Response.json({ id: entry.id, position: entry.position, request: entry.request, notBefore: entry.notBefore ?? null, images: entry.referenceFiles.map((ref) => ({ n: ref.n, name: ref.name, type: ref.type, url: referenceUrl({ id }, ref) })) });
  });
}

/** PATCH /api/queue/:id { move: "up" | "down" } | { notBefore: ISO | null } — reorder, or time a waiting request. */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send { move } or { notBefore }" });
    }
    if (typeof body !== "object" || body === null) return errorResponse({ status: 400, code: "validation", message: "send { move } or { notBefore }" });
    const b = body as Record<string, unknown>;
    if ("move" in b) {
      if (b["move"] !== "up" && b["move"] !== "down") return errorResponse({ status: 400, code: "validation", message: "move must be up or down", field: "move" });
      if (!getQueued(id) || getQueued(id)?.jobId !== undefined) return errorResponse({ status: 404, code: "not_found", message: `no waiting request ${id}` });
      moveQueued(id, b["move"]); // at an end of the line the move is a no-op, not an error
      return Response.json({ id, position: getQueued(id)?.position ?? 0 });
    }
    if ("notBefore" in b) {
      const value = b["notBefore"];
      if (value !== null && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) return errorResponse({ status: 400, code: "validation", message: "notBefore must be an ISO date-time or null", field: "notBefore" });
      const entry = setNotBefore(id, value === null ? undefined : new Date(value).toISOString());
      return entry ? Response.json({ id, notBefore: entry.notBefore ?? null }) : errorResponse({ status: 404, code: "not_found", message: `no waiting request ${id}` });
    }
    return errorResponse({ status: 400, code: "validation", message: "send { move } or { notBefore }" });
  });
}

/** DELETE /api/queue/:id — Remove: a waiting request leaves the line and history; its images go; the model server is never touched. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const entry = getQueued(id);
    if (!entry) return errorResponse({ status: 404, code: "not_found", message: `no queued request ${id}` });
    if (entry.jobId !== undefined) return errorResponse({ status: 409, code: "already_started", message: `${id} has been submitted; stop it from its task page` });
    removeQueued(id);
    historyStore().remove(id);
    removeUploads(id);
    return new Response(null, { status: 204 });
  });
}
