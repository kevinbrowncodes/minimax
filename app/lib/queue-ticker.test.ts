import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentQueueTicker, startQueueTicker } from "./queue-ticker";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  currentQueueTicker()?.stop();
  vi.useRealTimers();
});

describe("the queue's ticker (STORY_042)", () => {
  it("runs once per interval and not at start, keeps going after a failed tick, stops, and is one per process", async () => {
    const run = vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(1);
    const log = vi.fn();
    const ticker = startQueueTicker({ intervalMs: 30_000, run, log });
    expect(ticker?.intervalMs).toBe(30_000);
    expect(run).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("ticker started: every 30000 ms");
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("tick failed: disk full");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(3); // the failure did not stop it
    expect(startQueueTicker({ intervalMs: 5_000, run, log })).toBe(ticker); // one per process
    ticker?.stop();
    expect(currentQueueTicker()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("starts nothing for a zero or negative interval (the gate's Playwright server sets 0)", () => {
    expect(startQueueTicker({ intervalMs: 0, run: () => Promise.resolve(), log: () => undefined })).toBeUndefined();
    expect(startQueueTicker({ intervalMs: -1, run: () => Promise.resolve(), log: () => undefined })).toBeUndefined();
    expect(currentQueueTicker()).toBeUndefined();
  });
});
