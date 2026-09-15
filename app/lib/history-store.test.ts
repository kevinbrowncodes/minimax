import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HistoryStore, titleFor } from "./history-store";

let dir: string;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});
const params = { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
function store(): HistoryStore {
  dir = mkdtempSync(path.join(tmpdir(), "history-"));
  return new HistoryStore(path.join(dir, "nested", "history.json"));
}

describe("titleFor", () => {
  it("cuts at a word boundary within 48 characters and adds an ellipsis", () => {
    expect(titleFor("A small paper boat")).toBe("A small paper boat");
    expect(titleFor("  A   small  paper boat  ")).toBe("A small paper boat");
    const long = "A small paper boat drifting across a rain puddle in soft morning light, gentle ripples";
    const title = titleFor(long);
    expect(title.length).toBeLessThanOrEqual(49);
    expect(title.endsWith("…")).toBe(true);
    expect(title).toBe("A small paper boat drifting across a rain puddle…");
    expect(titleFor("")).toBe("Unnamed Session");
  });
});

describe("HistoryStore", () => {
  it("creates, lists newest first, gets, patches, records status and removes, with atomic writes", () => {
    const s = store();
    s.create({ id: "a", prompt: "first boat", params, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z" });
    s.create({ id: "b", prompt: "second boat", params, referenceImages: 1, createdAt: "2026-09-12T19:00:00Z" });
    expect(s.list().map((e) => e.id)).toEqual(["b", "a"]);
    expect(s.get("a")).toMatchObject({ title: "first boat", status: "queued", progress: 0 });
    expect(s.recordStatus("a", { id: "a", status: "running", progress: 40 })).toMatchObject({ status: "running", progress: 40 });
    expect(s.recordStatus("a", { id: "a", status: "running", progress: 10 })?.progress).toBe(40);
    const done = s.recordStatus("a", { id: "a", status: "done", progress: 100, result: { url: "/jobs/a/result", posterUrl: "/jobs/a/poster", mimeType: "video/mp4", durationSeconds: 5, width: 1344, height: 768, sizeBytes: 1, cuts: [{ frame: 270, seconds: 11.25 }] } });
    expect(done?.finishedAt).toBeDefined();
    expect(done?.result?.url).toBe("/jobs/a/result");
    expect(done?.result?.cuts).toEqual([{ frame: 270, seconds: 11.25 }]); // STORY_020: kept with the result
    const later = s.recordStatus("a", { id: "a", status: "running", progress: 1 });
    expect(later?.status).toBe("done");
    expect(s.patch("a", { openedAt: "2026-09-12T20:00:00Z" })?.openedAt).toBe("2026-09-12T20:00:00Z");
    expect(s.patch("a", { pinned: true, pinnedAt: "2026-09-15T10:00:00Z" })).toMatchObject({ pinned: true, pinnedAt: "2026-09-15T10:00:00Z" }); // STORY_029
    expect(s.patch("a", { pinned: false, pinnedAt: undefined })?.pinned).toBe(false);
    expect(s.get("a")?.pinnedAt).toBeUndefined();
    expect(s.patch("a", { archived: true, archivedAt: "2026-09-15T12:11:00Z" })).toMatchObject({ archived: true, archivedAt: "2026-09-15T12:11:00Z" }); // STORY_030
    expect(s.patch("a", { archived: false, archivedAt: undefined })?.archived).toBe(false);
    expect(s.get("a")?.archivedAt).toBeUndefined();
    expect(s.patch("a", { starred: true })?.starred).toBe(true); // STORY_032
    expect(s.patch("a", { referenceFiles: [{ n: 1, name: "ref.png", file: "1-ref.png", size: 3, type: "image/png" }] })?.referenceFiles).toHaveLength(1);
    expect(s.get("a")?.referenceFiles?.[0]?.name).toBe("ref.png");
    expect(s.patch("zzz", { progress: 1 })).toBeUndefined();
    expect(s.recordStatus("zzz", { id: "zzz", status: "done", progress: 100 })).toBeUndefined();
    expect(s.remove("b")).toBe(true);
    expect(s.remove("b")).toBe(false);
    expect(s.list().map((e) => e.id)).toEqual(["a"]);
    expect(readdirSync(path.dirname(s.file)).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    expect(existsSync(s.file)).toBe(true);
  });

  it("removeMany forgets every listed id in one write and reports the count (STORY_030)", () => {
    const s = store();
    for (const id of ["a", "b", "c"]) s.create({ id, prompt: `${id} boat`, params, referenceImages: 0, createdAt: "2026-09-12T18:00:00Z" });
    expect(s.removeMany(["a", "c", "nope"])).toBe(2);
    expect(s.list().map((e) => e.id)).toEqual(["b"]);
    expect(s.removeMany([])).toBe(0);
    expect(s.removeMany(["zzz"])).toBe(0);
    expect(s.list().map((e) => e.id)).toEqual(["b"]);
  });

  it("starts empty when the file does not exist and survives a new instance", () => {
    const s = store();
    expect(s.list()).toEqual([]);
    s.create({ id: "x", prompt: "boat", params, referenceImages: 0 });
    expect(new HistoryStore(s.file).get("x")?.title).toBe("boat");
  });
});

describe("HistoryStore — extensions (STORY_017)", () => {
  it("keeps continuesFrom and the requested overlap, and records what was carried once, from the first status that carries it", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "history-ext-"));
    const store = new HistoryStore(path.join(dir, "history.json"));
    store.create({ id: "e1", prompt: "next", params: { ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", overlapFrames: 22 }, referenceImages: 0, continuesFrom: { id: "src", title: "The first clip", durationSeconds: 10.125 } });
    expect(store.get("e1")).toMatchObject({ continuesFrom: { id: "src", title: "The first clip", durationSeconds: 10.125 }, params: { overlapFrames: 22 } });
    store.recordStatus("e1", { id: "e1", status: "running", progress: 10, request: { prompt: "next", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", referenceImages: 0, continueFrom: "src", overlapFrames: 22, overlap: { frames: 22, seconds: 0.917 } } });
    expect(store.get("e1")?.overlap).toEqual({ frames: 22, seconds: 0.917 });
    store.recordStatus("e1", { id: "e1", status: "running", progress: 50, request: { prompt: "next", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", referenceImages: 0, overlap: { frames: 1, seconds: 0.042 } } });
    expect(store.get("e1")?.overlap).toEqual({ frames: 22, seconds: 0.917 });
    rmSync(dir, { recursive: true, force: true });
  });
});
