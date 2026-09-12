import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/history/:id */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const entry = historyStore().get(id);
    return entry ? Response.json(entry) : errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
  });
}

/** PATCH /api/history/:id — the page's own marks (openedAt, title); job state comes from the jobs routes. */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "body is not valid JSON" });
    }
    if (typeof body !== "object" || body === null) return errorResponse({ status: 400, code: "validation", message: "body must be an object" });
    const patch: { openedAt?: string; title?: string } = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") return errorResponse({ status: 400, code: "validation", message: `${key} must be a string`, field: key });
      if (key === "openedAt") patch.openedAt = value;
      else if (key === "title") patch.title = value;
      else return errorResponse({ status: 400, code: "validation", message: `${key} cannot be patched`, field: key });
    }
    const entry = historyStore().patch(id, patch);
    return entry ? Response.json(entry) : errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
  });
}

/** DELETE /api/history/:id — forget the entry (the file on the Spark is untouched). */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    return historyStore().remove(id) ? new Response(null, { status: 204 }) : errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
  });
}
