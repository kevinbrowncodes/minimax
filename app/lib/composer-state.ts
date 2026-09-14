/**
 * The composer's state as a pure reducer (STORY_013): mode, text, reference images, model, ratio, resolution,
 * duration, capabilities and the last error; extend mode (STORY_016/017): the source, the seconds added, the overlap.
 * Side effects (object URLs, the request) live in the component.
 */
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, maxAddedSeconds, overlapSeconds } from "./extend";
import type { Capabilities, ExtensionCapabilities } from "./job-api";
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
/** The finished video an extension continues (STORY_016). */
export interface ExtendSource {
  readonly id: string;
  readonly title: string;
  readonly durationSeconds: number;
  readonly ratio: string;
  readonly resolution: string;
  readonly model: string;
  readonly posterUrl: string;
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
  /** Extend mode: the source; ratio/resolution/model are then the source's and durationSeconds is the seconds added. */
  readonly extend: ExtendSource | undefined;
  /** Extend mode (STORY_017): how many of the source's last frames become the new clip's own first frames. */
  readonly overlapFrames: number;
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
  | { readonly type: "extend-from"; readonly source: ExtendSource }
  | { readonly type: "clear-extend" }
  | { readonly type: "overlap"; readonly overlapFrames: number }
  | { readonly type: "error"; readonly error: ComposerError }
  | { readonly type: "clear-error" }
  | { readonly type: "submit-start" }
  | { readonly type: "submit-end" };

/** The reference's defaults (composer-video-mode@1440: 16:9, 5 s); resolution and model come from capabilities. */
export const DEFAULT_RATIO = "16:9";
export const DEFAULT_DURATION = 5;
const DEFAULT_EXTENSION: ExtensionCapabilities = { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: OVERLAP_OPTIONS, default: DEFAULT_OVERLAP }, maxFrames: MAX_FRAMES, maxSourceSeconds: 30 };
export const REFERENCE_MODELS: readonly { readonly id: string; readonly label: string }[] = [
  { id: "minimax-h3", label: "MiniMax-H3.0" },
  { id: "minimax-h3-max", label: "MiniMax-H3-Max" },
  { id: "hailuo-2.3", label: "Hailuo-2.3" },
];
export const REFERENCE_RESOLUTIONS: readonly string[] = ["768P", "2K"];
export const REFERENCE_RATIOS: readonly string[] = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

export function initialComposer(): ComposerState {
  return { mode: "text", text: "", images: [], capabilities: undefined, capabilitiesError: undefined, model: "", ratio: DEFAULT_RATIO, resolution: "", durationSeconds: DEFAULT_DURATION, extend: undefined, overlapFrames: DEFAULT_EXTENSION.overlapFrames.default, error: undefined, submitting: false };
}

/** The server's extension limits, or the contract's defaults while capabilities are unknown or lack them. */
export function extensionOf(caps: Capabilities | undefined): ExtensionCapabilities {
  return caps?.extension ?? DEFAULT_EXTENSION;
}
/** The most an extension step may add with this overlap: the server's range, cut by the model's frame ceiling. */
function maxAdded(caps: Capabilities | undefined, overlapFrames: number): number {
  const ext = extensionOf(caps);
  return Math.min(ext.durationsSeconds.max, maxAddedSeconds(overlapFrames, ext.durationsSeconds.max));
}
function clampDuration(seconds: number, caps: Capabilities | undefined, extending: number | undefined): number {
  if (extending !== undefined) {
    const { min } = extensionOf(caps).durationsSeconds;
    return Math.min(maxAdded(caps, extending), Math.max(min, seconds));
  }
  if (!caps) return seconds;
  const { min, max } = caps.durationsSeconds;
  return Math.min(max, Math.max(min, seconds));
}
function clampOverlap(frames: number, caps: Capabilities | undefined): number {
  const { options, default: fallback } = extensionOf(caps).overlapFrames;
  return options.includes(frames) ? frames : fallback;
}

