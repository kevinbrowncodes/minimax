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

describe("extensions (STORY_017)", () => {
  it("parses continueFrom, overlapFrames and seed, defaulting the overlap and ignoring it outside an extension", () => {
    const ext = validateRequest({ ...valid, continueFrom: "abc", durationSeconds: 10 }, []);
    expect(ext).toMatchObject({ continueFrom: "abc", durationSeconds: 10, overlapFrames: 39 });
    expect(ext).not.toHaveProperty("seed");
    const strings = validateRequest({ ...valid, continueFrom: " abc ", durationSeconds: "10", overlapFrames: "56", seed: "42" }, []);
    expect(strings).toMatchObject({ continueFrom: "abc", overlapFrames: 56, seed: 42 });
    const plain = validateRequest({ ...valid, overlapFrames: 22, seed: 7, continueFrom: "" }, []);
    expect(plain).not.toHaveProperty("continueFrom");
    expect(plain).not.toHaveProperty("overlapFrames");
    expect(plain.seed).toBe(7);
    // the most a step can add depends on the overlap (the model's 362-frame ceiling)
    expect(validateRequest({ ...valid, continueFrom: "abc", durationSeconds: 14, overlapFrames: 22 }, []).durationSeconds).toBe(14);
    expect(validateRequest({ ...valid, continueFrom: "abc", durationSeconds: 13, overlapFrames: 39 }, []).durationSeconds).toBe(13);
  });

  it("refuses the extension range, a bad overlap, the old contextSeconds, a bad seed, a non-string continueFrom and a reference image", () => {
    const cases: [Record<string, unknown>, string, string][] = [
      [{ ...valid, continueFrom: "abc", durationSeconds: 15 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, continueFrom: "abc", durationSeconds: 3 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, continueFrom: "abc", durationSeconds: 14, overlapFrames: 39 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, continueFrom: "abc", durationSeconds: 13, overlapFrames: 56 }, "unsupported_option", "durationSeconds"],
      [{ ...valid, continueFrom: "abc", overlapFrames: 30 }, "unsupported_option", "overlapFrames"],
      [{ ...valid, continueFrom: "abc", overlapFrames: 2.5 }, "unsupported_option", "overlapFrames"],
      [{ ...valid, continueFrom: "abc", contextSeconds: 5 }, "validation", "contextSeconds"],
      [{ ...valid, continueFrom: 12 }, "validation", "continueFrom"],
      [{ ...valid, seed: -1 }, "validation", "seed"],
      [{ ...valid, seed: "x" }, "validation", "seed"],
      [{ ...valid, seed: 1.5 }, "validation", "seed"],
    ];
    for (const [fields, code, field] of cases) {
      let caught: unknown;
      try {
        validateRequest(fields, []);
      } catch (error) {
        caught = error;
      }
      expect(caught, JSON.stringify(fields)).toMatchObject({ status: 400, code, field });
    }
    expect(() => validateRequest({ ...valid, continueFrom: "abc", durationSeconds: 14, overlapFrames: 39 }, [])).toThrow(/the most that can be added is 13 s/);
    expect(() => validateRequest({ ...valid, continueFrom: "abc", contextSeconds: 5 }, [])).toThrow(/overlapFrames/);
    expect(() => validateRequest({ ...valid, continueFrom: "abc" }, [{ field: "referenceImage", contentType: "image/png", size: 1 }])).toThrow(/takes no reference images/);
  });

  it("publishes the extension capabilities", () => {
    expect(CAPABILITIES.extension).toEqual({ durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 });
  });
});
