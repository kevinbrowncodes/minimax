import { errorResponse, guarded } from "@/lib/model-client";
import { createSkill, listSkills } from "@/lib/skill-store";
import { isValidSkillInput } from "@/lib/skills";

export const dynamic = "force-dynamic";

/** GET /api/skills — the built-in first, then the owner's (STORY_040). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ skills: listSkills() })));
}

/** POST /api/skills { name, description, template } — Management › Skills › Create skill. */
export function POST(request: Request): Promise<Response> {
  return guarded(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send { name, description, template }" });
    }
    const input = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    if (!isValidSkillInput(input)) return errorResponse({ status: 400, code: "validation", message: "a skill needs a name and a template (the description may be empty)", field: "name" });
    return Response.json({ skill: createSkill(input) }, { status: 201 });
  });
}
