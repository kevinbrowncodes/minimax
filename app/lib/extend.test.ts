import { describe, expect, it } from "vitest";
import { contextFedSeconds, gridDown, joinedSeconds, lengthForSeconds, segmentFrames } from "./extend";

describe("extend arithmetic (mirrors spark/adapter/src/mapping.ts)", () => {
  it("reproduces the adapter's table for the owner's 10 s clip and a 30 s source", () => {
    expect([4, 5, 10, 14].map(segmentFrames)).toEqual([124, 158, 277, 362]);
    expect([5, 48, 124, 243, 360, 362].map(gridDown)).toEqual([5, 39, 124, 243, 345, 362]);
    expect(lengthForSeconds(10.125)).toBe(243);
    // 10 s source (recorded as 10.125 s) at +10 s: context 2 / 5 / 10 / 15
    expect([2, 5, 10, 15].map((c) => contextFedSeconds(10.125, 10, c))).toEqual([2.3, 5.2, 10.1, 10.1]);
    // 30 s source at +10 s and at +14 s
    expect([2, 5, 10, 15].map((c) => contextFedSeconds(30.125, 10, c))).toEqual([2.3, 5.2, 10.1, 11.5]);
    expect(contextFedSeconds(30.125, 14, 15)).toBe(15.1);
    // the step caps the context: +4 s
    expect(contextFedSeconds(10.125, 4, 15)).toBe(5.2);
    // the stub's fixture (2.0 s = 56 frames): every choice yields all of it
    expect([2, 5, 10, 15].map((c) => contextFedSeconds(2, 10, c))).toEqual([2.3, 2.3, 2.3, 2.3]);
    expect(joinedSeconds(10.125, 10)).toBe(20.8);
    expect(joinedSeconds(2, 10)).toBe(13);
  });
});
