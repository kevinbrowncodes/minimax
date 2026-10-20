/**
 * The extension arithmetic of docs/contracts/job-api.md v1.2 (STORY_017), mirrored from spark/adapter/src/grid.ts so
 * the stub echoes the same `overlap` and joined length the adapter would. Pure functions; the same table is unit-tested
 * on both sides.
 */
export const FPS = 24;
export const AUDIO_LATENT_FPS = 40;
export const MAX_FRAMES = 362;
export const OVERLAP_OPTIONS: readonly number[] = [22, 39, 56, 90];
export const DEFAULT_OVERLAP = 90;

/** The overlap an extension carries (STORY_080): the one asked for, or — when the source is shorter — the longest offered
 *  overlap that fits it, so a short source still extends; `request.overlap` reports what was carried. Undefined when none fits. */
export function fitOverlap(requested: number, sourceFrames: number): number | undefined {
  if (requested <= sourceFrames) return requested;
  const fits = OVERLAP_OPTIONS.filter((o) => o <= sourceFrames);
  return fits.length > 0 ? Math.max(...fits) : undefined;
}

/** Frame count on the model's 17k+5 grid, snapped up. */
export function lengthForSeconds(seconds: number): number {
  const n = Math.max(5, Math.round(seconds * FPS));
  return n + ((((5 - (n % 17)) % 17) + 17) % 17);
}
/** The largest 17k+5 count that is ≤ n (n ≥ 5). */
export function gridDown(n: number): number {
  const m = Math.max(5, Math.floor(n));
  return m - ((m - 5) % 17);
}
/** Video latent frames for a pixel-frame count on the grid. */
export function latentFrames(frames: number): number {
  return frames <= 5 ? 2 : ((frames - 5) / 17) * 5 + 2;
}
/** Audio latent ticks for a pixel-frame count. */
export function audioTicks(frames: number): number {
  return Math.round((frames / FPS) * AUDIO_LATENT_FPS);
}
/** Frames generated for an extension step: the overlap plus at least the seconds added, snapped up. */
export function extensionLength(addedSeconds: number, overlapFrames: number): number {
  return lengthForSeconds(addedSeconds + overlapFrames / FPS);
}
/** The most seconds one step can add with this overlap and still fit the model's ceiling. */
export function maxAddedSeconds(overlapFrames: number, max = 14): number {
  let s = max;
  while (s > 0 && extensionLength(s, overlapFrames) > MAX_FRAMES) s -= 1;
  return s;
}
export function seconds(frames: number): number {
  return Math.round((frames / FPS) * 1000) / 1000;
}
