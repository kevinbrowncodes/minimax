import { describe, expect, it } from "vitest";
import { CUT_STEP, MERGE_FRAMES, SHOT_CHANGE, SLOW_CHANGE, detectCuts, parseFrameChanges, type FrameChanges } from "./cuts.ts";

/** A clip of n frames whose border barely moves (step 1, second 4, long 6), with `cuts` applied as hard steps at the given frames. */
function series(n: number, cutsAt: readonly number[] = [], height = 50): FrameChanges {
  const step = Array.from({ length: n - 1 }, () => 1);
  const second = Array.from({ length: n - 24 }, () => 4);
  const long = Array.from({ length: n - 72 }, () => 6);
  for (const at of cutsAt) {
    step[at - 1] = height; // frames at-1 -> at
    for (let i = Math.max(0, at - 24); i < at && i < second.length; i += 1) second[i] = height; // frame i vs i+24 straddles the cut
    for (let i = Math.max(0, at - 72); i < at && i < long.length; i += 1) long[i] = height; // frame i vs i+72 straddles the cut
  }
  return { step, second, span: 24, long, longSpan: 72 };
}

describe("detectCuts (STORY_020): the border one second apart", () => {
  it("a held shot reports nothing", () => {
    expect(detectCuts(series(300))).toEqual([]);
  });
  it("a hard cut is reported once, at the first frame of the new shot, in seconds to two decimals, as a cut (all three rules see it; they merge)", () => {
    expect(detectCuts(series(300, [142]))).toEqual([{ frame: 142, seconds: 5.92, kind: "cut" }]);
  });
  it("a fast dissolve (no single big step, the second climbing past the threshold) is reported at its steepest frame", () => {
    const s = series(400);
    const step = [...s.step];
    const second = [...s.second];
    for (let j = 270; j < 279; j += 1) step[j - 1] = 9 + (j - 270); // 9 … 17, steepest at 278
    for (let i = 260; i < 290; i += 1) second[i] = 20 + i - 260; // reaches 30 at i = 270 (frame 294 vs 270)
    expect(detectCuts({ ...s, step, second })).toEqual([{ frame: 278, seconds: 11.58, kind: "framing" }]);
  });
  it("one continuous run above the threshold is one event, however long", () => {
    const s = series(400);
    const second = s.second.map((v, i) => (i >= 100 && i < 220 ? 45 : v));
    const step = s.step.map((v, j) => (j === 123 ? 40 : v));
    expect(detectCuts({ ...s, step, second })).toEqual([{ frame: 124, seconds: 5.17, kind: "cut" }]);
  });
  it(`events within ${String(MERGE_FRAMES)} frames merge into the earliest; further apart they stay separate`, () => {
    expect(detectCuts(series(400, [100, 140])).map((c) => c.frame)).toEqual([100]);
    expect(detectCuts(series(400, [100, 149])).map((c) => c.frame)).toEqual([100, 149]);
  });
  it("a border change that peaks just under the one-second threshold (and under the single-frame one), with a quiet three-second series, is not a shot change", () => {
    const s = series(300, [142], SHOT_CHANGE - 1);
    expect(detectCuts({ ...s, long: Array.from({ length: 228 }, () => 6) })).toEqual([]);
    expect(detectCuts(series(300, [142], SHOT_CHANGE))).toHaveLength(1);
  });
});

describe("detectCuts (BUG_006): the border three seconds apart catches a slow dissolve", () => {
  /** The 2026-09-14 curtain → grey wall dissolve: 40 frames of small steps, one-second windows peaking at 16, three-second windows at 27. */
  function slowDissolve(): FrameChanges {
    const s = series(500);
    const step = s.step.map((v, j) => (j >= 261 && j < 303 ? 3 : v)); // frames 262–303: 3 per frame, steepest none
    const second = s.second.map((v, i) => { const end = i + 24; return end >= 270 && end <= 320 ? 16 : v; });
    const long = (s.long ?? []).map((v, i) => { const end = i + 72; return end >= 300 && end <= 360 ? 27 : v; });
    return { ...s, step, second, long };
  }
  it("flags the slow dissolve once, though no one-second window reached the threshold, placed in the middle of the first tripped window (inside the fade)", () => {
    const cuts = detectCuts(slowDissolve());
    expect(cuts).toEqual([{ frame: 264, seconds: 11, kind: "framing" }]); // first tripped window ends at 300; its middle is 264, inside 262–303
  });
  it("a held shot with the person moving (three-second border under the threshold) is not flagged", () => {
    const s = series(500);
    const base = s.long ?? [];
    expect(detectCuts({ ...s, long: base.map((v, i) => (i >= 100 && i < 200 ? SLOW_CHANGE - 1 : v)) })).toEqual([]);
    expect(detectCuts({ ...s, long: base.map((v, i) => (i === 150 ? SLOW_CHANGE : v)) })).toHaveLength(1);
  });
  it("a history from the STORY_020 node (no three-second series) still gets the one-second and the single-frame rules", () => {
    const s = series(300, [142]);
    const old: FrameChanges = { step: s.step, second: s.second, span: s.span };
    expect(detectCuts(old)).toEqual([{ frame: 142, seconds: 5.92, kind: "cut" }]);
    // the one-second rule alone (the step under CUT_STEP): framing, at the steepest step
    expect(detectCuts({ ...old, step: old.step.map((v) => (v === 50 ? 20 : v)) })).toEqual([{ frame: 142, seconds: 5.92, kind: "framing" }]);
    // neither series tripped: nothing (STORY_046 — a lone step of 50 with a flat one-second series is not a clip, so it is not the case)
    expect(detectCuts({ ...old, step: old.step.map(() => 1), second: old.second.map(() => 4) })).toEqual([]);
  });
});

