import { describe, expect, it } from "vitest";
import { CAPABILITIES, ValidationError, validateRequest } from "./capabilities.ts";

const valid = { prompt: " A boat ", ratio: "16:9", resolution: "768P", durationSeconds: 5 };

describe("validateRequest", () => {
  it("accepts a valid request, trims the prompt, defaults the model and counts uploads", () => {
    expect(validateRequest(valid, [])).toEqual({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", referenceImages: 0 });
    expect(validateRequest({ ...valid, durationSeconds: "15", model: "" }, [{ field: "referenceImage", contentType: "image/webp", size: 1 }]).referenceImages).toBe(1);
  });

  it("rejects each field with the contract's code and field", () => {
    const cases: [Record<string, unknown>, string, string][] = [
      [{ ...valid, prompt: " " }, "validation", "prompt"],
      [{ ...valid, prompt: "x".repeat(2001) }, "validation", "prompt"],
      [{ ...valid, ratio: "2:1" }, "unsupported_option", "ratio"],
      [{ ...valid, ratio: 169 }, "validation", "ratio"],
      [{ ...valid, resolution: "2K" }, "unsupported_option", "resolution"],
      [{ ...valid, durationSeconds: 3 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, durationSeconds: 16 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, durationSeconds: 4.5 }, "validation", "durationSeconds"],
      [{ ...valid, model: "hailuo-2.3" }, "unsupported_option", "model"],
    ];
    for (const [fields, code, field] of cases) {
      let caught: unknown;
      try {
        validateRequest(fields, []);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect(caught).toMatchObject({ status: 400, code, field });
    }
  });

  it("rejects a third image, a gif and a stray file field", () => {
    const png = { field: "referenceImage", contentType: "image/png", size: 1 };
    expect(() => validateRequest(valid, [png, png, png])).toThrow(/at most 2/);
    expect(() => validateRequest(valid, [{ ...png, contentType: "image/gif" }])).toThrow(/png, jpeg or webp/);
    expect(() => validateRequest(valid, [{ ...png, field: "other" }])).toThrow(/unexpected file field/);
  });

  it("publishes the Spark's capabilities", () => {
    expect(CAPABILITIES.resolutions).toEqual(["768P"]);
    expect(CAPABILITIES.models.map((m) => m.id)).toEqual(["minimax-h3"]);
  });
});
