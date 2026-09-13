import { describe, expect, it } from "vitest";
import { ANCHOR_FRAMES, contextFrames, extensionLength, gridDown, lengthForSeconds, seconds } from "./extension.ts";

describe("extension arithmetic (mirrors spark/adapter/src/mapping.ts)", () => {
  it("reproduces the adapter's table", () => {
    expect([4, 5, 10, 14].map(extensionLength)).toEqual([124, 158, 277, 362]);
    expect([5, 48, 124, 243, 360, 362].map(gridDown)).toEqual([5, 39, 124, 243, 345, 362]);
    expect([2, 5, 10, 15].map((c) => contextFrames(243, 277, c))).toEqual([56, 124, 243, 243]);
    expect([2, 5, 10, 15].map((c) => contextFrames(723, 277, c))).toEqual([56, 124, 243, 277]);
    expect(contextFrames(124, 277, 5)).toBe(124);
    expect(lengthForSeconds(5)).toBe(124);
    expect(seconds(124)).toBe(5.167);
    expect(ANCHOR_FRAMES).toBe(22);
  });
});
