/**
 * Pure mapping from a job request onto MiniMax-H3's grid and ComfyUI's API graph (STORY_006, STORY_017). The graph
 * template is spark/comfyui/h3_t2v_prompt.json (the one STORY_005 rendered with); this module fills prompt, size,
 * length, seed, wires reference images to first_frame / last_frame, adds a first-frame SaveImage for the poster, and —
 * for an extension — makes the source's last frames the new clip's own first frames, protected by the noise mask
 * (native masked continuation, docs/story/STORY_017), then joins source and segment into one clip.
 */
import type { JobRequest, Ratio } from "./capabilities.ts";
import { FPS, MAX_FRAMES, OVERLAP_OPTIONS, audioTicks, extensionLength, latentFrames, lengthForSeconds, seconds } from "./grid.ts";

export { AUDIO_LATENT_FPS, DEFAULT_OVERLAP, FPS, MAX_FRAMES, OVERLAP_OPTIONS, audioTicks, extensionLength, gridDown, latentFrames, lengthForSeconds, maxAddedSeconds, seconds } from "./grid.ts";

/** 768 on the short side, both sides multiples of 32 — what the model was measured at (STORY_005). */
export const SIZES: Readonly<Record<Ratio, { readonly width: number; readonly height: number }>> = {
  "21:9": { width: 1792, height: 768 },
  "16:9": { width: 1344, height: 768 },
  "4:3": { width: 1024, height: 768 },
  "1:1": { width: 768, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 768, height: 1344 },
};

export function sizeFor(ratio: Ratio): { width: number; height: number } {
  return SIZES[ratio];
}

export interface GraphNode {
  readonly class_type: string;
  readonly inputs: Record<string, unknown>;
}
export type Graph = Record<string, GraphNode>;

export interface UploadedImage {
  /** The name ComfyUI's /upload/image returned; LoadImage takes it as its `image` input. */
  readonly name: string;
}
/** An extension's source (STORY_017): the finished clip in ComfyUI's output directory and how much of it becomes the new clip's head. */
export interface Continuation {
  /** "<subfolder>/<filename>" under ComfyUI's output directory (LoadVideo reads it as "<file> [output]"). */
  readonly file: string;
  /** Frames in the source clip. */
  readonly frames: number;
  /** The source's last N frames carried into the new clip as its own first frames (one of OVERLAP_OPTIONS). */
  readonly overlapFrames: number;
  /** The prompt in MiniMax's base format (prompt.ts buildPrompt, kind "extension"). */
  readonly prompt: string;
}
export interface GraphOptions {
  readonly seed?: number;
  readonly filenamePrefix?: string;
  readonly continuation?: Continuation;
  /** STORY_020: the prompt as built for the model for a fresh clip (prompt.ts buildPrompt); the request's text when absent. */
  readonly prompt?: string;
}

const NEEDED_NODES = ["unet", "clip", "vae_video", "vae_audio", "cond", "noise", "guider", "sampler", "sigmas", "sample", "decode_video", "decode_audio", "video", "save"] as const;
/** Node classes the graphs rely on; verified against /object_info at start (server.ts). */
export const REQUIRED_CLASSES: readonly string[] = [
  "UNETLoader", "CLIPLoader", "VAELoader", "MiniMaxH3ImageToVideo", "RandomNoise", "BasicGuider", "KSamplerSelect", "BasicScheduler", "SamplerCustomAdvanced", "VAEDecode", "VAEDecodeAudio", "CreateVideo", "SaveVideo", "LoadImage", "ImageFromBatch", "SaveImage",
  // STORY_017 extensions: the source's tail as the new clip's own head, protected by the noise mask, joined in-graph
  "LoadVideo", "GetVideoComponents", "VAEEncode", "VAEEncodeAudio", "EmptyMiniMaxH3LatentAV", "LTXVSeparateAVLatent", "LTXVConcatAVLatent", "ReplaceVideoLatentFrames", "LatentCut", "LatentConcat",
  "SolidMask", "MaskToImage", "RepeatImageBatch", "ImageToMask", "MaskComposite", "SetLatentNoiseMask", "ImageBatch", "TrimAudioDuration", "AudioConcat",
];

