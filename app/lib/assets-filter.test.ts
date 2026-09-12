import { describe, expect, it } from "vitest";
import { fileNameFor, filterAssets } from "./assets-filter";
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
});

describe("fileNameFor", () => {
  it("strips characters a file name cannot carry and falls back to video", () => {
    expect(fileNameFor({ title: "Paper boat: on/rain?" })).toBe("Paper boat onrain.mp4");
    expect(fileNameFor({ title: "…" })).toBe("video.mp4");
  });
});
