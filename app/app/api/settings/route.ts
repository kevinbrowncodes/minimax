import { errorResponse, guarded } from "@/lib/model-client";
import { SETTING_KEYS, SETTING_TYPES, type Settings } from "@/lib/settings";
import { readSettings, writeSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

/** GET /api/settings — the server-wide settings (STORY_034). */
export function GET(): Promise<Response> {
  return guarded(() => Promise.resolve(Response.json(readSettings())));
}

/** PATCH /api/settings { removeWatermark?, videoEnabled?, agentSkill? } — Settings › General's switch (STORY_034), the video-creator plugin's switch (STORY_040), the Agent chip's skill (STORY_050). */
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
    const patch: { -readonly [K in keyof Settings]?: Settings[K] } = {};
    for (const [key, value] of entries) {
      if (!(SETTING_KEYS as readonly string[]).includes(key)) return errorResponse({ status: 400, code: "validation", message: `${key} is not a setting`, field: key });
      const wanted = SETTING_TYPES[key as keyof typeof SETTING_TYPES];
      if (typeof value !== wanted) return errorResponse({ status: 400, code: "validation", message: `${key} must be a ${wanted}`, field: key });
      if (key === "agentSkill" && typeof value === "string") patch.agentSkill = value;
      else if ((key === "removeWatermark" || key === "videoEnabled") && typeof value === "boolean") patch[key] = value;
    }
    return Response.json(writeSettings(patch));
  });
}
