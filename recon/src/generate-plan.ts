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

export const FAIL_TEXT = /request failed|generation failed|failed to generate|something went wrong|insufficient (account )?(credits|balance)|not enough credits|billing wall|rejected at submit|http 402|no conversation resources|subscribe to continue|content (was )?blocked|violat|try again later/i;

export function looksFailed(text: string): boolean {
  return FAIL_TEXT.test(text);
}

/** The reference's low-balance notice ("Fewer than 1,000 Credits remain", "Buy Credits"), seen 2026-09-12 next to a failed request. */
/**
 * Only the agent's own wording counts. The low-balance banner ("Fewer than 1,000
 * Credits remain", "Buy Credits") is pinned to every task page while the balance
 * is low, so matching it attributed an unrelated failure to credits on 2026-09-12.
 */
export const CREDIT_TEXT = /insufficient (account )?(credits|balance)|billing wall|http 402|out of credits|not enough credits|no conversation resources|subscribe to continue/i;

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

/** full: submit, wait, then the cancel job. revisit: reopen an existing session and capture its result. cancel-only: spend one job on the cancel state. */
export type CaptureMode = "full" | "revisit" | "cancel-only";

export function parseModeArg(args: string[]): CaptureMode {
  if (args.includes("--revisit")) return "revisit";
  if (args.includes("--cancel-only")) return "cancel-only";
  return "full";
}

/** The Recents entry to reopen in revisit mode; defaults to the auto-title the agent gave the first job on 2026-09-12. */
export function parseSessionArg(args: string[]): RegExp {
  const i = args.indexOf("--session");
  const value = i >= 0 ? args[i + 1] : undefined;
  return new RegExp(value && value.trim() ? value : "paper boat", "i");
}

/** Wording the agent shows while it is still working, when the composer's Send control is a stop control. */
export const WORKING_TEXT = /\b(merging|thinking|improving|processing|working|generating|running)\b/i;

export function looksWorking(text: string): boolean {
  return WORKING_TEXT.test(text);
}
