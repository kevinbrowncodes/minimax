/**
 * STORY_052 integration lane: the instructions routes, and a director run carrying the active instructions in the fixed
 * order — proven on the fake Vertex's record of the parts (their heads, the images' hashes).
 */
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as createJob } from "@/app/api/jobs/route";
import { DELETE as deleteRef, GET as getRef, POST as postRef } from "@/app/api/agent/instructions/[id]/reference/route";
import { GET as getInstructions, PUT as putInstructions } from "@/app/api/agent/instructions/route";
import { POST as postRun } from "@/app/api/agent/runs/route";
import { clearInstructions } from "@/lib/agent-instruction-store";
import { forgetTokens } from "@/lib/vertex";

let stub: StubServer;
let stubUrl = "";
let dir = "";
const image = readFileSync(path.join(DEFAULT_FIXTURES_DIR, "fixture-reference.png"));
const ENV = ["HISTORY_FILE", "MODEL_BASE_URL", "VERTEX_BASE_URL", "VERTEX_TOKEN_URL", "VERTEX_PROJECT", "VERTEX_LOCATION", "VERTEX_MODEL", "GOOGLE_APPLICATION_CREDENTIALS", "SKILLS_DIR"] as const;
const json = (url: string, body: unknown, method = "PUT"): Request => new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
});
beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "instr-it-"));
  const key = path.join(dir, "key.json");
  writeFileSync(key, JSON.stringify({ type: "service_account", client_email: "it@stub.invalid", private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString() }));
  Object.assign(process.env, { HISTORY_FILE: path.join(dir, "history.json"), MODEL_BASE_URL: stubUrl, VERTEX_BASE_URL: stubUrl, VERTEX_TOKEN_URL: `${stubUrl}/token`, VERTEX_PROJECT: "it-project", VERTEX_LOCATION: "global", VERTEX_MODEL: "gemini-3.8-flash", GOOGLE_APPLICATION_CREDENTIALS: key, SKILLS_DIR: path.resolve(__dirname, "../../../agents/skills") });
  forgetTokens();
  await fetch(`${stubUrl}/__stub/reset`, { method: "POST" });
});
afterEach(() => {
  clearInstructions();
  rmSync(dir, { recursive: true, force: true });
  for (const k of ENV) process.env[k] = "";
});

async function put(list: unknown): Promise<Response> {
  return putInstructions(json("http://app/api/agent/instructions", { instructions: list }));
}
async function run(): Promise<Response> {
  const form = new FormData();
  form.set("skill", "minimax-h3-director-thirst-trap");
  form.set("notes", "keep the camera still");
  form.append("referenceImage", new Blob([image], { type: "image/png" }), "01.png");
  return postRun(new Request("http://app/api/agent/runs?script=clean", { method: "POST", body: form }));
}
const heads = async (): Promise<{ kind: string; head?: string; sha256?: string }[][]> => ((await (await fetch(`${stubUrl}/__stub/agent/runs`)).json()) as { runs: { parts: { kind: string; head?: string; sha256?: string }[] }[] }).runs.map((r) => r.parts);

