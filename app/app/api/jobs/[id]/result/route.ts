import { fileNameFor } from "@/lib/assets-filter";
import { contentDisposition } from "@/lib/content-disposition";
import { historyStore } from "@/lib/history-store";
import { forward, guarded, relayBytes, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/**
 * GET /api/jobs/:id/result — the video, streamed, with Range passed through so the player can seek. The response names
 * the file (BUG_004): `inline` for the player, `attachment` with `?download`, so a browser that ignores the anchor's
 * `download` attribute still saves `<title>.mp4` and not `result`.
 */
export function GET(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const range = request.headers.get("range");
    const response = await forward(`/jobs/${encodeURIComponent(id)}/result`, { headers: range === null ? {} : { range } });
    if (!(response.ok || response.status === 206)) return relayJson(response);
    const relayed = relayBytes(response);
    const entry = historyStore().get(id);
    const kind = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
    relayed.headers.set("content-disposition", contentDisposition(entry ? fileNameFor(entry) : "video.mp4", kind));
    return relayed;
  });
}
