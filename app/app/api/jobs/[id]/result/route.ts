import { forward, guarded, relayBytes, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/jobs/:id/result — the video, streamed, with Range passed through so the player can seek. */
export function GET(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const range = request.headers.get("range");
    const response = await forward(`/jobs/${encodeURIComponent(id)}/result`, { headers: range === null ? {} : { range } });
    return response.ok || response.status === 206 ? relayBytes(response) : relayJson(response);
  });
}
