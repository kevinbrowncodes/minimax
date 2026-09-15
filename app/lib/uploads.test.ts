import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { referenceFilePath, removeReferenceFile, removeUploads, safeFileName, saveReferenceFiles, uploadsDirFor } from "./uploads";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "uploads-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the reference images kept with a job (STORY_032)", () => {
  it("live under uploads/<job> beside the history file, numbered by upload order, and go one at a time or all at once", async () => {
    const files = [new File(["png-one"], "boat sketch.png", { type: "image/png" }), new File(["jpg-two"], "../evil/second.jpg", { type: "image/jpeg" })];
    const refs = await saveReferenceFiles("job-1", files);
    expect(uploadsDirFor("job-1")).toBe(path.join(dir, "uploads", "job-1"));
    expect(refs).toEqual([
      { n: 1, name: "boat sketch.png", file: "1-boat sketch.png", size: 7, type: "image/png" },
      { n: 2, name: ".._evil_second.jpg", file: "2-.._evil_second.jpg", size: 7, type: "image/jpeg" },
    ]);
    const [one, two] = refs;
    if (!one || !two) throw new Error("two refs expected");
    expect(readFileSync(referenceFilePath("job-1", one), "utf8")).toBe("png-one");
    expect(existsSync(referenceFilePath("job-1", two))).toBe(true);
    removeReferenceFile("job-1", one);
    expect(existsSync(referenceFilePath("job-1", one))).toBe(false);
    removeReferenceFile("job-1", one); // already gone: no throw
    removeUploads("job-1");
    expect(existsSync(uploadsDirFor("job-1"))).toBe(false);
    removeUploads("never-existed");
    expect(await saveReferenceFiles("job-2", [])).toEqual([]);
    expect(existsSync(uploadsDirFor("job-2"))).toBe(false);
  });

  it("safeFileName keeps a plain name, replaces path separators, and never yields an empty or dot name", () => {
    expect(safeFileName("fixture-reference.png")).toBe("fixture-reference.png");
    expect(safeFileName("a/b\\c.png")).toBe("a_b_c.png");
    for (const bad of ["", "   ", ".", ".."]) expect(safeFileName(bad)).toBe("image");
  });
});
