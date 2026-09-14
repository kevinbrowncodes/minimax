/**
 * The prompt for a continuation (STORY_017): the owner's prose in MiniMax's base format for the FL2VA checkpoint —
 * docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en.txt (one `[Shot 1]`, the soundscape, the music). The
 * scene itself is not described: it is in the clip's own first frames (the masked prefix), which the model continues.
 * A prompt that already starts with `integrated_multimodal_description:` is the owner's own base-format text and goes
 * through unchanged.
 */
export const BASE_FORMAT_MARKER = "integrated_multimodal_description:";

export function isBaseFormatPrompt(prompt: string): boolean {
  return prompt.trimStart().startsWith(BASE_FORMAT_MARKER);
}

export function continuationPrompt(prose: string): string {
  if (isBaseFormatPrompt(prose)) return prose;
  return [
    `${BASE_FORMAT_MARKER} [Shot 1] Live-action, one continuous shot; the camera does not move. The person, the set, the props and the lighting already in frame stay exactly as they are and the action continues without a cut. ${prose.trim()}`,
    "",
    "overall_soundscape: The ambience already in the clip continues unchanged throughout, together with the sounds the description above specifies.",
    "",
    "non_diegetic_music: None, unless the description above asks for music.",
  ].join("\n");
}
