/**
 * What the director is sent (STORY_048): a skill folder in the Agent Skills layout (SKILL.md with frontmatter +
 * references/*.md, CHORE_012) read from disk, and the request assembled from it in one fixed order so that the spike,
 * STORY_049's route and STORY_052's instructions agree on what the model sees:
 *
 *   system instruction  = SKILL.md's body (the frontmatter stripped)
 *   parts, in order     = each reference as a text part headed by its file name
 *                         → each active instruction (STORY_052): its reference image, then "Instruction — <title>:" + text
 *                         → "The attached photo — the first frame:" + the image
 *                         → the notes, or "No notes."
 *
 * Pure apart from readSkill's file reads. The frontmatter parser is deliberately small — the three string keys and the
 * one nested map (metadata) the skills use — and is tested against the committed skill, not a YAML spec.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { safetySettingsAt, type GenerationConfig, type Part, type SafetySetting } from "./vertex";

export interface SkillFolder {
  /** The folder name. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly metadata: Readonly<Record<string, string>>;
  /** SKILL.md without its frontmatter, trimmed. */
  readonly body: string;
  readonly references: readonly { readonly file: string; readonly text: string }[];
}

export class SkillError extends Error {
  override readonly name = "SkillError";
}

function unquote(value: string): string {
  const v = value.trim();
  return (v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2) ? v.slice(1, -1) : v;
}

/** `---\nkey: value\nmap:\n  k: v\n---\nbody` → the top-level strings, the nested maps, and the body. */
export function parseFrontmatter(text: string): { readonly data: Readonly<Record<string, string | Readonly<Record<string, string>>>>; readonly body: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new SkillError("SKILL.md does not start with frontmatter");
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new SkillError("SKILL.md's frontmatter is not closed");
  const block = normalized.slice(4, end);
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  const data: Record<string, string | Record<string, string>> = {};
  let current: string | undefined;
  for (const line of block.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const nested = /^\s+([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    const top = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (top) {
      const [, key, value] = top;
      if (key === undefined) continue;
      if (value === undefined || value.trim() === "") {
        data[key] = {};
        current = key;
      } else {
        data[key] = unquote(value);
        current = undefined;
      }
    } else if (nested && current !== undefined) {
      const [, key, value] = nested;
      const map = data[current];
      if (key !== undefined && typeof map === "object") map[key] = unquote(value ?? "");
    } else {
      throw new SkillError(`SKILL.md's frontmatter has a line the parser does not read: "${line.trim().slice(0, 40)}"`);
    }
  }
  return { data, body: body.trim() };
}

/** The folder at `dir` as a skill; throws SkillError naming what is wrong, never silently half-reads it. */
export function readSkill(dir: string): SkillFolder {
  const file = path.join(dir, "SKILL.md");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new SkillError(`${path.basename(dir)} has no SKILL.md`);
  }
  const { data, body } = parseFrontmatter(text);
  const name = data["name"];
  const description = data["description"];
  if (typeof name !== "string" || name === "") throw new SkillError(`${path.basename(dir)}/SKILL.md has no name`);
  if (typeof description !== "string" || description === "") throw new SkillError(`${path.basename(dir)}/SKILL.md has no description`);
  const metadataRaw = data["metadata"];
  const metadata: Record<string, string> = typeof metadataRaw === "object" ? { ...metadataRaw } : {};
  const refDir = path.join(dir, "references");
  let files: string[] = [];
  try {
    files = readdirSync(refDir).filter((f) => f.endsWith(".md") && statSync(path.join(refDir, f)).isFile()).sort();
  } catch {
    files = [];
  }
  const references = files.map((f) => ({ file: `references/${f}`, text: readFileSync(path.join(refDir, f), "utf8").trim() }));
  return { id: path.basename(dir), name, description, metadata, body, references };
}

/** Every folder under `root` that reads as a skill, by id; folders that fail are reported, not thrown. */
export function readSkills(root: string): { readonly skills: readonly SkillFolder[]; readonly failed: readonly { readonly id: string; readonly message: string }[] } {
  let entries: string[] = [];
  try {
    entries = readdirSync(root).filter((f) => statSync(path.join(root, f)).isDirectory()).sort();
  } catch {
    return { skills: [], failed: [] };
  }
  const skills: SkillFolder[] = [];
  const failed: { id: string; message: string }[] = [];
  for (const id of entries) {
    try {
      skills.push(readSkill(path.join(root, id)));
    } catch (error) {
      failed.push({ id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { skills, failed };
}

export interface ImageInput {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}
/** STORY_052's instruction as the request takes it: a title, a guideline, an optional reference image. */
export interface InstructionInput {
  readonly title: string;
  readonly text: string;
  readonly image?: ImageInput;
}
export interface AssembledRequest {
  readonly systemInstruction: string;
  readonly parts: readonly Part[];
}

function imagePart(image: ImageInput): Part {
  return { inlineData: { mimeType: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } };
}

/** The request in the fixed order the module header states. */
export function assembleRequest(skill: SkillFolder, image: ImageInput, notes: string, instructions: readonly InstructionInput[] = []): AssembledRequest {
  const parts: Part[] = [];
  for (const ref of skill.references) parts.push({ text: `${ref.file}:\n\n${ref.text}` });
  for (const instruction of instructions) {
    if (instruction.image) {
      parts.push({ text: `Reference image for the instruction "${instruction.title}":` });
      parts.push(imagePart(instruction.image));
    }
    parts.push({ text: `Instruction — ${instruction.title}:\n${instruction.text}` });
  }
  parts.push({ text: "The attached photo — the first frame:" });
  parts.push(imagePart(image));
  const trimmed = notes.trim();
  parts.push({ text: trimmed === "" ? "No notes." : `Notes: ${trimmed}` });
  return { systemInstruction: skill.body, parts };
}

/**
 * The second pass (STORY_048): Gemini 3.8 Flash writes ≈ 250-word descriptions however the length is asked for, but
 * expands its own draft when told to — so the route sends the draft back with this turn. Every fact of the draft is
 * kept; only detail is added; the output is the whole prompt again in the same format.
 */
export function expandInstruction(minWords: number, maxWords: number): string {
  return `Revise your prompt: keep line 1 and every fact, name, colour, object and beat of what you wrote, and expand the integrated_multimodal_description to ${String(minWords)}–${String(maxWords)} words — first the scene anchor to 150–250 words (every object with colour, material and position; the light's source, direction and quality; the framing; each clothing item and piece of jewelry with the hand or wrist it is on; what the action reveals outside the frame), then each of the three beats with concrete physical detail (which hand, which foot, what the weight, the fabric and the face do), naming the subject by appearance in every beat (the man in the …, never a bare he), then the hold. Keep it one paragraph with no labels, line breaks or timestamps; keep the two sound fields. Output only the full prompt, nothing else.`;
}

/**
 * What the spike settled (STORY_048, 2026-09-17, gemini-3.8-flash): OFF on the five text harm categories is accepted
 * without an allowlist and none of the three photos was refused at either setting; thinking adds cost (≈ 6k tokens on
 * the second pass) and nothing to the length, so LOW; the output cap must leave room for thinking or a complete reply
 * comes back as MAX_TOKENS; the description is written in two passes because the model writes ≈ 250 words otherwise.
 */
export const DIRECTOR_SAFETY_SETTINGS: readonly SafetySetting[] = safetySettingsAt("OFF");
export const DIRECTOR_GENERATION_CONFIG: GenerationConfig = { maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } };
export const DIRECTOR_EXPAND_WORDS = { min: 450, max: 600 } as const;
