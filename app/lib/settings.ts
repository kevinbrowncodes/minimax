/** The server-wide settings' shape and parser (STORY_034, STORY_040) — pure, so the client can import it; the store is server-side. */
export interface Settings {
  /** On: downloads are the clean file. Off: `GET /api/jobs/:id/result?download` carries the "AI-generated" mark. */
  readonly removeWatermark: boolean;
  /** STORY_040: the video-creator plugin's switch — off makes a text-only workstation (no Video generation chip, no video controls). */
  readonly videoEnabled: boolean;
}
export const DEFAULT_SETTINGS: Settings = { removeWatermark: true, videoEnabled: true };
export const SETTING_KEYS = ["removeWatermark", "videoEnabled"] as const satisfies readonly (keyof Settings)[];

/** A stored value is merged over the defaults field by field; garbage yields the defaults. */
export function parseSettings(raw: string | undefined): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    const bool = (key: keyof Settings): boolean => (typeof v[key] === "boolean" ? v[key] : DEFAULT_SETTINGS[key]);
    return { removeWatermark: bool("removeWatermark"), videoEnabled: bool("videoEnabled") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
