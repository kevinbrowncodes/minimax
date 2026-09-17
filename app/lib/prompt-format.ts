/**
 * The format check (STORY_049): does a director's reply look like the prompt the model on the Spark expects? The
 * vocabulary is the adapter's (spark/adapter/src/prompt.ts, by value — the packages are separate): the I2VA instruction
 * line, the description marker, the two sound fields, `[Shot 1]`. Every finding is plain English with the number it
 * measured; the route returns them beside the prompt and never withholds a reply that has at least one of the three
 * fields — STORY_050 warns on findings, STORY_051 blocks a straight-through send on them (the owner's rule, 2026-09-17).
 * A code fence around an otherwise clean prompt is stripped and reported, so the prompt stays usable. Pure.
 */
export const INSTRUCTION_STARTS = ["For the target video", "How the reference pictures align"] as const;
/** The I2VA instruction line, as the adapter writes it (spark/adapter/src/prompt.ts › I2VA_INSTRUCTION, by value). */
export const I2VA_INSTRUCTION = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.";
export const DESCRIPTION_MARKER = "integrated_multimodal_description:";
export const SOUNDSCAPE_MARKER = "overall_soundscape:";
export const MUSIC_MARKER = "non_diegetic_music:";
export const SHOT_LABEL = "[Shot 1]";
/** The skill asks for 400–600 (v1.1); the story's floor is 350 — a reply under it is flagged, never withheld. */
export const MIN_DESCRIPTION_WORDS = 350;
export const MAX_DESCRIPTION_WORDS = 600;

export type FindingCode =
  | "text-before-instruction"
  | "no-instruction-line"
  | "instruction-line-differs"
  | "instruction-line-on-extension"
  | "no-description"
  | "no-soundscape"
  | "no-music"
  | "description-line-breaks"
  | "description-too-short"
  | "description-too-long"
  | "timestamps"
  | "markdown"
  | "no-shot-label";

export interface Finding {
  readonly code: FindingCode;
  readonly message: string;
  /** 1-based, for a chain (STORY_053); absent for a single-clip prompt. */
  readonly segment?: number;
}
export interface FormatCheck {
  /** The prompt as the caller should use it: the reply with any fence stripped and trimmed. */
  readonly prompt: string;
  readonly findings: readonly Finding[];
  readonly segments: number;
  /** True when the text has at least one of the three fields — anything less is not a prompt at all. */
  readonly isPrompt: boolean;
}

