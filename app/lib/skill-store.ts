/** The owner's skills (STORY_040): `skills.json` beside the history file (/data in the container), written atomically. Server-side only. */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore } from "./history-store";
import { BUILT_IN_SKILLS, type Skill } from "./skills";

export { BUILT_IN_SKILLS, applySkill, type Skill } from "./skills";

export function skillsFile(): string {
  return path.join(path.dirname(historyStore().file), "skills.json");
}

function readCustom(): Skill[] {
  let text: string;
  try {
    text = readFileSync(skillsFile(), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as Skill[]).filter((s) => typeof s.id === "string" && typeof s.name === "string" && typeof s.template === "string") : [];
  } catch {
    return [];
  }
}

function writeCustom(skills: readonly Skill[]): void {
  const file = skillsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(skills, null, 2));
  renameSync(tmp, file);
}

/** The built-in first, then the owner's in creation order. */
export function listSkills(): readonly Skill[] {
  return [...BUILT_IN_SKILLS, ...readCustom()];
}

export function getSkill(id: string): Skill | undefined {
  return listSkills().find((s) => s.id === id);
}

export function createSkill(input: { readonly name: string; readonly description: string; readonly template: string }): Skill {
  const skill: Skill = { id: randomUUID(), name: input.name.trim(), description: input.description.trim(), template: input.template };
  writeCustom([...readCustom(), skill]);
  return skill;
}

export class BuiltInSkillError extends Error {}

export function updateSkill(id: string, patch: Partial<Pick<Skill, "name" | "description" | "template">>): Skill | undefined {
  if (BUILT_IN_SKILLS.some((s) => s.id === id)) throw new BuiltInSkillError(`${id} is built in`);
  const skills = readCustom();
  const index = skills.findIndex((s) => s.id === id);
  const current = skills[index];
  if (index === -1 || !current) return undefined;
  const next: Skill = { ...current, ...patch, name: (patch.name ?? current.name).trim(), description: (patch.description ?? current.description).trim() };
  skills[index] = next;
  writeCustom(skills);
  return next;
}

export function removeSkill(id: string): boolean {
  if (BUILT_IN_SKILLS.some((s) => s.id === id)) throw new BuiltInSkillError(`${id} is built in`);
  const skills = readCustom();
  const next = skills.filter((s) => s.id !== id);
  if (next.length === skills.length) return false;
  writeCustom(next);
  return true;
}
