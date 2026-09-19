/**
 * The composer's state as a pure reducer (STORY_013): mode, text, reference images, model, ratio, resolution,
 * duration, capabilities and the last error; extend mode (STORY_016/017): the source, the seconds added, the overlap.
 * Side effects (object URLs, the request) live in the component.
 */
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, maxAddedSeconds, overlapSeconds } from "./extend";
import { END_ANCHORS, type Capabilities, type EndAnchor, type ExtensionCapabilities } from "./job-api";
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
  /** STORY_043: the source has not finished — its length is what it was asked for; the extension waits for it in the queue. */
  readonly pending?: boolean;
}
/** The composer's modes: text (the plain composer, BACKLOG_006's chat) and video (ours). STORY_026 removed the reference's other chips. */
export type ComposerMode = "text" | "video";

export interface ComposerState {
  readonly mode: ComposerMode;
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
  /** STORY_061: where an extension ends — the source's last frame pinned at the segment's last frame (the default), or free. Applies to every extension the chain posts too. */
  readonly endAnchor: EndAnchor;
  readonly error: ComposerError | undefined;
  readonly submitting: boolean;
  /** STORY_031: the project the task starts in (+ › Add to project, or the row's New task); undefined = No project. */
  readonly projectId: string | undefined;
  /** STORY_041: Send holds the request in the queue until this time (ISO); undefined = the next free slot. */
  readonly notBefore?: string;
  /** STORY_041: Edit of a waiting request — Send replaces this queue entry instead of creating a job. */
  readonly queueId?: string;
  /** STORY_050: the Agent chip — the director that writes the prompt from the photo. */
  readonly agent: AgentState;
}

/** STORY_050: a director skill as `GET /api/agent/skills` lists it. */
export interface AgentSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly metadata: Readonly<Record<string, string>>;
}
/** The format check's finding, as the route returns it (lib/prompt-format.ts). */
export interface AgentFinding {
  readonly code: string;
  readonly message: string;
  readonly segment?: number;
}

/**
 * The amber strip's words for a reply with findings: a single clip's as "The reply misses the skill's format: …";
 * a chain's per segment (STORY_053) — "Segment 2 misses the skill's format: …" — the server's own "Segment N:" prefix
 * dropped; "Not sent — " in front when straight-through mode held the reply back.
 */
export function findingsNotice(findings: readonly AgentFinding[], notSent: boolean): string {
  const prefix = notSent ? "Not sent — " : "";
  const chained = findings.every((f) => f.segment !== undefined);
  const tail = notSent ? `Edit it and Send${chained ? " all" : ""}.` : "Edit it, or send it as it is.";
  if (!chained) return `${prefix}${prefix === "" ? "The" : "the"} reply misses the skill's format: ${findings.map((f) => f.message).join("; ")}. ${tail}`;
  const bySegment = new Map<number, string[]>();
  for (const f of findings) bySegment.set(f.segment ?? 0, [...(bySegment.get(f.segment ?? 0) ?? []), f.message.replace(/^Segment \d+:\s*/, "")]);
  const parts = [...bySegment.entries()].map(([n, messages]) => `Segment ${String(n)} misses the skill's format: ${messages.join("; ")}.`);
  return `${prefix}${parts.join(" ")} ${tail}`;
}
export interface AgentState {
  readonly on: boolean;
  /** The chosen skill's id; undefined until the list arrives (then the setting's, or the first). */
  readonly skillId?: string;
  readonly skills: readonly AgentSkill[];
  readonly running: boolean;
  /** What the last run left behind: the findings of a reply, or the words of a refusal / error / stop. */
  readonly notice?: { readonly tone: "warn" | "alert" | "info"; readonly message: string };
}
export const INITIAL_AGENT: AgentState = { on: false, skills: [], running: false };

/** The chip's label: the skill's short name (`minimax-short-name`) or its name. */
export function agentSkillLabel(skill: AgentSkill | undefined): string {
  return skill?.metadata["minimax-short-name"] ?? skill?.name ?? "";
}
export function agentSkill(state: ComposerState): AgentSkill | undefined {
  return state.agent.skills.find((s) => s.id === state.agent.skillId);
}

