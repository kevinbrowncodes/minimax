/** The server-wide settings' shape and parser (STORY_034, STORY_040) — pure, so the client can import it; the store is server-side. */
export interface Settings {
  /** On: downloads are the clean file. Off: `GET /api/jobs/:id/result?download` carries the "AI-generated" mark. */
  readonly removeWatermark: boolean;
  /** STORY_050: the director skill the Agent chip follows (a folder id); undefined = the first skill listed. */
  readonly agentSkill?: string;
  /** STORY_051: Confirm before generating — "always" (the reply comes back for review) or "never" (straight to a job). */
  readonly agentConfirm: AgentConfirm;
  /** STORY_055: draws per prompt — one single-clip Send becomes this many jobs with the adapter's own seeds, one after another. */
  readonly agentDraws: AgentDraws;
}
export const AGENT_CONFIRM = ["always", "never"] as const;
export type AgentConfirm = (typeof AGENT_CONFIRM)[number];
export const AGENT_DRAWS = [1, 2, 3, 4] as const;
export type AgentDraws = (typeof AGENT_DRAWS)[number];
export const DEFAULT_SETTINGS: Settings = { removeWatermark: true, agentConfirm: "always", agentDraws: 1 };
// STORY_059 retired STORY_040's videoEnabled: the app is video; an old settings.json still carrying the key is read without it
export const SETTING_KEYS = ["removeWatermark", "agentSkill", "agentConfirm", "agentDraws"] as const satisfies readonly (keyof Settings)[];
/** What each setting accepts (STORY_050): a type, or the list of allowed values (strings, or STORY_055's numbers); the PATCH route refuses anything else. */
export const SETTING_TYPES: Readonly<Record<(typeof SETTING_KEYS)[number], "boolean" | "string" | readonly string[] | readonly number[]>> = { removeWatermark: "boolean", agentSkill: "string", agentConfirm: AGENT_CONFIRM, agentDraws: AGENT_DRAWS };
export function isAgentDraws(value: unknown): value is AgentDraws {
  return (AGENT_DRAWS as readonly unknown[]).includes(value);
}

/** A stored value is merged over the defaults field by field; garbage yields the defaults. */
export function parseSettings(raw: string | undefined): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    const bool = (key: "removeWatermark"): boolean => (typeof v[key] === "boolean" ? v[key] : DEFAULT_SETTINGS[key]);
    const agentSkill = typeof v["agentSkill"] === "string" && v["agentSkill"].trim() !== "" ? v["agentSkill"] : undefined;
    const agentConfirm = (AGENT_CONFIRM as readonly unknown[]).includes(v["agentConfirm"]) ? (v["agentConfirm"] as AgentConfirm) : DEFAULT_SETTINGS.agentConfirm;
    const agentDraws = isAgentDraws(v["agentDraws"]) ? v["agentDraws"] : DEFAULT_SETTINGS.agentDraws;
    return { removeWatermark: bool("removeWatermark"), agentConfirm, agentDraws, ...(agentSkill === undefined ? {} : { agentSkill }) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
