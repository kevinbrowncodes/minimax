/**
 * ComfyUI websocket events → a job's progress percentage (STORY_006). Model load and text encoding happen before the
 * first sampling step (2 %), sampling steps cover 5–95 %, the decode and save nodes 95–99 %, success 100.
 */
export interface ComfyEvent {
  readonly type: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export const SAMPLER_NODE = "sample";
const DECODE_NODES: ReadonlySet<string> = new Set(["decode_video", "decode_audio", "video", "save", "poster_frame", "poster"]);

export type ProgressUpdate =
  | { readonly kind: "started" }
  | { readonly kind: "progress"; readonly percent: number }
  | { readonly kind: "success" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "interrupted" }
  | { readonly kind: "ignore" };

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Interpret one event for the job whose ComfyUI prompt id is `promptId`. Events for other prompts are ignored. */
export function interpret(event: ComfyEvent, promptId: string): ProgressUpdate {
  const data = event.data ?? {};
  const forOther = "prompt_id" in data && str(data["prompt_id"]) !== promptId;
  if (forOther) return { kind: "ignore" };
  switch (event.type) {
    case "execution_start":
      return { kind: "started" };
    case "progress": {
      const value = num(data["value"]);
      const max = num(data["max"]);
      const node = str(data["node"]);
      if (value === undefined || max === undefined || max <= 0) return { kind: "ignore" };
      if (node !== undefined && node !== SAMPLER_NODE && !DECODE_NODES.has(node)) return { kind: "ignore" };
      const percent = DECODE_NODES.has(node ?? "") ? 95 + Math.floor((4 * value) / max) : 5 + Math.floor((90 * value) / max);
      return { kind: "progress", percent: Math.min(99, percent) };
    }
    case "executing": {
      const node = str(data["node"]) ?? null;
      if (node === null) return { kind: "ignore" }; // ComfyUI's "finished" marker; execution_success is the real one
      if (DECODE_NODES.has(node)) return { kind: "progress", percent: 95 };
      if (node === SAMPLER_NODE) return { kind: "progress", percent: 5 };
      return { kind: "progress", percent: 2 };
    }
    case "execution_success":
      return { kind: "success" };
    case "execution_error": {
      const message = [str(data["node_type"]), str(data["exception_message"])].filter((s): s is string => s !== undefined).join(": ");
      return { kind: "error", message: message || "ComfyUI reported an execution error" };
    }
    case "execution_interrupted":
      return { kind: "interrupted" };
    default:
      return { kind: "ignore" };
  }
}
