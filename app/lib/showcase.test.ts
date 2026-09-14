import { describe, expect, it } from "vitest";
import { REFERENCE_RATIOS, REFERENCE_RESOLUTIONS } from "./composer-state";
import { MODE_CARDS, VIDEO_SCENES } from "./showcase";

describe("showcase (STORY_022)", () => {
  it("has four video scenes with parameters the composer accepts and distinct ids", () => {
    expect(VIDEO_SCENES).toHaveLength(4);
    expect(new Set(VIDEO_SCENES.map((s) => s.id)).size).toBe(4);
    for (const scene of VIDEO_SCENES) {
      expect(REFERENCE_RATIOS).toContain(scene.ratio);
      expect(REFERENCE_RESOLUTIONS).toContain(scene.resolution);
      expect(scene.durationSeconds).toBeGreaterThanOrEqual(4);
      expect(scene.durationSeconds).toBeLessThanOrEqual(15);
      expect(scene.prompt.length).toBeGreaterThan(20);
    }
  });
  it("has four cards for each of the other modes", () => {
    for (const mode of ["document", "website", "image"] as const) {
      expect(MODE_CARDS[mode]).toHaveLength(4);
      expect(new Set(MODE_CARDS[mode].map((c) => c.id)).size).toBe(4);
    }
  });
});
