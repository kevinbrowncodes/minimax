/** STORY_048: the skill reader on the committed thirst-trap folder, the frontmatter parser, and the request's fixed order. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DIRECTOR_GENERATION_CONFIG, DIRECTOR_SAFETY_SETTINGS, assembleRequest, expandInstruction, parseFrontmatter, readSkill, readSkills, type SkillFolder } from "./agent-request";

const SKILLS = path.resolve(__dirname, "../../agents/skills");
const THIRST = path.join(SKILLS, "minimax-h3-director-thirst-trap");
let tmp: string | undefined;
afterEach(() => {
  if (tmp !== undefined) rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe("readSkill on the committed thirst-trap director", () => {
  const skill = readSkill(THIRST);
  it("reads the id, the name, the description and the metadata map with the keys the app uses", () => {
    expect(skill.id).toBe("minimax-h3-director-thirst-trap");
    expect(skill.name).toBe("minimax-h3-director-thirst-trap");
    expect(skill.description.startsWith("Directs one thirst-trap short")).toBe(true);
    expect(skill.metadata).toMatchObject({ "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10", "minimax-checkpoint": "minimax_h3_fl2va_int8_convrot", "minimax-verified-on": "2026-09-16" });
    expect(skill.metadata["version"]).toMatch(/^\d+\.\d+$/);
  });
  it("the body is the markdown after the frontmatter, and the references are the three files in name order", () => {
    expect(skill.body.startsWith("# MiniMax H3 director — thirst trap")).toBe(true);
    expect(skill.body).not.toContain("minimax-checkpoint:");
    expect(skill.references.map((r) => r.file)).toEqual(["references/anchor-example.md", "references/base-en.md", "references/example-i2va.md"]);
    expect(skill.references.every((r) => r.text.length > 200)).toBe(true);
  });
  it("readSkills lists every folder and reports one that fails without throwing", () => {
    tmp = mkdtempSync(path.join(tmpdir(), "skills-"));
    mkdirSync(path.join(tmp, "good"));
    writeFileSync(path.join(tmp, "good", "SKILL.md"), "---\nname: good\ndescription: fine\n---\n# Good\n");
    mkdirSync(path.join(tmp, "broken"));
    writeFileSync(path.join(tmp, "broken", "SKILL.md"), "no frontmatter");
    mkdirSync(path.join(tmp, "empty"));
    const { skills, failed } = readSkills(tmp);
    expect(skills.map((s) => s.id)).toEqual(["good"]);
    expect(failed).toEqual([{ id: "broken", message: "SKILL.md does not start with frontmatter" }, { id: "empty", message: "empty has no SKILL.md" }]);
    expect(readSkills(path.join(tmp, "missing"))).toEqual({ skills: [], failed: [] });
  });
});

describe("readSkill on the committed chain director (STORY_053)", () => {
  const skill = readSkill(path.join(SKILLS, "minimax-h3-director-thirst-trap-chain"));
  it("reads the metadata keys the app uses: the short name, the clip length and the default segment count", () => {
    expect(skill.id).toBe("minimax-h3-director-thirst-trap-chain");
    expect(skill.description).toContain("chain of several");
    expect(skill.metadata).toMatchObject({ "minimax-short-name": "Chain director", "minimax-clip-seconds": "10", "minimax-segments-default": "3", "minimax-verified-on": "2026-09-17" });
    expect(skill.references.map((r) => r.file)).toEqual(["references/anchor-example.md", "references/base-en.md", "references/chain-example.md", "references/example-i2va.md"]); // the chain that held (STORY_053's draw)
  });
});

describe("parseFrontmatter", () => {
  it("reads strings, quoted strings and one nested map; comments and blank lines are skipped", () => {
    const { data, body } = parseFrontmatter('---\nname: x\n# a comment\ndescription: "quoted: value"\nmetadata:\n  version: "1.0"\n  minimax-adapter: 1.5.0\n\n---\n\nBody here\n');
    expect(data).toEqual({ name: "x", description: "quoted: value", metadata: { version: "1.0", "minimax-adapter": "1.5.0" } });
    expect(body).toBe("Body here");
  });
  it("names what it cannot read", () => {
    expect(() => parseFrontmatter("no\n")).toThrow("does not start with frontmatter");
    expect(() => parseFrontmatter("---\nname: x\n")).toThrow("not closed");
    expect(() => parseFrontmatter("---\n- a list\n---\n")).toThrow("a line the parser does not read");
  });
});

describe("assembleRequest", () => {
  const skill: SkillFolder = { id: "s", name: "s", description: "d", metadata: {}, body: "SYSTEM", references: [{ file: "references/a.md", text: "A" }, { file: "references/b.md", text: "B" }] };
  const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" };
  it("system instruction = the body; parts = references, the photo, the notes — in that order", () => {
    const r = assembleRequest(skill, image, "  keep the camera still ");
    expect(r.systemInstruction).toBe("SYSTEM");
    expect(r.parts).toEqual([{ text: "references/a.md:\n\nA" }, { text: "references/b.md:\n\nB" }, { text: "The attached photo — the first frame:" }, { inlineData: { mimeType: "image/jpeg", data: "AQID" } }, { text: "Notes: keep the camera still" }]);
  });
  it("no notes says so; instructions go after the references and before the photo, each image before its text", () => {
    const r = assembleRequest(skill, image, "", [{ title: "Studio", text: "the sequin curtain", image: { bytes: new Uint8Array([9]), mimeType: "image/png" } }, { title: "House rule", text: "camera fixed" }]);
    expect(r.parts.map((p) => ("text" in p ? p.text.split("\n")[0] : `image:${p.inlineData.mimeType}`))).toEqual([
      "references/a.md:", "references/b.md:",
      'Reference image for the instruction "Studio":', "image:image/png", "Instruction — Studio:",
      "Instruction — House rule:",
      "The attached photo — the first frame:", "image:image/jpeg",
      "No notes.",
    ]);
  });
  it("the director's settings and the expansion turn are what the spike settled", () => {
    expect(DIRECTOR_SAFETY_SETTINGS.every((s) => s.threshold === "OFF")).toBe(true);
    expect(DIRECTOR_SAFETY_SETTINGS).toHaveLength(5);
    expect(DIRECTOR_GENERATION_CONFIG).toEqual({ maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } });
    expect(expandInstruction(450, 600)).toContain("450–600 words");
    expect(expandInstruction(450, 600)).toContain("Output only the full prompt");
  });
});
