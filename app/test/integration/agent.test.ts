/**
 * STORY_049 integration lane: the agent routes against the stub's fake Vertex (in-process, a random port), a key pair
 * generated into a temp file, the repo's own skills directory. Every scripted outcome; the abort; the record.
 */
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getRuns, POST as postRun } from "@/app/api/agent/runs/route";
import { PATCH as patchRun } from "@/app/api/agent/runs/[id]/route";
import { GET as getSkills } from "@/app/api/agent/skills/route";
import { forgetTokens } from "@/lib/vertex";

let stub: StubServer;
let stubUrl = "";
let dir = "";
const image = readFileSync(path.join(DEFAULT_FIXTURES_DIR, "fixture-reference.png"));
const ENV = ["HISTORY_FILE", "MODEL_BASE_URL", "VERTEX_BASE_URL", "VERTEX_TOKEN_URL", "VERTEX_PROJECT", "VERTEX_LOCATION", "VERTEX_MODEL", "GOOGLE_APPLICATION_CREDENTIALS", "SKILLS_DIR", "AGENT_TIMEOUT_MS", "VERTEX_THINKING"] as const;

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
});
beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "agent-it-"));
  const key = path.join(dir, "key.json");
  writeFileSync(key, JSON.stringify({ type: "service_account", client_email: "it@stub.invalid", private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString() }));
  Object.assign(process.env, { HISTORY_FILE: path.join(dir, "history.json"), MODEL_BASE_URL: stubUrl, VERTEX_BASE_URL: stubUrl, VERTEX_TOKEN_URL: `${stubUrl}/token`, VERTEX_PROJECT: "it-project", VERTEX_LOCATION: "global", VERTEX_MODEL: "gemini-3.8-flash", GOOGLE_APPLICATION_CREDENTIALS: key, SKILLS_DIR: path.resolve(__dirname, "../../../agents/skills"), AGENT_TIMEOUT_MS: "20000" });
  forgetTokens();
  await fetch(`${stubUrl}/__stub/reset`, { method: "POST" });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  // no dynamic delete: set each back to undefined, which Node treats as unset for our readers (they trim to empty)
  for (const k of ENV) process.env[k] = "";
});

function run(script: string | undefined, fields: { skill?: string; notes?: string; image?: Blob; images?: number } = {}, signal?: AbortSignal): Promise<Response> {
  const form = new FormData();
  form.set("skill", fields.skill ?? "minimax-h3-director-thirst-trap");
  form.set("notes", fields.notes ?? "keep the camera still");
  const blob = fields.image ?? new Blob([image], { type: "image/png" });
  for (let i = 0; i < (fields.images ?? 1); i += 1) form.append("referenceImage", blob, "01.png");
  const url = script === undefined ? "http://app/api/agent/runs" : `http://app/api/agent/runs?script=${script}`;
  return postRun(new Request(url, { method: "POST", body: form, ...(signal === undefined ? {} : { signal }) }));
}
const received = async (): Promise<{ script: string; pass: number; parts: { kind: string; head?: string; sha256?: string }[]; aborted: boolean; generationConfig: unknown }[]> => ((await (await fetch(`${stubUrl}/__stub/agent/runs`)).json()) as { runs: { script: string; pass: number; parts: { kind: string; head?: string; sha256?: string }[]; aborted: boolean; generationConfig: unknown }[] }).runs;
const stored = (): unknown[] => JSON.parse(readFileSync(path.join(dir, "agent-runs.json"), "utf8")) as unknown[];

describe("GET /api/agent/skills", () => {
  it("lists the two director folders with their metadata", async () => {
    const body = (await (await getSkills()).json()) as { skills: { id: string; name: string; description: string; metadata: Record<string, string> }[] };
    expect(body.skills.map((s) => s.id)).toEqual(["minimax-h3-director-thirst-trap", "minimax-h3-director-thirst-trap-chain"]);
    expect(body.skills[0]?.metadata).toMatchObject({ "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10", "minimax-checkpoint": "minimax_h3_fl2va_int8_convrot" });
    expect(body.skills[1]?.metadata["minimax-short-name"]).toBe("Chain director");
  });
});

