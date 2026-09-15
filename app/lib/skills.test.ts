import { describe, expect, it } from "vitest";
import { BUILT_IN_SKILLS, IDEA_SLOT, applySkill, isValidSkillInput, searchSkills } from "./skills";

describe("skills (STORY_040)", () => {
  it("ships one built-in, Short-to-script, whose template is the base prompt scaffold with the idea slot", () => {
    expect(BUILT_IN_SKILLS.map((s) => s.id)).toEqual(["short-to-script"]);
    const [skill] = BUILT_IN_SKILLS;
    expect(skill?.builtIn).toBe(true);
    expect(skill?.template).toContain("integrated_multimodal_description: [Shot 1] Live-action. The camera holds a perfectly static shot");
    expect(skill?.template).toContain(IDEA_SLOT);
    expect(skill?.template).toContain("overall_soundscape:");
    expect(skill?.template).toContain("non_diegetic_music:");
  });

  it("applySkill puts the idea in every slot and leaves the slot when the idea is blank", () => {
    expect(applySkill("Make {{idea}} — again: {{idea}}", "  a paper boat ")).toBe("Make a paper boat — again: a paper boat");
    expect(applySkill("Make {{idea}}", "   ")).toBe("Make {{idea}}");
    expect(applySkill("No slot here", "boat")).toBe("No slot here");
  });

  it("validates a skill's input and searches name and description", () => {
    expect(isValidSkillInput({ name: "A", description: "", template: "t" })).toBe(true);
    expect(isValidSkillInput({ name: " ", description: "", template: "t" })).toBe(false);
    expect(isValidSkillInput({ name: "A", description: "d", template: " " })).toBe(false);
    expect(isValidSkillInput({ name: "A", template: "t" })).toBe(false);
    const skills = [{ id: "1", name: "Short-to-script", description: "Expands an idea", template: "x" }, { id: "2", name: "Loop", description: "Seamless loops", template: "y" }];
    expect(searchSkills(skills, "").map((s) => s.id)).toEqual(["1", "2"]);
    expect(searchSkills(skills, "LOOP").map((s) => s.id)).toEqual(["2"]);
    expect(searchSkills(skills, "idea").map((s) => s.id)).toEqual(["1"]);
    expect(searchSkills(skills, "nothing")).toEqual([]);
  });
});
