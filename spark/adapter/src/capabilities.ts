/** What the Spark can do (STORY_006, STORY_016): one source for the contract's /capabilities and for request validation. */
export const CAPABILITIES = {
  models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }],
  ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["768P"],
  durationsSeconds: { min: 4, max: 15, step: 1 },
  referenceImages: { max: 2 },
  /** Extending a finished video (STORY_016): seconds added per step, seconds of the source watched, the longest source. */
  extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, contextSeconds: { min: 2, max: 15, default: 5 }, maxSourceSeconds: 30 },
} as const;
export type Ratio = (typeof CAPABILITIES.ratios)[number];

export const IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_PROMPT_CHARS = 2000;

export interface ContextFed {
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
  /** STORY_016: seconds of the source's end the model should watch (as requested). */
  readonly contextSeconds?: number;
  /** STORY_016: what the server actually fed (set by the server once the source is resolved). */
  readonly contextFed?: ContextFed;
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
  if (rawContinue !== undefined && rawContinue !== null && rawContinue !== "" && (typeof rawContinue !== "string" || rawContinue.trim() === "")) {
    throw new ValidationError("validation", "continueFrom", "continueFrom must be a job id");
  }
  const continueFrom = typeof rawContinue === "string" && rawContinue.trim() !== "" ? rawContinue.trim() : undefined;

  const rawDuration = fields["durationSeconds"];
  const durationSeconds = typeof rawDuration === "string" ? Number(rawDuration) : rawDuration;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds)) throw new ValidationError("validation", "durationSeconds", "durationSeconds must be an integer");
  const range = continueFrom === undefined ? CAPABILITIES.durationsSeconds : CAPABILITIES.extension.durationsSeconds;
  if (durationSeconds < range.min || durationSeconds > range.max || (durationSeconds - range.min) % range.step !== 0) {
    const what = continueFrom === undefined ? "durationSeconds" : "an extension's durationSeconds (the seconds added)";
    throw new ValidationError("unsupported_option", "durationSeconds", `${what} must be between ${String(range.min)} and ${String(range.max)}`);
  }

  const rawModel = fields["model"];
  const model = rawModel === undefined || rawModel === "" ? "minimax-h3" : rawModel;
  if (model !== "minimax-h3") throw new ValidationError("unsupported_option", "model", `model ${typeof model === "string" ? model : typeof model} is not offered by the Spark`);

  let contextSeconds: number | undefined;
  if (continueFrom !== undefined) {
    const { min, max, default: fallback } = CAPABILITIES.extension.contextSeconds;
    const raw = fields["contextSeconds"];
    if (raw === undefined || raw === null || raw === "") contextSeconds = fallback;
    else {
      const n = integer(raw);
      if (n === undefined || n < min || n > max) throw new ValidationError("unsupported_option", "contextSeconds", `contextSeconds must be a whole number between ${String(min)} and ${String(max)}`);
      contextSeconds = n;
    }
    if (uploads.length > 0) throw new ValidationError("validation", "referenceImage", "an extension takes no reference images: the video being extended is the reference");
  }

  let seed: number | undefined;
  const rawSeed = fields["seed"];
  if (rawSeed !== undefined && rawSeed !== null && rawSeed !== "") {
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
    ...(contextSeconds === undefined ? {} : { contextSeconds }),
    ...(seed === undefined ? {} : { seed }),
  };
}
