/**
 * Poll a job's status until it is terminal (STORY_009). Schedule 1 s, 2 s, then 5 s between polls; stops on the first
 * terminal response; aborts cleanly on an AbortSignal (nothing is scheduled after that); a transient failure is retried
 * on the next tick, and after `maxConsecutiveFailures` in a row the job is reported `failed` with code `unreachable`.
 * Uses the global timers so tests drive it with fake timers.
 */
import { isTerminal, type JobStatusResponse } from "./job-api";

export const DEFAULT_SCHEDULE_MS: readonly number[] = [1000, 2000, 5000];
export const DEFAULT_MAX_CONSECUTIVE_FAILURES = 5;

export interface PollOptions {
  readonly signal?: AbortSignal;
  readonly scheduleMs?: readonly number[];
  readonly maxConsecutiveFailures?: number;
  /** Called with every status response, including the terminal one. */
  readonly onUpdate?: (response: JobStatusResponse) => void;
}

export class PollAbortedError extends Error {
  override readonly name = "PollAbortedError";
}

export function unreachable(id: string, progress: number, cause: unknown): JobStatusResponse {
  const message = cause instanceof Error ? cause.message : String(cause);
  return { id, status: "failed", progress, error: { code: "unreachable", message: `the generation server stopped answering: ${message}` } };
}

function delay(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PollAbortedError("polling aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new PollAbortedError("polling aborted"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function pollUntilTerminal(
  id: string,
  fetchStatus: () => Promise<JobStatusResponse>,
  options: PollOptions = {},
): Promise<JobStatusResponse> {
  const schedule = options.scheduleMs ?? DEFAULT_SCHEDULE_MS;
  const maxFailures = options.maxConsecutiveFailures ?? DEFAULT_MAX_CONSECUTIVE_FAILURES;
  const last = schedule[schedule.length - 1] ?? 5000;
  let attempt = 0;
  let failures = 0;
  let progress = 0;
  for (;;) {
    await delay(schedule[attempt] ?? last, options.signal);
    attempt += 1;
    let response: JobStatusResponse;
    try {
      response = await fetchStatus();
      failures = 0;
    } catch (error) {
      if (options.signal?.aborted) throw new PollAbortedError("polling aborted");
      failures += 1;
      if (failures >= maxFailures) {
        const final = unreachable(id, progress, error);
        options.onUpdate?.(final);
        return final;
      }
      continue;
    }
    progress = Math.max(progress, response.progress);
    options.onUpdate?.(response);
    if (isTerminal(response.status)) return response;
  }
}