describe("POST /api/agent/runs", () => {
  it("clean: two passes, the expanded prompt with no findings; the fake received the skill, the references, the photo and the notes in order", async () => {
    const res = await run("clean");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kind: string; prompt: string; findings: unknown[]; segments: number; passes: number };
    expect(body).toMatchObject({ kind: "prompt", findings: [], segments: 1, passes: 2 });
    expect(body.prompt.startsWith("For the target video")).toBe(true);
    const runs = await received();
    expect(runs.map((r) => r.pass)).toEqual([1, 2]);
    const heads = runs[0]?.parts.map((p) => (p.kind === "text" ? p.head?.split("\n")[0] : "image")) ?? [];
    expect(heads).toEqual(["references/anchor-example.md:", "references/base-en.md:", "references/example-i2va.md:", "The attached photo — the first frame:", "image", "Notes: keep the camera still"]);
    expect(runs[0]?.parts.find((p) => p.kind === "image")?.sha256).toBe(createHash("sha256").update(image).digest("hex"));
    expect(runs[0]?.generationConfig).toEqual({ maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } });
    expect(() => stored()).toThrow(); // nothing recorded for a prompt
  });
  it("VERTEX_THINKING changes the generation config", async () => {
    process.env["VERTEX_THINKING"] = "high";
    await run("clean");
    expect((await received())[0]?.generationConfig).toEqual({ maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "HIGH" } });
  });
  it("warn: the prompt comes back with its two findings", async () => {
    const body = (await (await run("warn")).json()) as { kind: string; findings: { code: string; message: string }[] };
    expect(body.kind).toBe("prompt");
    expect(body.findings.map((f) => f.code)).toEqual(["description-too-short", "no-soundscape"]);
    expect(body.findings[0]?.message).toMatch(/^the description is \d+ words; the skill asks for 350–600$/);
  });
  it("chain: three segments, checked per segment, the chain expansion turn; chain-warn names segment 2", async () => {
    const body = (await (await run("chain", { skill: "minimax-h3-director-thirst-trap-chain", notes: "3 segments" })).json()) as { kind: string; segments: number; findings: unknown[] };
    expect(body).toMatchObject({ kind: "prompt", segments: 3, findings: [] });
    const warn = (await (await run("chain-warn", { skill: "minimax-h3-director-thirst-trap-chain", notes: "3 segments" })).json()) as { findings: { code: string; segment?: number; message: string }[] };
    expect(warn.findings).toEqual([{ code: "description-too-short", segment: 2, message: expect.stringContaining("Segment 2:") as string }]);
  });
  it("refusal, refusal-text and malformed are the model's words, and each is recorded; GET lists them newest first; PATCH stamps openedAt", async () => {
    expect(await (await run("refusal")).json()).toEqual({ kind: "refusal", message: "The model stopped for safety" });
    expect(await (await run("refusal-text")).json()).toMatchObject({ kind: "refusal", message: expect.stringContaining("I can't help") as string });
    expect(await (await run("malformed")).json()).toEqual({ kind: "refusal", message: "I can't see an image in this request." });
    const list = (await (await getRuns()).json()) as { runs: { id: string; outcome: string; message: string; openedAt?: string }[] };
    expect(list.runs.map((r) => r.outcome)).toEqual(["refusal", "refusal", "refusal"]);
    expect(list.runs[0]?.message).toBe("I can't see an image in this request.");
    const id = list.runs[0]?.id ?? "";
    const patched = await patchRun(new Request(`http://app/api/agent/runs/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ openedAt: "2026-09-17T12:00:00.000Z" }) }), { params: Promise.resolve({ id }) });
    expect(await patched.json()).toMatchObject({ id, openedAt: "2026-09-17T12:00:00.000Z" });
    expect((await patchRun(new Request("http://app/api/agent/runs/nope", { method: "PATCH" }), { params: Promise.resolve({ id: "nope" }) })).status).toBe(404);
  });
  it("quota is a 429 relayed and recorded; an unreachable fake is a 502 without the URL", async () => {
    const quota = await run("quota");
    expect(quota.status).toBe(429);
    expect(((await quota.json()) as { error: { code: string; message: string } }).error).toMatchObject({ code: "quota", message: expect.stringContaining("Quota exceeded") as string });
    process.env["VERTEX_BASE_URL"] = "http://127.0.0.1:1";
    forgetTokens();
    const down = await run("clean");
    expect(down.status).toBe(502);
    const err = ((await down.json()) as { error: { code: string; message: string } }).error;
    expect(err.code).toBe("unreachable");
    expect(err.message).not.toContain("127.0.0.1:1");
    expect((stored() as { outcome: string }[]).map((r) => r.outcome)).toEqual(["error", "error"]);
  });
  it("not configured is a 503 with the reason; an unknown skill, a missing photo, two photos and a bad type are 400s with the field", async () => {
    delete process.env["VERTEX_PROJECT"];
    const off = await run("clean");
    expect(off.status).toBe(503);
    expect(((await off.json()) as { error: { code: string } }).error.code).toBe("not_configured");
    process.env["VERTEX_PROJECT"] = "it-project";
    expect((await run("clean", { skill: "nope" })).status).toBe(400);
    expect(((await (await run("clean", { images: 0 })).json()) as { error: { field: string } }).error.field).toBe("referenceImage");
    expect(((await (await run("clean", { images: 2 })).json()) as { error: { message: string } }).error.message).toBe("the director takes one photo");
    expect((await run("clean", { image: new Blob([image], { type: "image/gif" }) })).status).toBe(400);
  });
  it("an aborted request stops the call to the fake and records nothing", async () => {
    const controller = new AbortController();
    const pending = run("slow", {}, controller.signal);
    await new Promise((r) => setTimeout(r, 300));
    controller.abort();
    const res = await pending;
    expect(res.status).toBe(499);
    await new Promise((r) => setTimeout(r, 200));
    expect((await received())[0]?.aborted).toBe(true);
    expect(() => stored()).toThrow();
  });
});
