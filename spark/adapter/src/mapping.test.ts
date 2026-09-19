import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { JobRequest } from "./capabilities.ts";
import { DEFAULT_OVERLAP, FPS, MAX_FRAMES, OVERLAP_OPTIONS, REQUIRED_CLASSES, SIZES, audioTicks, buildGraph, extensionLength, gridDown, latentFrames, lengthForSeconds, maxAddedSeconds, ref2vaFileFor, sizeFor, templateUnet, type Graph } from "./mapping.ts";

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

  it("adds the frame-change measure over the frames that are saved (STORY_020) and requires its class", () => {
    const fresh = buildGraph(template, request, [], { seed: 7 });
    expect(fresh["changes"]).toEqual({ class_type: "MiniMaxLocalFrameChanges", inputs: { images: ["decode_video", 0] } });
    const ext = buildGraph(template, { ...request, durationSeconds: 10, continueFrom: "src" }, [], { seed: 7, continuation: { file: "video/src.mp4", frames: 124, overlapFrames: 39, prompt: "p" } });
    expect(ext["changes"]).toEqual({ class_type: "MiniMaxLocalFrameChanges", inputs: { images: ["joined_frames", 0] } });
    expect(REQUIRED_CLASSES).toContain("MiniMaxLocalFrameChanges");
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

describe("extension arithmetic (STORY_017)", () => {
  it("latent frames, audio ticks, segment lengths and the most that fits the model's ceiling, per overlap", () => {
    expect([22, 39, 56].map(latentFrames)).toEqual([7, 12, 17]);
    expect([22, 39, 56].map(audioTicks)).toEqual([37, 65, 93]);
    expect([124, 294, 362].map(latentFrames)).toEqual([37, 87, 107]);
    expect([124, 294].map(audioTicks)).toEqual([207, 490]);
    expect([4, 10, 13].map((s) => extensionLength(s, 39))).toEqual([141, 294, 362]);
    expect(extensionLength(14, 39)).toBe(379);
    expect([22, 39, 56].map((o) => maxAddedSeconds(o))).toEqual([14, 13, 12]);
    for (const o of OVERLAP_OPTIONS) for (let s = 4; s <= maxAddedSeconds(o); s += 1) expect((extensionLength(s, o) - 5) % 17).toBe(0);
    expect(DEFAULT_OVERLAP).toBe(39);
    expect(MAX_FRAMES).toBe(362);
    expect([5, 48, 124, 243, 360, 362].map(gridDown)).toEqual([5, 39, 124, 243, 345, 362]);
  });

  it("names the Ref2VA checkpoint from the template's FL2VA file (reported by health, no longer used by extensions)", () => {
    expect(templateUnet(template)).toBe("minimax_h3_fl2va_int8_convrot.safetensors");
    expect(ref2vaFileFor("minimax_h3_fl2va_int8_convrot.safetensors")).toBe("minimax_h3_ref2va_int8_convrot.safetensors");
    for (const c of ["LoadVideo", "GetVideoComponents", "VAEEncode", "VAEEncodeAudio", "EmptyMiniMaxH3LatentAV", "LTXVSeparateAVLatent", "LTXVConcatAVLatent", "ReplaceVideoLatentFrames", "LatentCut", "LatentConcat", "SolidMask", "MaskToImage", "RepeatImageBatch", "ImageToMask", "MaskComposite", "SetLatentNoiseMask", "ImageBatch", "TrimAudioDuration", "AudioConcat"]) expect(REQUIRED_CLASSES).toContain(c);
    expect(REQUIRED_CLASSES).not.toContain("MiniMaxH3ReferenceToVideo");
    expect(REQUIRED_CLASSES).toContain("MiniMaxH3AddGuide"); // STORY_061: the end-frame anchor
  });

  it("builds the extension graph: the source's last 39 frames become the new clip's own masked head on FL2VA, then the join", () => {
    const req: JobRequest = { ...request, durationSeconds: 10, continueFrom: "src", overlapFrames: 39 };
    const graph = buildGraph(template, req, [], { seed: 3, filenamePrefix: "video/job-2", continuation: { file: "video/job-src_00001_.mp4", frames: 243, overlapFrames: 39, prompt: "WRAPPED" } });
    expect(graph["unet"]?.inputs["unet_name"]).toBe("minimax_h3_fl2va_int8_convrot.safetensors");
    // the tail
    expect(graph["source_video"]).toEqual({ class_type: "LoadVideo", inputs: { file: "video/job-src_00001_.mp4 [output]" } });
    expect(graph["source_parts"]).toEqual({ class_type: "GetVideoComponents", inputs: { video: ["source_video", 0] } });
    expect(graph["tail_frames"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: 204, length: 39 } });
    expect(graph["tail_latent"]).toEqual({ class_type: "VAEEncode", inputs: { pixels: ["tail_frames", 0], vae: ["vae_video", 0] } });
    expect(graph["tail_audio"]).toEqual({ class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: 8.5, duration: 1.625 } });
    expect(graph["tail_audio_latent_raw"]).toEqual({ class_type: "VAEEncodeAudio", inputs: { audio: ["tail_audio", 0], vae: ["vae_audio", 0] } });
    expect(graph["tail_audio_latent"]).toEqual({ class_type: "LatentCut", inputs: { samples: ["tail_audio_latent_raw", 0], dim: "x", index: 0, amount: 65 } });
    // the canvas with the tail as its head
    expect(graph["canvas"]).toEqual({ class_type: "EmptyMiniMaxH3LatentAV", inputs: { width: 1344, height: 768, length: 294 } });
    expect(graph["canvas_parts"]).toEqual({ class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["canvas", 0] } });
    expect(graph["video_latent"]).toEqual({ class_type: "ReplaceVideoLatentFrames", inputs: { destination: ["canvas_parts", 0], source: ["tail_latent", 0], index: 0 } });
    expect(graph["audio_rest"]).toEqual({ class_type: "LatentCut", inputs: { samples: ["canvas_parts", 1], dim: "x", index: 65, amount: 425 } });
    expect(graph["audio_latent"]).toEqual({ class_type: "LatentConcat", inputs: { samples1: ["tail_audio_latent", 0], samples2: ["audio_rest", 0], dim: "x" } });
    // the masks: 0 keeps the head (12 latent frames, 65 audio ticks), 1 generates the rest (75 frames, 425 ticks)
    expect(graph["mask_keep"]).toEqual({ class_type: "SolidMask", inputs: { value: 0, width: 84, height: 48 } });
    expect(graph["mask_new"]).toEqual({ class_type: "SolidMask", inputs: { value: 1, width: 84, height: 48 } });
    expect(graph["mask_keep_batch"]).toEqual({ class_type: "RepeatImageBatch", inputs: { image: ["mask_keep_img", 0], amount: 12 } });
    expect(graph["mask_new_batch"]).toEqual({ class_type: "RepeatImageBatch", inputs: { image: ["mask_new_img", 0], amount: 75 } });
    expect(graph["mask_video_img"]).toEqual({ class_type: "ImageBatch", inputs: { image1: ["mask_keep_batch", 0], image2: ["mask_new_batch", 0] } });
    expect(graph["mask_video"]).toEqual({ class_type: "ImageToMask", inputs: { image: ["mask_video_img", 0], channel: "red" } });
    expect(graph["video_masked"]).toEqual({ class_type: "SetLatentNoiseMask", inputs: { samples: ["video_latent", 0], mask: ["mask_video", 0] } });
    expect(graph["amask_base"]).toEqual({ class_type: "SolidMask", inputs: { value: 0, width: 490, height: 2 } });
    expect(graph["amask_new"]).toEqual({ class_type: "SolidMask", inputs: { value: 1, width: 425, height: 2 } });
    expect(graph["amask"]).toEqual({ class_type: "MaskComposite", inputs: { destination: ["amask_base", 0], source: ["amask_new", 0], x: 65, y: 0, operation: "add" } });
    expect(graph["audio_masked"]).toEqual({ class_type: "SetLatentNoiseMask", inputs: { samples: ["audio_latent", 0], mask: ["amask", 0] } });
    expect(graph["latent"]).toEqual({ class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["video_masked", 0], audio_latent: ["audio_masked", 0] } });
    expect(graph["sample"]?.inputs).toMatchObject({ latent_image: ["latent", 0], noise: ["noise", 0], guider: ["guider", 0] });
    // text conditioning only, on the FL2VA node, no anchors and no references
    expect(graph["cond"]).toEqual({ class_type: "MiniMaxH3ImageToVideo", inputs: { clip: ["clip", 0], vae: ["vae_video", 0], prompt: "WRAPPED", width: 1344, height: 768, length: 294 } });
    expect(graph["guider"]?.inputs).toMatchObject({ conditioning: ["cond", 0], model: ["unet", 0] });
    expect(graph["guide"]).toBeUndefined();
    expect(graph["last_frame_ref"]).toBeUndefined();
    expect(Object.values(graph).some((n) => n.class_type === "MiniMaxH3ReferenceToVideo" || n.class_type === "MiniMaxH3AddGuide")).toBe(false);
    // the join: the source's own frames and sound, then the new frames after the overlap
    expect(graph["new_frames"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: 39, length: 255 } });
    expect(graph["new_audio"]).toEqual({ class_type: "TrimAudioDuration", inputs: { audio: ["decode_audio", 0], start_index: 1.625, duration: 10.625 } });
    expect(graph["joined_frames"]).toEqual({ class_type: "ImageBatch", inputs: { image1: ["source_parts", 0], image2: ["new_frames", 0] } });
    expect(graph["joined_audio"]).toEqual({ class_type: "AudioConcat", inputs: { audio1: ["source_parts", 1], audio2: ["new_audio", 0], direction: "after" } });
    expect(graph["video"]?.inputs).toMatchObject({ images: ["joined_frames", 0], audio: ["joined_audio", 0], fps: 24 });
    expect(graph["poster_frame"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["joined_frames", 0], batch_index: 0, length: 1 } });
    expect(graph["noise"]?.inputs).toMatchObject({ noise_seed: 3 });
    expect(graph["save"]?.inputs).toMatchObject({ filename_prefix: "video/job-2" });
    // STORY_061: with the end anchored, the source's last frame is pinned at the new clip's last frame and the guider takes it
    const anchored = buildGraph(template, req, [], { seed: 3, filenamePrefix: "video/job-2", continuation: { file: "video/job-src_00001_.mp4", frames: 243, overlapFrames: 39, prompt: "WRAPPED", anchorEnd: true } });
    expect(anchored["anchor_frame"]).toEqual({ class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: 242, length: 1 } });
    expect(anchored["anchor"]).toEqual({ class_type: "MiniMaxH3AddGuide", inputs: { positive: ["cond", 0], vae: ["vae_video", 0], latent: ["latent", 0], image: ["anchor_frame", 0], frame_idx: 293 } });
    expect(anchored["guider"]?.inputs).toMatchObject({ conditioning: ["anchor", 0], model: ["unet", 0] });
    const without = (g: Record<string, unknown>, ...keys: string[]) => Object.fromEntries(Object.entries(g).filter(([k]) => !keys.includes(k)));
    expect(without(anchored, "anchor_frame", "anchor", "guider")).toEqual(without(graph, "guider")); // nothing else moves
    expect(buildGraph(template, req, [], { seed: 3, filenamePrefix: "video/job-2", continuation: { file: "video/job-src_00001_.mp4", frames: 243, overlapFrames: 39, prompt: "WRAPPED", anchorEnd: false } })).toEqual(graph);
    // what cannot be built is refused, not guessed
    expect(() => buildGraph(template, req, [], { continuation: { file: "x.mp4", frames: 243, overlapFrames: 30, prompt: "" } })).toThrow(/not one of/);
    expect(() => buildGraph(template, req, [], { continuation: { file: "x.mp4", frames: 20, overlapFrames: 39, prompt: "" } })).toThrow(/does not fit/);
    expect(() => buildGraph(template, { ...req, durationSeconds: 14 }, [], { continuation: { file: "x.mp4", frames: 243, overlapFrames: 39, prompt: "" } })).toThrow(/exceed/);
  });
});
