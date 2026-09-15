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
 * Each contiguous run of tripped windows is one event, placed at the largest single-frame border step inside the first
 * window that tripped it (the cut frame for a cut, the steepest point of a dissolve); events within MERGE_FRAMES merge.
 * `long` is optional: a history written by the STORY_020 node (no three-second series) still gets rule 1.
 */
import { FPS } from "./grid.ts";

export const SHOT_CHANGE = 30;
export const SLOW_CHANGE = 20;
export const MERGE_FRAMES = 48;

export interface Cut {
  /** The first frame of the new shot (0-based, the joined clip's timeline). */
  readonly frame: number;
  /** frame / 24, to two decimals. */
  readonly seconds: number;
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

function eventsOf(series: readonly number[], span: number, threshold: number, step: readonly number[]): number[] {
  const events: number[] = [];
  let inside = false;
  for (const [k, value] of series.entries()) {
    const i = k + span; // frame i compared with frame i - span
    if (value >= threshold && !inside) {
      inside = true;
      events.push(steepest(step, i, span));
    } else if (value < threshold) {
      inside = false;
    }
  }
  return events;
}

export function detectCuts(changes: FrameChanges, thresholds: { readonly shot?: number; readonly slow?: number } = {}): Cut[] {
  const { step, second, span, long, longSpan } = changes;
  const events = eventsOf(second, span, thresholds.shot ?? SHOT_CHANGE, step);
  if (long && longSpan !== undefined) events.push(...eventsOf(long, longSpan, thresholds.slow ?? SLOW_CHANGE, step));
  events.sort((a, b) => a - b);
  const merged: number[] = [];
  for (const frame of events) {
    const last = merged[merged.length - 1];
    if (last !== undefined && frame - last <= MERGE_FRAMES) continue;
    merged.push(frame);
  }
  return merged.map((frame) => ({ frame, seconds: Math.round((frame / FPS) * 100) / 100 }));
}
