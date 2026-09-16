/**
 * STORY_020: the shot-change notice's words — where the server measured that the set or the framing changed.
 * STORY_046: two voices. A cut (a single-frame jump of the border), or a framing change on a prompt that did not ask for
 * a moving camera, is a warning with Retry — the model wandered. Framing changes on a prompt that asked for a moving
 * camera are a note — the framing moved because it was told to — with no Retry.
 */
import type { Camera, Cut } from "./job-api";

export type NoticeTone = "warning" | "note";
export interface ShotChangeNotice {
  readonly tone: NoticeTone;
  readonly text: string;
  /** The seconds the text lists, in order (the Inbox names the first). */
  readonly seconds: readonly number[];
  readonly retry: boolean;
}

/** Seconds into the clip as mm:ss (floored), listed as "00:05, 00:11 and 00:21" (one: "00:11"; none: ""). */
export function listTimes(seconds: readonly number[]): string {
  const stamps = seconds.map((s) => {
    const whole = Math.max(0, Math.floor(s));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  });
  if (stamps.length <= 1) return stamps.join("");
  return `${stamps.slice(0, -1).join(", ")} and ${stamps[stamps.length - 1] ?? ""}`;
}

/** The notice, or undefined when there is nothing to say (no cuts, or a server without the field). */
export function shotChangeNotice(cuts: readonly Cut[] | undefined, camera?: Camera): ShotChangeNotice | undefined {
  if (cuts === undefined || cuts.length === 0) return undefined;
  // a cut is a warning whatever the camera did; a framing event is one unless the prompt asked for a moving camera
  const warnings = cuts.filter((cut) => cut.kind === "cut" || camera !== "moving");
  if (warnings.length > 0) {
    const seconds = warnings.map((cut) => cut.seconds);
    return { tone: "warning", seconds, retry: true, text: `The shot changed at ${listTimes(seconds)} — the set or the framing is no longer what it was. Retry generates this again with a new seed.` };
  }
  const seconds = cuts.map((cut) => cut.seconds);
  return { tone: "note", seconds, retry: false, text: `The framing moved at ${listTimes(seconds)}, as the prompt asked; no cut.` };
}
