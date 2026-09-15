import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetsPage } from "@/components/assets/AssetsPage";
import { Composer } from "@/components/composer/Composer";
import { Shell } from "@/components/shell/Shell";
import { TaskPage } from "@/components/task/TaskPage";
import type { HistoryEntry } from "@/lib/history-store";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const result = { url: "/jobs/a/result", posterUrl: "/jobs/a/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1344, height: 768, sizeBytes: 1 };
const done: HistoryEntry = { id: "a", title: "A boat", prompt: "A boat", params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z", finishedAt: "2026-09-12T18:00:20Z", status: "done", progress: 100, result };
const caps = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const fetchImpl = vi.fn((input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
  if (url === "/api/history") return Promise.resolve(json({ entries: [done] }));
  return Promise.resolve(json({}));
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchImpl);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** What STORY_026 removed, by the accessible name or text each control carried; none may come back on any surface. */
// ("More" and "Plugins" are not listed: the sidebar's More section, the result card's More ▾ and the Plugins row stay — the
// removed More chip and Plugins submenu are pinned by Composer.test.tsx.)
const REMOVED_CONTROLS = ["Scheduled", "MaxHermes", "MaxClaw", "Help improve our services setting", "Download desktop", "Changelog", "Download", "Subscribe", "Switch to classic", "Daily check-in", "Usage", "Contact us", "Learn more", "Logout", "Account", "Document", "Website", "Image Generation", "Like", "Dislike", "Buy Credits", "Dismiss usage notice", "Websites", "Documents", "Excel", "PPT", "Install Excel", "Refresh", "Create"];
const REMOVED_TEXT = ["Fewer than 1,000 Credits remain.", "MiniMax Agent is AI and can make mistakes", "MiniMax Local only generates videos", "Help improve our services"];

function expectNothingRemoved(): void {
  for (const name of REMOVED_CONTROLS) expect(screen.queryByRole("button", { name }), name).not.toBeInTheDocument();
  for (const name of REMOVED_CONTROLS) expect(screen.queryByRole("menuitem", { name }), name).not.toBeInTheDocument();
  for (const name of REMOVED_CONTROLS) expect(screen.queryByRole("link", { name }), name).not.toBeInTheDocument();
  for (const name of REMOVED_CONTROLS) expect(screen.queryByRole("switch", { name }), name).not.toBeInTheDocument();
  for (const text of REMOVED_TEXT) expect(screen.queryByText(text), text).not.toBeInTheDocument();
}

describe("what STORY_026 removed stays removed", () => {
  it("on the home (shell + composer, the user menu open)", async () => {
    render(<Shell><Composer fetchImpl={fetchImpl} /></Shell>);
    await screen.findByRole("button", { name: "Owner" });
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    expectNothingRemoved();
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent.trim())).toEqual(["Settings"]);
  });

  it("on a finished task", async () => {
    render(<Shell><TaskPage entry={done} fetchImpl={fetchImpl} /></Shell>);
    await screen.findByTestId("result-card");
    expectNothingRemoved();
  });

  it("on Assets", async () => {
    render(<Shell><AssetsPage fetchImpl={fetchImpl} /></Shell>);
    await screen.findByTestId("asset-tile");
    expectNothingRemoved();
    expect(screen.getAllByRole("button", { name: /^(All|Images|Videos|Audio|Websites|Documents|Excel|PPT)$/ }).map((el) => el.textContent)).toEqual(["All", "Images", "Videos", "Audio"]);
  });
});
