import { describe, expect, it } from "vitest";
import { MERGE_FRAMES, SHOT_CHANGE, detectCuts, parseFrameChanges, type FrameChanges } from "./cuts.ts";

/** A clip of n frames whose border barely moves (step 1, second 4), with `cuts` applied as hard steps at the given frames. */
function series(n: number, cutsAt: readonly number[] = [], height = 50): FrameChanges {
  const step = Array.from({ length: n - 1 }, () => 1);
  const second = Array.from({ length: n - 24 }, () => 4);
  for (const at of cutsAt) {
    step[at - 1] = height; // frames at-1 -> at
    for (let i = Math.max(0, at - 24); i < at && i < second.length; i += 1) second[i] = height; // frame i vs i+24 straddles the cut
  }
  return { step, second, span: 24 };
}

describe("detectCuts (STORY_020): the border one second apart", () => {
  it("a held shot reports nothing", () => {
    expect(detectCuts(series(300))).toEqual([]);
  });
  it("a hard cut is reported at the first frame of the new shot, in seconds to two decimals", () => {
    expect(detectCuts(series(300, [142]))).toEqual([{ frame: 142, seconds: 5.92 }]);
  });
  it("a dissolve (no single big step, the second climbing past the threshold) is reported at its steepest frame", () => {
    const s = series(400);
    const step = [...s.step];
    const second = [...s.second];
    for (let j = 270; j < 279; j += 1) step[j - 1] = 9 + (j - 270); // 9 … 17, steepest at 278
    for (let i = 260; i < 290; i += 1) second[i] = 20 + i - 260; // reaches 30 at i = 270 (frame 294 vs 270)
    expect(detectCuts({ step, second, span: 24 })).toEqual([{ frame: 278, seconds: 11.58 }]);
  });
  it("one continuous run above the threshold is one event, however long", () => {
    const s = series(400);
    const second = s.second.map((v, i) => (i >= 100 && i < 220 ? 45 : v));
    const step = s.step.map((v, j) => (j === 123 ? 40 : v));
    expect(detectCuts({ ...s, step, second })).toEqual([{ frame: 124, seconds: 5.17 }]);
  });
  it(`events within ${String(MERGE_FRAMES)} frames merge into the earliest; further apart they stay separate`, () => {
    expect(detectCuts(series(400, [100, 140])).map((c) => c.frame)).toEqual([100]);
    expect(detectCuts(series(400, [100, 149])).map((c) => c.frame)).toEqual([100, 149]);
  });
  it("a border change that peaks just under the threshold is not a shot change", () => {
    expect(detectCuts(series(300, [142], SHOT_CHANGE - 1))).toEqual([]);
    expect(detectCuts(series(300, [142], SHOT_CHANGE))).toHaveLength(1);
  });
});

describe("parseFrameChanges: the node's text output", () => {
  it("parses the two series and the span, defaulting the span to 24", () => {
    expect(parseFrameChanges('{"frames": 3, "span": 24, "step": [1, 2], "second": []}')).toEqual({ step: [1, 2], second: [], span: 24 });
    expect(parseFrameChanges('{"step": [1], "second": [2]}')).toEqual({ step: [1], second: [2], span: 24 });
  });
  it("returns undefined for absent, malformed or non-numeric text", () => {
    expect(parseFrameChanges(undefined)).toBeUndefined();
    expect(parseFrameChanges("not json")).toBeUndefined();
    expect(parseFrameChanges('{"step": ["a"], "second": []}')).toBeUndefined();
    expect(parseFrameChanges('{"second": []}')).toBeUndefined();
    expect(parseFrameChanges("[1,2]")).toBeUndefined();
  });
});
