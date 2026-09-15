import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShellContext, ShellStateProvider } from "@/components/shell/ShellContext";
import type { HistoryEntry } from "@/lib/history-store";
import { TaskPage } from "./TaskPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({ id: "j1", title: "A boat", prompt: "A boat", params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z", status: "queued", progress: 0, ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const caps = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };

function fetchScript(statuses: readonly { status: string; progress: number; result?: unknown; error?: unknown; request?: unknown }[]) {
  let polls = 0;
  const calls: string[] = [];
  const posts: string[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url === "/api/jobs" && init?.method === "POST") {
      posts.push(typeof init.body === "string" ? init.body : "");
      return Promise.resolve(json({ id: "j9", status: "queued", progress: 0 }, 202));
    }
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
  return { fetchImpl: vi.fn(impl), calls, posts, polls: () => polls };
}

/** The page under the state the Shell provides (STORY_023): the Work Area panel open, the preview pane closed. */
const shell = (page: ReactElement) => <ShellStateProvider scope="/task/j1">{page}</ShellStateProvider>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-12T18:00:20Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  push.mockReset();
});

describe("TaskPage — a request waiting in the queue (STORY_041)", () => {
  it("reads its place in line while the status answers queued with a position, then follows the job as usual", async () => {
    const waitingStep: { status: string; progress: number; position: number } = { status: "queued", progress: 0, position: 2 };
    const script = fetchScript([waitingStep, { status: "running", progress: 10 }, { status: "done", progress: 100, result: { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 2, width: 320, height: 180, sizeBytes: 40157 } }]);
    render(shell(<TaskPage entry={entry()} fetchImpl={script.fetchImpl} />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Waiting — 2nd in line");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Generating… 10 %");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent(/Done/);
  });
});

describe("TaskPage", () => {
  it("polls a queued job under StrictMode, re-renders each response and stops at the terminal one", async () => {
    const script = fetchScript([{ status: "running", progress: 33 }, { status: "running", progress: 66 }, { status: "done", progress: 100, result: { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 2, width: 320, height: 180, sizeBytes: 40157 } }]);
    render(shell(<StrictMode><TaskPage entry={entry()} fetchImpl={script.fetchImpl} /></StrictMode>));
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
    expect(screen.getByTestId("indicator")).toHaveTextContent("Done — 2.0 s · 320×180 · 39 KB");
    // the pane opened by itself when the job finished on the page (STORY_023's departure), the video inside it
    expect(within(screen.getByTestId("preview-pane")).getByTestId("result-video")).toHaveAttribute("src", "/api/jobs/j1/result");
    const pollsAtDone = script.polls();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(script.polls()).toBe(pollsAtDone);
    // the Work Area panel yields to the pane; Close brings it back with its Progress list
    expect(screen.queryByText("Validate the request")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
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
    render(shell(<TaskPage entry={entry({ status: "done", progress: 100, result: { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 5.2, width: 1344, height: 768, sizeBytes: 1_581_571 } })} fetchImpl={done.fetchImpl} />));
    // reopened from history: the card, not the player (task-page@1440); Download lives in the card's More menu
    expect(screen.getByTestId("result-card")).toHaveTextContent("A boat.mp4MP4");
    expect(screen.queryByTestId("result-video")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitem", { name: /Download/ })).toHaveAttribute("download", "A boat.mp4");
    expect(screen.getByRole("menuitem", { name: /Download/ })).toHaveAttribute("href", "/api/jobs/j1/result?download"); // BUG_004
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

describe("TaskPage — the shot-change notice (STORY_020, mounted by CHORE_009)", () => {
  const result = (cuts?: readonly { frame: number; seconds: number }[]) => ({ url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 12.25, width: 1344, height: 768, sizeBytes: 1000, ...(cuts ? { cuts } : {}) });

  it("names the time of one change, lists several, and shows nothing for [] or an older server without the field", () => {
    render(shell(<TaskPage entry={entry({ status: "done", progress: 100, result: result([{ frame: 270, seconds: 11.25 }]) })} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.getByTestId("cut-notice")).toHaveTextContent("The shot changed at 00:11");
    expect(screen.getByTestId("cut-notice")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("result-card")).toBeInTheDocument();
    cleanup();
    render(shell(<TaskPage entry={entry({ status: "done", progress: 100, result: result([{ frame: 142, seconds: 5.92 }, { frame: 270, seconds: 11.25 }, { frame: 521, seconds: 21.71 }]) })} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.getByTestId("cut-notice")).toHaveTextContent("The shot changed at 00:05, 00:11 and 00:21");
    cleanup();
    render(shell(<TaskPage entry={entry({ status: "done", progress: 100, result: result([]) })} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.queryByTestId("cut-notice")).not.toBeInTheDocument();
    cleanup();
    render(shell(<TaskPage entry={entry({ status: "done", progress: 100, result: result() })} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.queryByTestId("cut-notice")).not.toBeInTheDocument();
  });

  it("its Retry re-posts the request without a seed (an extension keeps continueFrom and the overlap) and opens the new task", async () => {
    const script = fetchScript([]);
    render(
      shell(
        <TaskPage
          entry={entry({ status: "done", progress: 100, result: result([{ frame: 270, seconds: 11.25 }]), params: { ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", overlapFrames: 39 }, continuesFrom: { id: "src", title: "The source", durationSeconds: 10.1 } })}
          fetchImpl={script.fetchImpl}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(within(screen.getByTestId("cut-notice")).getByRole("button", { name: "Retry" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(script.posts).toHaveLength(1);
    const body = JSON.parse(script.posts[0] ?? "{}") as Record<string, unknown>;
    expect(body).toMatchObject({ prompt: "A boat", continueFrom: "src", overlapFrames: 39, durationSeconds: 10 });
    expect(body).not.toHaveProperty("seed");
    expect(push).toHaveBeenCalledWith("/task/j9");
  });
});

describe("TaskPage — extend (STORY_016, STORY_017)", () => {
  const result = { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", frames: 56, durationSeconds: 2, width: 320, height: 180, sizeBytes: 1 };

  it("Extend puts the docked composer in extend mode and Stop extending leaves it; ?extend opens extending", () => {
    render(<TaskPage entry={entry({ status: "done", progress: 100, result })} fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.queryByTestId("continuation")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Extend/ }));
    expect(screen.getByTestId("continuation")).toHaveTextContent("Continues · 2.0 s");
    expect(screen.getByTestId("overlap-line")).toHaveTextContent("carries its last 1.6 s into the new clip");
    expect(screen.getByPlaceholderText("Describe what happens next…")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Stop extending" }));
    expect(screen.queryByTestId("continuation")).not.toBeInTheDocument();
    cleanup();
    render(<TaskPage entry={entry({ status: "done", progress: 100, result })} extendOnOpen fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.getByTestId("continuation")).toBeInTheDocument();
    cleanup();
    // failed: ?extend is ignored and there is no Extend action
    render(<TaskPage entry={entry({ status: "failed", progress: 0, error: { code: "generation_failed", message: "x" } })} extendOnOpen fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.queryByTestId("continuation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Queue an extension/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });

  it("a clip still running can be extended: Queue an extension (or ?extend) opens the pending tile with the requested length; Send posts continueFrom; Stop generation yields to Send while extending (STORY_043)", async () => {
    const script = fetchScript([{ status: "running", progress: 40 }]);
    render(shell(<TaskPage entry={entry({ status: "running", progress: 40 })} pendingSeconds={5} fetchImpl={script.fetchImpl} />));
    expect(screen.getByRole("button", { name: "Stop generation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Queue an extension/ }));
    const tile = screen.getByTestId("continuation");
    expect(tile).toHaveAttribute("data-pending", "true");
    expect(tile).toHaveTextContent("Continues · 5.0 s (not finished yet — the extension waits for it)");
    expect(screen.queryByRole("button", { name: "Stop generation" })).not.toBeInTheDocument(); // Send is back while extending
    fireEvent.change(screen.getByPlaceholderText("Describe what happens next…"), { target: { value: "and drifts on" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // the capabilities answer lands (fake timers: flush the microtasks)
    });
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    expect(script.posts).toHaveLength(1);
    expect(JSON.parse(script.posts[0] ?? "{}")).toMatchObject({ continueFrom: "j1", prompt: "and drifts on" });
    fireEvent.click(screen.getByRole("button", { name: "Stop extending" }));
    expect(screen.getByRole("button", { name: "Stop generation" })).toBeInTheDocument();
    cleanup();
    render(shell(<TaskPage entry={entry({ status: "queued", progress: 0 })} extendOnOpen pendingSeconds={9.3} fetchImpl={fetchScript([{ status: "queued", progress: 0 }]).fetchImpl} />));
    expect(screen.getByTestId("continuation")).toHaveTextContent("Continues · 9.3 s");
  });

  it("an extension's bubble names its source and what was carried, from history or from the first status", async () => {
    render(<TaskPage entry={entry({ status: "done", progress: 100, result, continuesFrom: { id: "src", title: "The first clip", durationSeconds: 10.125 }, overlap: { frames: 39, seconds: 1.625 } })} fetchImpl={fetchScript([]).fetchImpl} />);
    expect(screen.getByTestId("continues")).toHaveTextContent("Continues The first clip · 10.1 s · carried its last 1.6 s");
    expect(screen.getByRole("link", { name: "The first clip" })).toHaveAttribute("href", "/task/src");
    cleanup();
    const script = fetchScript([{ status: "running", progress: 10, request: { prompt: "p", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", referenceImages: 0, continueFrom: "src", overlap: { frames: 22, seconds: 0.917 } } }, { status: "done", progress: 100, result }]);
    render(<StrictMode><TaskPage entry={entry({ continuesFrom: { id: "src", title: "The first clip" } })} fetchImpl={script.fetchImpl} /></StrictMode>);
    expect(screen.getByTestId("continues")).toHaveTextContent("Continues The first clip");
    expect(screen.getByTestId("continues")).not.toHaveTextContent("carried");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId("continues")).toHaveTextContent("carried its last 0.9 s");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByTestId("indicator")).toHaveTextContent("Done — 2.0 s");
  });

  it("Retry of a failed extension re-posts continueFrom and the requested overlap", async () => {
    const script = fetchScript([]);
    render(<TaskPage entry={entry({ status: "failed", progress: 40, error: { code: "generation_failed", message: "boom" }, params: { ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", overlapFrames: 22 }, continuesFrom: { id: "src", title: "The first clip" } })} fetchImpl={script.fetchImpl} />);
    await act(async () => {
      screen.getByRole("button", { name: /Retry/ }).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(script.posts).toHaveLength(1);
    expect(JSON.parse(script.posts[0] ?? "{}")).toEqual({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", overlapFrames: 22, continueFrom: "src" });
    expect(push).toHaveBeenCalledWith("/task/j9");
  });
});

describe("TaskPage — the reference's task page (STORY_023)", () => {
  const result = { url: "/jobs/j1/result", posterUrl: "/jobs/j1/poster", mimeType: "video/mp4", durationSeconds: 5.2, width: 1344, height: 768, sizeBytes: 1_581_571 };
  const done = () => entry({ status: "done", progress: 100, result, finishedAt: "2026-09-12T18:00:20Z" });

  it("Open preview opens the pane with the playable video; Close, Escape and a Deliverables row drive it", () => {
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.queryByTestId("preview-pane")).not.toBeInTheDocument();
    expect(screen.getByTestId("work-area")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open preview" }));
    const pane = screen.getByTestId("preview-pane");
    expect(within(pane).getByTestId("result-video")).toHaveAttribute("poster", "/api/jobs/j1/poster");
    expect(within(pane).getByText("A boat.mp4")).toBeInTheDocument();
    expect(within(pane).getByRole("link", { name: /Download/ })).toHaveAttribute("href", "/api/jobs/j1/result?download");
    expect(screen.queryByTestId("work-area")).not.toBeInTheDocument(); // the panel yields to the pane
    fireEvent.click(within(pane).getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("preview-pane")).not.toBeInTheDocument();
    expect(screen.getByTestId("work-area")).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("work-area")).getByRole("button", { name: "A boat.mp4" }));
    expect(screen.getByTestId("preview-pane")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("preview-pane")).not.toBeInTheDocument();
  });

  it("the preview pane's Download ▾ offers Download, Copy link and Star; Star patches the entry and reads Unstar; Copy link copies the result's URL (STORY_032)", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const script = fetchScript([]);
    render(shell(<TaskPage entry={done()} fetchImpl={script.fetchImpl} />));
    fireEvent.click(screen.getByRole("button", { name: "Open preview" }));
    const pane = screen.getByTestId("preview-pane");
    expect(within(pane).getByRole("link", { name: /Download/ })).toHaveAttribute("href", "/api/jobs/j1/result?download");
    fireEvent.click(within(pane).getByRole("button", { name: "More download options" }));
    const menu = within(pane).getByRole("menu", { name: "Preview actions" });
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent.trim())).toEqual(["Download", "Copy link", "Star"]); // behaviour-preview-more-03 minus Refresh (Departures)
    expect(within(menu).getByRole("menuitem", { name: "Download" })).toHaveAttribute("download", "A boat.mp4");
    await act(async () => {
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Star" }));
      await Promise.resolve();
    });
    expect(script.calls).toContain("PATCH /api/history/j1");
    expect(within(pane).queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(within(pane).getByRole("button", { name: "More download options" }));
    expect(within(pane).getByRole("menuitem", { name: "Unstar" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(within(pane).getByRole("menuitem", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/api/jobs/j1/result`);
    fireEvent.click(within(pane).getByRole("button", { name: "More download options" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(within(pane).queryByRole("menu")).not.toBeInTheDocument();
  });

  it("the card's More menu offers Open preview, Download and Extend, and closes on Escape", () => {
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const menu = screen.getByRole("menu", { name: "Result actions" });
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent.trim())).toEqual(["Open preview", "Download", "⤴ Extend"]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Open preview" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-pane")).toBeInTheDocument();
  });

  it("Copy copies the prompt and the time is the finish time; Like / Dislike are gone (STORY_026)", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("A boat");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Like" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dislike" })).not.toBeInTheDocument();
    expect(screen.getByText(/^Sep 12, \d\d:\d\d$/)).toBeInTheDocument();
  });

  it("the Processed row shows the seconds the job took and unfolds the steps", () => {
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    const row = screen.getByRole("button", { name: /^Processed 20s/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByText("Validate the request")).toHaveLength(1); // the Work Area panel's list only
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Validate the request")).toHaveLength(2);
  });

  it("no credits notice and no disclaimer under the docked composer (STORY_026)", () => {
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    expect(screen.queryByTestId("credits-notice")).not.toBeInTheDocument();
    expect(screen.queryByText(/Credits remain/)).not.toBeInTheDocument();
    expect(screen.queryByText("MiniMax Agent is AI and can make mistakes")).not.toBeInTheDocument();
  });

  it("the Work Area panel lists the deliverable once done, folds, and hides when the Shell says so", () => {
    render(shell(<TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />));
    const panel = screen.getByTestId("work-area");
    expect(within(panel).getByRole("button", { name: "Deliverables" })).toHaveAttribute("aria-expanded", "true");
    expect(within(panel).getByRole("button", { name: "A boat.mp4" })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Deliverables" }));
    expect(within(panel).queryByRole("button", { name: "A boat.mp4" })).not.toBeInTheDocument();
    cleanup();
    render(
      <ShellContext.Provider value={{ workAreaOpen: false, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify: () => undefined, clearToast: () => undefined }}>
        <TaskPage entry={done()} fetchImpl={fetchScript([]).fetchImpl} />
      </ShellContext.Provider>,
    );
    expect(screen.queryByTestId("work-area")).not.toBeInTheDocument();
  });
});
