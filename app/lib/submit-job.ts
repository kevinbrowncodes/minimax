/** Send the composer's request to the app's own route (STORY_013). JSON without images, multipart with them. */
import type { ApiError, CreateJobResponse } from "./job-api";
import type { ComposerImage, ComposerState } from "./composer-state";

export type SubmitResult = { readonly ok: true; readonly id: string; readonly position?: number } | { readonly ok: false; readonly status: number; readonly message: string; readonly field?: string };

/**
 * STORY_044: one segment of a chain — its own prompt, its source (undefined for a fresh clip), its images (none on an
 * extension) and run-at. Without an override the request is the composer's state as it stands.
 */
export interface SegmentRequest {
  readonly prompt: string;
  readonly continueFrom?: string;
  readonly images?: readonly ComposerImage[];
  readonly notBefore?: string;
  /** STORY_041: only a chain's first segment may replace the queued request being edited. */
  readonly replaces?: string;
}

export function buildJobRequest(state: ComposerState, segment?: SegmentRequest): { readonly url: string; readonly init: RequestInit } {
  const prompt = (segment?.prompt ?? state.text).trim();
  const continueFrom = segment ? segment.continueFrom : state.extend?.id;
  const images = segment ? (segment.images ?? []) : state.images;
  const notBefore = segment ? segment.notBefore : state.notBefore;
  const replaces = segment ? segment.replaces : state.queueId;
  const fields = {
    prompt,
    ratio: state.ratio,
    resolution: state.resolution,
    durationSeconds: state.durationSeconds,
    model: state.model,
    // STORY_031: the project the task starts in; the route keeps it and never forwards it.
    ...(state.projectId === undefined ? {} : { projectId: state.projectId }),
    // STORY_041: a run-at time holds the request in the app's queue; an Edit replaces its entry. Never forwarded.
    ...(notBefore === undefined ? {} : { notBefore }),
    ...(replaces === undefined ? {} : { replaces }),
    // STORY_016: an extension names its source and the context; it never carries images.
    ...(continueFrom === undefined ? {} : { continueFrom, overlapFrames: state.overlapFrames }),
  };
  // A `?script=` on the page URL is forwarded so the e2e lane can choose the stub's outcome; the adapter ignores it.
  const script = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("script");
  const url = script === null ? "/api/jobs" : `/api/jobs?script=${encodeURIComponent(script)}`;
  if (images.length === 0 || continueFrom !== undefined) {
    return { url, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fields) } };
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));
  for (const image of images) form.append("referenceImage", image.file, image.name);
  return { url, init: { method: "POST", body: form } };
}

