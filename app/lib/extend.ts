/**
 * The extension arithmetic of docs/contracts/job-api.md v1.1 (STORY_016), mirrored from spark/adapter/src/mapping.ts so
 * the composer can say how much of the source the model will watch before the server is asked. Pure; the same table
 * is unit-tested here and in the adapter, so the tile never promises a context the adapter would not feed.
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
/** Frames generated for an extension step of `addedSeconds`. */
export function segmentFrames(addedSeconds: number): number {
  return lengthForSeconds(addedSeconds + ANCHOR_FRAMES / FPS);
}
/** Seconds of the source's end the model will watch for a step and a requested context. */
export function contextFedSeconds(sourceSeconds: number, addedSeconds: number, contextSeconds: number): number {
  const sourceFrames = lengthForSeconds(sourceSeconds);
  const fed = gridDown(Math.min(sourceFrames, segmentFrames(addedSeconds), lengthForSeconds(contextSeconds)));
  return Math.round((fed / FPS) * 10) / 10;
}
/** Seconds the joined clip will have after a step. */
export function joinedSeconds(sourceSeconds: number, addedSeconds: number): number {
  return Math.round(((lengthForSeconds(sourceSeconds) + segmentFrames(addedSeconds) - ANCHOR_FRAMES) / FPS) * 10) / 10;
}
