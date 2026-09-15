/**
 * The queue's ticker (STORY_042): runs the queue runner every interval from the app's server process, so a request
 * held by a run-at time or waiting for a slot goes with no browser open. Started once from instrumentation.ts;
 * `unref`'d so it never keeps the process alive; a tick that throws is logged and the next tick still runs.
 */
export interface QueueTickerOptions {
  readonly intervalMs: number;
  readonly run: () => Promise<unknown>;
  readonly log?: (message: string) => void;
}

export interface QueueTicker {
  readonly intervalMs: number;
  stop(): void;
}

let current: QueueTicker | undefined;

/** Start the process's one ticker; a second call returns the running one. `intervalMs` 0 (or less) starts nothing. */
export function startQueueTicker(options: QueueTickerOptions): QueueTicker | undefined {
  if (current) return current;
  if (!(options.intervalMs > 0)) return undefined;
  const log = options.log ?? ((message: string) => { console.log(`[queue] ${message}`); });
  const timer = setInterval(() => {
    options.run().catch((error: unknown) => {
      log(`tick failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, options.intervalMs);
  timer.unref();
  const ticker: QueueTicker = {
    intervalMs: options.intervalMs,
    stop: () => {
      clearInterval(timer);
      if (current === ticker) current = undefined;
    },
  };
  current = ticker;
  log(`ticker started: every ${String(options.intervalMs)} ms`);
  return ticker;
}

/** For tests: the running ticker, if any. */
export function currentQueueTicker(): QueueTicker | undefined {
  return current;
}
