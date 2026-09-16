/**
 * STORY_044: one text with several scripts becomes a chain of generations — the text splits at every line that begins
 * with "[0:00-" (the owner's scripts' own convention), the text before the first such line is the scene and goes with
 * every segment, and each segment after the first is an extension of the one before it. Pure: the arithmetic of the
 * lengths comes from lib/extend.ts (what the continuation tile shows), the cap from the capabilities, never a literal.
 */
import { FPS, extensionLength, lengthForSeconds } from "./extend";

const SEGMENT_START = /^\[0?0:00-/;
const TIMESTAMPED_LINE = /^\[(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\]\s*/;

export interface ChainSplit {
  /** The text before the first "[0:00-" line, trimmed; "" when there is none. */
  readonly scene: string;
  /** One entry per script; the whole text when it has no "[0:00-" line. */
  readonly segments: readonly string[];
}

/** Split the composer's text into the scene and its scripts. A text with fewer than two scripts is not a chain — the caller sends it as it is. */
export function splitChain(text: string): ChainSplit {
  const lines = text.split(/\r?\n/);
  const starts = lines.flatMap((line, i) => (SEGMENT_START.test(line.trim()) ? [i] : []));
  if (starts.length === 0) return { scene: "", segments: [text.trim()] };
  const scene = lines.slice(0, starts[0]).join("\n").trim();
  const segments = starts.map((start, k) => lines.slice(start, starts[k + 1] ?? lines.length).join("\n").trim());
  return { scene, segments };
}

/** The prompt one segment goes out with: the scene, a blank line, the script — the recipe of the verified chains (STORY_020). */
export function segmentPrompt(scene: string, script: string): string {
  return scene === "" ? script : `${scene}\n\n${script}`;
}

/** The first timestamped line's words, the bracket dropped — what a chain's rows are titled by (history-store › titleFor). */
export function firstTimestampedLine(text: string): string | undefined {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const match = TIMESTAMPED_LINE.exec(line);
    if (match) return line.slice(match[0].length).trim();
  }
  return undefined;
}

/** Where a script's last "[m:ss-m:ss]" ends, in seconds; undefined without one. */
export function lastTimestampSeconds(script: string): number | undefined {
  let end: number | undefined;
  for (const raw of script.split(/\r?\n/)) {
    const match = TIMESTAMPED_LINE.exec(raw.trim());
    if (match) end = Number(match[3]) * 60 + Number(match[4]);
  }
  return end;
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m)}:${s < 10 ? "0" : ""}${String(s)}`;
}

export interface ChainPlanOptions {
  /** The chosen length: the first clip's seconds, and the seconds each extension adds. */
  readonly seconds: number;
  readonly overlapFrames: number;
  /** The most one extension step may add (the capabilities' maximum, cut by the model's frame ceiling at this overlap). */
  readonly extensionMax: number;
  /** The longest source the server extends (`capabilities.extension.maxSourceSeconds`). */
  readonly maxSourceSeconds: number;
  /** Extend mode: the seconds of the clip the first segment continues; undefined when the first segment is a fresh clip. */
  readonly fromSource?: number;
}

export interface ChainSegment {
  /** 1-based. */
  readonly index: number;
  /** The seconds this segment adds (or has, for a fresh first clip), after the extension cap. */
  readonly seconds: number;
  /** True when the chosen length was cut to `extensionMax`. */
  readonly capped: boolean;
  /** The seconds of the clip this segment extends; undefined for a fresh first clip. */
  readonly sourceSeconds?: number;
  /** The seconds the clip has once this segment is done. */
  readonly joinedSeconds: number;
  /** False when this segment's source is longer than the server extends, or a segment before it does not fit. */
  readonly fits: boolean;
  /** Where the script's last timestamp ends, when it has one. */
  readonly endsAt?: number;
  /** The script's first words, for the row. */
  readonly words: string;
}

export interface ChainPlan {
  readonly segments: readonly ChainSegment[];
  /** The seconds the whole chain would have, fit or not. */
  readonly totalSeconds: number;
  readonly fits: boolean;
  /** The 1-based index of the first segment that does not fit. */
  readonly firstUnfit?: number;
}

/** Frames to seconds, to a tenth, as the continuation tile shows them (243 → 10.1). */
function tenths(frames: number): number {
  return Math.round((frames / FPS) * 10) / 10;
}

/**
 * The segments' lengths down the chain and whether each fits under the server's source cap. The lengths are carried
 * in frames, as the adapter joins them (the source's frames + the step's frames − the overlap), and rounded only for
 * display: feeding a rounded tenth back into the grid would snap a 498-frame clip up to 515.
 */
export function chainPlan(scripts: readonly string[], options: ChainPlanOptions): ChainPlan {
  const segments: ChainSegment[] = [];
  let previousFrames: number | undefined = options.fromSource === undefined ? undefined : lengthForSeconds(options.fromSource);
  let allFit = true;
  let firstUnfit: number | undefined;
  scripts.forEach((script, i) => {
    const index = i + 1;
    const extension = previousFrames !== undefined;
    const capped = extension && options.seconds > options.extensionMax;
    const seconds = extension ? Math.min(options.seconds, options.extensionMax) : options.seconds;
    const frames: number = extension ? (previousFrames ?? 0) + extensionLength(seconds, options.overlapFrames) - options.overlapFrames : lengthForSeconds(seconds);
    // row 1 of an extend-mode chain shows the source's own seconds (the tile's figure), later rows the grid's
    const sourceSeconds = !extension ? undefined : i === 0 && options.fromSource !== undefined ? Math.round(options.fromSource * 10) / 10 : tenths(previousFrames ?? 0);
    const fits = allFit && (sourceSeconds === undefined || sourceSeconds <= options.maxSourceSeconds);
    if (!fits && firstUnfit === undefined) firstUnfit = index;
    allFit = fits;
    const endsAt = lastTimestampSeconds(script);
    segments.push({ index, seconds, capped, ...(sourceSeconds === undefined ? {} : { sourceSeconds }), joinedSeconds: tenths(frames), fits, ...(endsAt === undefined ? {} : { endsAt }), words: firstWords(script) });
    previousFrames = frames;
  });
  return { segments, totalSeconds: previousFrames === undefined ? 0 : tenths(previousFrames), fits: firstUnfit === undefined, ...(firstUnfit === undefined ? {} : { firstUnfit }) };
}

/** The script's words with its leading bracket dropped, whitespace collapsed. */
function firstWords(script: string): string {
  return (firstTimestampedLine(script) ?? script).replace(/\s+/g, " ").trim();
}
