import { describe, expect, it } from "vitest";
import { BASE_FORMAT_MARKER, continuationPrompt, isBaseFormatPrompt } from "./prompt.ts";

describe("continuationPrompt (STORY_017)", () => {
  it("wraps the prose in MiniMax's base format: one continuous shot, the soundscape, the music", () => {
    const text = continuationPrompt("  He steps his left foot back and holds the angle.  ");
    const [first, blank1, sound, blank2, music] = text.split("\n");
    expect(first).toBe("integrated_multimodal_description: [Shot 1] Live-action, one continuous shot; the camera does not move. The person, the set, the props and the lighting already in frame stay exactly as they are and the action continues without a cut. He steps his left foot back and holds the angle.");
    expect(blank1).toBe("");
    expect(sound).toMatch(/^overall_soundscape: The ambience already in the clip continues unchanged/);
    expect(blank2).toBe("");
    expect(music).toMatch(/^non_diegetic_music: None/);
    expect(text).not.toMatch(/<Video 1>|<Picture 1>|subject_definitions/);
  });

  it("passes the owner's own base-format prompt through byte for byte", () => {
    const own = `${BASE_FORMAT_MARKER} [Shot 1] mine\n\noverall_soundscape: rain\n\nnon_diegetic_music: none`;
    expect(continuationPrompt(own)).toBe(own);
    expect(continuationPrompt(`  \n${own}`)).toBe(`  \n${own}`);
    expect(isBaseFormatPrompt("A plain prompt")).toBe(false);
    expect(isBaseFormatPrompt("\n integrated_multimodal_description: x")).toBe(true);
  });
});
