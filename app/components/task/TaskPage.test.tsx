import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "@/lib/history-store";
import { TaskPage } from "./TaskPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({ id: "j1", title: "A boat", prompt: "A boat", params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z", status: "queued", progress: 0, ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const caps = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };

function fetchScript(statuses: readonly { status: string; progress: number; result?: unknown; error?: unknown }[]) {
  let polls = 0;
  const calls: string[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url.startsWith("/api/history/")) return Promise.resolve(json({}));
    if (url === "/api/jobs/j1" && (init?.method ?? "GET") === "GET") {
      const step = statuses[Math.min(polls, statuses.length - 1)];
      polls += 1;
      return Promise.resolve(json({ id: "j1", ...step }));
    }
    if (url === "/api/jobs/j1" && init?.method === "DELETE") return Promise.resolve(json({ id: "j1", status: "cancelled", progress: 41 }, 202));
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return { fetchImpl: vi.fn(impl), calls, polls: () => polls };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  push.mockReset();
});

describe("TaskPage", () => {
  it("polls a queued job under StrictMode, re-renders each response and stops at the terminal one", async () => {
    const script = fetchScript([{ status: "running", progress: 33 }, { status: "running", progress: 66 }, { status: "done", progress: 100, result: { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 2, width: 320, height: 180, sizeBytes: 40157 } }]);
    render(<StrictMode><TaskPage entry={entry()} fetchImpl={script.fetchImpl} /></StrictMode>);
    expect(screen.getByTestId("indicator")).toHaveTextContent("Queued…");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Generating… 33 %");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Generating… 66 %");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Your video is ready");
    expect(screen.getByTestId("result-video")).toHaveAttribute("src", "/api/jobs/j1/result");
    const pollsAtDone = script.polls();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(script.polls()).toBe(pollsAtDone);
    expect(screen.getAllByText("Validate the request")).toHaveLength(1);
    expect(script.calls.filter((c) => c.startsWith("PATCH /api/history/j1"))).toHaveLength(1);
  });

  it("Stop calls the cancel route and renders Cancelled at N %", async () => {
    const script = fetchScript([{ status: "running", progress: 41 }]);
    render(<StrictMode><TaskPage entry={entry({ status: "running", progress: 41 })} fetchImpl={script.fetchImpl} /></StrictMode>);
    await act(async () => {
      screen.getByRole("button", { name: "Stop generation" }).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(script.calls).toContain("DELETE /api/jobs/j1");
    expect(screen.getByRole("alert")).toHaveTextContent("Cancelled at 41 %");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(script.polls()).toBe(0);
  });

  it("a done entry renders the video and does not poll; a failed one offers Retry; moderated does not", async () => {
    const done = fetchScript([]);
    render(<TaskPage entry={entry({ status: "done", progress: 100, result: { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 5.2, width: 1344, height: 768, sizeBytes: 1_581_571 } })} fetchImpl={done.fetchImpl} />);
    expect(screen.getByTestId("result-video")).toHaveAttribute("poster", "/api/jobs/j1/poster");
    expect(screen.getByRole("link", { name: /Download/ })).toHaveAttribute("download", "A boat.mp4");
    expect(screen.getByText(/1344×768/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(done.polls()).toBe(0);
    cleanup();
    render(<TaskPage entry={entry({ status: "failed", progress: 40, error: { code: "generation_failed", message: "boom" } })} fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed — boom");
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
    cleanup();
    render(<TaskPage entry={entry({ status: "failed", progress: 0, error: { code: "moderated", message: "no" } })} fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.getByRole("alert")).toHaveTextContent("refused on content grounds");
    expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
  });
});
