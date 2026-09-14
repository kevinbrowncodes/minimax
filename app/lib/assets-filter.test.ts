import { describe, expect, it } from "vitest";
import { fileNameFor, filterAssets, narrowChipLabel } from "./assets-filter";
import type { HistoryEntry } from "./history-store";

const result = { url: "/jobs/x/result", posterUrl: "/jobs/x/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1344, height: 768, sizeBytes: 1 };
const entry = (id: string, title: string, status: HistoryEntry["status"] = "done"): HistoryEntry => ({ id, title, prompt: title, params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z", status, progress: status === "done" ? 100 : 40, ...(status === "done" ? { result } : {}) });
const entries = [entry("a", "Paper boat on rain puddle"), entry("b", "Cyberpunk alley"), entry("c", "Still running", "running"), entry("d", "Failed one", "failed")];

describe("filterAssets", () => {
  it("keeps only finished jobs and searches the title case-insensitively", () => {
    expect(filterAssets(entries, { chip: "All", query: "" }).map((e) => e.id)).toEqual(["a", "b"]);
    expect(filterAssets(entries, { chip: "Videos", query: "PAPER" }).map((e) => e.id)).toEqual(["a"]);
    expect(filterAssets(entries, { chip: "All", query: "alley.mp4" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAssets(entries, { chip: "All", query: "nothing" })).toEqual([]);
  });
  it("yields nothing for the chips that have no local content", () => {
    for (const chip of ["Websites", "Documents", "Excel", "PPT", "Images", "Audio"] as const) expect(filterAssets(entries, { chip, query: "" })).toEqual([]);
  });
  it("From you and Star hold nothing; From agent is the default tab (STORY_024)", () => {
    expect(filterAssets(entries, { chip: "All", query: "", tab: "From you" })).toEqual([]);
    expect(filterAssets(entries, { chip: "Videos", query: "", tab: "Star" })).toEqual([]);
    expect(filterAssets(entries, { chip: "All", query: "", tab: "From agent" }).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("narrowChipLabel (STORY_024): the 390 chip row's wording", () => {
  it("singularises Websites and Documents and leaves the rest", () => {
    expect(narrowChipLabel("Websites")).toBe("Website");
    expect(narrowChipLabel("Documents")).toBe("Document");
    expect(narrowChipLabel("PPT")).toBe("PPT");
    expect(narrowChipLabel("All")).toBe("All");
  });
});

describe("fileNameFor", () => {
  it("strips characters a file name cannot carry and falls back to video", () => {
    expect(fileNameFor({ title: "Paper boat: on/rain?" })).toBe("Paper boat onrain.mp4");
    expect(fileNameFor({ title: "…" })).toBe("video.mp4");
  });
});
