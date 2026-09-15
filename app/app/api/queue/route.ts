import { errorResponse, guarded } from "@/lib/model-client";
import { submitDue } from "@/lib/queue-runner";
import { waiting } from "@/lib/queue-store";
import { historyStore } from "@/lib/history-store";

export const dynamic = "force-dynamic";

/** GET /api/queue — the waiting requests in line order, with their history titles (STORY_041); advances the line first. */
export function GET(): Promise<Response> {
  return guarded(async () => {
    await submitDue();
    const store = historyStore();
    const entries = waiting().map((e) => {
      const entry = store.get(e.id);
      return { id: e.id, position: e.position, title: entry?.title ?? e.request.prompt, createdAt: e.createdAt, ...(e.notBefore === undefined ? {} : { notBefore: e.notBefore }), referenceImages: e.referenceFiles.length, projectId: e.request.projectId };
    });
    return entries.length >= 0 ? Response.json({ entries }) : errorResponse({ status: 500, code: "internal", message: "unreachable" });
  });
}