const FENCE = /^\s*```[a-z]*\s*\n([\s\S]*?)\n\s*```\s*$/;
const BRACKET_TIME = /\[\d{1,2}:\d{2}/;
const CUT_PHRASE = /\b(?:at\s+)?\d{1,2}:\d{2}(?:\.\d+)?\s*,?\s*the camera cuts/i;
const HEADING_OR_FENCE = /(^|\n)\s*(#{1,6}\s|```)/;
const LABEL_LINE = /^\s*[A-Z][A-Za-z _-]{2,30}:\s/m;

export function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** The description field's text (between the marker and the soundscape marker, or to the end). */
export function descriptionOf(prompt: string): string | undefined {
  const start = prompt.indexOf(DESCRIPTION_MARKER);
  if (start === -1) return undefined;
  const body = prompt.slice(start + DESCRIPTION_MARKER.length);
  // the field ends at the next field, whichever is present
  const ends = [body.indexOf(SOUNDSCAPE_MARKER), body.indexOf(MUSIC_MARKER)].filter((i) => i !== -1);
  const end = ends.length === 0 ? -1 : Math.min(...ends);
  return (end === -1 ? body : body.slice(0, end)).trim();
}

/** The first sentence of the description after the style and camera sentences — the title rule (STORY_050) and the strip's rows (STORY_053). */
export function describedAction(prompt: string): string | undefined {
  const description = descriptionOf(prompt);
  if (description === undefined) return undefined;
  const text = description.replace(/^\[Shot \d+\]\s*/, "");
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s !== "");
  return sentences.find((s) => !/^(Live-action|The camera)/i.test(s)) ?? sentences[0];
}

function checkSingle(text: string, extension = false): Finding[] {
  const findings: Finding[] = [];
  const trimmed = text.trim();
  if (HEADING_OR_FENCE.test(trimmed)) findings.push({ code: "markdown", message: "the reply contains markdown (a heading or a code fence) that the model would read as text" });
  const instructionAt = INSTRUCTION_STARTS.map((s) => trimmed.indexOf(s)).filter((i) => i !== -1).sort((a, b) => a - b)[0];
  const markerAt = trimmed.indexOf(DESCRIPTION_MARKER);
  if (extension) {
    if (instructionAt !== undefined || trimmed.includes("<Picture")) findings.push({ code: "instruction-line-on-extension", message: "an extension segment carries an instruction line or a <Picture> reference — an extension has no picture" });
    if (markerAt > 0 && instructionAt === undefined) findings.push({ code: "text-before-instruction", message: `${String(wordCount(trimmed.slice(0, markerAt)))} words come before integrated_multimodal_description: — an extension segment starts at the marker` });
  } else if (instructionAt === undefined) {
    findings.push({ code: "no-instruction-line", message: 'the instruction line is missing — a single-clip prompt starts "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced."' });
  } else if (instructionAt > 0) {
    findings.push({ code: "text-before-instruction", message: `${String(wordCount(trimmed.slice(0, instructionAt)))} words come before the instruction line — the model would read them as part of the prompt` });
  } else if (trimmed.startsWith(INSTRUCTION_STARTS[0]) && (trimmed.split(/\r?\n/)[0] ?? "").trim() !== I2VA_INSTRUCTION) {
    // STORY_053: the adapter sends a base-format prompt unchanged, so a line the model mis-typed reaches MiniMax as it is
    findings.push({ code: "instruction-line-differs", message: `the instruction line is not the model's, word for word — it must read "${I2VA_INSTRUCTION}"` });
  }
  const description = descriptionOf(trimmed);
  if (description === undefined) {
    findings.push({ code: "no-description", message: "no integrated_multimodal_description: field" });
  } else {
    if (!description.startsWith(SHOT_LABEL)) findings.push({ code: "no-shot-label", message: `the description does not open with ${SHOT_LABEL}` });
    if (/\n\s*\n/.test(description) || LABEL_LINE.test(description.replace(/^\[Shot \d+\]/, ""))) findings.push({ code: "description-line-breaks", message: "the description is not one paragraph — it has a blank line or a labelled line inside it" });
    const words = wordCount(description.replace(/^\[Shot \d+\]\s*/, ""));
    if (words < MIN_DESCRIPTION_WORDS) findings.push({ code: "description-too-short", message: `the description is ${String(words)} words; the skill asks for ${String(MIN_DESCRIPTION_WORDS)}–${String(MAX_DESCRIPTION_WORDS)}` });
    if (words > MAX_DESCRIPTION_WORDS) findings.push({ code: "description-too-long", message: `the description is ${String(words)} words; the skill asks for ${String(MIN_DESCRIPTION_WORDS)}–${String(MAX_DESCRIPTION_WORDS)}` });
    if (BRACKET_TIME.test(description) || CUT_PHRASE.test(description)) findings.push({ code: "timestamps", message: "the description has a timestamp — in MiniMax's format a timestamp is a cut" });
  }
  if (!trimmed.includes(SOUNDSCAPE_MARKER)) findings.push({ code: "no-soundscape", message: "no overall_soundscape: field" });
  if (!trimmed.includes(MUSIC_MARKER)) findings.push({ code: "no-music", message: "no non_diegetic_music: field" });
  return findings;
}

/**
 * A chain reply's segments: the text splits before every description marker and every instruction line; a chunk that is
 * only an instruction line joins the segment after it — so segment 1 keeps its line, and a line wrongly written before
 * a later segment lands on that segment, where the extension rule can name it (STORY_053's rule).
 */
export function splitSegments(text: string): string[] {
  const chunks = text.trim().split(/\n(?=integrated_multimodal_description:|For the target video|How the reference pictures align)/).map((p) => p.trim()).filter((p) => p !== "");
  const segments: string[] = [];
  let pending: string | undefined;
  for (const chunk of chunks) {
    if (!chunk.includes(DESCRIPTION_MARKER)) {
      pending = pending === undefined ? chunk : `${pending}\n\n${chunk}`;
      continue;
    }
    segments.push(pending === undefined ? chunk : `${pending}\n\n${chunk}`);
    pending = undefined;
  }
  if (pending !== undefined) segments.push(pending);
  return segments;
}

export function checkPromptFormat(text: string, { chain = false }: { readonly chain?: boolean } = {}): FormatCheck {
  const fenced = FENCE.exec(text);
  const findings: Finding[] = [];
  let prompt = text.trim();
  if (fenced?.[1] !== undefined) {
    prompt = fenced[1].trim();
    findings.push({ code: "markdown", message: "the reply was wrapped in a code fence — removed" });
  }
  const isPrompt = [INSTRUCTION_STARTS[0], INSTRUCTION_STARTS[1], DESCRIPTION_MARKER, SOUNDSCAPE_MARKER, MUSIC_MARKER].some((m) => prompt.includes(m));
  const segments = chain ? splitSegments(prompt) : [prompt];
  if (chain && segments.length >= 2) {
    segments.forEach((segment, i) => {
      for (const f of checkSingle(segment, i > 0)) findings.push({ ...f, message: `Segment ${String(i + 1)}: ${f.message}`, segment: i + 1 });
    });
  } else {
    findings.push(...checkSingle(prompt));
  }
  return { prompt, findings, segments: segments.length, isPrompt };
}
