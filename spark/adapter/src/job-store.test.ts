import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { JobRequest } from "./capabilities.ts";
import { JobStore, isTerminal } from "./job-store.ts";

const request: JobRequest = { prompt: "boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", referenceImages: 0 };
let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("JobStore", () => {
  it("walks queued → running → done, pins progress at 100 and never goes backwards", () => {
    const store = new JobStore();
    store.create("j1", request);
    expect(store.get("j1")).toMatchObject({ status: "queued", progress: 0 });
    store.update("j1", { status: "running", progress: 40, promptId: "p1" });
    store.update("j1", { progress: 20 });
    expect(store.get("j1")).toMatchObject({ status: "running", progress: 40, promptId: "p1" });
    store.update("j1", { status: "done", progress: 97, result: { video: { filename: "v.mp4", subfolder: "video" }, mimeType: "video/mp4", durationSeconds: 5.17, width: 1344, height: 768, sizeBytes: 10 } });
    expect(store.get("j1")).toMatchObject({ status: "done", progress: 100 });
    expect(store.open()).toEqual([]);
  });

  it("makes terminal states absorbing and allows cancel from queued and from running", () => {
    const store = new JobStore();
    store.create("q", request);
    store.update("q", { status: "cancelled" });
    store.update("q", { status: "running", progress: 50 });
    expect(store.get("q")).toMatchObject({ status: "cancelled", progress: 0 });
    store.create("r", request);
    store.update("r", { status: "running", progress: 30 });
    store.update("r", { status: "cancelled" });
    expect(store.get("r")).toMatchObject({ status: "cancelled", progress: 30 });
    store.create("f", request);
    store.update("f", { status: "failed", error: { code: "generation_failed", message: "x" } });
    store.update("f", { status: "done" });
    expect(store.get("f")).toMatchObject({ status: "failed", error: { code: "generation_failed" } });
    expect(["done", "failed", "cancelled"].every((s) => isTerminal(s as "done"))).toBe(true);
    expect(() => store.update("nope", { progress: 1 })).toThrow(/no job nope/);
  });

  it("persists every change as JSON and reads it back on a new instance", () => {
    dir = mkdtempSync(path.join(tmpdir(), "adapter-store-"));
    const file = path.join(dir, "nested", "jobs.json");
    const a = new JobStore(file);
    a.create("j1", request);
    a.update("j1", { status: "running", progress: 12, promptId: "p1" });
    const onDisk = JSON.parse(readFileSync(file, "utf8")) as unknown[];
    expect(onDisk).toHaveLength(1);
    const b = new JobStore(file);
    expect(b.get("j1")).toMatchObject({ status: "running", progress: 12, promptId: "p1", request });
    expect(b.open().map((j) => j.id)).toEqual(["j1"]);
  });
});
