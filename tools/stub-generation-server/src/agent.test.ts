/** STORY_049: the fake Vertex — every script's shape, the two passes, the record, the token and model paths. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "./server.ts";
import { chainWarnText, loadAgentFixtures, warnText } from "./agent.ts";

async function withStub(run: (base: string, stub: StubServer) => Promise<void>): Promise<void> {
  const stub = createStubServer({ fixture: "mp4", apiKey: "secret", agentSlowDelayMs: 150 });
  const port = await stub.listen(0);
  try {
    await run(`http://127.0.0.1:${String(port)}`, stub);
  } finally {
    await stub.close();
  }
}
const generate = (base: string, script: string | undefined, contents: unknown[]): Promise<Response> =>
  fetch(`${base}/v1/projects/p/locations/global/publishers/google/models/gemini-3.8-flash:generateContent`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer stub-token", ...(script === undefined ? {} : { "x-stub-script": script }) }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "one two three" }] }, contents, safetySettings: [{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" }], generationConfig: { maxOutputTokens: 16384 } }) });
const image = Buffer.from("fake-image-bytes");
const userTurn = [{ role: "user", parts: [{ text: "references/a.md:\n\nA" }, { text: "The attached photo — the first frame:" }, { inlineData: { mimeType: "image/png", data: image.toString("base64") } }, { text: "Notes: x" }] }];
const text = async (res: Response): Promise<string> => ((await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] }).candidates[0]?.content.parts[0]?.text ?? "";

describe("the fake Vertex", () => {
  it("answers the token path and publishers.models.get without the generation server's bearer", async () => {
    await withStub(async (base) => {
      const tok = await fetch(`${base}/token`, { method: "POST", body: "grant_type=x&assertion=y" });
      expect(await tok.json()).toEqual({ access_token: "stub-token", token_type: "Bearer", expires_in: 3600 });
      expect((await fetch(`${base}/v1/publishers/google/models/gemini-3.8-flash`)).status).toBe(200);
      expect((await fetch(`${base}/v1/publishers/google/models/gemini-3-flash`)).status).toBe(404);
    });
  });
  it("clean: the draft on pass 1, the expanded prompt on pass 2; the record shows the pass, the parts and the image's sha256", async () => {
    await withStub(async (base) => {
      const fixtures = loadAgentFixtures(DEFAULT_FIXTURES_DIR);
      expect(await text(await generate(base, undefined, userTurn))).toBe(fixtures.draft);
      expect(await text(await generate(base, "clean", [...userTurn, { role: "model", parts: [{ text: fixtures.draft }] }, { role: "user", parts: [{ text: "Revise your prompt: …" }] }]))).toBe(fixtures.clean);
      const { runs } = (await (await fetch(`${base}/__stub/agent/runs`)).json()) as { runs: { pass: number; script: string; parts: { kind: string; head?: string; sha256?: string }[]; followUpHead?: string; systemInstructionWords: number; safetySettings: unknown }[] };
      expect(runs.map((r) => [r.script, r.pass])).toEqual([["clean", 1], ["clean", 2]]);
      expect(runs[0]?.parts.map((p) => p.kind)).toEqual(["text", "text", "image", "text"]);
      expect(runs[0]?.parts[2]?.sha256).toBe(createHash("sha256").update(image).digest("hex"));
      expect(runs[0]?.systemInstructionWords).toBe(3);
      expect(runs[1]?.followUpHead?.startsWith("Revise your prompt")).toBe(true);
      expect(runs[0]?.safetySettings).toEqual([{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" }]);
      expect((await fetch(`${base}/__stub/reset`, { method: "POST" })).status).toBe(200);
      expect(((await (await fetch(`${base}/__stub/agent/runs`)).json()) as { runs: unknown[] }).runs).toEqual([]);
    });
  });
  it("warn drops the soundscape and shortens; chain serves three segments; chain-warn shortens segment 2", () => {
    const f = loadAgentFixtures(DEFAULT_FIXTURES_DIR);
    expect(warnText(f.clean)).not.toContain("overall_soundscape:");
    expect(warnText(f.clean)).toContain("non_diegetic_music:");
    expect((f.chain.match(/^integrated_multimodal_description:/gm) ?? []).length).toBe(3);
    const warn = chainWarnText(f.chain).split(/\n(?=integrated_multimodal_description:)/);
    expect((warn[2] ?? "").split(/\s+/).length).toBeLessThan((f.chain.split(/\n(?=integrated_multimodal_description:)/)[2] ?? "").split(/\s+/).length);
  });
  it("refusal, refusal-text, malformed and quota have the shapes the spike recorded; an unknown script is a 400", async () => {
    await withStub(async (base) => {
      const refusal = (await (await generate(base, "refusal", userTurn)).json()) as { candidates: { finishReason: string }[] };
      expect(refusal.candidates[0]?.finishReason).toBe("SAFETY");
      expect(await text(await generate(base, "refusal-text", userTurn))).toContain("I can't help");
      expect(await text(await generate(base, "malformed", userTurn))).toBe("I can't see an image in this request.");
      const quota = await generate(base, "quota", userTurn);
      expect(quota.status).toBe(429);
      expect(((await quota.json()) as { error: { status: string } }).error.status).toBe("RESOURCE_EXHAUSTED");
      expect((await generate(base, "nope", userTurn)).status).toBe(400);
    });
  });
  it("slow answers after the delay and notes an abort; chain and chain-warn serve three segments; ?script= and a bad body are handled", async () => {
    await withStub(async (base) => {
      const started = Date.now();
      expect(await text(await generate(base, "slow", userTurn))).not.toBe("");
      expect(Date.now() - started).toBeGreaterThanOrEqual(140);
      const controller = new AbortController();
      const pending = fetch(`${base}/v1/projects/p/locations/global/publishers/google/models/gemini-3.8-flash:generateContent?script=slow`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: userTurn }), signal: controller.signal });
      await new Promise((r) => setTimeout(r, 30));
      controller.abort();
      await expect(pending).rejects.toThrow();
      await new Promise((r) => setTimeout(r, 250));
      const { runs } = (await (await fetch(`${base}/__stub/agent/runs`)).json()) as { runs: { script: string; aborted: boolean; followUpHead?: string; systemInstructionWords: number }[] };
      expect(runs.map((r) => [r.script, r.aborted])).toEqual([["slow", false], ["slow", true]]);
      expect(runs[1]?.systemInstructionWords).toBe(0);
      expect(runs[1]?.followUpHead).toBeUndefined();
      const chain = await text(await generate(base, "chain", userTurn));
      expect((chain.match(/^integrated_multimodal_description:/gm) ?? []).length).toBe(3);
      const chainWarn = await text(await generate(base, "chain-warn", [...userTurn, { role: "model", parts: [{ text: chain }] }, { role: "user", parts: [{ text: "Revise" }] }]));
      expect(chainWarn.length).toBeLessThan(chain.length);
      expect(await text(await generate(base, "chain-warn", userTurn))).toBe(chain);
      const bad = await fetch(`${base}/v1/projects/p/locations/global/publishers/google/models/m:generateContent`, { method: "POST", body: "{not json" });
      expect(bad.status).toBe(400);
    });
  });
  it("warnText and chainWarnText leave a text they cannot cut as it is", () => {
    expect(warnText("no fields here")).toBe("no fields here");
    expect(chainWarnText("one segment only")).toBe("one segment only");
  });
});
