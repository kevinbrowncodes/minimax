import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellStateProvider, useShell } from "@/components/shell/ShellContext";
import type { QueueRow } from "@/lib/queue-view";
import type { RecentEntry } from "@/lib/route-title";
import { ScheduledPage } from "./ScheduledPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/scheduled" }));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.useRealTimers();
});

const now = () => new Date(2026, 8, 15, 19, 0);
const at = (h: number, m: number, day = 15) => new Date(2026, 8, day, h, m).toISOString();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fetchWith(queue: QueueRow[], history: RecentEntry[], model: { adapter: boolean; comfyui: boolean } = { adapter: true, comfyui: true }) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    if (url === "/api/queue") return Promise.resolve(json({ entries: queue, model }));
    if (url === "/api/history") return Promise.resolve(json({ entries: history }));
    const job = /^\/api\/jobs\/([^/]+)$/.exec(url);
    if (job && method === "GET") {
      // the page polls each running job: the status route answers with fresher progress
      const entry = history.find((e) => e.id === decodeURIComponent(job[1] ?? ""));
      return Promise.resolve(entry ? json({ id: entry.id, status: entry.status, progress: (entry.progress ?? 0) + 1 }) : json({ error: { code: "not_found", message: url } }, 404));
    }
    if (method === "PATCH" || method === "DELETE") return Promise.resolve(json({}));
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return { fetchImpl: vi.fn(impl), calls };
}
function Bar() {
  const { pageActions } = useShell();
  return <div data-testid="bar">{pageActions}</div>;
}
const inShell = (page: React.ReactElement) => (
  <ShellStateProvider scope="/scheduled">
    <Bar />
    {page}
  </ShellStateProvider>
);
const queue: QueueRow[] = [
  { id: "w1", position: 1, title: "Same boat, wider", createdAt: at(19, 2), referenceImages: 0 },
  { id: "w2", position: 2, title: "Neon street at night", createdAt: at(19, 5), notBefore: at(2, 0, 16), referenceImages: 1 },
];
const history: RecentEntry[] = [
  { id: "r1", title: "Paper boat on rain puddle", createdAt: at(19, 1), status: "running", progress: 41 },
  { id: "w1", title: "Same boat, wider", createdAt: at(19, 2), status: "queued", progress: 0 },
  { id: "d1", title: "Forest dawn fly-through", createdAt: at(17, 30), finishedAt: at(17, 52), status: "done", progress: 100 },
  { id: "f1", title: "Failed one", createdAt: at(18, 0), finishedAt: at(18, 5), status: "failed", progress: 40, error: { code: "generation_failed", message: "boom" } },
];

