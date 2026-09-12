/** What the Spark can do (STORY_006): one source for the contract's /capabilities and for request validation. */
export const CAPABILITIES = {
  models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }],
  ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["768P"],
  durationsSeconds: { min: 4, max: 15, step: 1 },
  referenceImages: { max: 2 },
} as const;
export type Ratio = (typeof CAPABILITIES.ratios)[number];

export const IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_PROMPT_CHARS = 2000;

export interface JobRequest {
  readonly prompt: string;
  readonly ratio: Ratio;
  readonly resolution: "768P";
  readonly durationSeconds: number;
  readonly model: "minimax-h3";
  readonly referenceImages: number;
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

  const rawDuration = fields["durationSeconds"];
  const durationSeconds = typeof rawDuration === "string" ? Number(rawDuration) : rawDuration;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds)) throw new ValidationError("validation", "durationSeconds", "durationSeconds must be an integer");
  const { min, max, step } = CAPABILITIES.durationsSeconds;
  if (durationSeconds < min || durationSeconds > max || (durationSeconds - min) % step !== 0) {
    throw new ValidationError("unsupported_option", "durationSeconds", `durationSeconds must be between ${String(min)} and ${String(max)}`);
  }

  const rawModel = fields["model"];
  const model = rawModel === undefined || rawModel === "" ? "minimax-h3" : rawModel;
  if (model !== "minimax-h3") throw new ValidationError("unsupported_option", "model", `model ${typeof model === "string" ? model : typeof model} is not offered by the Spark`);

  if (uploads.length > CAPABILITIES.referenceImages.max) throw new ValidationError("validation", "referenceImage", `at most ${String(CAPABILITIES.referenceImages.max)} reference images`);
  for (const upload of uploads) {
    if (upload.field !== "referenceImage") throw new ValidationError("validation", upload.field, `unexpected file field ${upload.field}`);
    if (!IMAGE_TYPES.has(upload.contentType)) throw new ValidationError("validation", "referenceImage", `reference images must be png, jpeg or webp (got ${upload.contentType})`);
  }
  return { prompt: prompt.trim(), ratio, resolution: "768P", durationSeconds, model: "minimax-h3", referenceImages: uploads.length };
}
