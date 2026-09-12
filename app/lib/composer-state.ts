/**
 * The composer's state as a pure reducer (STORY_013): mode, text, reference images, model, ratio, resolution,
 * duration, capabilities and the last error. Side effects (object URLs, the request) live in the component.
 */
import type { Capabilities } from "./job-api";
import { validateReferenceImages, type UploadLike } from "./upload-validation";

export interface ComposerImage extends UploadLike {
  readonly id: string;
  readonly file: File;
  /** An object URL for the thumbnail, created by the component (empty under jsdom). */
  readonly url: string;
}
export interface ComposerError {
  readonly message: string;
  readonly field?: string;
}
export interface ComposerState {
  readonly mode: "text" | "video";
  readonly text: string;
  readonly images: readonly ComposerImage[];
  readonly capabilities: Capabilities | undefined;
  readonly capabilitiesError: string | undefined;
  readonly model: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly error: ComposerError | undefined;
  readonly submitting: boolean;
}
export type ComposerAction =
  | { readonly type: "capabilities"; readonly capabilities: Capabilities }
  | { readonly type: "capabilities-failed"; readonly message: string }
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "enter-video-mode" }
  | { readonly type: "leave-video-mode" }
  | { readonly type: "add-images"; readonly images: readonly ComposerImage[] }
  | { readonly type: "remove-image"; readonly id: string }
  | { readonly type: "model"; readonly model: string }
  | { readonly type: "ratio"; readonly ratio: string }
  | { readonly type: "resolution"; readonly resolution: string }
  | { readonly type: "duration"; readonly durationSeconds: number }
  | { readonly type: "error"; readonly error: ComposerError }
  | { readonly type: "clear-error" }
  | { readonly type: "submit-start" }
  | { readonly type: "submit-end" };

/** The reference's defaults (composer-video-mode@1440: 16:9, 5 s); resolution and model come from capabilities. */
export const DEFAULT_RATIO = "16:9";
export const DEFAULT_DURATION = 5;
export const REFERENCE_MODELS: readonly { readonly id: string; readonly label: string }[] = [
  { id: "minimax-h3", label: "MiniMax-H3.0" },
  { id: "minimax-h3-max", label: "MiniMax-H3-Max" },
  { id: "hailuo-2.3", label: "Hailuo-2.3" },
];
export const REFERENCE_RESOLUTIONS: readonly string[] = ["768P", "2K"];
export const REFERENCE_RATIOS: readonly string[] = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

export function initialComposer(): ComposerState {
  return { mode: "text", text: "", images: [], capabilities: undefined, capabilitiesError: undefined, model: "", ratio: DEFAULT_RATIO, resolution: "", durationSeconds: DEFAULT_DURATION, error: undefined, submitting: false };
}

function clampDuration(seconds: number, caps: Capabilities | undefined): number {
  if (!caps) return seconds;
  const { min, max } = caps.durationsSeconds;
  return Math.min(max, Math.max(min, seconds));
}

export function reduceComposer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case "capabilities": {
      const caps = action.capabilities;
      return {
        ...state,
        capabilities: caps,
        capabilitiesError: undefined,
        model: caps.models[0]?.id ?? "",
        resolution: caps.resolutions[0] ?? "",
        ratio: caps.ratios.includes(state.ratio) ? state.ratio : (caps.ratios[0] ?? state.ratio),
        durationSeconds: clampDuration(state.durationSeconds, caps),
      };
    }
    case "capabilities-failed":
      return { ...state, capabilities: undefined, capabilitiesError: action.message };
    case "text":
      return { ...state, text: action.text, error: undefined };
    case "enter-video-mode":
      return state.mode === "video" ? state : { ...state, mode: "video", error: undefined };
    case "leave-video-mode":
      return state.mode === "text" ? state : { ...state, mode: "text", images: [], error: undefined };
    case "add-images": {
      const next = [...state.images, ...action.images];
      const verdict = validateReferenceImages(next);
      if (!verdict.ok) return { ...state, error: { message: verdict.message, field: verdict.field } };
      const max = state.capabilities?.referenceImages.max ?? 2;
      if (next.length > max) return { ...state, error: { message: `at most ${String(max)} reference images`, field: "referenceImage" } };
      return { ...state, images: next, error: undefined };
    }
    case "remove-image":
      return { ...state, images: state.images.filter((i) => i.id !== action.id), error: undefined };
    case "model":
      return isModelEnabled(state, action.model) ? { ...state, model: action.model } : state;
    case "ratio":
      return !state.capabilities || state.capabilities.ratios.includes(action.ratio) ? { ...state, ratio: action.ratio } : state;
    case "resolution":
      return isResolutionEnabled(state, action.resolution) ? { ...state, resolution: action.resolution } : state;
    case "duration":
      return { ...state, durationSeconds: clampDuration(action.durationSeconds, state.capabilities) };
    case "error":
      return { ...state, error: action.error, submitting: false };
    case "clear-error":
      return { ...state, error: undefined };
    case "submit-start":
      return { ...state, submitting: true, error: undefined };
    case "submit-end":
      return { ...state, submitting: false };
  }
}

export function isModelEnabled(state: ComposerState, id: string): boolean {
  return state.capabilities?.models.some((m) => m.id === id) ?? false;
}
export function isResolutionEnabled(state: ComposerState, resolution: string): boolean {
  return state.capabilities?.resolutions.includes(resolution) ?? false;
}
export function durationOptions(state: ComposerState): readonly number[] {
  const caps = state.capabilities;
  if (!caps) return [];
  const out: number[] = [];
  for (let s = caps.durationsSeconds.min; s <= caps.durationsSeconds.max; s += caps.durationsSeconds.step) out.push(s);
  return out;
}
export function canSend(state: ComposerState): boolean {
  return state.text.trim().length > 0 && !state.submitting && (state.mode !== "video" || state.capabilities !== undefined);
}
/** "16:9 768P 5s" — the Video parameters button's label (video-params-open@1440). */
export function paramsLabel(state: ComposerState): string {
  return `${state.ratio} ${state.resolution || "768P"} ${String(state.durationSeconds)}s`;
}