/** STORY_041: a waiting request as the composer reopens it (Edit), from `GET /api/queue/:id`. */
export interface InitialRequest {
  readonly queueId: string;
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  readonly projectId?: string;
  readonly notBefore?: string;
  readonly images: readonly { readonly n: number; readonly name: string; readonly type: string; readonly url: string }[];
}
export type ComposerAction =
  | { readonly type: "capabilities"; readonly capabilities: Capabilities }
  | { readonly type: "capabilities-failed"; readonly message: string }
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "add-images"; readonly images: readonly ComposerImage[] }
  | { readonly type: "remove-image"; readonly id: string }
  | { readonly type: "model"; readonly model: string }
  | { readonly type: "ratio"; readonly ratio: string }
  | { readonly type: "resolution"; readonly resolution: string }
  | { readonly type: "duration"; readonly durationSeconds: number }
  /** STORY_041's Edit (and anything that hands the composer a whole request): the prompt and the parameters where the Spark allows them. */
  | { readonly type: "request"; readonly prompt: string; readonly ratio: string; readonly resolution: string; readonly durationSeconds: number }
  | { readonly type: "extend-from"; readonly source: ExtendSource }
  | { readonly type: "clear-extend" }
  | { readonly type: "overlap"; readonly overlapFrames: number }
  | { readonly type: "end-anchor"; readonly endAnchor: EndAnchor }
  | { readonly type: "error"; readonly error: ComposerError }
  | { readonly type: "clear-error" }
  | { readonly type: "submit-start" }
  | { readonly type: "submit-end" }
  | { readonly type: "project"; readonly projectId: string | undefined }
  | { readonly type: "not-before"; readonly notBefore: string | undefined }
  // STORY_050: the Agent chip
  | { readonly type: "agent-skills"; readonly skills: readonly AgentSkill[]; readonly chosen?: string }
  | { readonly type: "agent-toggle"; readonly on?: boolean }
  | { readonly type: "agent-skill"; readonly skillId: string }
  | { readonly type: "agent-start" }
  | { readonly type: "agent-reply"; readonly prompt: string; readonly findings: readonly AgentFinding[]; readonly clipSeconds?: number; readonly notSent?: boolean }
  | { readonly type: "agent-declined"; readonly message: string }
  | { readonly type: "agent-failed"; readonly message: string }
  | { readonly type: "agent-stopped" }
  | { readonly type: "agent-notes"; readonly notes: string; readonly message: string };

/**
 * The reference's defaults (composer-video-mode@1440: 16:9, 5 s). The models, ratios and resolutions on offer are
 * whatever `/api/capabilities` reports — STORY_026 dropped the reference's greyed cloud options (2K, H3-Max, H2.3).
 */
export const DEFAULT_RATIO = "16:9";
export const DEFAULT_DURATION = 5;
/** STORY_061: the owner's default (2026-09-19) — prevention first; a beat that must end elsewhere chooses Anywhere. */
export const DEFAULT_END_ANCHOR: EndAnchor = "source-last-frame";
const DEFAULT_EXTENSION: ExtensionCapabilities = { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: OVERLAP_OPTIONS, default: DEFAULT_OVERLAP }, maxFrames: MAX_FRAMES, maxSourceSeconds: 30, endAnchor: { options: END_ANCHORS, default: DEFAULT_END_ANCHOR } };

export function initialComposer(projectId?: string, text = "", more: Pick<ComposerState, "notBefore" | "queueId"> = {}): ComposerState {
  // STORY_058: a new task opens in video mode — there is nothing else it can be here
  return { mode: "video", text, images: [], capabilities: undefined, capabilitiesError: undefined, model: "", ratio: DEFAULT_RATIO, resolution: "", durationSeconds: DEFAULT_DURATION, extend: undefined, overlapFrames: DEFAULT_EXTENSION.overlapFrames.default, endAnchor: DEFAULT_END_ANCHOR, error: undefined, submitting: false, projectId, agent: INITIAL_AGENT, ...more };
}

