/**
 * The prompt the model is documented to expect (STORY_020), built around the owner's own words.
 *
 * MiniMax's base prompt guide (docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en.txt) — read, not recalled:
 *   - image-to-video "always uses" one instruction line first, verbatim (I2VA_INSTRUCTION); first + last frame uses the
 *     FL2VA alignment line; text-to-video "begins directly with the three core fields";
 *   - `[Shot 1]` opens with the style and composition; a static camera is written as "holds a static shot" (the model
 *     card's own image-to-video example: "The camera holds a perfectly static shot throughout the entire eight-second
 *     duration"); the only timestamps in the format mark cuts, so the owner's "[0:00-0:03]" brackets become plain time
 *     phrases;
 *   - the three fields are integrated_multimodal_description, overall_soundscape and non_diegetic_music.
 * An extension (STORY_017's masked continuation) gets no instruction line: its preserved head is not a Picture, and the
 * community suites say the masked context "does not need to be mentioned in the prompt". The scene itself is never
 * invented here — the adapter does not see the image; the owner's text (docs/scripts/scene.txt) describes it.
 * A prompt that already begins with the format or with either instruction line is the owner's own and passes unchanged.
 */
import { FPS } from "./grid.ts";

export const BASE_FORMAT_MARKER = "integrated_multimodal_description:";
export const I2VA_INSTRUCTION = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.";
export const SOUNDSCAPE_FIELD = "overall_soundscape: The ambience the description above specifies, and no other sound.";
export const MUSIC_FIELD = "non_diegetic_music: None, unless the description above asks for music.";
const INSTRUCTION_STARTS = ["For the target video", "How the reference pictures align"] as const;
const BRACKET = /^\[(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\]\s*/;
const SOUNDSCAPE_MARKER = "overall_soundscape:";

/**
 * STORY_046: the camera moves the base guide names (§4.2: Push In / Pull Out, Pan, Tilt, Pedestal, Arc Shot, Tracking
 * Shot — "the camera follows a moving subject" — and Zoom), plus the handheld words the owner's prompts use. Matched as
 * whole words, case-insensitive, in the description field only: the soundscape may say a pan clatters.
 */
export const CAMERA_MOVES = [
  "push in", "push-in", "pushes in", "pushing in",
  "pull out", "pull-out", "pulls out", "pulling out",
  "pan left", "pan right", "pans", "panning",
  "tilt up", "tilt down", "tilts", "tilting",
  "pedestal", "arc shot", "tracking shot", "dolly", "dollies",
  "zoom", "zooms", "zooming",
  "handheld", "hand-held", "sway", "sways", "swaying", "camera follows",
] as const;
const STATIC_CAMERA = /\bstatic shot\b/i;
const MOVE_PATTERN = new RegExp(`\\b(?:${CAMERA_MOVES.map((m) => m.replace(/[-\s]/g, "[-\\s]")).join("|")})\\b`, "i");

export type Camera = "static" | "moving" | "unknown";

/** The description field of a base-format prompt (between its marker and the soundscape); the whole text otherwise. */
export function descriptionOf(prompt: string): string {
  const start = prompt.indexOf(BASE_FORMAT_MARKER);
  const body = start === -1 ? prompt : prompt.slice(start + BASE_FORMAT_MARKER.length);
  const end = body.indexOf(SOUNDSCAPE_MARKER);
  return end === -1 ? body : body.slice(0, end);
}

/**
 * What the caller's prompt asks of the camera, read from the prompt the model gets: a prompt the adapter wraps is
 * "static" (the wrapper says so); the caller's own base-format prompt is "moving" when its description names a move,
 * "static" when it says "static shot" and names none, "unknown" otherwise.
 */
export function cameraOf(prompt: string): Camera {
  if (!isBaseFormatPrompt(prompt)) return "static";
  const description = descriptionOf(prompt);
  if (MOVE_PATTERN.test(description)) return "moving";
  return STATIC_CAMERA.test(description) ? "static" : "unknown";
}

export type PromptShape =
  | { readonly kind: "fresh"; readonly frames: number; readonly images: number }
  | { readonly kind: "extension"; readonly frames: number };

export function isBaseFormatPrompt(prompt: string): boolean {
  const text = prompt.trimStart();
  return text.startsWith(BASE_FORMAT_MARKER) || INSTRUCTION_STARTS.some((start) => text.startsWith(start));
}

/** The clip's duration as the guide's S.SS (124 frames → "5.17"). */
export function durationLabel(frames: number): string {
  return (frames / FPS).toFixed(2);
}

export function fl2vaInstruction(frames: number): string {
  return `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the ${durationLabel(frames)}-second mark of the target video.`;
}

/**
 * The owner's text as one paragraph: a line's leading "[m:ss-m:ss]" becomes "From m:ss to m:ss," (the next word
 * lower-cased when it was capitalised), lines are joined by single spaces, whitespace collapsed; every other word stays.
 */
export function bodyOf(prose: string): string {
  const lines = prose.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  return lines
    .map((line) => {
      const match = BRACKET.exec(line);
      if (!match) return line;
      const rest = line.slice(match[0].length);
      const first = rest.charAt(0);
      const capitalised = first !== first.toLowerCase() && first === first.toUpperCase();
      return `From ${match[1] ?? ""} to ${match[2] ?? ""}, ${capitalised ? first.toLowerCase() + rest.slice(1) : rest}`;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPrompt(prose: string, shape: PromptShape): string {
  if (isBaseFormatPrompt(prose)) return prose;
  const label = durationLabel(shape.frames);
  const anchor =
    shape.kind === "extension"
      ? "the person, the set, the props and the lighting already in frame at the start stay exactly as they are for the whole video and the action continues without interruption"
      : shape.images === 0
        ? "the person, the set, the props and the lighting established at the start stay as they are for the whole video"
        : "the person, the set, the props and the lighting in <Picture 1> stay as they are for the whole video";
  const shot = `${BASE_FORMAT_MARKER} [Shot 1] Live-action. The camera holds a perfectly static shot throughout the entire ${label}-second duration: no cut, no dissolve, no transition and no change of framing; ${anchor}. ${bodyOf(prose)}`;
  const instruction = shape.kind === "fresh" && shape.images === 1 ? I2VA_INSTRUCTION : shape.kind === "fresh" && shape.images >= 2 ? fl2vaInstruction(shape.frames) : undefined;
  return [...(instruction === undefined ? [] : [instruction]), shot, SOUNDSCAPE_FIELD, MUSIC_FIELD].join("\n\n");
}
