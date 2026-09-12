import { errorResponse, forward, guarded, relayJson } from "@/lib/model-client";
import { validateReferenceImages } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

/** POST /api/jobs — create a job. JSON or multipart (with up to two `referenceImage` files), validated before forwarding. */
export function POST(request: Request): Promise<Response> {
  return guarded(async () => {
    const contentType = request.headers.get("content-type") ?? "";
    const script = new URL(request.url).searchParams.get("script");
    const path = script === null ? "/jobs" : `/jobs?script=${encodeURIComponent(script)}`;

    if (contentType.startsWith("application/json")) {
      const body = await request.text();
      return relayJson(await forward(path, { method: "POST", headers: { "content-type": "application/json" }, body }));
    }
    if (contentType.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("referenceImage").filter((v): v is File => v instanceof File);
      const verdict = validateReferenceImages(files);
      if (!verdict.ok) return errorResponse({ status: 400, code: "validation", message: verdict.message, field: verdict.field });
      const out = new FormData();
      for (const [key, value] of form.entries()) {
        if (key === "referenceImage") continue;
        if (typeof value === "string") out.set(key, value);
      }
      for (const file of files) out.append("referenceImage", file, file.name);
      return relayJson(await forward(path, { method: "POST", body: out }));
    }
    return errorResponse({ status: 415, code: "unsupported_media_type", message: "send application/json or multipart/form-data" });
  });
}
