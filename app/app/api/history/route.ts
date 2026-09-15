import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { removeUploads } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** GET /api/history — every job the UI created, newest first. */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ entries: historyStore().list() })));
}

/** DELETE /api/history?ids=a,b — Settings › Archived tasks › Delete all (STORY_030): every listed entry in one write. */
export function DELETE(request: Request): Promise<Response> {
  return guarded(() => {
    const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter((id) => id !== "");
    if (ids.length === 0) return Promise.resolve(errorResponse({ status: 400, code: "validation", message: "ids must name at least one history entry", field: "ids" }));
    for (const id of ids) removeUploads(id); // STORY_032
    return Promise.resolve(Response.json({ removed: historyStore().removeMany(ids) }));
  });
}
