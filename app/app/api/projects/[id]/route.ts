import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { projectStore } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** PATCH /api/projects/:id — Rename ({ name }) and Pin / Unpin ({ pinned }) from the project row's menu (STORY_031). */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send a JSON object" });
    }
    if (typeof body !== "object" || body === null) return errorResponse({ status: 400, code: "validation", message: "send a JSON object" });
    const patch: { name?: string; pinned?: boolean; pinnedAt?: string } = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === "name") {
        if (typeof value !== "string" || value.trim() === "") return errorResponse({ status: 400, code: "validation", message: "name cannot be empty", field: key });
        patch.name = value.trim();
      } else if (key === "pinned") {
        if (typeof value !== "boolean") return errorResponse({ status: 400, code: "validation", message: "pinned must be a boolean", field: key });
        patch.pinned = value;
        patch.pinnedAt = value ? new Date().toISOString() : undefined;
      } else return errorResponse({ status: 400, code: "validation", message: `${key} cannot be patched`, field: key });
    }
    const project = projectStore().patch(id, patch);
    return project ? Response.json({ project }) : errorResponse({ status: 404, code: "not_found", message: `no project ${id}` });
  });
}

/** DELETE /api/projects/:id — the Delete project dialog; its tasks stay in history, unassigned (Departures). */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    if (!projectStore().remove(id)) return errorResponse({ status: 404, code: "not_found", message: `no project ${id}` });
    historyStore().unassignProject(id);
    return new Response(null, { status: 204 });
  });
}
