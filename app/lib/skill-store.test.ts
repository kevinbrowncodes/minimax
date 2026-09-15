import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BuiltInSkillError, createSkill, getSkill, listSkills, removeSkill, skillsFile, updateSkill } from "./skill-store";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "skills-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the skill store (STORY_040)", () => {
  it("lists the built-in first, creates beside the history file, updates, removes, and protects the built-in", () => {
    expect(skillsFile()).toBe(path.join(dir, "skills.json"));
    expect(listSkills().map((s) => s.id)).toEqual(["short-to-script"]);
    const made = createSkill({ name: "  Loop  ", description: " Seamless loops ", template: "Loop: {{idea}}" });
    expect(made).toMatchObject({ name: "Loop", description: "Seamless loops", template: "Loop: {{idea}}" });
    expect(existsSync(skillsFile())).toBe(true);
    expect(listSkills().map((s) => s.id)).toEqual(["short-to-script", made.id]);
    expect(getSkill(made.id)?.name).toBe("Loop");
    expect(getSkill("short-to-script")?.builtIn).toBe(true);
    expect(updateSkill(made.id, { name: "Loops" })?.name).toBe("Loops");
    expect(updateSkill("nope", { name: "x" })).toBeUndefined();
    expect(() => updateSkill("short-to-script", { name: "x" })).toThrow(BuiltInSkillError);
    expect(() => removeSkill("short-to-script")).toThrow(BuiltInSkillError);
    expect(removeSkill(made.id)).toBe(true);
    expect(removeSkill(made.id)).toBe(false);
    expect(listSkills().map((s) => s.id)).toEqual(["short-to-script"]);
  });

  it("ignores garbage on disk", () => {
    writeFileSync(skillsFile(), "not json");
    expect(listSkills()).toHaveLength(1);
    writeFileSync(skillsFile(), JSON.stringify([{ id: "ok", name: "Ok", description: "", template: "t" }, { id: 3 }, "x"]));
    expect(listSkills().map((s) => s.id)).toEqual(["short-to-script", "ok"]);
  });
});
