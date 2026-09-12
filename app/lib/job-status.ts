/**
 * The client-side job state (STORY_009): a pure reducer over status responses. Terminal states absorb every later
 * update; progress is clamped to 0–100 and never goes backwards; a cancel request is remembered until the server
 * confirms (or the job ends some other way). Never blocks: it is data in, data out.
 */
import { isTerminal, type JobError, type JobResult, type JobStatus, type JobStatusResponse } from "./job-api";

export interface JobSnapshot {
  readonly id: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly error?: JobError;
  readonly result?: JobResult;
  /** The user asked to cancel and the server has not yet reported `cancelled`. */
  readonly cancelRequested: boolean;
}
export type JobEvent = { readonly type: "status"; readonly response: JobStatusResponse } | { readonly type: "cancel-requested" };

export function initialJob(id: string): JobSnapshot {
  return { id, status: "queued", progress: 0, cancelRequested: false };
}

function clamp(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function reduceJob(state: JobSnapshot, event: JobEvent): JobSnapshot {
  if (isTerminal(state.status)) return state;
  if (event.type === "cancel-requested") {
    return state.cancelRequested ? state : { ...state, cancelRequested: true };
  }
  const { response } = event;
  if (response.id !== state.id) return state;
  const progress = Math.max(state.progress, clamp(response.progress));
  const terminal = isTerminal(response.status);
  return {
    id: state.id,
    status: response.status,
    progress: response.status === "done" ? 100 : progress,
    ...(response.error ? { error: response.error } : {}),
    ...(response.result ? { result: response.result } : {}),
    cancelRequested: terminal ? false : state.cancelRequested,
  };
}

export { isTerminal };
