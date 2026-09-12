import { forward, guarded, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

/** GET /api/capabilities — what the configured generation server can do. */
export function GET(): Promise<Response> {
  return guarded(async () => relayJson(await forward("/capabilities")));
}
