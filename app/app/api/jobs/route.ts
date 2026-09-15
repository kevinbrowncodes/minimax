import { historyStore } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";
import { errorResponse, forward, guarded, relayJson } from "@/lib/model-client";
import { projectStore } from "@/lib/project-store";
import { randomUUID } from "node:crypto";
import { enqueue, getQueued, replaceQueued, type QueueEntry } from "@/lib/queue-store";
import { removeUploads, saveReferenceFiles } from "@/lib/uploads";
import { validateReferenceImages } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

interface Fields {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  /** STORY_016/017: an extension's source and requested overlap. */
  readonly continueFrom?: string;
  readonly overlapFrames?: number;
  /** STORY_031: the project the task starts in; ours alone, never forwarded to the model. */
  readonly projectId?: string;
  /** STORY_041 (ours alone): hold the request until this time; Edit of a waiting request. */
  readonly notBefore?: string;
  readonly replaces?: string;
}

function fieldsFrom(source: Record<string, unknown>): Fields {
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const num = (v: unknown): number => (typeof v === "number" ? v : Number(str(v)));
  const continueFrom = str(source["continueFrom"]).trim();
  const overlap = source["overlapFrames"];
  const projectId = str(source["projectId"]).trim();
  const notBefore = str(source["notBefore"]).trim();
  const replaces = str(source["replaces"]).trim();
  return {
    prompt: str(source["prompt"]),
    ratio: str(source["ratio"]),
    resolution: str(source["resolution"]),
    durationSeconds: num(source["durationSeconds"]),
    model: str(source["model"]) || "minimax-h3",
    ...(continueFrom === "" ? {} : { continueFrom }),
    ...(continueFrom !== "" && overlap !== undefined && overlap !== null && overlap !== "" ? { overlapFrames: num(overlap) } : {}),
    ...(projectId === "" ? {} : { projectId }),
    ...(notBefore === "" ? {} : { notBefore }),
    ...(replaces === "" ? {} : { replaces }),
  };
}

/** The app's own fields never reach the model server (STORY_031, STORY_041). */
const APP_ONLY = new Set(["projectId", "notBefore", "replaces"]);

function queuedRequest(fields: Fields, script: string | null): QueueEntry["request"] {
  return {
    prompt: fields.prompt,
    ratio: fields.ratio,
    resolution: fields.resolution,
    durationSeconds: fields.durationSeconds,
    model: fields.model,
    ...(fields.continueFrom === undefined ? {} : { continueFrom: fields.continueFrom }),
    ...(fields.overlapFrames === undefined ? {} : { overlapFrames: fields.overlapFrames }),
    ...(fields.projectId === undefined ? {} : { projectId: fields.projectId }),
    ...(script === null ? {} : { script }),
  };
}

/**
 * STORY_041: keep the request in the app's queue — the model server was busy, or the owner timed it. The history entry
 * is created now, under the queue's id, as a queued job; the runner submits it later and records the model server's id.
 */
async function queued(fields: Fields, files: readonly File[], script: string | null): Promise<Response> {
  if (fields.notBefore !== undefined && Number.isNaN(Date.parse(fields.notBefore))) return errorResponse({ status: 400, code: "validation", message: "notBefore must be an ISO date-time", field: "notBefore" });
  const id = randomUUID();
  const referenceFiles = await saveReferenceFiles(id, files);
  const entry = enqueue({ id, request: queuedRequest(fields, script), referenceFiles, ...(fields.notBefore === undefined ? {} : { notBefore: new Date(fields.notBefore).toISOString() }) });
  historyStore().create({
    id,
    prompt: fields.prompt,
    params: { ratio: fields.ratio, resolution: fields.resolution, durationSeconds: fields.durationSeconds, model: fields.model, ...(fields.overlapFrames === undefined ? {} : { overlapFrames: fields.overlapFrames }) },
    referenceImages: files.length,
    ...(fields.projectId === undefined ? {} : { projectId: fields.projectId }),
    ...(referenceFiles.length === 0 ? {} : { referenceFiles }),
  });
  return Response.json({ id, status: "queued", progress: 0, position: entry.position }, { status: 202 });
}

