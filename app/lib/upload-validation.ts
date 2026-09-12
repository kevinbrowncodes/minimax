/** Reference-image rules (STORY_009): png/jpeg/webp, at most 10 MB each, at most 2 per job (FL2VA first/last frame). */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES = 2;

export interface UploadLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}
export type UploadValidation = { readonly ok: true } | { readonly ok: false; readonly field: "referenceImage"; readonly message: string };

export function validateReferenceImages(files: readonly UploadLike[]): UploadValidation {
  if (files.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, field: "referenceImage", message: `at most ${String(MAX_REFERENCE_IMAGES)} reference images (got ${String(files.length)})` };
  }
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return { ok: false, field: "referenceImage", message: `${file.name}: reference images must be PNG, JPEG or WebP (got ${file.type || "unknown"})` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, field: "referenceImage", message: `${file.name}: reference images must be 10 MB or smaller` };
    }
  }
  return { ok: true };
}
