import { errorResponse, guarded } from "@/lib/model-client";
import { projectStore } from "@/lib/project-store";

export const dynamic = "force-dynamic";

/** GET /api/projects — every project, newest first (STORY_031). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ projects: projectStore().list() })));
}

/** POST /api/projects { name } — the Create project dialog (behaviour-project-create-02); the name is required. */
export function POST(request: Request): Promise<Response> {
  return guarded(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send a JSON object with a name", field: "name" });
    }
    const name = typeof body === "object" && body !== null ? (body as Record<string, unknown>)["name"] : undefined;
    if (typeof name !== "string" || name.trim() === "") return errorResponse({ status: 400, code: "validation", message: "name is required", field: "name" });
    return Response.json({ project: projectStore().create({ name }) }, { status: 201 });
  });
}
