/** Send the composer's request to the app's own route (STORY_013). JSON without images, multipart with them. */
import type { ApiError, CreateJobResponse } from "./job-api";
import type { ComposerState } from "./composer-state";

export type SubmitResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly status: number; readonly message: string; readonly field?: string };

export function buildJobRequest(state: ComposerState): { readonly url: string; readonly init: RequestInit } {
  const fields = {
    prompt: state.text.trim(),
    ratio: state.ratio,
    resolution: state.resolution,
    durationSeconds: state.durationSeconds,
    model: state.model,
    // STORY_031: the project the task starts in; the route keeps it and never forwards it.
    ...(state.projectId === undefined ? {} : { projectId: state.projectId }),
    // STORY_016: an extension names its source and the context; it never carries images.
    ...(state.extend ? { continueFrom: state.extend.id, overlapFrames: state.overlapFrames } : {}),
  };
  // A `?script=` on the page URL is forwarded so the e2e lane can choose the stub's outcome; the adapter ignores it.
  const script = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("script");
  const url = script === null ? "/api/jobs" : `/api/jobs?script=${encodeURIComponent(script)}`;
  if (state.images.length === 0 || state.extend) {
    return { url, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fields) } };
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));
  for (const image of state.images) form.append("referenceImage", image.file, image.name);
  return { url, init: { method: "POST", body: form } };
}

export async function submitJob(state: ComposerState, fetchImpl: typeof fetch = fetch): Promise<SubmitResult> {
  const { url, init } = buildJobRequest(state);
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    return { ok: false, status: 0, message: `The app could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (response.status === 202) {
    const body = (await response.json()) as CreateJobResponse;
    return { ok: true, id: body.id };
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
