import { chainView } from "@/lib/chain-outcome";
import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { getQueued } from "@/lib/queue-store";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/**
 * GET /api/history/:id/chain (STORY_057) — the whole chain the entry belongs to: back to its first segment, then forward
 * along the links that are not cancelled, each with what became of it (waiting on its source, queued, running with its
 * progress, done, cut at the join, cut inside, failed, cancelled). One segment for a clip with no links.
 */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const store = historyStore();
    if (store.get(id) === undefined) return errorResponse({ status: 404, code: "not_found", message: `no history entry ${id}` });
    const waiting = (segmentId: string): boolean => {
      const queued = getQueued(segmentId);
      return queued !== undefined && queued.jobId === undefined;
    };
    return Response.json({ segments: chainView(store.list(), id, waiting) });
  });
}
