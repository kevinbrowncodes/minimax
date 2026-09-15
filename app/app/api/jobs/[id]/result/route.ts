import { fileNameFor } from "@/lib/assets-filter";
import { contentDisposition } from "@/lib/content-disposition";
import { historyStore } from "@/lib/history-store";
import { forward, guarded, relayBytes, relayJson } from "@/lib/model-client";
import { upstreamJobId } from "@/lib/queue-runner";
import { readSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/**
 * GET /api/jobs/:id/result — the video, streamed, with Range passed through so the player can seek. The response names
 * the file (BUG_004): `inline` for the player, `attachment` with `?download`, so a browser that ignores the anchor's
 * `download` attribute still saves `<title>.mp4` and not `result`. STORY_034: a download with the watermark switch off
 * asks the adapter for the marked copy (`?watermark=1`); playback is always the clean file.
 */
export function GET(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const range = request.headers.get("range");
    const download = new URL(request.url).searchParams.has("download");
    const watermark = download && !readSettings().removeWatermark;
    const response = await forward(`/jobs/${encodeURIComponent(upstreamJobId(id))}/result${watermark ? "?watermark=1" : ""}`, { headers: range === null ? {} : { range } }); // STORY_041: a queued job's id maps to the model server's
    if (!(response.ok || response.status === 206)) return relayJson(response);
    const relayed = relayBytes(response);
    const entry = historyStore().get(id);
    const kind = download ? "attachment" : "inline";
    relayed.headers.set("content-disposition", contentDisposition(entry ? fileNameFor(entry) : "video.mp4", kind));
    return relayed;
  });
}
