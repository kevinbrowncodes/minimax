/**
 * Pure mapping from a job request onto MiniMax-H3's grid and ComfyUI's API graph (STORY_006, STORY_016). The graph
 * template is spark/comfyui/h3_t2v_prompt.json (the one STORY_005 rendered with); this module fills prompt, size,
 * length, seed, wires reference images to first_frame / last_frame, adds a first-frame SaveImage for the poster, and —
 * for an extension — rebuilds the conditioning on the Ref2VA checkpoint with the source's tail as the reference,
 * anchors the seam, and joins source and segment into one clip (docs/story/STORY_016).
 */
import type { JobRequest, Ratio } from "./capabilities.ts";

/** 768 on the short side, both sides multiples of 32 — what the model was measured at (STORY_005). */
export const SIZES: Readonly<Record<Ratio, { readonly width: number; readonly height: number }>> = {
  "21:9": { width: 1792, height: 768 },
  "16:9": { width: 1344, height: 768 },
  "4:3": { width: 1024, height: 768 },
  "1:1": { width: 768, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 768, height: 1344 },
};
export const FPS = 24;
/** The seam anchor: the source's last 22 frames (the smallest 17k+5 clip with motion in it) pinned at frame 0 of the segment, then cut at the join. */
export const ANCHOR_FRAMES = 22;

/** Frame count on the model's 17k+5 grid, the rule of the official template and spark/comfyui/h3.sh. */
export function lengthForSeconds(seconds: number): number {
  const n = Math.max(5, Math.round(seconds * FPS));
  return n + ((((5 - (n % 17)) % 17) + 17) % 17);
}

/** The largest 17k+5 count that is ≤ n (n ≥ 5) — how ComfyUI cuts a reference or guide clip down to the grid. */
export function gridDown(n: number): number {
  const m = Math.max(5, Math.floor(n));
  return m - ((m - 5) % 17);
}

/** Frames generated for an extension: at least the requested seconds are new after the anchor is cut, snapped up. */
export function extensionLength(addedSeconds: number): number {
  return lengthForSeconds(addedSeconds + ANCHOR_FRAMES / FPS);
}

/** Frames of the source's end the model watches: the requested seconds on the grid, cut down to the source and to the segment. */
export function contextFrames(sourceFrames: number, segmentFrames: number, contextSeconds: number): number {
  return gridDown(Math.min(sourceFrames, segmentFrames, lengthForSeconds(contextSeconds)));
}

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
/** An extension's source (STORY_016): the finished clip in ComfyUI's output directory and what to feed from it. */
export interface Continuation {
  /** "<subfolder>/<filename>" under ComfyUI's output directory (LoadVideo reads it as "<file> [output]"). */
  readonly file: string;
  /** Frames in the source clip. */
  readonly frames: number;
  /** Frames of the source's end fed as the reference (see contextFrames). */
  readonly contextFrames: number;
  /** The full-reference prompt (prompt.ts continuationPrompt) the Ref2VA node gets instead of the prose. */
  readonly prompt: string;
}
export interface GraphOptions {
  readonly seed?: number;
  readonly filenamePrefix?: string;
  readonly continuation?: Continuation;
}

const NEEDED_NODES = ["unet", "clip", "vae_video", "vae_audio", "cond", "noise", "guider", "sampler", "sigmas", "sample", "decode_video", "decode_audio", "video", "save"] as const;
/** Node classes the graphs rely on; verified against /object_info at start (server.ts). */
export const REQUIRED_CLASSES: readonly string[] = [
  "UNETLoader", "CLIPLoader", "VAELoader", "MiniMaxH3ImageToVideo", "RandomNoise", "BasicGuider", "KSamplerSelect", "BasicScheduler", "SamplerCustomAdvanced", "VAEDecode", "VAEDecodeAudio", "CreateVideo", "SaveVideo", "LoadImage", "ImageFromBatch", "SaveImage",
  // STORY_016 extensions
  "LoadVideo", "GetVideoComponents", "MiniMaxH3ReferenceToVideo", "MiniMaxH3AddGuide", "ImageBatch", "TrimAudioDuration", "AudioConcat",
];

/** The Ref2VA checkpoint for the template's FL2VA file at the same precision (Comfy-Org names them alike). */
export function ref2vaFileFor(fl2vaFile: string): string {
  return fl2vaFile.replace("fl2va", "ref2va");
}
/** The FL2VA checkpoint the template loads (the adapter's start-up check needs both names). */
export function templateUnet(template: Graph): string {
  const name = template["unet"]?.inputs["unet_name"];
  return typeof name === "string" ? name : "";
}

const seconds = (frames: number): number => Math.round((frames / FPS) * 1000) / 1000;

