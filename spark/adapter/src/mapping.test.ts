import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { JobRequest } from "./capabilities.ts";
import { FPS, SIZES, buildGraph, lengthForSeconds, sizeFor, type Graph } from "./mapping.ts";

const template = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../comfyui/h3_t2v_prompt.json"), "utf8")) as Graph;
const request: JobRequest = { prompt: "A paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", referenceImages: 0 };

describe("sizes and lengths", () => {
  it("puts 768 on the short side with both sides multiples of 32 and the right orientation", () => {
    for (const [ratio, { width, height }] of Object.entries(SIZES)) {
      expect(Math.min(width, height)).toBe(768);
      expect(width % 32).toBe(0);
      expect(height % 32).toBe(0);
      const [w, h] = ratio.split(":").map(Number);
      expect(Math.abs(width / height - (w ?? 1) / (h ?? 1))).toBeLessThan(0.05); // 1344x768 is 1.75, the closest 32-multiple to 16:9
    }
    expect(sizeFor("16:9")).toEqual({ width: 1344, height: 768 });
    expect(sizeFor("9:16")).toEqual({ width: 768, height: 1344 });
  });

  it("snaps every duration 4–15 s to the 17k+5 frame grid", () => {
    const expected: Record<number, number> = { 4: 107, 5: 124, 6: 158, 7: 175, 8: 192, 9: 226, 10: 243, 11: 277, 12: 294, 13: 328, 14: 345, 15: 362 };
    for (const [s, frames] of Object.entries(expected)) {
      const n = lengthForSeconds(Number(s));
      expect(n).toBe(frames);
      expect((n - 5) % 17).toBe(0);
      expect(n).toBeGreaterThanOrEqual(Number(s) * FPS);
    }
  });
});

describe("buildGraph", () => {
  it("fills the template with the request and adds the poster nodes, without touching the template", () => {
    const before = JSON.stringify(template);
    const graph = buildGraph(template, request, [], { seed: 7, filenamePrefix: "video/job-1" });
    expect(JSON.stringify(template)).toBe(before);
    expect(graph["cond"]?.inputs).toMatchObject({ prompt: "A paper boat", width: 1344, height: 768, length: 124 });
    expect(graph["noise"]?.inputs).toMatchObject({ noise_seed: 7 });
    expect(graph["video"]?.inputs).toMatchObject({ fps: 24 });
    expect(graph["save"]?.inputs).toMatchObject({ filename_prefix: "video/job-1" });
    expect(graph["poster_frame"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: 0, length: 1 } });
    expect(graph["poster"]?.inputs).toMatchObject({ images: ["poster_frame", 0], filename_prefix: "video/job-1_poster" });
    expect(graph).not.toHaveProperty("_comment");
    expect(graph["first_frame"]).toBeUndefined();
    expect(graph["cond"]?.inputs).not.toHaveProperty("first_frame");
  });

  it("wires one image to first_frame and two to first_frame and last_frame", () => {
    const one = buildGraph(template, { ...request, ratio: "9:16", durationSeconds: 8 }, [{ name: "a.png" }]);
    expect(one["first_frame"]).toEqual({ class_type: "LoadImage", inputs: { image: "a.png" } });
    expect(one["cond"]?.inputs).toMatchObject({ first_frame: ["first_frame", 0], width: 768, height: 1344, length: 192 });
    expect(one["cond"]?.inputs).not.toHaveProperty("last_frame");
    const two = buildGraph(template, request, [{ name: "a.png" }, { name: "b.png" }]);
    expect(two["last_frame"]).toEqual({ class_type: "LoadImage", inputs: { image: "b.png" } });
    expect(two["cond"]?.inputs).toMatchObject({ first_frame: ["first_frame", 0], last_frame: ["last_frame", 0] });
  });

  it("picks a random 32-bit seed when none is given and refuses a template without the needed nodes", () => {
    const seed = buildGraph(template, request, [])["noise"]?.inputs["noise_seed"];
    expect(typeof seed).toBe("number");
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(() => buildGraph({ unet: { class_type: "UNETLoader", inputs: {} } }, request, [])).toThrow(/no "clip" node/);
  });
});
