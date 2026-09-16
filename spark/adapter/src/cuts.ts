/**
 * STORY_020 + BUG_006: where did the shot change? Two rules over the picture's outer border — the set, not the person —
 * from the MiniMaxLocalFrameChanges node (spark/comfyui/custom_nodes/minimax_local):
 *   1. the border differs from ONE second earlier by SHOT_CHANGE (30) or more — a cut, a fast dissolve, a camera move.
 *      Calibrated on the seven clips of 2026-09-13/14: a held shot never moved its border more than 11 over a second;
 *      every cut, fast dissolve and camera move seen moved it by 37 or more (a person moving cannot: a squat moved the
 *      whole picture by 66 but the border by 16).
 *   2. the border differs from THREE seconds earlier by SLOW_CHANGE (20) or more — a slow dissolve of the set
 *      (BUG_006: on 2026-09-14 the sequin curtain faded to a grey wall over 1.7 s; one-second windows peaked at 16.5,
 *      the three-second window at 26.9; the held shots on disk peak at 3–14 over three seconds, one older clip at 16).
 * Each contiguous run of tripped windows is one event: rule 1's at the largest single-frame border step inside the first
 * window that tripped it (the cut frame), rule 2's at the middle of that window (inside the fade); events within
 * MERGE_FRAMES merge, rule 1's exact frame winning over rule 2's estimate.
 *   3. (STORY_046) the border differs from the PREVIOUS FRAME by CUT_STEP (30) or more — a cut, whatever the camera does.
 *      Rules 1 and 2 cannot tell a camera move from a cut (a handheld selfie moved the border 48–54 over a second on
 *      2026-09-16, as much as a cut); the single frame can: the real cuts on disk step 46.5–49.7 in one frame, the
 *      handheld draws at most 15.7, a held shot 2.4, BUG_006's slow dissolve 2.8. A contiguous run of such steps is one
 *      event at its largest step. Every event carries a `kind`: rule 3's are "cut", rules 1 and 2's "framing" (the set
 *      or the framing changed — which, on a prompt that asked for a moving camera, is what was asked for).
 * Events within MERGE_FRAMES merge; the higher-ranked event (cut > one-second > three-second) gives the merged event its
 * frame and its kind, as rule 1's exact frame won over rule 2's estimate before.
 * `long` is optional: a history written by the STORY_020 node (no three-second series) still gets rules 1 and 3.
 */
import { FPS } from "./grid.ts";

export const SHOT_CHANGE = 30;
export const SLOW_CHANGE = 20;
export const CUT_STEP = 30;
export const MERGE_FRAMES = 48;

export type CutKind = "cut" | "framing";
export interface Cut {
  /** The first frame of the new shot (0-based, the joined clip's timeline). */
  readonly frame: number;
  /** frame / 24, to two decimals. */
  readonly seconds: number;
  /** STORY_046: "cut" from the single-frame rule; "framing" from the one- and three-second rules. */
  readonly kind: CutKind;
}
export interface FrameChanges {
  /** Border change between frames i and i + 1. */
  readonly step: readonly number[];
  /** Border change between frames i and i + span. */
  readonly second: readonly number[];
  readonly span: number;
  /** Border change between frames i and i + longSpan (BUG_006); absent from the STORY_020 node's output. */
  readonly long?: readonly number[];
  readonly longSpan?: number;
}

function numbers(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: number[] = [];
  for (const v of value) {
    if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
    out.push(v);
  }
  return out;
}
function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

/** The node's text output parsed; undefined when absent or malformed (the job is still done — the check is advisory). */
export function parseFrameChanges(text: string | undefined): FrameChanges | undefined {
  if (text === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const step = numbers(record["step"]);
  const second = numbers(record["second"]);
  if (!step || !second) return undefined;
  const span = positiveInteger(record["span"]) ?? FPS;
  const long = numbers(record["long"]);
  const longSpan = positiveInteger(record["longSpan"]);
  return { step, second, span, ...(long && longSpan !== undefined ? { long, longSpan } : {}) };
}

/** The frame after the largest single step inside (end - span, end]. */
function steepest(step: readonly number[], end: number, span: number): number {
  let best = end - span + 1;
  for (let j = end - span + 1; j <= end; j += 1) {
    if ((step[j - 1] ?? -1) > (step[best - 1] ?? -1)) best = j;
  }
  return best;
}

/**
 * The events of one series: a new event where the window (i - span, i] first reaches the threshold. A fast change is
 * placed at the steepest single step inside that window (the cut frame); a slow one at the window's middle, because a
 * gradual fade has no steepest frame and its first tripped window straddles the fade (BUG_006: the steepest step in
 * the 2026-09-14 dissolve's window was the seam, 20 frames before the fade began).
 */
function eventsOf(series: readonly number[], span: number, threshold: number, step: readonly number[], place: "steepest" | "middle"): number[] {
  const events: number[] = [];
  let inside = false;
  for (const [k, value] of series.entries()) {
    const i = k + span; // frame i compared with frame i - span
    if (value >= threshold && !inside) {
      inside = true;
      events.push(place === "steepest" ? steepest(step, i, span) : i - Math.floor(span / 2));
    } else if (value < threshold) {
      inside = false;
    }
  }
  return events;
}

/**
 * STORY_046: the single-frame events — each contiguous run of steps at or over the threshold is one cut, at the frame
 * after the run's largest step (a cut spread over two frames by encoding is still one cut).
 */
function stepEventsOf(step: readonly number[], threshold: number): number[] {
  const events: number[] = [];
  let best: number | undefined;
  for (const [j, value] of step.entries()) {
    if (value >= threshold) {
      if (best === undefined || value > (step[best] ?? -1)) best = j;
    } else if (best !== undefined) {
      events.push(best + 1);
      best = undefined;
    }
  }
  if (best !== undefined) events.push(best + 1);
  return events;
}

/** cut > one-second > three-second: the higher rank names the merged event's frame and kind. */
const RANK = { cut: 3, second: 2, long: 1 } as const;
type Rank = (typeof RANK)[keyof typeof RANK];

export function detectCuts(changes: FrameChanges, thresholds: { readonly shot?: number; readonly slow?: number; readonly cut?: number } = {}): Cut[] {
  const { step, second, span, long, longSpan } = changes;
  const events: { frame: number; rank: Rank }[] = eventsOf(second, span, thresholds.shot ?? SHOT_CHANGE, step, "steepest").map((frame) => ({ frame, rank: RANK.second }));
  if (long && longSpan !== undefined) {
    events.push(...eventsOf(long, longSpan, thresholds.slow ?? SLOW_CHANGE, step, "middle").map((frame) => ({ frame, rank: RANK.long })));
  }
  events.push(...stepEventsOf(step, thresholds.cut ?? CUT_STEP).map((frame) => ({ frame, rank: RANK.cut })));
  events.sort((a, b) => a.frame - b.frame || b.rank - a.rank);
  // Merge events within MERGE_FRAMES: the higher rank names the exact frame (a cut's step, a one-second event's
  // steepest step) and wins over a lower one's estimate.
  const merged: { frame: number; rank: Rank }[] = [];
  for (const event of events) {
    const last = merged[merged.length - 1];
    if (last !== undefined && event.frame - last.frame <= MERGE_FRAMES) {
      if (event.rank > last.rank) {
        last.frame = event.frame;
        last.rank = event.rank;
      }
      continue;
    }
    merged.push({ ...event });
  }
  return merged.map(({ frame, rank }) => ({ frame, seconds: Math.round((frame / FPS) * 100) / 100, kind: rank === RANK.cut ? "cut" : "framing" }));
}
