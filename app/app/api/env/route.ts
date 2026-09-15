import { EnvKeyError, maskedEnv, writeEnv, type EnvPut } from "@/lib/env-store";
import { errorResponse, guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

/** GET /api/env — the stored variables' keys with a mask; a value never leaves the server (STORY_035). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ vars: maskedEnv() })));
}

/** PUT /api/env { vars: { KEY: "value" | null } } — the dialog's Save: replaces the set; null keeps a stored value. */
export function PUT(request: Request): Promise<Response> {
  return guarded(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send { vars: { KEY: value } }", field: "vars" });
    }
    const vars = typeof body === "object" && body !== null ? (body as Record<string, unknown>)["vars"] : undefined;
    if (typeof vars !== "object" || vars === null || Array.isArray(vars)) return errorResponse({ status: 400, code: "validation", message: "vars must be an object of KEY: value", field: "vars" });
    const put: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(vars as Record<string, unknown>)) {
      if (value !== null && typeof value !== "string") return errorResponse({ status: 400, code: "validation", message: `${key} must be a string (or null to keep the stored value)`, field: key });
      put[key] = value;
    }
    const accepted: EnvPut = put;
    try {
      return Response.json({ vars: maskedEnv(writeEnv(accepted)) });
    } catch (error) {
      if (error instanceof EnvKeyError) return errorResponse({ status: 400, code: "validation", message: error.message, field: error.key });
      throw error;
    }
  });
}
