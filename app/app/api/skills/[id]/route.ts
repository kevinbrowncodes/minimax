import { errorResponse, guarded } from "@/lib/model-client";
import { BuiltInSkillError, removeSkill, updateSkill } from "@/lib/skill-store";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** PATCH /api/skills/:id { name?, description?, template? } — Edit; the built-in cannot be edited. */
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
    const patch: { name?: string; description?: string; template?: string } = {};
    for (const [key, value] of Object.entries(body)) {
      if (key !== "name" && key !== "description" && key !== "template") return errorResponse({ status: 400, code: "validation", message: `${key} cannot be patched`, field: key });
      if (typeof value !== "string" || (key !== "description" && value.trim() === "")) return errorResponse({ status: 400, code: "validation", message: `${key} must be a non-empty string`, field: key });
      patch[key] = value;
    }
    try {
      const skill = updateSkill(id, patch);
      return skill ? Response.json({ skill }) : errorResponse({ status: 404, code: "not_found", message: `no skill ${id}` });
    } catch (error) {
      if (error instanceof BuiltInSkillError) return errorResponse({ status: 400, code: "validation", message: error.message, field: "id" });
      throw error;
    }
  });
}

/** DELETE /api/skills/:id — the built-in cannot be deleted. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    try {
      return removeSkill(id) ? new Response(null, { status: 204 }) : errorResponse({ status: 404, code: "not_found", message: `no skill ${id}` });
    } catch (error) {
      if (error instanceof BuiltInSkillError) return errorResponse({ status: 400, code: "validation", message: error.message, field: "id" });
      throw error;
    }
  });
}
