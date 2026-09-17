import { readFileSync } from "node:fs";
import { clearReference, listInstructions, referenceLocation, setHistoryReference, setUploadedReference } from "@/lib/agent-instruction-store";
import { historyStore } from "@/lib/history-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { validateReferenceImages } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/agent/instructions/:id/reference — the instruction's image (an upload, or a job's own reference file). */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const row = listInstructions().find((r) => r.id === id);
    if (row === undefined) return errorResponse({ status: 404, code: "not_found", message: "no such instruction" });
    const location = referenceLocation(row);
    if (location === undefined) return errorResponse({ status: 404, code: "not_found", message: "the instruction has no reference image, or its file is gone" });
    return new Response(new Uint8Array(readFileSync(location.path)), { status: 200, headers: { "content-type": location.mimeType, "cache-control": "no-store" } });
  });
}

/**
 * POST /api/agent/instructions/:id/reference — multipart `referenceImage` (an upload, validated as a job's is), or JSON
 * { historyId, n } (a job's own reference image from Assets › From you).
 */
export function POST(request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    if (listInstructions().every((r) => r.id !== id)) return errorResponse({ status: 404, code: "not_found", message: "no such instruction" });
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("referenceImage").filter((v): v is File => v instanceof File);
      if (files.length !== 1) return errorResponse({ status: 400, code: "validation", message: "send one referenceImage", field: "referenceImage" });
      const verdict = validateReferenceImages(files);
      if (!verdict.ok) return errorResponse({ status: 400, code: "validation", message: verdict.message, field: verdict.field });
      const file = files[0];
      if (file === undefined) return errorResponse({ status: 400, code: "validation", message: "send one referenceImage", field: "referenceImage" });
      return Response.json(await setUploadedReference(id, file));
    }
    if (contentType.startsWith("application/json")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse({ status: 400, code: "validation", message: "send { historyId, n }" });
      }
      const o = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      const historyId = o["historyId"];
      const n = o["n"];
      if (typeof historyId !== "string" || typeof n !== "number") return errorResponse({ status: 400, code: "validation", message: "send { historyId, n }", field: "historyId" });
      const entry = historyStore().get(historyId);
      if (entry === undefined || !entry.referenceFiles?.some((f) => f.n === n)) return errorResponse({ status: 404, code: "not_found", message: "no such reference image in the history", field: "historyId" });
      return Response.json(setHistoryReference(id, historyId, n));
    }
    return errorResponse({ status: 415, code: "unsupported_media_type", message: "send multipart/form-data with referenceImage, or JSON { historyId, n }" });
  });
}

/** DELETE /api/agent/instructions/:id/reference — the instruction keeps its text, loses its image. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    const row = clearReference(id);
    if (row === undefined) return errorResponse({ status: 404, code: "not_found", message: "no such instruction" });
    return Response.json(row);
  });
}
