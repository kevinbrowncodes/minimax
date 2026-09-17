import { InstructionError, listInstructions, replaceInstructions, type InstructionInput } from "@/lib/agent-instruction-store";
import { errorResponse, guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

/** GET /api/agent/instructions — the guidelines, oldest first (STORY_052). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ instructions: listInstructions() })));
}

function isInput(v: unknown): v is InstructionInput {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (r["id"] === undefined || typeof r["id"] === "string") && typeof r["title"] === "string" && typeof r["text"] === "string" && typeof r["active"] === "boolean";
}

/** PUT /api/agent/instructions { instructions: [{ id?, title, text, active }] } — the panel's Done: the whole list; references stay with their ids. */
export function PUT(request: Request): Promise<Response> {
  return guarded(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send a JSON object with instructions" });
    }
    const list = typeof body === "object" && body !== null ? (body as { instructions?: unknown }).instructions : undefined;
    if (!Array.isArray(list) || !list.every(isInput)) return errorResponse({ status: 400, code: "validation", message: "instructions must be a list of { id?, title, text, active }", field: "instructions" });
    try {
      return Response.json({ instructions: replaceInstructions(list) });
    } catch (error) {
      if (error instanceof InstructionError) return errorResponse({ status: 400, code: "validation", message: error.message, field: error.field });
      throw error;
    }
  });
}