describe("the instructions routes", () => {
  it("PUT replaces the list and GET lists it; the limits are 400s with the field; an upload and a pick attach a reference, GET serves it, DELETE drops it", async () => {
    expect(await (await getInstructions()).json()).toEqual({ instructions: [] });
    const saved = (await (await put([{ title: "House rule", text: "the camera stays fixed", active: true }])).json()) as { instructions: { id: string }[] };
    const id = saved.instructions[0]?.id ?? "";
    expect(id).not.toBe("");
    expect(((await (await put([{ title: "", text: "t", active: true }])).json()) as { error: { field: string } }).error.field).toBe("title");
    expect((await put("nope")).status).toBe(400);
    expect((await putInstructions(new Request("http://app/api/agent/instructions", { method: "PUT", body: "{" }))).status).toBe(400);
    // an upload
    const form = new FormData();
    form.append("referenceImage", new Blob([image], { type: "image/png" }), "ref.png");
    const uploaded = await postRef(new Request(`http://app/api/agent/instructions/${id}/reference`, { method: "POST", body: form }), ctx(id));
    expect(uploaded.status).toBe(200);
    expect(((await uploaded.json()) as { reference: unknown }).reference).toEqual({ kind: "upload", file: { name: "ref.png", type: "image/png", size: image.length } });
    const served = await getRef(new Request("http://app/x"), ctx(id));
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await served.arrayBuffer()).equals(image)).toBe(true);
    // a bad upload
    const bad = new FormData();
    bad.append("referenceImage", new Blob([image], { type: "image/gif" }), "x.gif");
    expect((await postRef(new Request(`http://app/api/agent/instructions/${id}/reference`, { method: "POST", body: bad }), ctx(id))).status).toBe(400);
    // a pick from the history: create a job with a reference first
    const job = new FormData();
    job.set("prompt", "p"); job.set("ratio", "16:9"); job.set("resolution", "768P"); job.set("durationSeconds", "5"); job.set("model", "minimax-h3");
    job.append("referenceImage", new Blob([image], { type: "image/png" }), "from-a-job.png");
    const created = await createJob(new Request("http://app/api/jobs?script=done-after-1-poll", { method: "POST", body: job }));
    const { id: jobId } = (await created.json()) as { id: string };
    const picked = await postRef(json(`http://app/api/agent/instructions/${id}/reference`, { historyId: jobId, n: 1 }, "POST"), ctx(id));
    expect(((await picked.json()) as { reference: unknown }).reference).toEqual({ kind: "history", historyId: jobId, n: 1 });
    expect((await postRef(json(`http://app/api/agent/instructions/${id}/reference`, { historyId: "nope", n: 1 }, "POST"), ctx(id))).status).toBe(404);
    expect((await postRef(new Request(`http://app/api/agent/instructions/${id}/reference`, { method: "POST", body: "x" }), ctx(id))).status).toBe(415);
    expect(((await (await deleteRef(new Request("http://app/x"), ctx(id))).json()) as { reference?: unknown }).reference).toBeUndefined();
    expect((await getRef(new Request("http://app/x"), ctx(id))).status).toBe(404);
    expect((await postRef(new Request("http://app/api/agent/instructions/nope/reference", { method: "POST", body: form }), ctx("nope"))).status).toBe(404);
    // the job must finish for the lane's own hygiene
    await fetch(`${stubUrl}/__stub/reset`, { method: "POST" });
  });
});

describe("a run carries the active instructions", () => {
  it("in order: the skill's references, each instruction's image then text, the photo, the notes; an inactive row sends nothing; a gone file sends the text alone", async () => {
    const saved = (await (await put([{ title: "Studio", text: "the sequin curtain", active: true }, { title: "House rule", text: "the camera stays fixed", active: true }, { title: "Off", text: "never", active: false }])).json()) as { instructions: { id: string; title: string }[] };
    const studio = saved.instructions.find((r) => r.title === "Studio")?.id ?? "";
    const form = new FormData();
    const studioBytes = Buffer.from("studio-image");
    form.append("referenceImage", new Blob([studioBytes], { type: "image/png" }), "studio.png");
    await postRef(new Request(`http://app/api/agent/instructions/${studio}/reference`, { method: "POST", body: form }), ctx(studio));
    expect((await run()).status).toBe(200);
    const [first] = await heads();
    expect(first?.map((p) => (p.kind === "text" ? p.head?.split("\n")[0] : `image:${p.sha256?.slice(0, 8) ?? ""}`))).toEqual([
      "references/anchor-example.md:", "references/base-en.md:", "references/example-i2va.md:",
      'Reference image for the instruction "Studio":', `image:${createHash("sha256").update(studioBytes).digest("hex").slice(0, 8)}`, "Instruction — Studio:",
      "Instruction — House rule:",
      "The attached photo — the first frame:", `image:${createHash("sha256").update(image).digest("hex").slice(0, 8)}`,
      "Notes: keep the camera still",
    ]);
    // the Studio row's file removed behind the store's back: the text alone, still in order
    rmSync(path.join(dir, "uploads", "agent-instructions", studio), { recursive: true, force: true });
    await fetch(`${stubUrl}/__stub/reset`, { method: "POST" });
    await run();
    const [again] = await heads();
    expect(again?.map((p) => (p.kind === "text" ? p.head?.split("\n")[0] : "image"))).toEqual(["references/anchor-example.md:", "references/base-en.md:", "references/example-i2va.md:", "Instruction — Studio:", "Instruction — House rule:", "The attached photo — the first frame:", "image", "Notes: keep the camera still"]);
    // toggled off: no instruction parts at all
    await put(saved.instructions.map((r) => ({ id: r.id, title: r.title, text: "t", active: false })));
    await fetch(`${stubUrl}/__stub/reset`, { method: "POST" });
    await run();
    const [none] = await heads();
    expect(none?.filter((p) => p.kind === "text" && p.head?.startsWith("Instruction"))).toEqual([]);
  });
});
