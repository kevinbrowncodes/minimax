/**
 * "≈ N min on the Spark" (STORY_050): what a job will take, from the README's measured table — not a promise (the
 * word is ≈), never from the adapter (it reports no times). Constants read from README › Running the Model on
 * 2026-09-15: 5 s text-to-video 17 min; 10 s from an image 50 min; a +10 s extension 67 min. Linear between the points,
 * extrapolated beyond them; the image's share is what the 5 s and 10 s rows differ by once the length is accounted for.
 */
export interface SparkJob {
  readonly seconds: number;
  /** A fresh clip from a reference image (the 10 s row) rather than from text (the 5 s row). */
  readonly fromImage?: boolean;
  /** An extension step (the +10 s row). */
  readonly extension?: boolean;
}
export const MEASURED = { textPerSecond: 17 / 5, imageTenSeconds: 50, extensionTenSeconds: 67, measuredOn: "2026-09-15" } as const;

export function estimateMinutes(job: SparkJob): number {
  const s = Math.max(1, job.seconds);
  if (job.extension) return Math.round((MEASURED.extensionTenSeconds / 10) * s);
  if (job.fromImage) return Math.round((MEASURED.imageTenSeconds / 10) * s);
  return Math.round(MEASURED.textPerSecond * s);
}

/** "≈ 50 min" / "≈ 3 h 5 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return `≈ ${String(m)} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `≈ ${String(h)} h` : `≈ ${String(h)} h ${String(rest)} min`;
}

/** The line under Send for one job, or for a chain's segments summed; STORY_055: "≈ 2 × 50 min" when a single clip is drawn more than once. */
export function sparkTimeLine(jobs: readonly SparkJob[], draws = 1): string {
  const total = jobs.reduce((sum, job) => sum + estimateMinutes(job), 0);
  if (draws > 1) return `≈ ${String(draws)} × ${formatMinutes(total).replace(/^≈ /, "")} on the Spark`;
  return `${formatMinutes(total)} on the Spark`;
}
