/**
 * Pure mapping from a job request onto MiniMax-H3's grid and ComfyUI's API graph (STORY_006). The graph template is
 * spark/comfyui/h3_t2v_prompt.json (the one STORY_005 rendered with); this module fills prompt, size, length, seed,
 * wires reference images to first_frame / last_frame, and adds a first-frame SaveImage for the poster.
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

/** Frame count on the model's 17k+5 grid, the rule of the official template and spark/comfyui/h3.sh. */
export function lengthForSeconds(seconds: number): number {
  const n = Math.max(5, Math.round(seconds * FPS));
  return n + ((((5 - (n % 17)) % 17) + 17) % 17);
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
export interface GraphOptions {
  readonly seed?: number;
  readonly filenamePrefix?: string;
}

const NEEDED_NODES = ["unet", "clip", "vae_video", "vae_audio", "cond", "noise", "sampler", "sigmas", "sample", "decode_video", "decode_audio", "video", "save"] as const;
/** Node classes the graph relies on; verified against /object_info at start (server.ts). */
export const REQUIRED_CLASSES: readonly string[] = ["UNETLoader", "CLIPLoader", "VAELoader", "MiniMaxH3ImageToVideo", "RandomNoise", "BasicGuider", "KSamplerSelect", "BasicScheduler", "SamplerCustomAdvanced", "VAEDecode", "VAEDecodeAudio", "CreateVideo", "SaveVideo", "LoadImage", "ImageFromBatch", "SaveImage"];

export function buildGraph(template: Graph, request: JobRequest, images: readonly UploadedImage[], options: GraphOptions = {}): Graph {
  for (const id of NEEDED_NODES) if (!(id in template)) throw new Error(`graph template has no "${id}" node`);
  const graph: Graph = structuredClone(template);
  delete (graph as Record<string, unknown>)["_comment"];
  const { width, height } = sizeFor(request.ratio);
  const cond = graph["cond"];
  const noise = graph["noise"];
  const video = graph["video"];
  const save = graph["save"];
  if (!cond || !noise || !video || !save) throw new Error("graph template is missing nodes");
  cond.inputs["prompt"] = request.prompt;
  cond.inputs["width"] = width;
  cond.inputs["height"] = height;
  cond.inputs["length"] = lengthForSeconds(request.durationSeconds);
  noise.inputs["noise_seed"] = options.seed ?? Math.floor(Math.random() * 2 ** 32);
  video.inputs["fps"] = FPS;
  const prefix = options.filenamePrefix ?? "video/MiniMax_H3";
  save.inputs["filename_prefix"] = prefix;

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
