import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useShell, ShellStateProvider } from "@/components/shell/ShellContext";
import type { HistoryEntry } from "@/lib/history-store";
import { AssetsPage } from "./AssetsPage";

const result = { url: "/jobs/a/result", posterUrl: "/jobs/a/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1344, height: 768, sizeBytes: 1 };
const entry = (id: string, title: string, status: HistoryEntry["status"] = "done"): HistoryEntry => ({ id, title, prompt: title, params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z", status, progress: 100, ...(status === "done" ? { result } : {}) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fetchWith(entries: HistoryEntry[]) {
  const deleted: string[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "/api/history") return Promise.resolve(json({ entries: entries.filter((e) => !deleted.includes(e.id)) }));
    if (url.startsWith("/api/history/") && init?.method === "DELETE") {
      deleted.push(decodeURIComponent(url.slice("/api/history/".length)));
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return { fetchImpl: vi.fn(impl), deleted };
}

beforeAll(() => {
  // jsdom has no <dialog> implementation of showModal/close
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});
afterEach(cleanup);

describe("AssetsPage", () => {
  it("shows the empty state with a New task link when nothing is finished", async () => {
    render(<AssetsPage fetchImpl={fetchWith([entry("r", "Running", "running")]).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("assets-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No assets yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+ New task" })).toHaveAttribute("href", "/");
  });

  it("renders finished jobs as tiles with the poster, filters by search and chip, and opens the preview with the result", async () => {
    render(<AssetsPage fetchImpl={fetchWith([entry("a", "Paper boat"), entry("b", "Cyberpunk alley"), entry("f", "Failed", "failed")]).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getAllByTestId("asset-tile")).toHaveLength(2);
    });
    expect(document.querySelector("img")).toHaveAttribute("src", "/api/jobs/a/poster"); // decorative poster: alt="" carries no img role
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "cyber" } });
    expect(screen.getAllByTestId("asset-tile")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Images" }));
    expect(screen.getByText("No assets yet")).toBeInTheDocument(); // the one empty state for every chip (STORY_024)
    fireEvent.click(screen.getByRole("button", { name: "Videos" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview Paper boat.mp4" }));
    const video = screen.getByTestId("preview-video");
    expect(video).toHaveAttribute("src", "/api/jobs/a/result");
    // the preview's ⋯ leads with Download (STORY_024)
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(within(screen.getByRole("menu", { name: "Preview actions" })).getByRole("menuitem", { name: /Download/ })).toHaveAttribute("download", "Paper boat.mp4");
    fireEvent.click(screen.getByRole("button", { name: "Close asset preview" }));
    expect(screen.queryByTestId("preview-video")).not.toBeInTheDocument();
  });

  it("the kebab menu locates the task, sends to a new task, has an inert Star, and deletes from history after a confirm", async () => {
    const { fetchImpl, deleted } = fetchWith([entry("a", "Paper boat")]);
    const confirmImpl = vi.fn(() => true);
    render(<AssetsPage fetchImpl={fetchImpl} confirmImpl={confirmImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Paper boat.mp4" }));
    // assets-tile-menu-open@1440: Locate in task, Send to new task, Star, Delete
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent.trim())).toEqual(["Locate in task", "Send to new task", "Star", "Delete"]);
    expect(screen.getByRole("menuitem", { name: "Locate in task" })).toHaveAttribute("href", "/task/a");
    expect(screen.getByRole("menuitem", { name: "Send to new task" })).toHaveAttribute("href", "/task/a?extend");
    expect(screen.getByRole("menuitem", { name: "Star" })).toHaveAttribute("aria-disabled", "true");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      await Promise.resolve();
    });
    expect(confirmImpl).toHaveBeenCalledWith(expect.stringContaining("Paper boat"));
    expect(deleted).toEqual(["a"]);
    await waitFor(() => {
      expect(screen.getByTestId("assets-empty")).toBeInTheDocument();
    });
  });
});

describe("AssetsPage — extend (STORY_016)", () => {
  it("the kebab's Send to new task links to the task with ?extend (STORY_024 names it as the reference does)", async () => {
    render(<AssetsPage fetchImpl={fetchWith([entry("a", "Gallery clip")]).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Gallery clip.mp4" }));
    expect(screen.getByRole("menuitem", { name: "Send to new task" })).toHaveAttribute("href", "/task/a?extend");
  });
});

describe("AssetsPage — the reference's Assets page (STORY_024)", () => {
  it("From you and Star show the empty state; From agent shows the tiles again", async () => {
    render(<AssetsPage fetchImpl={fetchWith([entry("a", "Paper boat")]).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    const tabs = screen.getByRole("tablist", { name: "Assets" });
    expect(within(tabs).getAllByRole("tab").map((el) => el.textContent)).toEqual(["From agent", "From you", "Star"]);
    fireEvent.click(within(tabs).getByRole("tab", { name: "From you" }));
    expect(within(tabs).getByRole("tab", { name: "From you" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("assets-empty")).toHaveTextContent("No assets yet");
    fireEvent.click(within(tabs).getByRole("tab", { name: "Star" }));
    expect(screen.getByTestId("assets-empty")).toBeInTheDocument();
    fireEvent.click(within(tabs).getByRole("tab", { name: "From agent" }));
    expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
  });

  it("the preview's ⋯ menu carries Download and the tile's four entries; Delete from it closes the preview", async () => {
    const { fetchImpl, deleted } = fetchWith([entry("a", "Paper boat")]);
    render(<AssetsPage fetchImpl={fetchImpl} confirmImpl={() => true} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Paper boat.mp4" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const menu = screen.getByRole("menu", { name: "Preview actions" });
    expect(within(menu).getAllByRole("menuitem").map((el) => el.textContent.trim())).toEqual(["Download", "Locate in task", "Send to new task", "Star", "Delete"]);
    await act(async () => {
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
      await Promise.resolve();
    });
    expect(deleted).toEqual(["a"]);
    await waitFor(() => {
      expect(screen.queryByTestId("preview-video")).not.toBeInTheDocument();
    });
  });

  it("puts its Search and Filter buttons in the Shell's slot; Search shows the field, Filter shows the tabs", async () => {
    function Bar() {
      const { pageActions } = useShell();
      return <div data-testid="bar">{pageActions}</div>;
    }
    render(
      <ShellStateProvider scope="/assets">
        <Bar />
        <AssetsPage fetchImpl={fetchWith([entry("a", "Paper boat")]).fetchImpl} />
      </ShellStateProvider>,
    );
    const bar = screen.getByTestId("bar");
    await waitFor(() => {
      expect(within(bar).getByRole("button", { name: "Search" })).toBeInTheDocument();
    });
    expect(within(bar).getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(bar).getByRole("button", { name: "Search" }));
    expect(within(bar).getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    fireEvent.click(within(bar).getByRole("button", { name: "Filter" }));
    expect(within(bar).getByRole("button", { name: "Filter" })).toHaveAttribute("aria-pressed", "true");
  });
});
