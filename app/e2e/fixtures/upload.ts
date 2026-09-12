import path from "node:path";

/** The committed reference image for upload specs (tools/stub-generation-server/fixtures). Playwright runs from app/. */
export const REFERENCE_IMAGE = path.resolve(process.cwd(), "../tools/stub-generation-server/fixtures/fixture-reference.png");
export const REFERENCE_IMAGE_NAME = "fixture-reference.png";
