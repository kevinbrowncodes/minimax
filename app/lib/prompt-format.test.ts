/** STORY_049: the format check on real replies (the spike's fixtures) and on prompts broken one way each. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkPromptFormat, describedAction, descriptionOf, splitSegments, wordCount } from "./prompt-format";

const fixture = (name: string): string => readFileSync(path.resolve(__dirname, "../test/fixtures/agent", name), "utf8");
const office = fixture("office-expanded.txt");
const cove = fixture("cove-expanded.txt");
const draft = fixture("office-draft.txt");
const codes = (text: string, chain = false): string[] => checkPromptFormat(text, { chain }).findings.map((f) => f.code);

describe("checkPromptFormat on the spike's replies", () => {
  it("the two expanded replies are clean; the one-pass draft is only too short", () => {
    expect(codes(office)).toEqual([]);
    expect(codes(cove)).toEqual([]);
    expect(checkPromptFormat(draft).findings).toEqual([{ code: "description-too-short", message: expect.stringMatching(/^the description is 23\d words; the skill asks for 350–600$/) as string }]);
    expect(checkPromptFormat(office).isPrompt).toBe(true);
    expect(checkPromptFormat(office).segments).toBe(1);
  });
  it("returns the prompt trimmed, and a fenced reply unwrapped with a markdown finding", () => {
    const fenced = "```text\n" + office + "\n```\n";
    const check = checkPromptFormat(fenced);
    expect(check.prompt).toBe(office.trim());
    expect(check.findings.map((f) => f.code)).toEqual(["markdown"]);
  });
});

describe("each finding, on a prompt broken for it", () => {
  const description = descriptionOf(office) ?? "";
  it("text before the instruction line", () => {
    expect(codes(`Here is your prompt:\n\n${office}`)).toEqual(["text-before-instruction"]);
  });
  it("no instruction line", () => {
    expect(codes(office.slice(office.indexOf("integrated_multimodal_description:")))).toEqual(["no-instruction-line"]);
  });
  it("no description, no soundscape, no music", () => {
    expect(codes(office.split("integrated_multimodal_description:")[0] ?? "")).toContain("no-description");
    expect(codes(office.replace(/overall_soundscape:.*\n?/, ""))).toEqual(["no-soundscape"]);
    expect(codes(office.replace(/non_diegetic_music:.*\n?/, ""))).toEqual(["no-music"]);
  });
  it("a blank line or a label inside the description", () => {
    expect(codes(office.replace("In the first two seconds", "\n\nIn the first two seconds"))).toEqual(["description-line-breaks"]);
    expect(codes(office.replace("In the first two seconds", "\nThe Hook: In the first two seconds"))).toEqual(["description-line-breaks"]);
  });
  it("too long", () => {
    const padded = office.replace(description, `${description} ${"more words here ".repeat(60)}`);
    expect(codes(padded)).toEqual(["description-too-long"]);
  });
  it("timestamps — a bracket, or the format's own cut phrase", () => {
    expect(codes(office.replace("In the first two seconds", "[0:00-0:02] In the first two seconds"))).toEqual(["timestamps"]);
    expect(codes(office.replace("Through the middle of the clip", "At 00:03.500, the camera cuts to a wide shot. Through the middle of the clip"))).toEqual(["timestamps"]);
  });
  it("markdown inside, and a missing shot label", () => {
    expect(codes(`${office}\n\n## Notes\n`)).toEqual(["markdown"]);
    expect(codes(office.replace("[Shot 1] ", ""))).toEqual(["no-shot-label"]);
  });
  it("several findings come in document order", () => {
    const broken = `Title\n\n${office.replace(/overall_soundscape:.*\n?/, "").replace("[Shot 1] ", "")}`;
    expect(codes(broken)).toEqual(["text-before-instruction", "no-shot-label", "no-soundscape"]);
  });
  it("prose that is not a prompt at all", () => {
    const check = checkPromptFormat("I can't see an image in this request.");
    expect(check.isPrompt).toBe(false);
    expect(check.findings.map((f) => f.code)).toContain("no-instruction-line");
  });
});

describe("chains (the rule STORY_053 builds on)", () => {
  const chain = readFileSync(path.resolve(__dirname, "../../tools/stub-generation-server/fixtures/agent/chain.txt"), "utf8");
  it("splits at each marker with the instruction line staying on segment 1, and the stub's chain fixture is clean", () => {
    const segments = splitSegments(chain);
    expect(segments).toHaveLength(3);
    expect(segments[0]?.startsWith("For the target video")).toBe(true);
    expect(segments[1]?.startsWith("integrated_multimodal_description:")).toBe(true);
    const check = checkPromptFormat(chain, { chain: true });
    expect(check.segments).toBe(3);
    expect(check.findings).toEqual([]);
  });
  it("an extension segment with an instruction line or a picture, or a short one, is named by its number", () => {
    const segments = splitSegments(chain);
    const withPicture = [segments[0], `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\n${segments[1] ?? ""}`, segments[2]].join("\n\n");
    expect(checkPromptFormat(withPicture, { chain: true }).findings).toEqual([{ code: "text-before-instruction", message: expect.stringContaining("Segment 2:") as string, segment: 2 }]);
    const short = [segments[0], segments[1], (segments[2] ?? "").replace(/(integrated_multimodal_description:\s*\[Shot 1\][^.]*\.)[\s\S]*?(\n\s*overall_soundscape:)/, "$1 A few words only.$2")].join("\n\n");
    const findings = checkPromptFormat(short, { chain: true }).findings;
    expect(findings.map((f) => [f.code, f.segment])).toEqual([["description-too-short", 3]]);
  });
  it("a single prompt under chain: true is one segment under the single-clip rules", () => {
    expect(checkPromptFormat(office, { chain: true })).toMatchObject({ segments: 1, findings: [] });
  });
});

describe("helpers", () => {
  it("describedAction skips the style and camera sentences", () => {
    expect(describedAction(office)?.startsWith("A fit young man")).toBe(true);
    expect(describedAction("no marker here")).toBeUndefined();
    expect(wordCount("  a  b   c ")).toBe(3);
  });
});
