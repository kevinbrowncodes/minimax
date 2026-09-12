import { describe, expect, it } from "vitest";
import { frameState, frameToKeep, isResultControl, looksFailed, looksOutOfCredits, parseModelArg, smallestDuration } from "./generate-plan.ts";

describe("frameToKeep", () => {
  it("keeps the first frame at or past each mark once", () => {
    const kept: number[] = [];
    const take = (s: number) => {
      const mark = frameToKeep(s, kept);
      if (mark !== null) kept.push(mark);
      return mark;
    };
    expect(take(0)).toBe(0);
    expect(take(10)).toBeNull();
    expect(take(31)).toBe(30);
    expect(take(40)).toBeNull();
    expect(take(95)).toBe(90);
    expect(take(95)).toBeNull();
  });
});

describe("frameState", () => {
  it("zero-pads the elapsed mark", () => {
    expect(frameState(0)).toBe("task-generating-000s");
    expect(frameState(90)).toBe("task-generating-090s");
    expect(frameState(600)).toBe("task-generating-600s");
  });
});

describe("looksFailed", () => {
  it("matches failure and moderation wording and nothing else", () => {
    expect(looksFailed("Generation failed, please try again")).toBe(true);
    expect(looksFailed("Insufficient credits")).toBe(true);
    expect(looksFailed("Your prompt violates our policy")).toBe(true);
    expect(looksFailed("Generating your video…")).toBe(false);
  });
  it("matches the plain 'Request failed' the task page showed on 2026-09-12", () => {
    expect(looksFailed("10:38 Request failed Retry")).toBe(true);
  });
});

describe("looksOutOfCredits", () => {
  it("matches the low-balance notice and its Buy Credits control, not ordinary text", () => {
    expect(looksOutOfCredits("Fewer than 1,000 Credits remain. Buy Credits Subscribe")).toBe(true);
    expect(looksOutOfCredits("Track progress on longer tasks.")).toBe(false);
  });
});

describe("isResultControl", () => {
  it("rejects the top-bar Download button and accepts one under the header", () => {
    expect(isResultControl({ y: 16 })).toBe(false);
    expect(isResultControl({ y: 420 })).toBe(true);
    expect(isResultControl(null)).toBe(false);
  });
});

describe("billing wall wording (agent message on 2026-09-12)", () => {
  const msg = "Hit a billing wall — your H3 generation got rejected at submit. Provider returned HTTP 402: insufficient account credits for MiniMax-H3 video generation";
  it("is a failure and a credits problem", () => {
    expect(looksFailed(msg)).toBe(true);
    expect(looksOutOfCredits(msg)).toBe(true);
  });
});

describe("parseModelArg", () => {
  it("defaults to h3 and accepts hailuo-2.3 or hailuo", () => {
    expect(parseModelArg([])).toBe("h3");
    expect(parseModelArg(["--generate", "2"])).toBe("h3");
    expect(parseModelArg(["--model", "hailuo-2.3"])).toBe("hailuo-2.3");
    expect(parseModelArg(["--model", "hailuo"])).toBe("hailuo-2.3");
    expect(() => parseModelArg(["--model", "gpt"])).toThrow();
  });
});

describe("smallestDuration", () => {
  it("picks the smallest N s label and ignores non-duration labels", () => {
    expect(smallestDuration(["16:9", "6s", "10s", "768P"])).toBe("6s");
    expect(smallestDuration(["5s", "6s", "15s"])).toBe("5s");
    expect(smallestDuration(["16:9"])).toBeNull();
  });
});
