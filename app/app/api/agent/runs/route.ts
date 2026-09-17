import { runDirector } from "@/lib/agent-service";
import { listAgentRuns } from "@/lib/agent-run-store";
import { errorResponse, guarded } from "@/lib/model-client";
import { validateReferenceImages } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

/** GET /api/agent/runs — the runs that ended without a prompt, newest first (STORY_050's Inbox rows). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json({ runs: listAgentRuns() })));
}

/**
 * POST /api/agent/runs — the director writes a prompt (STORY_049). Multipart: `skill`, one `referenceImage`, `notes`;
 * `?script=` picks the fake's outcome in the gate. 200 { kind: "prompt", prompt, findings, segments } or
 * { kind: "refusal", message }; the errors in the contract's shape. Aborting the request aborts the call to the model.
 */
export function POST(request: Request): Promise<Response> {
  return guarded(async () => {
    if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return errorResponse({ status: 415, code: "unsupported_media_type", message: "send multipart/form-data with skill, referenceImage and notes" });
    const form = await request.formData();
    const skill = form.get("skill");
    if (typeof skill !== "string" || skill.trim() === "") return errorResponse({ status: 400, code: "validation", message: "skill is required", field: "skill" });
    const files = form.getAll("referenceImage").filter((v): v is File => v instanceof File);
    if (files.length !== 1) return errorResponse({ status: 400, code: "validation", message: files.length === 0 ? "attach the photo the director starts from" : "the director takes one photo", field: "referenceImage" });
    const verdict = validateReferenceImages(files);
    if (!verdict.ok) return errorResponse({ status: 400, code: "validation", message: verdict.message, field: verdict.field });
    const file = files[0];
    if (file === undefined) return errorResponse({ status: 400, code: "validation", message: "attach the photo the director starts from", field: "referenceImage" });
    const notesRaw = form.get("notes");
    const notes = typeof notesRaw === "string" ? notesRaw : "";
    const script = new URL(request.url).searchParams.get("script") ?? undefined;
    const outcome = await runDirector({ skillId: skill.trim(), image: { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type }, notes, signal: request.signal, ...(script === undefined ? {} : { script }) });
    if (outcome.kind === "error") return errorResponse({ status: outcome.status, code: outcome.code, message: outcome.message });
    return Response.json(outcome);
  });
}
