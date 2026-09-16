import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chainPlan, firstTimestampedLine, formatTimestamp, lastTimestampSeconds, segmentPrompt, splitChain } from "./chain";

// the owner's own scripts and scene (docs/scripts/), the ones the three verified chains were generated from
const scripts = join(__dirname, "..", "..", "docs", "scripts");
const scene = readFileSync(join(scripts, "scene.txt"), "utf8").trim();
const script = (n: number): string => readFileSync(join(scripts, `script${String(n)}.txt`), "utf8").trim();
const three = `${scene}\n\n${script(1)}\n\n${script(2)}\n\n${script(3)}`;

describe("splitChain (STORY_044)", () => {
  it("splits the scene and three scripts at their [0:00- lines, each script keeping its closing lines", () => {
    const split = splitChain(three);
    expect(split.scene).toBe(scene);
    expect(split.segments).toHaveLength(3);
    expect(split.segments[0]).toBe(script(1));
    expect(split.segments[1]).toBe(script(2));
    expect(split.segments[2]).toBe(script(3));
    expect(split.segments[0]?.endsWith("or music.")).toBe(true);
  });
  it("accepts [00:00-, tolerates indentation and CRLF, and is one segment with no scene when there is no bracketed line", () => {
    expect(splitChain("Scene.\r\n  [00:00-0:03] First.\r\n[00:00-0:02] Second.").segments).toEqual(["[00:00-0:03] First.", "[00:00-0:02] Second."]);
    expect(splitChain("A red kite over a beach")).toEqual({ scene: "", segments: ["A red kite over a beach"] });
  });
  it("one script is one segment; a bracket that does not start a line does not split", () => {
    expect(splitChain(`${scene}\n${script(1)}`).segments).toHaveLength(1);
    expect(splitChain("He waits [0:00-0:03] then [0:00-0:05] again").segments).toHaveLength(1);
  });
  it("segmentPrompt is the scene, a blank line, the script — or the script alone without a scene", () => {
    expect(segmentPrompt(scene, script(1))).toBe(`${scene}\n\n${script(1)}`);
    expect(segmentPrompt("", script(1))).toBe(script(1));
  });
});

describe("timestamps", () => {
  it("firstTimestampedLine drops the bracket; lastTimestampSeconds is where the last one ends", () => {
    expect(firstTimestampedLine(script(2))).toMatch(/^He steps his left foot back slightly/);
    expect(firstTimestampedLine(three)).toMatch(/^From his standing stance/);
    expect(firstTimestampedLine("no brackets here")).toBeUndefined();
    expect(lastTimestampSeconds(script(1))).toBe(10);
    expect(lastTimestampSeconds("[0:00-0:03] a\n[0:03-1:05] b\nThe camera stays fixed.")).toBe(65);
    expect(lastTimestampSeconds("no brackets")).toBeUndefined();
    expect(formatTimestamp(10)).toBe("0:10");
    expect(formatTimestamp(65)).toBe("1:05");
  });
});

describe("chainPlan", () => {
  const base = { seconds: 10, overlapFrames: 39, extensionMax: 13, maxSourceSeconds: 30 };
  it("three 10 s scripts at overlap 39 → 10.1 / 20.8 / 31.4 s, all fitting under a 30 s cap", () => {
    const plan = chainPlan([script(1), script(2), script(3)], base);
    expect(plan.segments.map((s) => s.joinedSeconds)).toEqual([10.1, 20.8, 31.4]); // 243, 498, 753 frames — the verified chain's
    expect(plan.segments.map((s) => s.seconds)).toEqual([10, 10, 10]);
    expect(plan.segments[0]?.sourceSeconds).toBeUndefined();
    expect(plan.segments[1]?.sourceSeconds).toBe(10.1);
    expect(plan.segments.every((s) => s.fits)).toBe(true);
    expect(plan.fits).toBe(true);
    expect(plan.totalSeconds).toBe(31.4);
    expect(plan.segments[0]?.endsAt).toBe(10);
    expect(plan.segments[1]?.words).toMatch(/^He steps his left foot back/);
  });
  it("six 10 s scripts: segments 4–6 do not fit (their source is longer than 30 s), the total is still the minute", () => {
    const plan = chainPlan(Array.from({ length: 6 }, () => script(1)), base);
    expect(plan.segments.map((s) => s.fits)).toEqual([true, true, true, false, false, false]);
    expect(plan.firstUnfit).toBe(4);
    expect(plan.fits).toBe(false);
    expect(plan.segments[3]?.sourceSeconds).toBe(31.4);
    expect(plan.totalSeconds).toBe(63.3);
    // a higher cap (STORY_045) lifts it with no other change
    expect(chainPlan(Array.from({ length: 6 }, () => script(1)), { ...base, maxSourceSeconds: 120 }).fits).toBe(true);
  });
  it("an extension's seconds are cut to the extension maximum and say so; the first fresh clip is not", () => {
    const plan = chainPlan([script(1), script(2)], { ...base, seconds: 14 });
    expect(plan.segments[0]).toMatchObject({ seconds: 14, capped: false });
    expect(plan.segments[1]).toMatchObject({ seconds: 13, capped: true });
  });
  it("from an existing 5 s clip every segment is an extension, the first of the source", () => {
    const plan = chainPlan([script(1), script(2)], { ...base, seconds: 5, fromSource: 5 });
    expect(plan.segments[0]).toMatchObject({ sourceSeconds: 5, seconds: 5, fits: true });
    expect(plan.segments[0]?.joinedSeconds).toBe(10.8); // 124 + 175 − 39 = 260 frames
    expect(plan.segments[1]?.sourceSeconds).toBe(10.8);
    // a source already over the cap: nothing fits
    expect(chainPlan([script(1)], { ...base, fromSource: 31.4 }).fits).toBe(false);
  });
});
