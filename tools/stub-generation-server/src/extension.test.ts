import { describe, expect, it } from "vitest";
import { DEFAULT_OVERLAP, fitOverlap, MAX_FRAMES, OVERLAP_OPTIONS, audioTicks, extensionLength, gridDown, latentFrames, lengthForSeconds, maxAddedSeconds, seconds } from "./extension.ts";

describe("extension arithmetic (mirrors spark/adapter/src/grid.ts)", () => {
  it("carries the overlap asked for, or the longest offered one that fits a shorter source (STORY_080)", () => {
    expect(fitOverlap(90, 345)).toBe(90);
    expect(fitOverlap(90, 56)).toBe(56); // the stub's 2 s fixture
    expect(fitOverlap(90, 48)).toBe(39);
    expect(fitOverlap(39, 30)).toBe(22);
    expect(fitOverlap(22, 10)).toBeUndefined();
  });
  it("reproduces the adapter's table", () => {
    expect([22, 39, 56, 90].map(latentFrames)).toEqual([7, 12, 17, 27]);
    expect([22, 39, 56, 90].map(audioTicks)).toEqual([37, 65, 93, 150]);
    expect([124, 294, 362].map(latentFrames)).toEqual([37, 87, 107]);
    expect([124, 294].map(audioTicks)).toEqual([207, 490]);
    expect([4, 10, 13].map((s) => extensionLength(s, 39))).toEqual([141, 294, 362]);
    expect(extensionLength(14, 39)).toBe(379);
    expect([22, 39, 56, 90].map((o) => maxAddedSeconds(o))).toEqual([14, 13, 12, 11]);
    expect([5, 48, 124, 243, 360, 362].map(gridDown)).toEqual([5, 39, 124, 243, 345, 362]);
    expect(lengthForSeconds(5)).toBe(124);
    expect(seconds(39)).toBe(1.625);
    expect(OVERLAP_OPTIONS).toEqual([22, 39, 56, 90]);
    expect(DEFAULT_OVERLAP).toBe(90); // STORY_080: the last whole beat
    expect(MAX_FRAMES).toBe(362);
  });
});
