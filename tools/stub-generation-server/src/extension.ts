/**
 * The extension arithmetic of docs/contracts/job-api.md v1.1 (STORY_016), mirrored from spark/adapter/src/mapping.ts so
 * the stub echoes the same `contextFed` the adapter would. Pure functions; the same table is unit-tested on both sides.
 */
export const FPS = 24;
export const ANCHOR_FRAMES = 22;

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
/** Frames generated for an extension step. */
export function extensionLength(addedSeconds: number): number {
  return lengthForSeconds(addedSeconds + ANCHOR_FRAMES / FPS);
}
/** Frames of the source's end fed to the model. */
export function contextFrames(sourceFrames: number, segmentFrames: number, contextSeconds: number): number {
  return gridDown(Math.min(sourceFrames, segmentFrames, lengthForSeconds(contextSeconds)));
}
export function seconds(frames: number): number {
  return Math.round((frames / FPS) * 1000) / 1000;
}
