/** The server-wide settings' shape and parser (STORY_034, STORY_040) — pure, so the client can import it; the store is server-side. */
export interface Settings {
  /** On: downloads are the clean file. Off: `GET /api/jobs/:id/result?download` carries the "AI-generated" mark. */
  readonly removeWatermark: boolean;
  /** STORY_040: the video-creator plugin's switch — off makes a text-only workstation (no Video generation chip, no video controls). */
  readonly videoEnabled: boolean;
  /** STORY_050: the director skill the Agent chip follows (a folder id); undefined = the first skill listed. */
  readonly agentSkill?: string;
}
export const DEFAULT_SETTINGS: Settings = { removeWatermark: true, videoEnabled: true };
export const SETTING_KEYS = ["removeWatermark", "videoEnabled", "agentSkill"] as const satisfies readonly (keyof Settings)[];
/** What each setting accepts (STORY_050): the PATCH route refuses anything else. */
export const SETTING_TYPES: Readonly<Record<(typeof SETTING_KEYS)[number], "boolean" | "string">> = { removeWatermark: "boolean", videoEnabled: "boolean", agentSkill: "string" };

/** A stored value is merged over the defaults field by field; garbage yields the defaults. */
export function parseSettings(raw: string | undefined): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    const bool = (key: "removeWatermark" | "videoEnabled"): boolean => (typeof v[key] === "boolean" ? v[key] : DEFAULT_SETTINGS[key]);
    const agentSkill = typeof v["agentSkill"] === "string" && v["agentSkill"].trim() !== "" ? v["agentSkill"] : undefined;
    return { removeWatermark: bool("removeWatermark"), videoEnabled: bool("videoEnabled"), ...(agentSkill === undefined ? {} : { agentSkill }) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