/** STORY_041: Edit — rewrite a waiting request in place; new images replace the old ones, none sent keeps them. */
async function replaced(fields: Fields, files: readonly File[], script: string | null): Promise<Response> {
  const id = fields.replaces ?? "";
  const current = getQueued(id);
  if (!current) return errorResponse({ status: 404, code: "not_found", message: `no queued request ${id}`, field: "replaces" });
  if (current.jobId !== undefined) return errorResponse({ status: 409, code: "already_started", message: "that request has already been submitted; it can no longer be edited", field: "replaces" });
  if (fields.notBefore !== undefined && Number.isNaN(Date.parse(fields.notBefore))) return errorResponse({ status: 400, code: "validation", message: "notBefore must be an ISO date-time", field: "notBefore" });
  let referenceFiles = current.referenceFiles;
  if (files.length > 0) {
    removeUploads(id);
    referenceFiles = await saveReferenceFiles(id, files);
  }
  const entry = replaceQueued(id, { request: queuedRequest(fields, script), referenceFiles, ...(fields.notBefore === undefined ? {} : { notBefore: new Date(fields.notBefore).toISOString() }) });
  historyStore().patch(id, {
    prompt: fields.prompt,
    params: { ratio: fields.ratio, resolution: fields.resolution, durationSeconds: fields.durationSeconds, model: fields.model, ...(fields.overlapFrames === undefined ? {} : { overlapFrames: fields.overlapFrames }) },
    referenceImages: referenceFiles.length,
    referenceFiles,
    projectId: fields.projectId,
  });
  return Response.json({ id, status: "queued", progress: 0, position: getQueued(id)?.position ?? 0, replaced: entry !== undefined }, { status: 202 });
}

/** The model server's answer: 202 → recorded; 503 busy → the app's queue (STORY_041); anything else relayed. */
async function accepted(response: Response, fields: Fields, files: readonly File[], script: string | null): Promise<Response> {
  if (response.status === 503) {
    const text = await response.text();
    let code = "";
    try {
      code = (JSON.parse(text) as { error?: { code?: string } }).error?.code ?? "";
    } catch {
      code = "";
    }
    if (code === "busy") return queued(fields, files, script);
    return relayJson(new Response(text, { status: 503, headers: { "content-type": "application/json" } }));
  }
  return recorded(response, fields, files);
}

/** STORY_031: a named project must exist before a job is created in it. */
function unknownProject(fields: Fields): Response | undefined {
  if (fields.projectId !== undefined && !projectStore().get(fields.projectId)) return errorResponse({ status: 400, code: "validation", message: "projectId must name a project", field: "projectId" });
  return undefined;
}

/** After the server accepted the job, record it in history BEFORE answering the browser (STORY_014); the reference images are kept with it (STORY_032). */
async function recorded(response: Response, fields: Fields, files: readonly File[]): Promise<Response> {
  if (response.status !== 202) return relayJson(response);
  const body = (await response.json()) as CreateJobResponse;
  const store = historyStore();
  const referenceFiles = await saveReferenceFiles(body.id, files);
  // STORY_016: an extension remembers its source by id and by the title it had (the source may leave history later).
  const source = fields.continueFrom === undefined ? undefined : store.get(fields.continueFrom);
  const continuesFrom = fields.continueFrom === undefined ? undefined : { id: fields.continueFrom, title: source?.title ?? fields.continueFrom, ...(source?.result ? { durationSeconds: source.result.durationSeconds } : {}) };
  store.create({
    id: body.id,
    prompt: fields.prompt,
    params: { ratio: fields.ratio, resolution: fields.resolution, durationSeconds: fields.durationSeconds, model: fields.model, ...(fields.overlapFrames === undefined ? {} : { overlapFrames: fields.overlapFrames }) },
    referenceImages: files.length,
    ...(continuesFrom ? { continuesFrom } : {}),
    ...(fields.projectId === undefined ? {} : { projectId: fields.projectId }),
    ...(referenceFiles.length === 0 ? {} : { referenceFiles }),
  });
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
      const source = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
      const fields = fieldsFrom(source ?? {});
      const refused = unknownProject(fields);
      if (refused) return refused;
      if (fields.replaces !== undefined) return replaced(fields, [], script);
      if (fields.notBefore !== undefined) return queued(fields, [], script);
      // the model never sees our own fields: the body goes up as sent unless it carried one
      const body = source && Object.keys(source).some((key) => APP_ONLY.has(key)) ? JSON.stringify(Object.fromEntries(Object.entries(source).filter(([key]) => !APP_ONLY.has(key)))) : text;
      return accepted(await forward(path, { method: "POST", headers: { "content-type": "application/json" }, body }), fields, [], script);
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
          if (!APP_ONLY.has(key)) out.set(key, value);
          source[key] = value;
        }
      }
      for (const file of files) out.append("referenceImage", file, file.name);
      const fields = fieldsFrom(source);
      const refused = unknownProject(fields);
      if (refused) return refused;
      if (fields.replaces !== undefined) return replaced(fields, files, script);
      if (fields.notBefore !== undefined) return queued(fields, files, script);
      return accepted(await forward(path, { method: "POST", body: out }), fields, files, script);
    }
    return errorResponse({ status: 415, code: "unsupported_media_type", message: "send application/json or multipart/form-data" });
  });
}