/** The server's extension limits, or the contract's defaults while capabilities are unknown or lack them. */
export function extensionOf(caps: Capabilities | undefined): ExtensionCapabilities {
  return caps?.extension ?? DEFAULT_EXTENSION;
}
/** The most an extension step may add with this overlap: the server's range, cut by the model's frame ceiling. */
export function maxAdded(caps: Capabilities | undefined, overlapFrames: number): number {
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
    case "request": {
      // the parameters where the Spark allows them (the capabilities clamp); the prompt as given
      const caps = state.capabilities;
      return {
        ...state,
        text: action.prompt,
        ratio: caps ? (caps.ratios.includes(action.ratio) ? action.ratio : state.ratio) : action.ratio,
        resolution: caps ? (caps.resolutions.includes(action.resolution) ? action.resolution : state.resolution) : action.resolution,
        durationSeconds: clampDuration(action.durationSeconds, caps, undefined),
        error: undefined,
      };
    }
    case "extend-from": {
      const ext = extensionOf(state.capabilities);
      const overlapFrames = ext.overlapFrames.default;
      return { ...state, mode: "video", extend: action.source, images: [], ratio: action.source.ratio, resolution: action.source.resolution, model: action.source.model, durationSeconds: clampDuration(ext.durationsSeconds.default, state.capabilities, overlapFrames), overlapFrames, error: undefined, agent: { ...state.agent, on: false, notice: undefined } };
    }
    case "clear-extend": {
      if (!state.extend) return state;
      const caps = state.capabilities;
      return { ...state, extend: undefined, images: [], model: caps?.models[0]?.id ?? "", resolution: caps?.resolutions[0] ?? "", ratio: caps?.ratios.includes(DEFAULT_RATIO) === false ? (caps.ratios[0] ?? DEFAULT_RATIO) : DEFAULT_RATIO, durationSeconds: clampDuration(DEFAULT_DURATION, caps, undefined), overlapFrames: extensionOf(caps).overlapFrames.default, error: undefined };
    }
    case "overlap": {
      // STORY_044: outside extend mode the overlap is the chain strip's — it applies to every extension the chain will
      // post; the first clip's own length is not clamped by it (the plan caps each extension's step itself)
      const overlapFrames = clampOverlap(action.overlapFrames, state.capabilities);
      if (!state.extend) return state.overlapFrames === overlapFrames ? state : { ...state, overlapFrames };
      return { ...state, overlapFrames, durationSeconds: clampDuration(state.durationSeconds, state.capabilities, overlapFrames) };
    }
    case "end-anchor": {
      // STORY_061: like the overlap, the choice applies to this extension and to every extension a chain will post
      const options = extensionOf(state.capabilities).endAnchor?.options ?? END_ANCHORS;
      const endAnchor = options.includes(action.endAnchor) ? action.endAnchor : state.endAnchor;
      return state.endAnchor === endAnchor ? state : { ...state, endAnchor };
    }
    case "add-images": {
      if (state.extend) return { ...state, error: { message: "An extension takes no reference images — the video being extended is the reference", field: "referenceImage" } };
      const next = [...state.images, ...action.images];
      if (state.agent.on && next.length > 1) return { ...state, error: { message: "The director takes one photo", field: "referenceImage" } };
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
    case "project":
      return state.projectId === action.projectId ? state : { ...state, projectId: action.projectId };
    case "not-before":
      return state.notBefore === action.notBefore ? state : { ...state, notBefore: action.notBefore };
    // STORY_050 — the Agent chip
    case "agent-skills": {
      const chosen = action.skills.some((k) => k.id === action.chosen) ? action.chosen : action.skills.some((k) => k.id === state.agent.skillId) ? state.agent.skillId : action.skills[0]?.id;
      return { ...state, agent: { ...state.agent, skills: action.skills, ...(chosen === undefined ? {} : { skillId: chosen }) } };
    }
    case "agent-toggle": {
      const on = action.on ?? !state.agent.on;
      if (on === state.agent.on || state.agent.running) return state;
      if (on && state.extend) return state; // the chip is disabled in extend mode: it directs from a photo
      // turning it on keeps one photo at most; turning it off clears a run's notice
      return { ...state, mode: on ? "video" : state.mode, images: on ? state.images.slice(0, 1) : state.images, error: undefined, agent: { ...state.agent, on, notice: undefined } };
    }
    case "agent-skill":
      return state.agent.skills.some((k) => k.id === action.skillId) ? { ...state, agent: { ...state.agent, skillId: action.skillId } } : state;
    case "agent-start":
      return { ...state, error: undefined, agent: { ...state.agent, running: true, notice: undefined } };
    case "agent-reply": {
      // the prompt into the box, the chip off, the photo kept; the duration becomes the skill's clip length when it declares one
      const durationSeconds = action.clipSeconds === undefined ? state.durationSeconds : clampDuration(action.clipSeconds, state.capabilities, undefined);
      // STORY_051: in straight-through mode a reply with findings is not sent — the strip says so
      const notice = action.findings.length === 0 ? undefined : { tone: "warn" as const, message: findingsNotice(action.findings, action.notSent === true) };
      return { ...state, text: action.prompt, durationSeconds, error: undefined, agent: { ...state.agent, on: false, running: false, notice } };
    }
    case "agent-declined":
      return { ...state, agent: { ...state.agent, running: false, notice: { tone: "alert", message: `The director declined: "${action.message}"` } } };
    case "agent-failed":
      return { ...state, agent: { ...state.agent, running: false, notice: { tone: "alert", message: action.message } } };
    case "agent-stopped":
      return { ...state, agent: { ...state.agent, running: false, notice: { tone: "info", message: "Stopped — nothing was sent." } } };
    case "agent-notes":
      // an Inbox row reopened (STORY_050): the notes back in the box with the chip on and the run's words
      return { ...state, mode: "video", text: action.notes, error: undefined, agent: { ...state.agent, on: true, running: false, notice: { tone: "alert", message: action.message } } };
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
/** STORY_061: extend mode's End choices — the server's options, in plain words; none when the server predates v1.5. */
export function endAnchorOptions(state: ComposerState): readonly { readonly value: EndAnchor; readonly label: string }[] {
  if (!state.extend) return [];
  const options = extensionOf(state.capabilities).endAnchor?.options ?? [];
  return options.map((value) => ({ value, label: value === "source-last-frame" ? "Where it began" : "Anywhere" }));
}
/** Extend mode's Overlap choices: the server's options as seconds ("0.9 s", "1.6 s", "2.3 s"). */
export function overlapOptions(state: ComposerState): readonly { readonly frames: number; readonly label: string }[] {
  if (!state.extend) return [];
  return extensionOf(state.capabilities).overlapFrames.options.map((frames) => ({ frames, label: `${overlapSeconds(frames)} s` }));
}
export function canSend(state: ComposerState): boolean {
  if (state.mode === "video" && state.agent.on) return state.images.length === 1 && !state.agent.running && !state.submitting && state.capabilities !== undefined;
  return state.text.trim().length > 0 && !state.submitting && (state.mode !== "video" || state.capabilities !== undefined);
}
/** STORY_050: the clip length a skill's prompts are written for (`minimax-clip-seconds`), when it declares one. */
export function skillClipSeconds(skill: AgentSkill | undefined): number | undefined {
  const raw = Number(skill?.metadata["minimax-clip-seconds"]);
  return Number.isFinite(raw) && raw > 0 ? raw : undefined;
}
/** The label the model pill shows for the chosen model ("MiniMax-H3.0" → "MiniMax-H3"); the capabilities name it. */
export function modelLabel(state: ComposerState): string {
  return (state.capabilities?.models.find((m) => m.id === state.model)?.label ?? "MiniMax-H3.0").replace(".0", "");
}
/** "16:9 768P 5s" — the Video parameters button's label (video-params-open@1440); "+10s" while extending. */
export function paramsLabel(state: ComposerState): string {
  return `${state.ratio} ${state.resolution || "768P"} ${state.extend ? "+" : ""}${String(state.durationSeconds)}s`;
}
