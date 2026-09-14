/** STORY_020: the shot-change notice's words — where the server measured that the set or the framing changed. */
import type { Cut } from "./job-api";

/** Seconds into the clip as mm:ss (floored), listed as "00:05, 00:11 and 00:21" (one: "00:11"; none: ""). */
export function listTimes(seconds: readonly number[]): string {
  const stamps = seconds.map((s) => {
    const whole = Math.max(0, Math.floor(s));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  });
  if (stamps.length <= 1) return stamps.join("");
  return `${stamps.slice(0, -1).join(", ")} and ${stamps[stamps.length - 1] ?? ""}`;
}

/** The notice's sentence, or undefined when there is nothing to say (no cuts, or a server without the field). */
export function shotChangeNotice(cuts: readonly Cut[] | undefined): string | undefined {
  if (cuts === undefined || cuts.length === 0) return undefined;
  return `The shot changed at ${listTimes(cuts.map((cut) => cut.seconds))} — the set or the framing is no longer what it was. Retry generates this again with a new seed.`;
}
