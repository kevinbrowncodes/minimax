import { agentFlag } from "@/lib/agent-config";
import { errorResponse, forward, guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/capabilities — what the configured generation server can do, plus `agent` (STORY_047): whether agent mode
 * is configured on this server and, when not, why. The adapter's JSON is relayed as it is with the one field merged
 * in; a non-object or non-JSON upstream answer is relayed as before, without it.
 */
export function GET(): Promise<Response> {
  return guarded(async () => {
    const response = await forward("/capabilities");
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return errorResponse({ status: 502, code: "bad_upstream", message: `the generation server answered ${String(response.status)} without JSON` });
    }
    if (response.ok && typeof body === "object" && body !== null && !Array.isArray(body)) {
      return Response.json({ ...(body as Record<string, unknown>), agent: agentFlag() }, { status: response.status });
    }
    return Response.json(body, { status: response.status });
  });
}
