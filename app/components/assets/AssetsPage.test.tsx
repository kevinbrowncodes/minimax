import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
    expect(screen.getByText("No images yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Videos" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview Paper boat.mp4" }));
    const video = screen.getByTestId("preview-video");
    expect(video).toHaveAttribute("src", "/api/jobs/a/result");
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("download", "Paper boat.mp4");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("preview-video")).not.toBeInTheDocument();
  });

  it("the kebab menu opens the task, downloads, and deletes from history after a confirm", async () => {
    const { fetchImpl, deleted } = fetchWith([entry("a", "Paper boat")]);
    const confirmImpl = vi.fn(() => true);
    render(<AssetsPage fetchImpl={fetchImpl} confirmImpl={confirmImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Paper boat.mp4" }));
    expect(screen.getByRole("menuitem", { name: "Open task" })).toHaveAttribute("href", "/task/a");
    expect(screen.getByRole("menuitem", { name: "Download" })).toHaveAttribute("href", "/api/jobs/a/result");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete from history" }));
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
  it("the kebab offers Extend, linking to the task with ?extend", async () => {
    render(<AssetsPage fetchImpl={fetchWith([entry("a", "Gallery clip")]).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("asset-tile")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Gallery clip.mp4" }));
    const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(items).toEqual(["Open task", "Extend", "Download", "Delete from history"]);
    expect(screen.getByRole("menuitem", { name: "Extend" })).toHaveAttribute("href", "/task/a?extend");
  });
});
