import { describe, expect, it } from "vitest";
import { BASE_FORMAT_MARKER, I2VA_INSTRUCTION, MUSIC_FIELD, SOUNDSCAPE_FIELD, bodyOf, buildPrompt, durationLabel, fl2vaInstruction, isBaseFormatPrompt, cameraOf, descriptionOf } from "./prompt.ts";

const STATIC = "The camera holds a perfectly static shot throughout the entire";

describe("buildPrompt (STORY_020): the prompt the model is documented to expect", () => {
  it("image-to-video: MiniMax's instruction line first, verbatim, then one static [Shot 1] with the duration, then the two audio fields", () => {
    const text = buildPrompt("He rolls his shoulders back.", { kind: "fresh", frames: 124, images: 1 });
    const parts = text.split("\n\n");
    expect(parts[0]).toBe("For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.");
    expect(parts[0]).toBe(I2VA_INSTRUCTION);
    expect(parts[1]).toBe(
      `${BASE_FORMAT_MARKER} [Shot 1] Live-action. ${STATIC} 5.17-second duration: no cut, no dissolve, no transition and no change of framing; the person, the set, the props and the lighting in <Picture 1> stay as they are for the whole video. He rolls his shoulders back.`,
    );
    expect(parts[2]).toBe(SOUNDSCAPE_FIELD);
    expect(parts[3]).toBe(MUSIC_FIELD);
    expect(parts).toHaveLength(4);
  });

  it("the duration is the clip's grid length to two decimals (245 frames → 10.21; 294 → 12.25)", () => {
    expect(durationLabel(245)).toBe("10.21");
    expect(buildPrompt("x", { kind: "fresh", frames: 245, images: 1 })).toContain("entire 10.21-second duration");
    expect(buildPrompt("x", { kind: "extension", frames: 294 })).toContain("entire 12.25-second duration");
  });

  it("text-to-video: no instruction line and no Picture clause", () => {
    const text = buildPrompt("A boat on a pond.", { kind: "fresh", frames: 124, images: 0 });
    expect(text.startsWith(BASE_FORMAT_MARKER)).toBe(true);
    expect(text).not.toContain("<Picture 1>");
    expect(text).toContain("the person, the set, the props and the lighting established at the start stay as they are for the whole video. A boat on a pond.");
  });

  it("first and last frame: the FL2VA alignment line with the clip's length", () => {
    const text = buildPrompt("x", { kind: "fresh", frames: 124, images: 2 });
    expect(text.split("\n\n")[0]).toBe(fl2vaInstruction(124));
    expect(text).toContain("Picture 2 (from Shot 1) aligns with the 5.17-second mark");
  });

  it("an extension: no instruction line (the preserved head is not a Picture), the 'already in frame' clause, the two audio fields", () => {
    const text = buildPrompt("He steps his left foot back.", { kind: "extension", frames: 294 });
    const parts = text.split("\n\n");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(
      `${BASE_FORMAT_MARKER} [Shot 1] Live-action. ${STATIC} 12.25-second duration: no cut, no dissolve, no transition and no change of framing; the person, the set, the props and the lighting already in frame at the start stay exactly as they are for the whole video and the action continues without interruption. He steps his left foot back.`,
    );
    expect(parts[1]).toBe(SOUNDSCAPE_FIELD);
    expect(parts[2]).toBe(MUSIC_FIELD);
  });

  it("passes the owner's own base-format text, or text that opens with either instruction line, through unchanged", () => {
    const own = "integrated_multimodal_description: [Shot 1] Mine.\n\noverall_soundscape: Rain.\n\nnon_diegetic_music: None.";
    expect(buildPrompt(own, { kind: "extension", frames: 294 })).toBe(own);
    expect(buildPrompt(`  \n${own}`, { kind: "fresh", frames: 124, images: 1 })).toBe(`  \n${own}`);
    const withInstruction = `${I2VA_INSTRUCTION}\n\n${own}`;
    expect(buildPrompt(withInstruction, { kind: "fresh", frames: 124, images: 1 })).toBe(withInstruction);
    expect(isBaseFormatPrompt("How the reference pictures align with the target video — …")).toBe(true);
    expect(isBaseFormatPrompt("\n integrated_multimodal_description: x")).toBe(true);
    expect(isBaseFormatPrompt("He rolls his shoulders back.")).toBe(false);
  });
});

