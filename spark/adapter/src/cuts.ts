/**
 * STORY_020: where did the shot change? One rule, calibrated on the seven clips of 2026-09-13/14 (the story's table):
 * the picture's outer border — the set, not the person — differs from one second earlier by SHOT_CHANGE (30) or more.
 * A held shot never moved its border more than 11 over a second; every cut, dissolve and camera move seen moved it by
 * 37 or more (a person moving cannot: a squat moved the whole picture by 66 but the border by 16). Each contiguous run
 * of such seconds is one event, placed at the largest single-frame border step inside the first second that tripped it
 * (the cut frame for a cut, the steepest point of a dissolve or a camera move); events within MERGE_FRAMES merge.
 * The series come from the MiniMaxLocalFrameChanges node (spark/comfyui/custom_nodes/minimax_local).
 */
import { FPS } from "./grid.ts";

export const SHOT_CHANGE = 30;
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

/** The node's text output parsed; undefined when absent or malformed (the job is still done — the check is advisory). */
export function parseFrameChanges(text: string | undefined): FrameChanges | undefined {
  if (text === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const record = parsed as Record<string, unknown>;
  const step = numbers(record["step"]);
  const second = numbers(record["second"]);
  const span = typeof record["span"] === "number" && Number.isInteger(record["span"]) && record["span"] > 0 ? record["span"] : FPS;
  if (!step || !second) return undefined;
  return { step, second, span };
}

export function detectCuts(changes: FrameChanges, threshold = SHOT_CHANGE): Cut[] {
  const { step, second, span } = changes;
  const events: number[] = [];
  let inside = false;
  for (const [k, value] of second.entries()) {
    const i = k + span; // frame i compared with frame i - span
    if (value >= threshold && !inside) {
      inside = true;
      // the frame after the largest single step inside (i - span, i]
      let best = i - span + 1;
      for (let j = i - span + 1; j <= i; j += 1) {
        if ((step[j - 1] ?? -1) > (step[best - 1] ?? -1)) best = j;
      }
      events.push(best);
    } else if (value < threshold) {
      inside = false;
    }
  }
  const merged: number[] = [];
  for (const frame of events) {
    const last = merged[merged.length - 1];
    if (last !== undefined && frame - last <= MERGE_FRAMES) continue;
    merged.push(frame);
  }
  return merged.map((frame) => ({ frame, seconds: Math.round((frame / FPS) * 100) / 100 }));
}
