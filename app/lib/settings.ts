/** The server-wide settings' shape and parser (STORY_034, STORY_040) — pure, so the client can import it; the store is server-side. */
export interface Settings {
  /** On: downloads are the clean file. Off: `GET /api/jobs/:id/result?download` carries the "AI-generated" mark. */
  readonly removeWatermark: boolean;
  /** STORY_040: the video-creator plugin's switch — off makes a text-only workstation (no Video generation chip, no video controls). */
  readonly videoEnabled: boolean;
  /** STORY_050: the director skill the Agent chip follows (a folder id); undefined = the first skill listed. */
  readonly agentSkill?: string;
  /** STORY_051: Confirm before generating — "always" (the reply comes back for review) or "never" (straight to a job). */
  readonly agentConfirm: AgentConfirm;
}
export const AGENT_CONFIRM = ["always", "never"] as const;
export type AgentConfirm = (typeof AGENT_CONFIRM)[number];
export const DEFAULT_SETTINGS: Settings = { removeWatermark: true, videoEnabled: true, agentConfirm: "always" };
export const SETTING_KEYS = ["removeWatermark", "videoEnabled", "agentSkill", "agentConfirm"] as const satisfies readonly (keyof Settings)[];
/** What each setting accepts (STORY_050): a type, or the list of allowed values; the PATCH route refuses anything else. */
export const SETTING_TYPES: Readonly<Record<(typeof SETTING_KEYS)[number], "boolean" | "string" | readonly string[]>> = { removeWatermark: "boolean", videoEnabled: "boolean", agentSkill: "string", agentConfirm: AGENT_CONFIRM };

/** A stored value is merged over the defaults field by field; garbage yields the defaults. */
export function parseSettings(raw: string | undefined): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    const bool = (key: "removeWatermark" | "videoEnabled"): boolean => (typeof v[key] === "boolean" ? v[key] : DEFAULT_SETTINGS[key]);
    const agentSkill = typeof v["agentSkill"] === "string" && v["agentSkill"].trim() !== "" ? v["agentSkill"] : undefined;
    const agentConfirm = (AGENT_CONFIRM as readonly unknown[]).includes(v["agentConfirm"]) ? (v["agentConfirm"] as AgentConfirm) : DEFAULT_SETTINGS.agentConfirm;
    return { removeWatermark: bool("removeWatermark"), videoEnabled: bool("videoEnabled"), agentConfirm, ...(agentSkill === undefined ? {} : { agentSkill }) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
