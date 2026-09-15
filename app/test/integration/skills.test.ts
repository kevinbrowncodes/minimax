/** STORY_040 integration lane: the skills routes — the built-in first, create / edit / delete for the owner's, the built-in protected. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteSkill, PATCH as patchSkill } from "@/app/api/skills/[id]/route";
import { GET as listSkills, POST as createSkill } from "@/app/api/skills/route";
import type { Skill } from "@/lib/skills";

let dir = "";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (p: string, body: unknown, method = "POST") => new Request(`http://app${p}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ids = async (): Promise<string[]> => ((await (await listSkills()).json()) as { skills: Skill[] }).skills.map((s) => s.id);
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "skills-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("skills through the app's routes", () => {
  it("lists the built-in, creates with validation, edits, deletes, and refuses touching the built-in", async () => {
    expect(await ids()).toEqual(["short-to-script"]);
    expect((await createSkill(jsonRequest("/api/skills", { name: "", description: "", template: "x" }))).status).toBe(400);
    expect((await createSkill(jsonRequest("/api/skills", { name: "Loop" }))).status).toBe(400);
    expect((await createSkill(new Request("http://app/api/skills", { method: "POST", body: "nope" }))).status).toBe(400);
    const created = await createSkill(jsonRequest("/api/skills", { name: "Loop", description: "Seamless loops", template: "Loop: {{idea}}" }));
    expect(created.status).toBe(201);
    const { skill } = (await created.json()) as { skill: Skill };
    expect(await ids()).toEqual(["short-to-script", skill.id]);
    const edited = await patchSkill(jsonRequest(`/api/skills/${skill.id}`, { name: "Loops", template: "Loops: {{idea}}" }, "PATCH"), ctx(skill.id));
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as { skill: Skill }).skill).toMatchObject({ name: "Loops", template: "Loops: {{idea}}", description: "Seamless loops" });
    expect((await patchSkill(jsonRequest(`/api/skills/${skill.id}`, { name: "" }, "PATCH"), ctx(skill.id))).status).toBe(400);
    expect((await patchSkill(jsonRequest(`/api/skills/${skill.id}`, { id: "z" }, "PATCH"), ctx(skill.id))).status).toBe(400);
    expect((await patchSkill(jsonRequest(`/api/skills/nope`, { name: "x" }, "PATCH"), ctx("nope"))).status).toBe(404);
    expect((await patchSkill(jsonRequest(`/api/skills/short-to-script`, { name: "x" }, "PATCH"), ctx("short-to-script"))).status).toBe(400);
    expect((await deleteSkill(new Request("http://app/api/skills/short-to-script", { method: "DELETE" }), ctx("short-to-script"))).status).toBe(400);
    expect((await deleteSkill(new Request(`http://app/api/skills/${skill.id}`, { method: "DELETE" }), ctx(skill.id))).status).toBe(204);
    expect((await deleteSkill(new Request(`http://app/api/skills/${skill.id}`, { method: "DELETE" }), ctx(skill.id))).status).toBe(404);
    expect(await ids()).toEqual(["short-to-script"]);
  });
});