export function reduceComposer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case "capabilities": {
      const caps = action.capabilities;
      if (state.extend) {
        const overlapFrames = clampOverlap(state.overlapFrames, caps);
        return { ...state, capabilities: caps, capabilitiesError: undefined, overlapFrames, durationSeconds: clampDuration(state.durationSeconds, caps, overlapFrames) };
      }
      return {
        ...state,
        capabilities: caps,
        capabilitiesError: undefined,
        model: caps.models[0]?.id ?? "",
        resolution: caps.resolutions[0] ?? "",
        ratio: caps.ratios.includes(state.ratio) ? state.ratio : (caps.ratios[0] ?? state.ratio),
        durationSeconds: clampDuration(state.durationSeconds, caps, undefined),
      };
    }
    case "capabilities-failed":
      return { ...state, capabilities: undefined, capabilitiesError: action.message };
    case "text":
      return { ...state, text: action.text, error: undefined };
    case "enter-video-mode":
      return state.mode === "video" ? state : { ...state, mode: "video", error: undefined };
    case "leave-video-mode":
      return state.mode === "text" ? state : { ...state, mode: "text", images: [], extend: undefined, error: undefined };
    case "extend-from": {
      const ext = extensionOf(state.capabilities);
      const overlapFrames = ext.overlapFrames.default;
      return { ...state, mode: "video", extend: action.source, images: [], ratio: action.source.ratio, resolution: action.source.resolution, model: action.source.model, durationSeconds: clampDuration(ext.durationsSeconds.default, state.capabilities, overlapFrames), overlapFrames, error: undefined };
    }
    case "clear-extend": {
      if (!state.extend) return state;
      const caps = state.capabilities;
      return { ...state, extend: undefined, images: [], model: caps?.models[0]?.id ?? "", resolution: caps?.resolutions[0] ?? "", ratio: caps?.ratios.includes(DEFAULT_RATIO) === false ? (caps.ratios[0] ?? DEFAULT_RATIO) : DEFAULT_RATIO, durationSeconds: clampDuration(DEFAULT_DURATION, caps, undefined), overlapFrames: extensionOf(caps).overlapFrames.default, error: undefined };
    }
    case "overlap": {
      if (!state.extend) return state;
      const overlapFrames = clampOverlap(action.overlapFrames, state.capabilities);
      return { ...state, overlapFrames, durationSeconds: clampDuration(state.durationSeconds, state.capabilities, overlapFrames) };
    }
    case "add-images": {
      if (state.extend) return { ...state, error: { message: "An extension takes no reference images — the video being extended is the reference", field: "referenceImage" } };
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
      return !state.extend && isModelEnabled(state, action.model) ? { ...state, model: action.model } : state;
    case "ratio":
      return !state.extend && (!state.capabilities || state.capabilities.ratios.includes(action.ratio)) ? { ...state, ratio: action.ratio } : state;
    case "resolution":
      return !state.extend && isResolutionEnabled(state, action.resolution) ? { ...state, resolution: action.resolution } : state;
    case "duration":
      return { ...state, durationSeconds: clampDuration(action.durationSeconds, state.capabilities, state.extend ? state.overlapFrames : undefined) };
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
/** The durations on offer; in extend mode the seconds that can be added with the chosen overlap. */
export function durationOptions(state: ComposerState): readonly number[] {
  const caps = state.capabilities;
  if (!caps) return [];
  const range = state.extend ? extensionOf(caps).durationsSeconds : caps.durationsSeconds;
  const max = state.extend ? maxAdded(caps, state.overlapFrames) : range.max;
  const out: number[] = [];
  for (let s = range.min; s <= max; s += range.step) out.push(s);
  return out;
}
/** Extend mode's Overlap choices: the server's options as seconds ("0.9 s", "1.6 s", "2.3 s"). */
export function overlapOptions(state: ComposerState): readonly { readonly frames: number; readonly label: string }[] {
  if (!state.extend) return [];
  return extensionOf(state.capabilities).overlapFrames.options.map((frames) => ({ frames, label: `${overlapSeconds(frames)} s` }));
}
export function canSend(state: ComposerState): boolean {
  return state.text.trim().length > 0 && !state.submitting && (state.mode !== "video" || state.capabilities !== undefined);
}
/** "16:9 768P 5s" — the Video parameters button's label (video-params-open@1440); "+10s" while extending. */
export function paramsLabel(state: ComposerState): string {
  return `${state.ratio} ${state.resolution || "768P"} ${state.extend ? "+" : ""}${String(state.durationSeconds)}s`;
}
