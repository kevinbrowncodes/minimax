/**
 * MiniMax's full-reference prompt for a continuation (STORY_016): the owner's prose wrapped in the six sections the
 * Ref2VA checkpoint was trained on — docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_ref_en.txt. The source's
 * tail is <Video 1>, its soundtrack <Audio 1>, the task type is `[video continuation + audio reference]`. A prompt that
 * already starts with `subject_definitions:` is the owner's own full-reference text and goes through unchanged.
 */
export const FULL_REFERENCE_MARKER = "subject_definitions:";

export function isFullReferencePrompt(prompt: string): boolean {
  return prompt.trimStart().startsWith(FULL_REFERENCE_MARKER);
}

export function continuationPrompt(prose: string, contextFedSeconds: number): string {
  if (isFullReferencePrompt(prose)) return prose;
  const seconds = contextFedSeconds.toFixed(1);
  return [
    "subject_definitions:",
    `<Video 1> is the last ${seconds} seconds of the source video that the target video continues from; its subject, environment, lighting, framing and camera position at its final frame are the target video's starting state.`,
    "<Audio 1> is the synchronized soundtrack of <Video 1>, referenced for the continuity of its ambience and sound texture.",
    "",
    "summary:",
    "[video continuation + audio reference] The target video continues directly from the last frame of <Video 1> with the same subject, scene, framing, lighting and camera position, and develops as the detailed description specifies; its sound continues the ambience of <Audio 1>.",
    "",
    "retention_analysis:",
    "<Video 1> (continuation source): fully_preserved - the subject's identity and appearance, the environment, the lighting, the framing and the camera position at the end of <Video 1> continue unchanged into the target video.",
    "<Audio 1>: reference - the target video's ambience continues the character of <Audio 1> without copying the signal.",
    "",
    "detailed_description:",
    "The target video continues directly from the last frame of <Video 1>, keeping its style, framing, lighting and camera position; the subject's identity and appearance stay exactly as in <Video 1>.",
    `[Shot 1] ${prose.trim()}`,
    "",
    "overall_soundscape: The ambience of <Audio 1> continues throughout the target video, together with the sounds the description above specifies.",
    "",
    "non_diegetic_music: Only what the description above asks for; none otherwise.",
  ].join("\n");
}
