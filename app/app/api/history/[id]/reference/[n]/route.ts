import { readFileSync } from "node:fs";
import { contentDisposition } from "@/lib/content-disposition";
import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { referenceFilePath, removeReferenceFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string; readonly n: string }> };

function find(id: string, n: string) {
  const entry = historyStore().get(id);
  const ref = entry?.referenceFiles?.find((r) => String(r.n) === n);
  return entry && ref ? { entry, ref } : undefined;
}

/** GET /api/history/:id/reference/:n — a reference image kept with the job (STORY_032; Assets › From you). */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id, n } = await context.params;
    const found = find(id, n);
    if (!found) return errorResponse({ status: 404, code: "not_found", message: `no reference image ${n} on ${id}` });
    let bytes: Buffer;
    try {
      bytes = readFileSync(referenceFilePath(id, found.ref));
    } catch {
      return errorResponse({ status: 404, code: "not_found", message: `reference image ${n} of ${id} is no longer on disk` });
    }
    return new Response(new Uint8Array(bytes), { headers: { "content-type": found.ref.type || "application/octet-stream", "content-length": String(bytes.length), "content-disposition": contentDisposition(found.ref.name, "inline"), "cache-control": "private, max-age=3600" } });
  });
}

/** DELETE /api/history/:id/reference/:n — the file only; the task stays. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id, n } = await context.params;
    const found = find(id, n);
    if (!found) return errorResponse({ status: 404, code: "not_found", message: `no reference image ${n} on ${id}` });
    removeReferenceFile(id, found.ref);
    historyStore().patch(id, { referenceFiles: (found.entry.referenceFiles ?? []).filter((r) => r.n !== found.ref.n) });
    return new Response(null, { status: 204 });
  });
}