export function buildGraph(template: Graph, request: JobRequest, images: readonly UploadedImage[], options: GraphOptions = {}): Graph {
  for (const id of NEEDED_NODES) if (!(id in template)) throw new Error(`graph template has no "${id}" node`);
  const graph: Graph = structuredClone(template);
  delete (graph as Record<string, unknown>)["_comment"];
  const { width, height } = sizeFor(request.ratio);
  const cond = graph["cond"];
  const noise = graph["noise"];
  const video = graph["video"];
  const save = graph["save"];
  const unet = graph["unet"];
  const guider = graph["guider"];
  if (!cond || !noise || !video || !save || !unet || !guider) throw new Error("graph template is missing nodes");
  noise.inputs["noise_seed"] = options.seed ?? Math.floor(Math.random() * 2 ** 32);
  video.inputs["fps"] = FPS;
  const prefix = options.filenamePrefix ?? "video/MiniMax_H3";
  save.inputs["filename_prefix"] = prefix;

  const continuation = options.continuation;
  if (!continuation) {
    cond.inputs["prompt"] = request.prompt;
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

  // --- an extension (STORY_016): Ref2VA, the source's tail as <Video 1>/<Audio 1>, the seam anchored, the join in-graph
  const segment = extensionLength(request.durationSeconds);
  const { frames: sourceFrames, contextFrames: ctx } = continuation;
  if (ctx < 5 || ctx > sourceFrames || ANCHOR_FRAMES > sourceFrames) throw new Error(`continuation context ${String(ctx)} does not fit a ${String(sourceFrames)}-frame source`);
  unet.inputs["unet_name"] = ref2vaFileFor(templateUnet(template));
  graph["source_video"] = { class_type: "LoadVideo", inputs: { file: `${continuation.file} [output]` } };
  graph["source_parts"] = { class_type: "GetVideoComponents", inputs: { video: ["source_video", 0] } };
  graph["context_frames"] = { class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: sourceFrames - ctx, length: ctx } };
  graph["context_audio"] = { class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: seconds(sourceFrames - ctx), duration: seconds(ctx) } };
  // CHORE_003: the source's last frame is also <Picture 1>, the shot's first frame in MiniMax's own vocabulary, so the set stays.
  graph["last_frame_ref"] = { class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: sourceFrames - 1, length: 1 } };
  graph["anchor_frames"] = { class_type: "ImageFromBatch", inputs: { image: ["source_parts", 0], batch_index: sourceFrames - ANCHOR_FRAMES, length: ANCHOR_FRAMES } };
  graph["anchor_audio"] = { class_type: "TrimAudioDuration", inputs: { audio: ["source_parts", 1], start_index: seconds(sourceFrames - ANCHOR_FRAMES), duration: seconds(ANCHOR_FRAMES) } };
  graph["cond"] = {
    class_type: "MiniMaxH3ReferenceToVideo",
    inputs: {
      clip: ["clip", 0],
      vae: ["vae_video", 0],
      audio_vae: ["vae_audio", 0],
      prompt: continuation.prompt,
      width,
      height,
      length: segment,
      ref_image_size: "match",
      "ref_images.ref_image_0": ["last_frame_ref", 0],
      "ref_videos.ref_video_0": ["context_frames", 0],
      "ref_video_audios.ref_video_audio_0": ["context_audio", 0],
    },
  };
  graph["guide"] = {
    class_type: "MiniMaxH3AddGuide",
    inputs: { positive: ["cond", 0], vae: ["vae_video", 0], audio_vae: ["vae_audio", 0], latent: ["cond", 1], image: ["anchor_frames", 0], audio: ["anchor_audio", 0], frame_idx: 0 },
  };
  guider.inputs["conditioning"] = ["guide", 0];
  graph["new_frames"] = { class_type: "ImageFromBatch", inputs: { image: ["decode_video", 0], batch_index: ANCHOR_FRAMES, length: segment - ANCHOR_FRAMES } };
  graph["new_audio"] = { class_type: "TrimAudioDuration", inputs: { audio: ["decode_audio", 0], start_index: seconds(ANCHOR_FRAMES), duration: seconds(segment - ANCHOR_FRAMES) } };
  graph["joined_frames"] = { class_type: "ImageBatch", inputs: { image1: ["source_parts", 0], image2: ["new_frames", 0] } };
  graph["joined_audio"] = { class_type: "AudioConcat", inputs: { audio1: ["source_parts", 1], audio2: ["new_audio", 0], direction: "after" } };
  video.inputs["images"] = ["joined_frames", 0];
  video.inputs["audio"] = ["joined_audio", 0];
  graph["poster_frame"] = { class_type: "ImageFromBatch", inputs: { image: ["joined_frames", 0], batch_index: 0, length: 1 } };
  graph["poster"] = { class_type: "SaveImage", inputs: { images: ["poster_frame", 0], filename_prefix: `${prefix}_poster` } };
  return graph;
}