describe("ScheduledPage (STORY_041)", () => {
  it("shows the empty state with a Create button and puts Create in the bar", async () => {
    render(inShell(<ScheduledPage fetchImpl={fetchWith([], []).fetchImpl} now={now} pollMs={0} />));
    expect(await screen.findByTestId("scheduled-empty")).toHaveTextContent("No scheduled tasks yet.");
    expect(within(screen.getByTestId("scheduled-empty")).getByRole("link", { name: "Create" })).toHaveAttribute("href", "/");
    expect(within(screen.getByTestId("bar")).getByRole("link", { name: "Create" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("searchbox", { name: "Search scheduled tasks" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Scheduled task status" })).toHaveDisplayValue("All");
  });

  it("lists Running with Stop, Waiting in order with its controls, Done today and Failed; the search and the filter narrow them", async () => {
    const { fetchImpl, calls } = fetchWith(queue, history);
    render(inShell(<ScheduledPage fetchImpl={fetchImpl} now={now} pollMs={0} />));
    const running = await screen.findByRole("region", { name: "Running" });
    expect(within(running).getAllByTestId("running-row").map((r) => r.textContent)).toEqual(["26-09-15-1901Paper boat on rain puddleGenerating 42 %Stop"]); // 41 in history, 42 from the poll
    expect(calls.filter((c) => c.method === "GET" && c.url.startsWith("/api/jobs/")).map((c) => c.url)).toEqual(["/api/jobs/r1"]); // the running one is polled, the waiting one is not
    const waiting = screen.getByRole("region", { name: "Waiting" });
    expect(within(waiting).getByRole("heading")).toHaveTextContent("Waiting (2)");
    const rows = within(waiting).getAllByTestId("waiting-row");
    expect(rows.map((r) => r.getAttribute("data-position"))).toEqual(["1", "2"]);
    expect(rows[0]).toHaveTextContent("Waiting · next");
    expect(rows[1]).toHaveTextContent("Not before Sep 16, 02:00");
    expect(within(rows[0] as HTMLElement).getByRole("link", { name: /Same boat, wider/ })).toHaveAttribute("href", "/task/w1");
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: "Move Same boat, wider up" })).toBeDisabled();
    expect(within(rows[1] as HTMLElement).getByRole("button", { name: "Move Neon street at night down" })).toBeDisabled();
    expect(within(screen.getByRole("region", { name: "Done today" })).getByRole("link", { name: /Forest dawn/ })).toHaveAttribute("href", "/task/d1");
    expect(screen.getByRole("region", { name: "Done today" })).toHaveTextContent("Done 17:52");
    expect(screen.getByRole("region", { name: "Failed" })).toHaveTextContent("Failed oneFailed");
    // the actions call their routes and refetch
    await act(async () => {
      fireEvent.click(within(running).getByRole("button", { name: "Stop Paper boat on rain puddle" }));
      await Promise.resolve();
    });
    expect(calls.find((c) => c.method === "DELETE")?.url).toBe("/api/jobs/r1");
    await act(async () => {
      fireEvent.click(within(rows[1] as HTMLElement).getByRole("button", { name: "Move Neon street at night up" }));
      await Promise.resolve();
    });
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({ url: "/api/queue/w2", body: { move: "up" } });
    await act(async () => {
      fireEvent.click(within(rows[0] as HTMLElement).getByRole("button", { name: "Remove Same boat, wider" }));
      await Promise.resolve();
    });
    expect(calls.filter((c) => c.method === "DELETE").map((c) => c.url)).toEqual(["/api/jobs/r1", "/api/queue/w1"]);
    fireEvent.click(within(rows[0] as HTMLElement).getByRole("button", { name: "Edit Same boat, wider" }));
    expect(push).toHaveBeenCalledWith("/?queue=w1");
    // search and filter
    fireEvent.change(screen.getByRole("searchbox", { name: "Search scheduled tasks" }), { target: { value: "neon" } });
    expect(screen.queryByRole("region", { name: "Running" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("waiting-row")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search scheduled tasks" }), { target: { value: "zzz" } });
    expect(screen.getByText("No matching tasks.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search scheduled tasks" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Scheduled task status" }), { target: { value: "Done" } });
    expect(screen.queryByRole("region", { name: "Waiting" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done today" })).toBeInTheDocument();
  });

  it("says when the Spark's model is not running, and nothing when it is (CHORE_011)", async () => {
    render(inShell(<ScheduledPage fetchImpl={fetchWith(queue, history, { adapter: true, comfyui: false }).fetchImpl} now={now} pollMs={0} />));
    expect(await screen.findByTestId("model-notice")).toHaveTextContent("The Spark's model is not running — the line waits; start it with spark/comfyui/run.sh.");
    cleanup();
    render(inShell(<ScheduledPage fetchImpl={fetchWith(queue, history).fetchImpl} now={now} pollMs={0} />));
    await screen.findByRole("region", { name: "Waiting" });
    expect(screen.queryByTestId("model-notice")).not.toBeInTheDocument();
  });

  it("Run at… opens a date-time field that patches the time; Clear sends null", async () => {
    const { fetchImpl, calls } = fetchWith(queue, history);
    render(inShell(<ScheduledPage fetchImpl={fetchImpl} now={now} pollMs={0} />));
    const waiting = await screen.findByRole("region", { name: "Waiting" });
    fireEvent.click(within(waiting).getByRole("button", { name: "Run Same boat, wider at" }));
    const picker = screen.getByTestId("run-at");
    expect(picker).toHaveTextContent("browser or no browser"); // STORY_042
    await act(async () => {
      fireEvent.change(within(picker).getByLabelText("Run at time for Same boat, wider"), { target: { value: "2026-09-16T02:00" } });
      await Promise.resolve();
    });
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({ url: "/api/queue/w1", body: { notBefore: new Date("2026-09-16T02:00").toISOString() } });
    fireEvent.click(within(waiting).getByRole("button", { name: "Run Neon street at night at" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear the time for Neon street at night" }));
      await Promise.resolve();
    });
    expect(calls.filter((c) => c.method === "PATCH").at(-1)).toMatchObject({ url: "/api/queue/w2", body: { notBefore: null } });
  });

  it("polls the queue and the history while mounted, under StrictMode, and stops on unmount (CLAUDE.md §6b)", async () => {
    vi.useFakeTimers();
    const { fetchImpl } = fetchWith([], []);
    const { unmount } = render(inShell(<StrictMode><ScheduledPage fetchImpl={fetchImpl} now={now} pollMs={2000} /></StrictMode>));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const before = vi.mocked(fetchImpl).mock.calls.filter((c) => c[0] === "/api/queue").length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    const after = vi.mocked(fetchImpl).mock.calls.filter((c) => c[0] === "/api/queue").length;
    expect(after - before).toBe(2); // one tick per two seconds, not one per mount
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(vi.mocked(fetchImpl).mock.calls.filter((c) => c[0] === "/api/queue").length).toBe(after);
  });
});
