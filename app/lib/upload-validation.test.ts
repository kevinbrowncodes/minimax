import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateReferenceImages } from "./upload-validation";

const file = (type: string, size = 1000, name = "ref.png") => ({ name, type, size });

describe("validateReferenceImages", () => {
  it("accepts png, jpeg and webp, up to two", () => {
    expect(validateReferenceImages([])).toEqual({ ok: true });
    expect(validateReferenceImages([file("image/png")])).toEqual({ ok: true });
    expect(validateReferenceImages([file("image/jpeg"), file("image/webp")])).toEqual({ ok: true });
  });

  it("refuses a gif with the referenceImage field", () => {
    expect(validateReferenceImages([file("image/gif", 10, "x.gif")])).toMatchObject({ ok: false, field: "referenceImage", message: /x\.gif.*PNG, JPEG or WebP/ });
  });

  it("refuses a file one byte over 10 MB, and a third file", () => {
    expect(validateReferenceImages([file("image/png", MAX_IMAGE_BYTES)])).toEqual({ ok: true });
    expect(validateReferenceImages([file("image/png", MAX_IMAGE_BYTES + 1)])).toMatchObject({ ok: false, message: /10 MB/ });
    expect(validateReferenceImages([file("image/png"), file("image/png"), file("image/png")])).toMatchObject({ ok: false, message: /at most 2/ });
  });
});
