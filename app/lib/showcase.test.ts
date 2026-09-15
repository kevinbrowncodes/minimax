import { describe, expect, it } from "vitest";
import { VIDEO_SCENES } from "./showcase";

// The ratios and resolution the Spark's adapter and the stub report (STORY_026: the composer lists what capabilities say).
const SPARK_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

describe("showcase (STORY_022, STORY_026: video scenes only)", () => {
  it("has four video scenes with parameters the Spark accepts and distinct ids", () => {
    expect(VIDEO_SCENES).toHaveLength(4);
    expect(new Set(VIDEO_SCENES.map((s) => s.id)).size).toBe(4);
    for (const scene of VIDEO_SCENES) {
      expect(SPARK_RATIOS).toContain(scene.ratio);
      expect(scene.resolution).toBe("768P");
      expect(scene.durationSeconds).toBeGreaterThanOrEqual(4);
      expect(scene.durationSeconds).toBeLessThanOrEqual(15);
      expect(scene.prompt.length).toBeGreaterThan(20);
    }
  });
});
