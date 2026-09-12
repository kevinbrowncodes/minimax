/** Pure helpers for STORY_002 part 2: which generating frames to keep, how to name them, what counts as done or failed. */

export const KEEP_FRAMES_AT_SECONDS = [0, 30, 90, 180, 300, 600] as const;

/** Every frame goes to recon/out; only these elapsed marks (first frame at or past each mark) are copied into docs. */
export function frameToKeep(elapsedSeconds: number, alreadyKept: number[]): number | null {
  for (const mark of KEEP_FRAMES_AT_SECONDS) {
    if (elapsedSeconds >= mark && !alreadyKept.includes(mark)) return mark;
  }
  return null;
}

export function frameState(mark: number): string {
  return `task-generating-${String(mark).padStart(3, "0")}s`;
}

export const FAIL_TEXT = /request failed|generation failed|failed to generate|something went wrong|insufficient (account )?(credits|balance)|not enough credits|billing wall|rejected at submit|http 402|content (was )?blocked|violat|try again later/i;

export function looksFailed(text: string): boolean {
  return FAIL_TEXT.test(text);
}

/** The reference's low-balance notice ("Fewer than 1,000 Credits remain", "Buy Credits"), seen 2026-09-12 next to a failed request. */
export const CREDIT_TEXT = /fewer than [\d,]+ credits remain|buy credits|out of credits|no credits|insufficient account credits|billing wall|http 402/i;

export function looksOutOfCredits(text: string): boolean {
  return CREDIT_TEXT.test(text);
}

/** A download control belongs to the result, not the top bar, when it sits below the header. */
export function isResultControl(box: { y: number } | null, headerBottom = 80): boolean {
  return !!box && box.y > headerBottom;
}

/** Which model the capture submits with; the reference's default is H3, which bills account credits. */
export type CaptureModel = "h3" | "hailuo-2.3";

export function parseModelArg(args: string[]): CaptureModel {
  const i = args.indexOf("--model");
  const value = i >= 0 ? (args[i + 1] ?? "") : "";
  if (value === "" || value === "h3") return "h3";
  if (value === "hailuo-2.3" || value === "hailuo") return "hailuo-2.3";
  throw new Error(`unknown --model "${value}" (use h3 or hailuo-2.3)`);
}

/** The smallest duration among the radio labels ("5s", "6s", "10s"…). */
export function smallestDuration(labels: string[]): string | null {
  const seconds = labels
    .map((l) => ({ label: l, n: Number.parseFloat(l) }))
    .filter((x) => /^\d+(\.\d+)?s$/.test(x.label.trim()) && Number.isFinite(x.n));
  if (!seconds.length) return null;
  return seconds.sort((a, b) => a.n - b.n)[0]?.label ?? null;
}