describe("parseFrameChanges: the node's text output", () => {
  it("parses the series and the spans, defaulting the one-second span to 24 and keeping the long series only with its span", () => {
    expect(parseFrameChanges('{"frames": 3, "span": 24, "longSpan": 72, "step": [1, 2], "second": [], "long": []}')).toEqual({ step: [1, 2], second: [], span: 24, long: [], longSpan: 72 });
    expect(parseFrameChanges('{"step": [1], "second": [2]}')).toEqual({ step: [1], second: [2], span: 24 });
    expect(parseFrameChanges('{"step": [1], "second": [2], "long": [3]}')).toEqual({ step: [1], second: [2], span: 24 });
  });
  it("returns undefined for absent, malformed or non-numeric text", () => {
    expect(parseFrameChanges(undefined)).toBeUndefined();
    expect(parseFrameChanges("not json")).toBeUndefined();
    expect(parseFrameChanges('{"step": ["a"], "second": []}')).toBeUndefined();
    expect(parseFrameChanges('{"second": []}')).toBeUndefined();
    expect(parseFrameChanges("[1,2]")).toBeUndefined();
  });
});

describe("detectCuts (STORY_046): a cut is a single-frame step; a camera move is framing", () => {
  /** The office round's handheld draw of 2026-09-16 (`ecb286a6`): one-second windows over 30 for most of the clip in three runs, no single step above 15. */
  function handheld(): FrameChanges {
    const s = series(243);
    const step = s.step.map((v, j) => (j % 7 === 0 ? 14 : 8));
    const second = s.second.map((v, i) => { const end = i + 24; return (end >= 24 && end < 60) || (end >= 100 && end < 170) || (end >= 204 && end < 243) ? 40 : 10; });
    const long = (s.long ?? []).map(() => 50);
    return { ...s, step, second, long };
  }
  it("a handheld clip whose border moves for most of its length is framing only — one event per run, none a cut", () => {
    const cuts = detectCuts(handheld());
    expect(cuts.map((c) => c.kind)).toEqual(["framing", "framing", "framing"]);
    // each event inside the run that tripped it: (0, 60), (76, 170), (180, 243)
    expect(cuts[0]?.frame).toBeLessThan(60);
    expect(cuts[1]?.frame).toBeGreaterThanOrEqual(76);
    expect(cuts[1]?.frame).toBeLessThan(170);
    expect(cuts[2]?.frame).toBeGreaterThanOrEqual(180);
  });
  it("a hard cut inside a moving stretch is a cut at its own frame; the framing events around it stay framing", () => {
    const s = handheld();
    const step = s.step.map((v, j) => (j === 141 ? 45 : v)); // frame 142
    const cuts = detectCuts({ ...s, step });
    const cut = cuts.find((c) => c.kind === "cut");
    expect(cut).toEqual({ frame: 142, seconds: 5.92, kind: "cut" });
    expect(cuts.filter((c) => c.kind === "framing").length).toBeGreaterThanOrEqual(2);
  });
  it("a cut spread over two frames by encoding is one cut, at the larger step; a step just under the threshold is not one", () => {
    const s = series(300);
    const step = s.step.map((v, j) => (j === 141 ? 31 : j === 142 ? CUT_STEP : v)); // frames 142 and 143
    expect(detectCuts({ ...s, step })).toEqual([{ frame: 142, seconds: 5.92, kind: "cut" }]);
    expect(detectCuts({ ...s, step: s.step.map((v, j) => (j === 141 ? CUT_STEP - 1 : v)) })).toEqual([]);
  });
  it("a cut within the merge distance of a framing event names the merged event's frame and kind", () => {
    const s = series(400);
    const second = s.second.map((v, i) => (i >= 100 && i < 220 ? 45 : v)); // framing from frame 124 (steepest step: none — all 1 → the window's first frame 101)
    const step = s.step.map((v, j) => (j === 139 ? 50 : v)); // a cut at frame 140, 39 frames after the framing event at 101
    expect(detectCuts({ ...s, second, step })).toEqual([{ frame: 140, seconds: 5.83, kind: "cut" }]);
  });
});
