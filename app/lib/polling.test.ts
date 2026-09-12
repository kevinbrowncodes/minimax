import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobStatusResponse } from "./job-api";
import { PollAbortedError, pollUntilTerminal } from "./polling";

const running = (progress: number): JobStatusResponse => ({ id: "j1", status: "running", progress });
const done: JobStatusResponse = { id: "j1", status: "done", progress: 100 };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("pollUntilTerminal", () => {
  it("polls at 1 s, 2 s, 5 s, 5 s and stops on the first terminal response", async () => {
    const fetchStatus = vi.fn<() => Promise<JobStatusResponse>>()
      .mockResolvedValueOnce(running(10))
      .mockResolvedValueOnce(running(20))
      .mockResolvedValueOnce(running(30))
      .mockResolvedValueOnce(done)
      .mockResolvedValue(done);
    const updates: number[] = [];
    const promise = pollUntilTerminal("j1", fetchStatus, { onUpdate: (r) => updates.push(r.progress) });
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchStatus).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchStatus).toHaveBeenCalledTimes(4);
    await expect(promise).resolves.toEqual(done);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(4);
    expect(updates).toEqual([10, 20, 30, 100]);
  });

  it("rejects with PollAbortedError on abort and schedules nothing afterwards", async () => {
    const controller = new AbortController();
    const fetchStatus = vi.fn<() => Promise<JobStatusResponse>>().mockResolvedValue(running(1));
    const promise = pollUntilTerminal("j1", fetchStatus, { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(PollAbortedError);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it("gives up as failed/unreachable after five consecutive errors, but four errors then a success continue", async () => {
    const failing = vi.fn<() => Promise<JobStatusResponse>>().mockRejectedValue(new Error("ECONNREFUSED"));
    const p1 = pollUntilTerminal("j1", failing);
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 5000 * 3);
    await expect(p1).resolves.toMatchObject({ status: "failed", error: { code: "unreachable" } });
    expect(failing).toHaveBeenCalledTimes(5);

    const flaky = vi.fn<() => Promise<JobStatusResponse>>()
      .mockRejectedValueOnce(new Error("1"))
      .mockRejectedValueOnce(new Error("2"))
      .mockRejectedValueOnce(new Error("3"))
      .mockRejectedValueOnce(new Error("4"))
      .mockResolvedValueOnce(running(50))
      .mockRejectedValueOnce(new Error("5"))
      .mockResolvedValue(done);
    const p2 = pollUntilTerminal("j1", flaky);
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 5000 * 5);
    await expect(p2).resolves.toEqual(done);
    expect(flaky).toHaveBeenCalledTimes(7);
  });
});
