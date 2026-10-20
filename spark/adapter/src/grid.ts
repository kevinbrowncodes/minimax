/**
 * MiniMax-H3's time grids and the extension arithmetic (STORY_006, STORY_017): 24 fps video on the model's 17k+5 frame
 * grid (5 latent frames per 17 pixel frames after the first), 40 Hz audio latents, the trained ceiling of 362 frames.
 * Pure; mirrored in tools/stub-generation-server/src/extension.ts and app/lib/extend.ts, with the same test table.
 */
export const FPS = 24;
export const AUDIO_LATENT_FPS = 40;
/** The model's trained ceiling: 362 frames = 15.08 s (STORY_016's research). */
export const MAX_FRAMES = 362;
/** How much of the source becomes the new clip's own first frames (STORY_017): 0.9 s, 1.6 s (the community default), 2.3 s; 3.75 s the default since STORY_080 (the last whole beat, so small details survive a move). */
export const OVERLAP_OPTIONS: readonly number[] = [22, 39, 56, 90];
export const DEFAULT_OVERLAP = 90;

/** The overlap an extension carries (STORY_080): the one asked for, or — when the source is shorter — the longest offered
 *  overlap that fits it, so a short source still extends; `request.overlap` reports what was carried. Undefined when none fits. */
export function fitOverlap(requested: number, sourceFrames: number): number | undefined {
  if (requested <= sourceFrames) return requested;
  const fits = OVERLAP_OPTIONS.filter((o) => o <= sourceFrames);
  return fits.length > 0 ? Math.max(...fits) : undefined;
}

/** Frame count on the model's 17k+5 grid, snapped up — the official template's rule. */
export function lengthForSeconds(seconds: number): number {
  const n = Math.max(5, Math.round(seconds * FPS));
  return n + ((((5 - (n % 17)) % 17) + 17) % 17);
}
/** The largest 17k+5 count that is ≤ n (n ≥ 5) — how ComfyUI cuts a clip down to the grid. */
export function gridDown(n: number): number {
  const m = Math.max(5, Math.floor(n));
  return m - ((m - 5) % 17);
}
/** Video latent frames for a pixel-frame count on the grid: 1 + 4 per latent step after the first (comfy/sd.py downscale_ratio). */
export function latentFrames(frames: number): number {
  return frames <= 5 ? 2 : ((frames - 5) / 17) * 5 + 2;
}
/** Audio latent ticks for a pixel-frame count (comfy_extras/nodes_minimax_h3.py temporal_shape). */
export function audioTicks(frames: number): number {
  return Math.round((frames / FPS) * AUDIO_LATENT_FPS);
}
/** Frames generated for an extension: the overlap that becomes the clip's head plus at least the seconds added, snapped up. */
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
