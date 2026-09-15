import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectStore, projectStore } from "./project-store";

let dir: string | undefined;
const store = (): ProjectStore => {
  dir = mkdtempSync(path.join(tmpdir(), "projects-"));
  return new ProjectStore(path.join(dir, "nested", "projects.json"));
};
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
  delete process.env["PROJECTS_FILE"];
});

describe("ProjectStore (STORY_031)", () => {
  it("creates with a trimmed name and a fresh id, lists newest first, gets, patches, removes, with atomic writes", () => {
    const s = store();
    const a = s.create({ name: "  My film  ", createdAt: "2026-09-15T10:00:00Z" });
    const b = s.create({ name: "Second", createdAt: "2026-09-15T11:00:00Z" });
    expect(a.name).toBe("My film");
    expect(a.id).not.toBe(b.id);
    expect(s.list().map((p) => p.id)).toEqual([b.id, a.id]);
    expect(s.get(a.id)?.name).toBe("My film");
    expect(s.patch(a.id, { name: "Renamed" })?.name).toBe("Renamed");
    expect(s.patch(a.id, { pinned: true, pinnedAt: "2026-09-15T12:00:00Z" })).toMatchObject({ pinned: true, pinnedAt: "2026-09-15T12:00:00Z" });
    expect(s.patch(a.id, { pinned: false, pinnedAt: undefined })?.pinnedAt).toBeUndefined();
    expect(s.patch("nope", { name: "x" })).toBeUndefined();
    expect(s.remove(b.id)).toBe(true);
    expect(s.remove(b.id)).toBe(false);
    expect(s.list().map((p) => p.id)).toEqual([a.id]);
    expect(readdirSync(path.dirname(s.file)).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    expect(existsSync(s.file)).toBe(true);
  });

  it("starts empty without a file and the shared store follows PROJECTS_FILE", () => {
    const s = store();
    expect(s.list()).toEqual([]);
    process.env["PROJECTS_FILE"] = s.file;
    expect(projectStore().file).toBe(s.file);
    process.env["PROJECTS_FILE"] = `${s.file}.other`;
    expect(projectStore().file).toBe(`${s.file}.other`);
  });
});
