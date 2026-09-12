import { forward, guarded, relayBytes, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/jobs/:id/poster — a still of the result. */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const response = await forward(`/jobs/${encodeURIComponent(id)}/poster`);
    return response.ok ? relayBytes(response) : relayJson(response);
  });
}
