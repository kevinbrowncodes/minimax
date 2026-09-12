import { historyStore } from "@/lib/history-store";
import { guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

/** GET /api/history — every job the UI created, newest first. */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ entries: historyStore().list() })));
}
