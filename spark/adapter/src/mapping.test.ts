import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { JobRequest } from "./capabilities.ts";
import { ANCHOR_FRAMES, FPS, REQUIRED_CLASSES, SIZES, buildGraph, contextFrames, extensionLength, gridDown, lengthForSeconds, ref2vaFileFor, sizeFor, templateUnet, type Graph } from "./mapping.ts";

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

describe("extension arithmetic (STORY_016)", () => {
  it("extensionLength adds at least the requested seconds after the 22-frame anchor, snapped up to the grid", () => {
    const expected: Record<number, number> = { 4: 124, 5: 158, 6: 175, 8: 226, 10: 277, 12: 311, 14: 362 };
    for (const [added, frames] of Object.entries(expected)) {
      const n = extensionLength(Number(added));
      expect(n).toBe(frames);
      expect((n - 5) % 17).toBe(0);
      expect(n - ANCHOR_FRAMES).toBeGreaterThanOrEqual(Number(added) * FPS);
    }
    expect(ANCHOR_FRAMES).toBe(22);
  });

  it("gridDown and contextFrames reproduce the story's table and never exceed the model's 362", () => {
    expect([gridDown(5), gridDown(21), gridDown(22), gridDown(48), gridDown(124), gridDown(243), gridDown(360), gridDown(362), gridDown(1000)]).toEqual([5, 5, 22, 39, 124, 243, 345, 362, 991]);
    // the owner's 10 s clip (243 frames) at +10 s (segment 277), context 2 / 5 / 10 / 15
    expect([2, 5, 10, 15].map((c) => contextFrames(243, 277, c))).toEqual([56, 124, 243, 243]);
    // a 30 s source (723 frames) at +10 s
    expect([2, 5, 10, 15].map((c) => contextFrames(723, 277, c))).toEqual([56, 124, 243, 277]);
    // the step caps the context: +4 s (124) and +14 s (362)
    expect(contextFrames(243, 124, 15)).toBe(124);
    expect(contextFrames(723, 362, 15)).toBe(362);
    for (let src = 107; src <= 1445; src += 17) for (const seg of [124, 277, 362]) for (const c of [2, 5, 10, 15]) expect(contextFrames(src, seg, c)).toBeLessThanOrEqual(362);
  });

  it("names the Ref2VA checkpoint from the template's FL2VA file", () => {
    expect(templateUnet(template)).toBe("minimax_h3_fl2va_int8_convrot.safetensors");
    expect(ref2vaFileFor("minimax_h3_fl2va_int8_convrot.safetensors")).toBe("minimax_h3_ref2va_int8_convrot.safetensors");
    expect(ref2vaFileFor("minimax_h3_fl2va_pruned_bf16.safetensors")).toBe("minimax_h3_ref2va_pruned_bf16.safetensors");
    for (const c of ["LoadVideo", "GetVideoComponents", "MiniMaxH3ReferenceToVideo", "MiniMaxH3AddGuide", "ImageBatch", "TrimAudioDuration", "AudioConcat"]) expect(REQUIRED_CLASSES).toContain(c);
  });

  it("builds the extension graph: Ref2VA, the source's tail as the reference, the anchored seam, the in-graph join", () => {
    const req: JobRequest = { ...request, durationSeconds: 10, continueFrom: "src", contextSeconds: 5 };
    const graph = buildGraph(template, req, [], { seed: 3, filenamePrefix: "video/job-2", continuation: { file: "video/job-src_00001_.mp4", frames: 243, contextFrames: 124, prompt: "WRAPPED" } });
    expect(graph["unet"]?.inputs["unet_name"]).toBe("minimax_h3_ref2va_int8_convrot.safetensors");
    expect(graph["source_video"]).toEqual({ class_type: "LoadVideo", inputs: { file: "video/job-src_00001_.mp4 [output]" } });
    expect(graph["source_parts"]).toEqual({ class_type: "GetVideoComponents", inputs: { video: ["source_video", 0] } });
    expect(graph["context_frames"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: 119, length: 124 } });
    expect(graph["context_audio"]).toEqual({ class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: 4.958, duration: 5.167 } });
    expect(graph["anchor_frames"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: 221, length: 22 } });
    expect(graph["anchor_audio"]).toEqual({ class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: 9.208, duration: 0.917 } });
    expect(graph["cond"]).toEqual({
      class_type: "MiniMaxH3ReferenceToVideo",
      inputs: { clip: ["clip", 0], vae: ["vae_video", 0], audio_vae: ["vae_audio", 0], prompt: "WRAPPED", width: 1344, height: 768, length: 277, ref_image_size: "match", "ref_videos.ref_video_0": ["context_frames", 0], "ref_video_audios.ref_video_audio_0": ["context_audio", 0] },
    });
    expect(graph["guide"]).toEqual({ class_type: "MiniMaxH3AddGuide", inputs: { positive: ["cond", 0], vae: ["vae_video", 0], audio_vae: ["vae_audio", 0], latent: ["cond", 1], image: ["anchor_frames", 0], audio: ["anchor_audio", 0], frame_idx: 0 } });
    expect(graph["guider"]?.inputs).toMatchObject({ conditioning: ["guide", 0], model: ["unet", 0] });
    expect(graph["sample"]?.inputs).toMatchObject({ latent_image: ["cond", 1] });
    expect(graph["new_frames"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: 22, length: 255 } });
    expect(graph["new_audio"]).toEqual({ class_type: "TrimAudioDuration", inputs: { audio: ["decode_audio", 0], start_index: 0.917, duration: 10.625 } });
    expect(graph["joined_frames"]).toEqual({ class_type: "ImageBatch", inputs: { image1: ["source_parts", 0], image2: ["new_frames", 0] } });
    expect(graph["joined_audio"]).toEqual({ class_type: "AudioConcat", inputs: { audio1: ["source_parts", 1], audio2: ["new_audio", 0], direction: "after" } });
    expect(graph["video"]?.inputs).toMatchObject({ images: ["joined_frames", 0], audio: ["joined_audio", 0], fps: 24 });
    expect(graph["poster_frame"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["joined_frames", 0], batch_index: 0, length: 1 } });
    expect(graph["noise"]?.inputs).toMatchObject({ noise_seed: 3 });
    expect(graph["save"]?.inputs).toMatchObject({ filename_prefix: "video/job-2" });
    expect(graph["first_frame"]).toBeUndefined();
    // a context that does not fit the source is a programming error, not a graph
    expect(() => buildGraph(template, req, [], { continuation: { file: "x.mp4", frames: 100, contextFrames: 124, prompt: "" } })).toThrow(/does not fit/);
  });
});
