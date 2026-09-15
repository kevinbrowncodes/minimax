import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { projectStore } from "@/lib/project-store";
import { removeQueued } from "@/lib/queue-store";
import { removeUploads } from "@/lib/uploads";

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

/** PATCH /api/history/:id — the page's own marks (openedAt, title, pinned — STORY_029, archived — STORY_030, projectId — STORY_031); job state comes from the jobs routes. */
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
    const patch: { openedAt?: string; title?: string; pinned?: boolean; pinnedAt?: string; archived?: boolean; archivedAt?: string; projectId?: string; starred?: boolean } = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === "starred") {
        // Assets › Star (STORY_032)
        if (typeof value !== "boolean") return errorResponse({ status: 400, code: "validation", message: "starred must be a boolean", field: key });
        patch.starred = value;
        continue;
      }
      if (key === "projectId") {
        // Move to project › (STORY_031): a project's id, or null for No project
        if (value === null) {
          patch.projectId = undefined;
          continue;
        }
        if (typeof value !== "string" || !projectStore().get(value)) return errorResponse({ status: 400, code: "validation", message: "projectId must name a project, or be null", field: key });
        patch.projectId = value;
        continue;
      }
      if (key === "pinned" || key === "archived") {
        if (typeof value !== "boolean") return errorResponse({ status: 400, code: "validation", message: `${key} must be a boolean`, field: key });
        const at = value ? new Date().toISOString() : undefined;
        if (key === "pinned") {
          patch.pinned = value;
          patch.pinnedAt = at;
        } else {
          patch.archived = value;
          patch.archivedAt = at;
        }
        continue;
      }
      if (typeof value !== "string") return errorResponse({ status: 400, code: "validation", message: `${key} must be a string`, field: key });
      if (key === "openedAt") patch.openedAt = value;
      else if (key === "title") {
        if (value.trim() === "") return errorResponse({ status: 400, code: "validation", message: "title cannot be empty", field: key });
        patch.title = value.trim();
      } else return errorResponse({ status: 400, code: "validation", message: `${key} cannot be patched`, field: key });
    }
    const entry = historyStore().patch(id, patch);
    return entry ? Response.json(entry) : errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
  });
}

/** DELETE /api/history/:id — forget the entry (the file on the Spark is untouched). */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    removeUploads(id); // STORY_032: the reference images go with the entry
    removeQueued(id); // STORY_041: and its place in the queue
    return historyStore().remove(id) ? new Response(null, { status: 204 }) : errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
  });
}
