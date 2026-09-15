import { describe, expect, it } from "vitest";
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, extensionLength, joinedSeconds, lengthForSeconds, maxAddedSeconds, overlapSeconds, pendingSourceSeconds, type PendingLength } from "./extend";

describe("extend arithmetic (mirrors spark/adapter/src/grid.ts)", () => {
  it("reproduces the adapter's table", () => {
    expect([4, 10, 13].map((s) => extensionLength(s, 39))).toEqual([141, 294, 362]);
    expect(extensionLength(14, 39)).toBe(379);
    expect([22, 39, 56].map((o) => maxAddedSeconds(o))).toEqual([14, 13, 12]);
    expect([22, 39, 56].map(overlapSeconds)).toEqual(["0.9", "1.6", "2.3"]);
    expect(lengthForSeconds(10.125)).toBe(243);
    // the owner's 10 s clip (243 frames) + 10 s at the default overlap: 243 + 294 - 39 = 498 frames
    expect(joinedSeconds(10.125, 10, 39)).toBe(20.8);
    // the stub's fixture (2.0 s = 56 frames): 56 + 294 - 39 = 311
    expect(joinedSeconds(2, 10, 39)).toBe(13);
    expect(OVERLAP_OPTIONS).toEqual([22, 39, 56]);
    expect(DEFAULT_OVERLAP).toBe(39);
    expect(MAX_FRAMES).toBe(362);
  });
});

describe("the length a pending clip will have (STORY_043)", () => {
  const first: PendingLength = { id: "a", params: { durationSeconds: 5 } };
  const second: PendingLength = { id: "b", params: { durationSeconds: 4, overlapFrames: 39 }, continuesFrom: { id: "a" } };
  const third: PendingLength = { id: "c", params: { durationSeconds: 10 }, continuesFrom: { id: "b" } };
  const lookup = (id: string): PendingLength | undefined => ({ a: first, b: second, c: third })[id];

  it("is the requested seconds for a fresh clip, the joined length for an extension, resolved down a chain; a measured result wins", () => {
    expect(pendingSourceSeconds(first, lookup)).toBe(5);
    expect(pendingSourceSeconds(second, lookup)).toBe(joinedSeconds(5, 4, 39));
    expect(pendingSourceSeconds(third, lookup)).toBe(joinedSeconds(joinedSeconds(5, 4, 39), 10, DEFAULT_OVERLAP));
    expect(pendingSourceSeconds({ ...second, continuesFrom: { id: "a", durationSeconds: 5.167 } }, lookup)).toBe(joinedSeconds(5.167, 4, 39)); // the recorded source length is used when known
    expect(pendingSourceSeconds({ ...second, result: { durationSeconds: 8.5 } }, lookup)).toBe(8.5);
    expect(pendingSourceSeconds({ ...second, continuesFrom: { id: "gone" } }, lookup)).toBe(joinedSeconds(4, 4, 39)); // an unknown source: its own seconds stand in
  });
});
