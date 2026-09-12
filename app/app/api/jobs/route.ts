import { historyStore } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";
import { errorResponse, forward, guarded, relayJson } from "@/lib/model-client";
import { validateReferenceImages } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

interface Fields {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
}

function fieldsFrom(source: Record<string, unknown>): Fields {
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const raw = source["durationSeconds"];
  return { prompt: str(source["prompt"]), ratio: str(source["ratio"]), resolution: str(source["resolution"]), durationSeconds: typeof raw === "number" ? raw : Number(str(raw)), model: str(source["model"]) || "minimax-h3" };
}

/** After the server accepted the job, record it in history BEFORE answering the browser (STORY_014). */
async function accepted(response: Response, fields: Fields, referenceImages: number): Promise<Response> {
  if (response.status !== 202) return relayJson(response);
  const body = (await response.json()) as CreateJobResponse;
  historyStore().create({ id: body.id, prompt: fields.prompt, params: { ratio: fields.ratio, resolution: fields.resolution, durationSeconds: fields.durationSeconds, model: fields.model }, referenceImages });
  return Response.json(body, { status: 202 });
}

/** POST /api/jobs — create a job. JSON or multipart (with up to two `referenceImage` files), validated before forwarding. */
export function POST(request: Request): Promise<Response> {
  return guarded(async () => {
    const contentType = request.headers.get("content-type") ?? "";
    const script = new URL(request.url).searchParams.get("script");
    const path = script === null ? "/jobs" : `/jobs?script=${encodeURIComponent(script)}`;

    if (contentType.startsWith("application/json")) {
      const text = await request.text();
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        // the upstream validates and answers 400
      }
      const fields = fieldsFrom(typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {});
      return accepted(await forward(path, { method: "POST", headers: { "content-type": "application/json" }, body: text }), fields, 0);
    }
    if (contentType.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("referenceImage").filter((v): v is File => v instanceof File);
      const verdict = validateReferenceImages(files);
      if (!verdict.ok) return errorResponse({ status: 400, code: "validation", message: verdict.message, field: verdict.field });
      const out = new FormData();
      const source: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        if (key === "referenceImage") continue;
        if (typeof value === "string") {
          out.set(key, value);
          source[key] = value;
        }
      }
      for (const file of files) out.append("referenceImage", file, file.name);
      return accepted(await forward(path, { method: "POST", body: out }), fieldsFrom(source), files.length);
    }
    return errorResponse({ status: 415, code: "unsupported_media_type", message: "send application/json or multipart/form-data" });
  });
}
