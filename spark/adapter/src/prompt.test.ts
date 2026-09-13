import { describe, expect, it } from "vitest";
import { FULL_REFERENCE_MARKER, continuationPrompt, isFullReferencePrompt } from "./prompt.ts";

const SECTIONS = ["subject_definitions:", "summary:", "retention_analysis:", "detailed_description:", "overall_soundscape:", "non_diegetic_music:"];

describe("continuationPrompt (STORY_016)", () => {
  it("wraps the prose in MiniMax's six full-reference sections, in order, as a video continuation", () => {
    const text = continuationPrompt("He steps his left foot back and holds the angle.", 5.167);
    const positions = SECTIONS.map((s) => text.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).toContain("<Video 1> is the last 5.2 seconds of the source video");
    expect(text).toContain("<Audio 1> is the synchronized soundtrack of <Video 1>");
    expect(text).toContain("summary:\n[video continuation + audio reference] ");
    expect(text).toContain("<Video 1> (continuation source): fully_preserved - ");
    expect(text).toContain("<Audio 1>: reference - ");
    expect(text).toContain("[Shot 1] He steps his left foot back and holds the angle.");
    expect(text.indexOf("[Shot 1]")).toBeGreaterThan(text.indexOf("detailed_description:"));
    expect(text).toMatch(/overall_soundscape: .*<Audio 1>/);
  });

  it("passes the owner's own full-reference prompt through byte for byte", () => {
    const own = `${FULL_REFERENCE_MARKER}\n<Video 1> is my source.\n\nsummary:\n[video continuation] mine`;
    expect(continuationPrompt(own, 5)).toBe(own);
    expect(continuationPrompt(`  \n${own}`, 5)).toBe(`  \n${own}`);
    expect(isFullReferencePrompt("A plain prompt")).toBe(false);
    expect(isFullReferencePrompt("\n subject_definitions:\n")).toBe(true);
  });
});
