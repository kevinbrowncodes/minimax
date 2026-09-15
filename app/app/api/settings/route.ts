import { errorResponse, guarded } from "@/lib/model-client";
import { SETTING_KEYS, type Settings } from "@/lib/settings";
import { readSettings, writeSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

/** GET /api/settings — the server-wide settings (STORY_034). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json(readSettings())));
}

/** PATCH /api/settings { removeWatermark?, videoEnabled? } — Settings › General's switch (STORY_034), the video-creator plugin's switch (STORY_040). */
export function PATCH(request: Request): Promise<Response> {
  return guarded(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse({ status: 400, code: "validation", message: "send a JSON object" });
    }
    if (typeof body !== "object" || body === null) return errorResponse({ status: 400, code: "validation", message: "send a JSON object" });
    const entries = Object.entries(body);
    if (entries.length === 0) return errorResponse({ status: 400, code: "validation", message: "nothing to change" });
    const patch: Partial<Record<keyof Settings, boolean>> = {};
    for (const [key, value] of entries) {
      if (!(SETTING_KEYS as readonly string[]).includes(key)) return errorResponse({ status: 400, code: "validation", message: `${key} is not a setting`, field: key });
      if (typeof value !== "boolean") return errorResponse({ status: 400, code: "validation", message: `${key} must be a boolean`, field: key });
      patch[key as keyof Settings] = value;
    }
    return Response.json(writeSettings(patch));
  });
}
