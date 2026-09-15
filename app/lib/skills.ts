/**
 * Skills (STORY_040): prompt recipes — text templates with a `{{idea}}` slot — that + › Skills and Management › Skills
 * drop into the composer. Pure; the store is server-side. One built-in, Short-to-script, whose template is the base
 * prompt scaffold STORY_020 documents (docs/references/prompt-guides, the model card's own example).
 */
export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly template: string;
  readonly builtIn?: boolean;
}

export const IDEA_SLOT = "{{idea}}";

export const BUILT_IN_SKILLS: readonly Skill[] = [
  {
    id: "short-to-script",
    name: "Short-to-script",
    description: "Expands a one-line idea into the base prompt format the model expects (STORY_020): one held shot, the scene in your words, the soundscape and music fields.",
    template: `integrated_multimodal_description: [Shot 1] Live-action. The camera holds a perfectly static shot throughout the entire duration: ${IDEA_SLOT}

overall_soundscape: The ambience the description above specifies, and no other sound.

non_diegetic_music: None, unless the description above asks for music.`,
    builtIn: true,
  },
];

/** The template with the idea in its slot; an empty idea leaves the slot for the owner to fill. */
export function applySkill(template: string, idea: string): string {
  const text = idea.trim();
  return text === "" ? template : template.split(IDEA_SLOT).join(text);
}

export function isValidSkillInput(input: { readonly name?: unknown; readonly description?: unknown; readonly template?: unknown }): input is { name: string; description: string; template: string } {
  return typeof input.name === "string" && input.name.trim() !== "" && typeof input.description === "string" && typeof input.template === "string" && input.template.trim() !== "";
}

export function searchSkills(skills: readonly Skill[], query: string): readonly Skill[] {
  const q = query.trim().toLowerCase();
  return q === "" ? skills : skills.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
}
