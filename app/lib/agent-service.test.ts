/** STORY_049: the director run end to end against a fake fetch that plays the token endpoint and Vertex — two passes, the outcomes, the record. */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentConfig } from "./agent-config";
import { runDirector } from "./agent-service";
import { forgetTokens } from "./vertex";

const office = readFileSync(path.resolve(__dirname, "../test/fixtures/agent/office-expanded.txt"), "utf8");
const draft = readFileSync(path.resolve(__dirname, "../test/fixtures/agent/office-draft.txt"), "utf8");
const reply = (text: string): Response => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } }), { status: 200 });
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status });

let dir = "";
let config: Extract<AgentConfig, { configured: true }>;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "agent-service-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  const key = path.join(dir, "key.json");
  writeFileSync(key, JSON.stringify({ type: "service_account", client_email: "t@test.invalid", private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString() }));
  config = { configured: true as const, project: "p", location: "global", model: "gemini-3.8-flash", keyFile: key, skillsDir: path.resolve(__dirname, "../../agents/skills"), tokenUrl: "http://fake/token", vertexBaseUrl: "http://fake", timeoutMs: 5000, thinking: "low" };
  forgetTokens();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});
const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" };

/** A fetch that answers the token endpoint and then each generateContent call from a queue, recording every body. */
function vertex(answers: (() => Response)[]): { fetch: typeof fetch; bodies: Record<string, unknown>[] } {
  const bodies: Record<string, unknown>[] = [];
  const impl = (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/token")) return Promise.resolve(json(200, { access_token: "t", expires_in: 3600 }));
    bodies.push(JSON.parse(typeof init.body === "string" ? init.body : "{}") as Record<string, unknown>);
    const next = answers.shift();
    return Promise.resolve(next ? next() : json(500, { error: { message: "no answer queued" } }));
  };
  return { fetch: impl, bodies };
}

describe("runDirector", () => {
  it("two passes: the draft, then the draft sent back with the expansion turn; the expanded prompt and its findings come back", async () => {
    const record = vi.fn();
    const { fetch, bodies } = vertex([() => reply(draft), () => reply(office)]);
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "keep the camera still" }, { config, fetch, record });
    expect(out).toMatchObject({ kind: "prompt", prompt: office.trim(), findings: [], segments: 1, passes: 2 });
    expect(bodies).toHaveLength(2);
    expect((bodies[0]?.["contents"] as unknown[]).length).toBe(1);
    const second = bodies[1]?.["contents"] as { role: string; parts: { text?: string }[] }[];
    expect(second.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(second[1]?.parts[0]?.text).toBe(draft.trim());
    expect(second[2]?.parts[0]?.text?.startsWith("Revise your prompt")).toBe(true);
    expect(bodies[0]?.["generationConfig"]).toEqual({ maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } });
    expect((bodies[0]?.["safetySettings"] as unknown[]).length).toBe(5);
    expect(record).not.toHaveBeenCalled();
  });
  it("the thinking setting shapes the generation config; 'default' sends none", async () => {
    const { fetch, bodies } = vertex([() => reply(draft), () => reply(office)]);
    await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" }, { config: { ...config, thinking: "default" }, fetch, record: vi.fn() });
    expect(bodies[0]?.["generationConfig"]).toEqual({ maxOutputTokens: 16384 });
  });
  it("a draft with findings still comes back as a prompt when the expansion fails, with one pass", async () => {
    const { fetch } = vertex([() => reply(draft), () => json(500, { error: { message: "flaky" } })]);
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" }, { config, fetch, record: vi.fn() });
    expect(out).toMatchObject({ kind: "prompt", passes: 1, findings: [{ code: "description-too-short" }] });
  });
  it("a refusal on the first pass is the model's words, recorded", async () => {
    const record = vi.fn();
    const { fetch } = vertex([() => json(200, { candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: "I can't help with that." }] } }] })]);
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "n" }, { config, fetch, record });
    expect(out).toEqual({ kind: "refusal", message: "I can't help with that." });
    expect(record).toHaveBeenCalledWith({ skill: "minimax-h3-director-thirst-trap", notes: "n", outcome: "refusal", message: "I can't help with that." });
  });
  it("a reply that is not a prompt (prose) is shown as a refusal in the model's words", async () => {
    const record = vi.fn();
    const { fetch } = vertex([() => reply("I can't see an image in this request."), () => reply("I can't see an image in this request.")]);
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" }, { config, fetch, record });
    expect(out).toEqual({ kind: "refusal", message: "I can't see an image in this request." });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "refusal" }));
  });
  it("errors: not configured, an unknown skill, quota, unreachable — recorded except the first two", async () => {
    const record = vi.fn();
    expect(await runDirector({ skillId: "x", image, notes: "" }, { config: { configured: false, reason: "why" }, fetch, record })).toMatchObject({ kind: "error", code: "not_configured", status: 503, message: "why" });
    expect(await runDirector({ skillId: "nope", image, notes: "" }, { config, fetch: vertex([]).fetch, record })).toMatchObject({ kind: "error", code: "unknown_skill", status: 400 });
    expect(record).not.toHaveBeenCalled();
    const quota = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" }, { config, fetch: vertex([() => json(429, { error: { message: "Quota exceeded" } })]).fetch, record });
    expect(quota).toMatchObject({ kind: "error", code: "quota", status: 429, message: "Quota exceeded" });
    const down = (): Promise<Response> => Promise.reject(new Error("ECONNREFUSED"));
    const downFetch = ((input: string | URL | Request, init?: RequestInit) => (String(input instanceof Request ? input.url : input).endsWith("/token") ? vertex([]).fetch(input, init) : down())) as typeof fetch;
    expect(await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" }, { config, fetch: downFetch, record })).toMatchObject({ kind: "error", code: "unreachable", status: 502 });
    expect(record).toHaveBeenCalledTimes(2);
  });
  it("an abort by the caller is not recorded", async () => {
    const record = vi.fn();
    const controller = new AbortController();
    const impl = ((input: string | URL | Request, init: RequestInit = {}) => {
      if (String(input instanceof Request ? input.url : input).endsWith("/token")) return Promise.resolve(json(200, { access_token: "t", expires_in: 3600 }));
      controller.abort();
      const reason: unknown = init.signal?.reason;
      return Promise.reject(reason instanceof Error ? reason : new Error("aborted"));
    }) as typeof fetch;
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap", image, notes: "" , signal: controller.signal }, { config, fetch: impl, record });
    expect(out).toMatchObject({ kind: "error", code: "timeout", status: 499, message: "the run was stopped" });
    expect(record).not.toHaveBeenCalled();
  });
  it("a chain reply is checked per segment and the expansion turn is the chain's", async () => {
    const chain = readFileSync(path.resolve(__dirname, "../../tools/stub-generation-server/fixtures/agent/chain.txt"), "utf8");
    const { fetch, bodies } = vertex([() => reply(chain), () => reply(chain)]);
    const out = await runDirector({ skillId: "minimax-h3-director-thirst-trap-chain", image, notes: "3 segments" }, { config, fetch, record: vi.fn() });
    expect(out).toMatchObject({ kind: "prompt", segments: 3, findings: [] });
    const second = bodies[1]?.["contents"] as { parts: { text?: string }[] }[];
    expect(second[2]?.parts[0]?.text?.startsWith("Revise your reply: keep all 3 segments")).toBe(true);
  });
});
