import { describe, expect, it } from "vitest";
import { ASSET_CHIPS, assetItems, assetKey, assetName, fileNameFor, filterAssets, referenceUrl } from "./assets-filter";
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
  it("offers All · Images · Videos · Audio (STORY_026) and yields nothing for the two with no local content yet", () => {
    expect(ASSET_CHIPS).toEqual(["All", "Images", "Videos", "Audio"]);
    for (const chip of ["Images", "Audio"] as const) expect(filterAssets(entries, { chip, query: "" })).toEqual([]);
  });
  it("From you lists no videos; Star lists the starred ones; From agent is the default tab (STORY_024, STORY_032)", () => {
    expect(filterAssets(entries, { chip: "All", query: "", tab: "From you" })).toEqual([]);
    expect(filterAssets(entries, { chip: "Videos", query: "", tab: "Star" })).toEqual([]);
    const [first, second] = entries;
    if (!first || !second) throw new Error("fixture");
    expect(filterAssets([{ ...second, starred: true }, first], { chip: "Videos", query: "", tab: "Star" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAssets(entries, { chip: "All", query: "", tab: "From agent" }).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("assetItems (STORY_032)", () => {
  const ref1 = { n: 1, name: "boat sketch.png", file: "1-boat sketch.png", size: 10, type: "image/png" };
  const ref2 = { n: 2, name: "second.jpg", file: "2-second.jpg", size: 20, type: "image/jpeg" };
  const withImages = [{ ...entry("a", "Paper boat on rain puddle"), referenceFiles: [ref1, ref2] }, { ...entry("b", "Cyberpunk alley"), starred: true }, { ...entry("c", "Still running", "running"), referenceFiles: [{ ...ref1, name: "running ref.png" }] }];

  it("From you is the reference images of every job (any status); Videos there is empty", () => {
    const items = assetItems(withImages, { chip: "All", query: "", tab: "From you" });
    expect(items.map(assetKey)).toEqual(["image:a:1", "image:a:2", "image:c:1"]);
    expect(items.map(assetName)).toEqual(["boat sketch.png", "second.jpg", "running ref.png"]);
    expect(assetItems(withImages, { chip: "Videos", query: "", tab: "From you" })).toEqual([]);
    expect(assetItems(withImages, { chip: "Images", query: "", tab: "From you" })).toHaveLength(3);
  });

  it("the Images chip lists the reference images on From agent too, never on Star; Audio is always empty", () => {
    expect(assetItems(withImages, { chip: "Images", query: "", tab: "From agent" }).map(assetKey)).toEqual(["image:a:1", "image:a:2", "image:c:1"]);
    expect(assetItems(withImages, { chip: "All", query: "", tab: "From agent" }).map(assetKey)).toEqual(["video:a", "video:b"]);
    expect(assetItems(withImages, { chip: "Images", query: "", tab: "Star" })).toEqual([]);
    expect(assetItems(withImages, { chip: "All", query: "", tab: "Star" }).map(assetKey)).toEqual(["video:b"]);
    for (const tab of ["From agent", "From you", "Star"] as const) expect(assetItems(withImages, { chip: "Audio", query: "", tab })).toEqual([]);
  });

  it("the search matches an image's own name or its task's title", () => {
    expect(assetItems(withImages, { chip: "All", query: "SKETCH", tab: "From you" }).map(assetKey)).toEqual(["image:a:1"]);
    expect(assetItems(withImages, { chip: "All", query: "paper boat", tab: "From you" }).map(assetKey)).toEqual(["image:a:1", "image:a:2"]);
    expect(referenceUrl({ id: "a b" }, ref1)).toBe("/api/history/a%20b/reference/1");
  });
});

describe("fileNameFor", () => {
  it("strips characters a file name cannot carry and falls back to video", () => {
    expect(fileNameFor({ title: "Paper boat: on/rain?" })).toBe("Paper boat onrain.mp4");
    expect(fileNameFor({ title: "…" })).toBe("video.mp4");
  });
});