/** The Ref2VA checkpoint for the template's FL2VA file at the same precision (reported by health; not used by extensions since STORY_017). */
export function ref2vaFileFor(fl2vaFile: string): string {
  return fl2vaFile.replace("fl2va", "ref2va");
}
/** The FL2VA checkpoint the template loads. */
export function templateUnet(template: Graph): string {
  const name = template["unet"]?.inputs["unet_name"];
  return typeof name === "string" ? name : "";
}

export function buildGraph(template: Graph, request: JobRequest, images: readonly UploadedImage[], options: GraphOptions = {}): Graph {
  for (const id of NEEDED_NODES) if (!(id in template)) throw new Error(`graph template has no "${id}" node`);
  const graph: Graph = structuredClone(template);
  delete (graph as Record<string, unknown>)["_comment"];
  const { width, height } = sizeFor(request.ratio);
  const cond = graph["cond"];
  const noise = graph["noise"];
  const video = graph["video"];
  const save = graph["save"];
  const sample = graph["sample"];
  if (!cond || !noise || !video || !save || !sample) throw new Error("graph template is missing nodes");
  noise.inputs["noise_seed"] = options.seed ?? Math.floor(Math.random() * 2 ** 32);
  video.inputs["fps"] = FPS;
  const prefix = options.filenamePrefix ?? "video/MiniMax_H3";
  save.inputs["filename_prefix"] = prefix;

  const continuation = options.continuation;
  if (!continuation) {
    cond.inputs["prompt"] = options.prompt ?? request.prompt;
    cond.inputs["width"] = width;
    cond.inputs["height"] = height;
    cond.inputs["length"] = lengthForSeconds(request.durationSeconds);
    const [first, last] = images;
    if (first) {
      graph["first_frame"] = { class_type: "LoadImage", inputs: { image: first.name } };
      cond.inputs["first_frame"] = ["first_frame", 0];
    }
    if (last) {
      graph["last_frame"] = { class_type: "LoadImage", inputs: { image: last.name } };
      cond.inputs["last_frame"] = ["last_frame", 0];
    }
    // The poster: the first decoded frame, saved as PNG next to the video.
    graph["poster_frame"] = { class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: 0, length: 1 } };
    graph["poster"] = { class_type: "SaveImage", inputs: { images: ["poster_frame", 0], filename_prefix: `${prefix}_poster` } };
    return graph;
  }

  // --- an extension (STORY_017): native masked continuation on the FL2VA checkpoint the template loads ------------
  const S = continuation.frames;
  const O = continuation.overlapFrames;
  if (!OVERLAP_OPTIONS.includes(O)) throw new Error(`overlap ${String(O)} is not one of ${OVERLAP_OPTIONS.join("/")}`);
  if (O > S) throw new Error(`an overlap of ${String(O)} frames does not fit a ${String(S)}-frame source`);
  const L = extensionLength(request.durationSeconds, O);
  if (L > MAX_FRAMES) throw new Error(`${String(L)} frames exceed the model's ${String(MAX_FRAMES)}`);
  const latW = width / 16;
  const latH = height / 16;
  const lO = latentFrames(O);
  const lL = latentFrames(L);
  const aO = audioTicks(O);
  const aL = audioTicks(L);

  // The source's tail: pixels and sound of its last O frames, encoded by the model's own VAEs.
  graph["source_video"] = { class_type: "LoadVideo", inputs: { file: `${continuation.file} [output]` } };
  graph["source_parts"] = { class_type: "GetVideoComponents", inputs: { video: ["source_video", 0] } };
  graph["tail_frames"] = { class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: S - O, length: O } };
  graph["tail_latent"] = { class_type: "VAEEncode", inputs: { pixels: ["tail_frames", 0], vae: ["vae_video", 0] } };
  graph["tail_audio"] = { class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: seconds(S - O), duration: seconds(O) } };
  graph["tail_audio_latent_raw"] = { class_type: "VAEEncodeAudio", inputs: { audio: ["tail_audio", 0], vae: ["vae_audio", 0] } };
  graph["tail_audio_latent"] = { class_type: "LatentCut", inputs: { samples: ["tail_audio_latent_raw", 0], dim: "x", index: 0, amount: aO } };
  // The canvas: an empty AV latent of the whole new clip, with the tail written over its first frames.
  graph["canvas"] = { class_type: "EmptyMiniMaxH3LatentAV", inputs: { width, height, length: L } };
  graph["canvas_parts"] = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["canvas", 0] } };
  graph["video_latent"] = { class_type: "ReplaceVideoLatentFrames", inputs: { destination: ["canvas_parts", 0], source: ["tail_latent", 0], index: 0 } };
  graph["audio_rest"] = { class_type: "LatentCut", inputs: { samples: ["canvas_parts", 1], dim: "x", index: aO, amount: aL - aO } };
  graph["audio_latent"] = { class_type: "LatentConcat", inputs: { samples1: ["tail_audio_latent", 0], samples2: ["audio_rest", 0], dim: "x" } };
  // The masks: 0 keeps the tail's rows as they are, 1 lets the model generate the rest (ComfyUI PR #15375).
  graph["mask_keep"] = { class_type: "SolidMask", inputs: { value: 0, width: latW, height: latH } };
  graph["mask_new"] = { class_type: "SolidMask", inputs: { value: 1, width: latW, height: latH } };
  graph["mask_keep_img"] = { class_type: "MaskToImage", inputs: { mask: ["mask_keep", 0] } };
  graph["mask_new_img"] = { class_type: "MaskToImage", inputs: { mask: ["mask_new", 0] } };
  graph["mask_keep_batch"] = { class_type: "RepeatImageBatch", inputs: { image: ["mask_keep_img", 0], amount: lO } };
  graph["mask_new_batch"] = { class_type: "RepeatImageBatch", inputs: { image: ["mask_new_img", 0], amount: lL - lO } };
  graph["mask_video_img"] = { class_type: "ImageBatch", inputs: { image1: ["mask_keep_batch", 0], image2: ["mask_new_batch", 0] } };
  graph["mask_video"] = { class_type: "ImageToMask", inputs: { image: ["mask_video_img", 0], channel: "red" } };
  graph["video_masked"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["video_latent", 0], mask: ["mask_video", 0] } };
  graph["amask_base"] = { class_type: "SolidMask", inputs: { value: 0, width: aL, height: 2 } };
  graph["amask_new"] = { class_type: "SolidMask", inputs: { value: 1, width: aL - aO, height: 2 } };
  graph["amask"] = { class_type: "MaskComposite", inputs: { destination: ["amask_base", 0], source: ["amask_new", 0], x: aO, y: 0, operation: "add" } };
  graph["audio_masked"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["audio_latent", 0], mask: ["amask", 0] } };
  graph["latent"] = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["video_masked", 0], audio_latent: ["audio_masked", 0] } };
  // Text conditioning only (FL2VA's base format); the node's own empty latent is not used.
  cond.inputs["prompt"] = continuation.prompt;
  cond.inputs["width"] = width;
  cond.inputs["height"] = height;
  cond.inputs["length"] = L;
  delete cond.inputs["first_frame"];
  delete cond.inputs["last_frame"];
  sample.inputs["latent_image"] = ["latent", 0];
  // The join: the source's own frames and sound, then the new frames after the overlap.
  graph["new_frames"] = { class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: O, length: L - O } };
  graph["new_audio"] = { class_type: "TrimAudioDuration", inputs: { audio: ["decode_audio", 0], start_index: seconds(O), duration: seconds(L - O) } };
  graph["joined_frames"] = { class_type: "ImageBatch", inputs: { image1: ["source_parts", 0], image2: ["new_frames", 0] } };
  graph["joined_audio"] = { class_type: "AudioConcat", inputs: { audio1: ["source_parts", 1], audio2: ["new_audio", 0], direction: "after" } };
  video.inputs["images"] = ["joined_frames", 0];
  video.inputs["audio"] = ["joined_audio", 0];
  graph["poster_frame"] = { class_type: "ImageFromBatch", inputs: { image: ["joined_frames", 0], batch_index: 0, length: 1 } };
  graph["poster"] = { class_type: "SaveImage", inputs: { images: ["poster_frame", 0], filename_prefix: `${prefix}_poster` } };
  return graph;
}
