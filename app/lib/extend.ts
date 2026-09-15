/**
 * The extension arithmetic of docs/contracts/job-api.md v1.2 (STORY_017), mirrored from spark/adapter/src/grid.ts so
 * the composer can say what the new clip starts from and how long the result will be before the server is asked.
 * Pure; the same table is unit-tested here and in the adapter, so the tile never promises what the adapter will not do.
 */
export const FPS = 24;
/** The model's trained ceiling: 362 frames = 15.08 s. */
export const MAX_FRAMES = 362;
/** How much of the source becomes the new clip's own first frames: 0.9 s, 1.6 s (the default), 2.3 s. */
export const OVERLAP_OPTIONS: readonly number[] = [22, 39, 56];
export const DEFAULT_OVERLAP = 39;

/** Frame count on the model's 17k+5 grid, snapped up. */
export function lengthForSeconds(seconds: number): number {
  const n = Math.max(5, Math.round(seconds * FPS));
  return n + ((((5 - (n % 17)) % 17) + 17) % 17);
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
/** The overlap in seconds, one decimal, as the tile and the Overlap choices show it. */
export function overlapSeconds(overlapFrames: number): string {
  return (Math.round((overlapFrames / FPS) * 10) / 10).toFixed(1);
}
/** Seconds the joined clip will have after a step. */
export function joinedSeconds(sourceSeconds: number, addedSeconds: number, overlapFrames: number): number {
  return Math.round(((lengthForSeconds(sourceSeconds) + extensionLength(addedSeconds, overlapFrames) - overlapFrames) / FPS) * 10) / 10;
}

/**
 * STORY_043: the length a clip *will* have, from its request, for extending it before it has finished — a fresh clip's
 * requested seconds; an extension's source length plus what it adds (the source found through `lookup`, its own
 * length the same way — a chain resolves back to its first clip). A measured result, when there is one, wins.
 */
export interface PendingLength {
  readonly id: string;
  readonly params: { readonly durationSeconds: number; readonly overlapFrames?: number };
  readonly continuesFrom?: { readonly id: string; readonly durationSeconds?: number };
  readonly result?: { readonly durationSeconds: number };
}
export function pendingSourceSeconds(entry: PendingLength, lookup: (id: string) => PendingLength | undefined, depth = 0): number {
  if (entry.result) return entry.result.durationSeconds;
  if (entry.continuesFrom === undefined) return entry.params.durationSeconds;
  const source = lookup(entry.continuesFrom.id);
  const sourceSeconds = entry.continuesFrom.durationSeconds ?? (source && depth < 20 ? pendingSourceSeconds(source, lookup, depth + 1) : entry.params.durationSeconds);
  return joinedSeconds(sourceSeconds, entry.params.durationSeconds, entry.params.overlapFrames ?? DEFAULT_OVERLAP);
}