describe("bodyOf: the owner's script as one paragraph", () => {
  it("rewrites a line's leading [m:ss-m:ss] as 'From m:ss to m:ss,' and lower-cases the capital that followed it", () => {
    expect(bodyOf("[0:03-0:07] He rolls his shoulders back.")).toBe("From 0:03 to 0:07, he rolls his shoulders back.");
    expect(bodyOf("[0:00-0:03] From his standing stance, he draws his elbows back.")).toBe("From 0:00 to 0:03, from his standing stance, he draws his elbows back.");
  });
  it("leaves a line without a bracket, and a bracket in mid-line, untouched", () => {
    expect(bodyOf("The camera stays completely fixed — no pan, tilt, zoom, push-in, or pull-out.")).toBe("The camera stays completely fixed — no pan, tilt, zoom, push-in, or pull-out.");
    expect(bodyOf("He holds [0:03-0:07] the pose.")).toBe("He holds [0:03-0:07] the pose.");
  });
  it("joins the lines into one paragraph with single spaces and collapses whitespace; keeps every other word", () => {
    const script = "[0:00-0:03] He plants both palms flat.\n[0:03-0:07] He rolls his   shoulders back.\n\nThe camera stays completely fixed.\n  Quiet studio ambient tone only.  ";
    expect(bodyOf(script)).toBe("From 0:00 to 0:03, he plants both palms flat. From 0:03 to 0:07, he rolls his shoulders back. The camera stays completely fixed. Quiet studio ambient tone only.");
  });
  it("a lower-case or non-letter start after the bracket is kept as is", () => {
    expect(bodyOf("[0:00-0:03] he waits.")).toBe("From 0:00 to 0:03, he waits.");
    expect(bodyOf("[0:00-0:03] 3 seconds of stillness.")).toBe("From 0:00 to 0:03, 3 seconds of stillness.");
  });
});

describe("cameraOf (STORY_046): what the prompt asks of the camera, read from the prompt the model gets", () => {
  const base = (description: string, soundscape = "The room's own tone.") => `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\nintegrated_multimodal_description: [Shot 1] ${description}\n\noverall_soundscape: ${soundscape}\n\nnon_diegetic_music: None.`;
  it("a prompt the adapter wraps is static — the wrapper says so", () => {
    expect(cameraOf("[0:00-0:03] He steps back and holds.")).toBe("static");
  });
  it("the owner's base-format prompt: 'static shot' with no move named is static", () => {
    expect(cameraOf(base("Live-action. The camera holds a perfectly static shot throughout the entire ten-second duration: no cut. He waves."))).toBe("static");
  });
  it("a named move — the guide's types, the handheld words, 'camera follows' — is moving, whatever else the prompt says", () => {
    expect(cameraOf(base("Live-action. The camera is the front-facing phone in his own hand and holds this selfie framing with only the small natural handheld sway that follows his lean."))).toBe("moving");
    for (const move of ["The camera pushes in with small amplitude at slow speed.", "A slow push-in, then it holds.", "The camera pans right.", "The camera tilts up.", "A tracking shot along the pier.", "The camera follows her down the hall.", "A slow zoom out over the first three seconds.", "The camera holds a static shot, then a slow pull out."]) {
      expect(cameraOf(base(move)), move).toBe("moving");
    }
  });
  it("neither a static declaration nor a move is unknown", () => {
    expect(cameraOf(base("Live-action, cinematic. He waves at the lens."))).toBe("unknown");
  });
  it("reads the description only: a pan that clatters in the soundscape, or 'spans' and 'zoomed' as other words, is not a move", () => {
    expect(cameraOf(base("Live-action. The camera holds a static shot. He cooks.", "A pan clatters on the stove; the camera pans, someone says."))).toBe("static");
    expect(cameraOf(base("The bridge spans the river; the camera holds a static shot; a zoomed-in map lies on the table."))).toBe("static");
  });
  it("descriptionOf: the field between the marker and the soundscape; the whole text without a marker", () => {
    expect(descriptionOf(base("Alpha.", "Beta."))).toBe(" [Shot 1] Alpha.\n\n");
    expect(descriptionOf("plain words")).toBe("plain words");
  });
});
