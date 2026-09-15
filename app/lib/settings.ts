/** The server-wide settings' shape and parser (STORY_034) — pure, so the client can import it; the store is server-side. */
export interface Settings {
  /** On: downloads are the clean file. Off: `GET /api/jobs/:id/result?download` carries the "AI-generated" mark. */
  readonly removeWatermark: boolean;
}
export const DEFAULT_SETTINGS: Settings = { removeWatermark: true };

/** A stored value is merged over the defaults field by field; garbage yields the defaults. */
export function parseSettings(raw: string | undefined): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    return { removeWatermark: typeof v["removeWatermark"] === "boolean" ? v["removeWatermark"] : DEFAULT_SETTINGS.removeWatermark };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
