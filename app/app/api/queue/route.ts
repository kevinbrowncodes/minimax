import { errorResponse, forward, guarded } from "@/lib/model-client";
import { submitDue } from "@/lib/queue-runner";
import { waiting } from "@/lib/queue-store";
import { historyStore } from "@/lib/history-store";

export const dynamic = "force-dynamic";

/** CHORE_011: whether the model server answers, and whether the model behind it (ComfyUI) is reachable — from the adapter's /health. */
async function modelState(): Promise<{ readonly adapter: boolean; readonly comfyui: boolean }> {
  const res = await forward("/health").catch(() => undefined);
  if (!res?.ok) return { adapter: false, comfyui: false };
  try {
    const body = (await res.json()) as { comfyui?: { reachable?: boolean } };
    return { adapter: true, comfyui: body.comfyui?.reachable !== false }; // a server without the field (the stub) counts as reachable
  } catch {
    return { adapter: true, comfyui: true };
  }
}

/** GET /api/queue — the waiting requests in line order, with their history titles (STORY_041); advances the line first. CHORE_011: `model` says whether the line can move. */
export function GET(): Promise<Response> {
  return guarded(async () => {
    await submitDue();
    const model = await modelState();
    const store = historyStore();
    const entries = waiting().map((e) => {
      const entry = store.get(e.id);
      return { id: e.id, position: e.position, title: entry?.title ?? e.request.prompt, createdAt: e.createdAt, ...(e.notBefore === undefined ? {} : { notBefore: e.notBefore }), referenceImages: e.referenceFiles.length, projectId: e.request.projectId };
    });
    return entries.length >= 0 ? Response.json({ entries, model }) : errorResponse({ status: 500, code: "internal", message: "unreachable" });
  });
}
