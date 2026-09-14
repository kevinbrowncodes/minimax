import { describe, expect, it } from "vitest";
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, audioTicks, extensionLength, gridDown, latentFrames, lengthForSeconds, maxAddedSeconds, seconds } from "./extension.ts";

describe("extension arithmetic (mirrors spark/adapter/src/grid.ts)", () => {
  it("reproduces the adapter's table", () => {
    expect([22, 39, 56].map(latentFrames)).toEqual([7, 12, 17]);
    expect([22, 39, 56].map(audioTicks)).toEqual([37, 65, 93]);
    expect([124, 294, 362].map(latentFrames)).toEqual([37, 87, 107]);
    expect([124, 294].map(audioTicks)).toEqual([207, 490]);
    expect([4, 10, 13].map((s) => extensionLength(s, 39))).toEqual([141, 294, 362]);
    expect(extensionLength(14, 39)).toBe(379);
    expect([22, 39, 56].map((o) => maxAddedSeconds(o))).toEqual([14, 13, 12]);
    expect([5, 48, 124, 243, 360, 362].map(gridDown)).toEqual([5, 39, 124, 243, 345, 362]);
    expect(lengthForSeconds(5)).toBe(124);
    expect(seconds(39)).toBe(1.625);
    expect(OVERLAP_OPTIONS).toEqual([22, 39, 56]);
    expect(DEFAULT_OVERLAP).toBe(39);
    expect(MAX_FRAMES).toBe(362);
  });
});
