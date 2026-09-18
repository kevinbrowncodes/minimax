/**
 * STORY_054: what Management › Skills shows for a director skill folder — the meta line from the skill's metadata
 * (model · checkpoint · ComfyUI · adapter · verified), a missing key skipped — and the search across the director
 * rows (name, short name, description). Pure; the folders come from GET /api/agent/skills (STORY_049).
 */
import type { AgentSkill } from "./composer-state";

const META_LINE: readonly { readonly key: string; readonly label?: string }[] = [
  { key: "minimax-model" },
  { key: "minimax-checkpoint" },
  { key: "minimax-comfyui", label: "ComfyUI" },
  { key: "minimax-adapter", label: "adapter" },
  { key: "minimax-verified-on", label: "verified" },
];

/** "MiniMax-H3 (open weights, Comfy-Org quantized) · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.5.0 · verified 2026-09-16"; "" with no keys. */
export function skillMetaLine(metadata: Readonly<Record<string, string>>): string {
  return META_LINE.flatMap(({ key, label }) => {
    const value = metadata[key]?.trim();
    if (value === undefined || value === "") return [];
    return [label === undefined ? value : `${label} ${value}`];
  }).join(" · ");
}

/** The director rows that match a query on the short name, the folder name or the description; all of them for an empty query. */
export function searchDirectors(skills: readonly AgentSkill[], query: string): readonly AgentSkill[] {
  const q = query.trim().toLowerCase();
  if (q === "") return skills;
  return skills.filter((s) => [s.metadata["minimax-short-name"] ?? "", s.name, s.description].some((text) => text.toLowerCase().includes(q)));
}