export async function submitJob(state: ComposerState, fetchImpl: typeof fetch = fetch, segment?: SegmentRequest): Promise<SubmitResult> {
  const { url, init } = buildJobRequest(state, segment);
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    return { ok: false, status: 0, message: `The app could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (response.status === 202) {
    const body = (await response.json()) as CreateJobResponse;
    return { ok: true, id: body.id, ...(body.position === undefined ? {} : { position: body.position }) };
  }
  let message = `The generation server answered ${String(response.status)}`;
  let field: string | undefined;
  try {
    const body = (await response.json()) as ApiError;
    message = body.error.message;
    field = body.error.field;
  } catch {
    // keep the status message
  }
  // A 503 carries the adapter's own reason (e.g. "ComfyUI is not running on the Spark — start it with …"); keep it.
  if (response.status === 503 && message === `The generation server answered 503`) message = "The Spark is busy; try again in a moment";
  return { ok: false, status: response.status, message, ...(field === undefined ? {} : { field }) };
}

export type ChainResult = { readonly ok: true; readonly ids: readonly string[] } | { readonly ok: false; readonly sent: readonly string[]; readonly index: number; readonly message: string; readonly field?: string };

/**
 * STORY_044: post a chain's segments one after another, each after the previous 202 — the first as the composer would
 * post a single request (its images or its source, its run-at, its Edit), each next as an extension of the id just
 * answered, so STORY_043 holds it in the line until its source is done. A refusal stops the sequence: the accepted
 * segments are real requests and stay; the result says which segment failed and why.
 */
export async function submitChain(state: ComposerState, prompts: readonly string[], fetchImpl: typeof fetch = fetch): Promise<ChainResult> {
  const ids: string[] = [];
  for (const [i, prompt] of prompts.entries()) {
    const segment: SegmentRequest = i === 0
      ? { prompt, ...(state.extend === undefined ? { images: state.images } : { continueFrom: state.extend.id }), ...(state.notBefore === undefined ? {} : { notBefore: state.notBefore }), ...(state.queueId === undefined ? {} : { replaces: state.queueId }) }
      : { prompt, continueFrom: ids[i - 1] };
    const result = await submitJob(state, fetchImpl, segment);
    if (!result.ok) return { ok: false, sent: ids, index: i, message: result.message, ...(result.field === undefined ? {} : { field: result.field }) };
    ids.push(result.id);
  }
  return { ok: true, ids };
}

export type DrawsResult = { readonly ok: true; readonly ids: readonly string[]; readonly position?: number } | { readonly ok: false; readonly sent: readonly string[]; readonly index: number; readonly message: string; readonly field?: string };

/**
 * STORY_055: the same single-clip request `count` times, one after another, each after the previous 202 — the first
 * as the composer would post it (its images, its run-at, its Edit's `replaces`), the rest as new requests with the
 * same images and run-at (they wait together), never with a seed: the adapter draws one per job. A refusal stops the
 * sequence: the accepted draws are real requests and stay; the result says which draw failed and why. A count of 1
 * is today's one submitJob.
 */
export async function submitDraws(state: ComposerState, count: number, fetchImpl: typeof fetch = fetch, prompt: string = state.text): Promise<DrawsResult> {
  const ids: string[] = [];
  let position: number | undefined;
  for (let i = 0; i < Math.max(1, count); i += 1) {
    // in extend mode every draw extends the same source (the images are ignored by the request builder then, as today)
    const segment: SegmentRequest = { prompt, images: state.images, ...(state.extend === undefined ? {} : { continueFrom: state.extend.id }), ...(state.notBefore === undefined ? {} : { notBefore: state.notBefore }), ...(i === 0 && state.queueId !== undefined ? { replaces: state.queueId } : {}) };
    const result = await submitJob(state, fetchImpl, segment);
    if (!result.ok) return { ok: false, sent: ids, index: i, message: result.message, ...(result.field === undefined ? {} : { field: result.field }) };
    ids.push(result.id);
    if (i === 0) position = result.position;
  }
  return { ok: true, ids, ...(position === undefined ? {} : { position }) };
}

/** STORY_050: what `POST /api/agent/runs` answers, as the composer reads it. */
export type AgentRunResult =
  | { readonly kind: "prompt"; readonly prompt: string; readonly findings: readonly { readonly code: string; readonly message: string; readonly segment?: number }[]; readonly segments: number }
  | { readonly kind: "refusal"; readonly message: string }
  | { readonly kind: "error"; readonly status: number; readonly message: string }
  | { readonly kind: "stopped" };

/**
 * STORY_050: the director run — the skill, the one photo and the notes as multipart; `?agentScript=` on the page URL
 * forwarded as `?script=` so the e2e lane picks the fake's outcome (the jobs route's `?script=` is untouched). The
 * caller's signal aborts the request; an abort is "stopped", never an error.
 */
export async function submitAgentRun(state: ComposerState, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<AgentRunResult> {
  const image = state.images[0];
  const skillId = state.agent.skillId;
  if (image === undefined || skillId === undefined) return { kind: "error", status: 0, message: "Attach the photo the director starts from" };
  const form = new FormData();
  form.set("skill", skillId);
  form.set("notes", state.text);
  form.append("referenceImage", image.file, image.name);
  const script = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("agentScript");
  const url = script === null ? "/api/agent/runs" : `/api/agent/runs?script=${encodeURIComponent(script)}`;
  let response: Response;
  try {
    response = await fetchImpl(url, { method: "POST", body: form, ...(signal === undefined ? {} : { signal }) });
  } catch (error) {
    if (signal?.aborted) return { kind: "stopped" };
    return { kind: "error", status: 0, message: `The agent could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: "error", status: response.status, message: `The agent answered ${String(response.status)} without JSON` };
  }
  const o = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (response.ok && o["kind"] === "prompt" && typeof o["prompt"] === "string") return { kind: "prompt", prompt: o["prompt"], findings: Array.isArray(o["findings"]) ? (o["findings"] as AgentRunResult extends { findings: infer F } ? F : never) : [], segments: typeof o["segments"] === "number" ? o["segments"] : 1 };
  if (response.ok && o["kind"] === "refusal" && typeof o["message"] === "string") return { kind: "refusal", message: o["message"] };
  const err = typeof o["error"] === "object" && o["error"] !== null ? (o["error"] as Record<string, unknown>) : {};
  const code = typeof err["code"] === "string" ? err["code"] : "";
  const message = typeof err["message"] === "string" ? err["message"] : `The agent answered ${String(response.status)}`;
  const prefix = code === "unreachable" ? "The agent could not be reached: " : code === "quota" ? "Google's quota: " : code === "timeout" ? "" : code === "not_configured" ? "The agent is not configured: " : "";
  return { kind: "error", status: response.status, message: `${prefix}${message}` };
}
