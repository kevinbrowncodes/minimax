/** What the Spark can do (STORY_006, STORY_017): one source for the contract's /capabilities and for request validation. */
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, extensionLength, maxAddedSeconds, seconds } from "./grid.ts";

export const CAPABILITIES = {
  models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }],
  ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["768P"],
  durationsSeconds: { min: 4, max: 15, step: 1 },
  referenceImages: { max: 2 },
  /** Extending a finished video (STORY_017): seconds added per step, the overlap that becomes the new clip's head, the limits. */
  extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: OVERLAP_OPTIONS, default: DEFAULT_OVERLAP }, maxFrames: MAX_FRAMES, maxSourceSeconds: 30 },
} as const;
export type Ratio = (typeof CAPABILITIES.ratios)[number];

export const IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);
/** STORY_020: MiniMax's own 350–700-word prompts run to 4,500 characters; the owner must be able to write one. */
export const MAX_PROMPT_CHARS = 6000;

/** What was carried from the source into the new clip's own first frames. */
export interface Overlap {
  readonly frames: number;
  readonly seconds: number;
}
export interface JobRequest {
  readonly prompt: string;
  readonly ratio: Ratio;
  readonly resolution: "768P";
  readonly durationSeconds: number;
  readonly model: "minimax-h3";
  readonly referenceImages: number;
  /** STORY_016: the finished job this one continues; durationSeconds is then the seconds added. */
  readonly continueFrom?: string;
  /** STORY_017: the source's last N frames carried into the new clip (as requested). */
  readonly overlapFrames?: number;
  /** STORY_017: what the server carried (set once the source is resolved). */
  readonly overlap?: Overlap;
  /** The noise seed; given by the caller for like-for-like runs, otherwise drawn by the server and echoed. */
  readonly seed?: number;
}
export interface UploadLike {
  readonly field: string;
  readonly contentType: string;
  readonly size: number;
}

export class ValidationError extends Error {
  readonly status: number;
  readonly code: "validation" | "unsupported_option";
  readonly field: string;
  constructor(code: "validation" | "unsupported_option", field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.code = code;
    this.field = field;
  }
}

function isRatio(value: string): value is Ratio {
  return (CAPABILITIES.ratios as readonly string[]).includes(value);
}
function integer(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}
function blank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function validateRequest(fields: Readonly<Record<string, unknown>>, uploads: readonly UploadLike[]): JobRequest {
  const prompt = fields["prompt"];
  if (typeof prompt !== "string" || prompt.trim().length === 0) throw new ValidationError("validation", "prompt", "prompt is required");
  if (prompt.trim().length > MAX_PROMPT_CHARS) throw new ValidationError("validation", "prompt", `prompt is longer than ${String(MAX_PROMPT_CHARS)} characters`);

  const ratio = fields["ratio"];
  if (typeof ratio !== "string") throw new ValidationError("validation", "ratio", "ratio is required");
  if (!isRatio(ratio)) throw new ValidationError("unsupported_option", "ratio", `ratio ${ratio} is not offered by the Spark`);

  const resolution = fields["resolution"];
  if (typeof resolution !== "string") throw new ValidationError("validation", "resolution", "resolution is required");
  if (resolution !== "768P") throw new ValidationError("unsupported_option", "resolution", `resolution ${resolution} is not offered by the Spark (768P only: the 2K upscaler is not open-sourced)`);

  const rawContinue = fields["continueFrom"];
  if (!blank(rawContinue) && (typeof rawContinue !== "string" || rawContinue.trim() === "")) throw new ValidationError("validation", "continueFrom", "continueFrom must be a job id");
  const continueFrom = typeof rawContinue === "string" && rawContinue.trim() !== "" ? rawContinue.trim() : undefined;
  if (!blank(fields["contextSeconds"])) throw new ValidationError("validation", "contextSeconds", "contextSeconds is gone (contract v1.2): send overlapFrames (22, 39 or 56)");

  let overlapFrames: number | undefined;
  if (continueFrom !== undefined) {
    const { options, default: fallback } = CAPABILITIES.extension.overlapFrames;
    const raw = fields["overlapFrames"];
    if (blank(raw)) overlapFrames = fallback;
    else {
      const n = integer(raw);
      if (n === undefined || !options.includes(n)) throw new ValidationError("unsupported_option", "overlapFrames", `overlapFrames must be one of ${options.join(", ")}`);
      overlapFrames = n;
    }
  }

  const rawDuration = fields["durationSeconds"];
  const durationSeconds = typeof rawDuration === "string" ? Number(rawDuration) : rawDuration;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds)) throw new ValidationError("validation", "durationSeconds", "durationSeconds must be an integer");
  const range = continueFrom === undefined ? CAPABILITIES.durationsSeconds : CAPABILITIES.extension.durationsSeconds;
  if (durationSeconds < range.min || durationSeconds > range.max || (durationSeconds - range.min) % range.step !== 0) {
    const what = continueFrom === undefined ? "durationSeconds" : "an extension's durationSeconds (the seconds added)";
    throw new ValidationError("unsupported_option", "durationSeconds", `${what} must be between ${String(range.min)} and ${String(range.max)}`);
  }
  if (overlapFrames !== undefined && extensionLength(durationSeconds, overlapFrames) > MAX_FRAMES) {
    throw new ValidationError("unsupported_option", "durationSeconds", `with an overlap of ${String(seconds(overlapFrames))} s the most that can be added is ${String(maxAddedSeconds(overlapFrames))} s (the model generates at most ${String(MAX_FRAMES)} frames at once)`);
  }

  const rawModel = fields["model"];
  const model = rawModel === undefined || rawModel === "" ? "minimax-h3" : rawModel;
  if (model !== "minimax-h3") throw new ValidationError("unsupported_option", "model", `model ${typeof model === "string" ? model : typeof model} is not offered by the Spark`);

  if (continueFrom !== undefined && uploads.length > 0) throw new ValidationError("validation", "referenceImage", "an extension takes no reference images: the video being extended is the reference");

  let seed: number | undefined;
  const rawSeed = fields["seed"];
  if (!blank(rawSeed)) {
    const n = integer(rawSeed);
    if (n === undefined || n < 0 || n > 0xffffffff) throw new ValidationError("validation", "seed", "seed must be a whole number between 0 and 4294967295");
    seed = n;
  }

  if (uploads.length > CAPABILITIES.referenceImages.max) throw new ValidationError("validation", "referenceImage", `at most ${String(CAPABILITIES.referenceImages.max)} reference images`);
  for (const upload of uploads) {
    if (upload.field !== "referenceImage") throw new ValidationError("validation", upload.field, `unexpected file field ${upload.field}`);
    if (!IMAGE_TYPES.has(upload.contentType)) throw new ValidationError("validation", "referenceImage", `reference images must be png, jpeg or webp (got ${upload.contentType})`);
  }
  return {
    prompt: prompt.trim(),
    ratio,
    resolution: "768P",
    durationSeconds,
    model: "minimax-h3",
    referenceImages: uploads.length,
    ...(continueFrom === undefined ? {} : { continueFrom }),
    ...(overlapFrames === undefined ? {} : { overlapFrames }),
    ...(seed === undefined ? {} : { seed }),
  };
}
