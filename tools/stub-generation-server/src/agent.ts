/**
 * The fake Vertex (STORY_049): the token endpoint, publishers.models.get and generateContent on the stub's own port, so
 * the gate never reaches Google. Outcomes by script name (`x-stub-script` or `?script=`, default "clean"); the request
 * and response shapes are the ones the real API showed STORY_048 (Vertex's discovery document rev. 20260904) — nothing
 * here is Google's code. Every generateContent request is recorded (the pass, the parts' kinds and heads, the image's
 * sha256, the safety and generation settings, whether the client aborted) for `GET /__stub/agent/runs`.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

export const AGENT_SCRIPTS = ["clean", "warn", "refusal", "refusal-text", "malformed", "slow", "quota", "chain", "chain-warn"] as const;
export type AgentScript = (typeof AGENT_SCRIPTS)[number];
export const DEFAULT_AGENT_SCRIPT: AgentScript = "clean";
export function isAgentScript(name: string): name is AgentScript {
  return (AGENT_SCRIPTS as readonly string[]).includes(name);
}
/** The ids publishers.models.get answers 200 for — the two the spike confirmed GA. */
export const KNOWN_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"] as const;
export const SLOW_DELAY_MS = 8000;

export type RecordedPart = { readonly kind: "text"; readonly head: string } | { readonly kind: "image"; readonly mimeType: string; readonly bytes: number; readonly sha256: string };
export interface RecordedRun {
  readonly id: string;
  readonly script: string;
  /** 1 for the draft, 2 for the expansion (a request with the model's own turn in it). */
  readonly pass: 1 | 2;
  readonly model: string;
  readonly systemInstructionWords: number;
  readonly parts: readonly RecordedPart[];
  readonly followUpHead?: string;
  readonly safetySettings: unknown;
  readonly generationConfig: unknown;
  readonly receivedAt: string;
  aborted: boolean;
}

interface Fixtures {
  readonly draft: string;
  readonly clean: string;
  readonly chain: string;
}
export function loadAgentFixtures(fixturesDir: string): Fixtures {
  const read = (name: string): string => readFileSync(path.join(fixturesDir, "agent", name), "utf8").trim();
  return { draft: read("draft.txt"), clean: read("clean.txt"), chain: read("chain.txt") };
}

/** `clean.txt` with the soundscape field dropped and the description cut to ≈ 300 words — two findings. */
export function warnText(clean: string): string {
  const withoutSoundscape = clean.replace(/\n\s*overall_soundscape:[^\n]*\n?/, "\n");
  const m = /(integrated_multimodal_description:\s*)([\s\S]*?)(\n\s*non_diegetic_music:)/.exec(withoutSoundscape);
  if (!m) return withoutSoundscape;
  const words = (m[2] ?? "").trim().split(/\s+/).slice(0, 300).join(" ");
  return withoutSoundscape.replace(m[0], `${m[1] ?? ""}${words}${m[3] ?? ""}`);
}
/** `chain.txt` with segment 2's description cut to ≈ 250 words. */
export function chainWarnText(chain: string): string {
  const segments = chain.split(/\n(?=integrated_multimodal_description:)/);
  const second = segments[2] ?? "";
  const m = /(integrated_multimodal_description:\s*)([\s\S]*?)(\n\s*overall_soundscape:)/.exec(second);
  if (!m) return chain; // a fixture without a third segment or its soundscape: served as it is
  segments[2] = second.replace(m[0], `${m[1] ?? ""}${(m[2] ?? "").trim().split(/\s+/).slice(0, 250).join(" ")}${m[3] ?? ""}`);
  return segments.join("\n");
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function reply(text: string, prompt: number, candidates: number): Record<string, unknown> {
  return {
    candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP", index: 0 }],
    usageMetadata: { promptTokenCount: prompt, candidatesTokenCount: candidates, totalTokenCount: prompt + candidates, thoughtsTokenCount: 0, promptTokensDetails: [{ modality: "TEXT", tokenCount: prompt - 1100 }, { modality: "IMAGE", tokenCount: 1100 }] },
    modelVersion: "gemini-3.8-flash",
  };
}

export interface AgentFake {
  /** True when the request was one of the fake's routes (handled, or a 404 within its space). */
  handle(req: IncomingMessage, res: ServerResponse, url: URL, body: () => Promise<Buffer>, send: (status: number, body: unknown) => void): Promise<boolean>;
  readonly runs: RecordedRun[];
  reset(): void;
}

const MODEL_PATH = /^\/v1\/projects\/([^/]+)\/locations\/([^/]+)\/publishers\/google\/models\/([^/:]+):generateContent$/;
const GET_MODEL_PATH = /^\/v1\/publishers\/google\/models\/([^/]+)$/;

export function createAgentFake(fixtures: Fixtures, { slowDelayMs = SLOW_DELAY_MS }: { readonly slowDelayMs?: number } = {}): AgentFake {
  const runs: RecordedRun[] = [];
  let counter = 0;
  return {
    runs,
    reset() {
      runs.length = 0;
      counter = 0;
    },
    async handle(req, res, url, body, send) {
      const method = req.method ?? "GET";
      const p = url.pathname;
      if (method === "POST" && p === "/token") {
        await body();
        send(200, { access_token: "stub-token", token_type: "Bearer", expires_in: 3600 });
        return true;
      }
      let m: RegExpExecArray | null;
      if (method === "GET" && (m = GET_MODEL_PATH.exec(p)) && m[1] !== undefined) {
        const id = m[1];
        if ((KNOWN_MODELS as readonly string[]).includes(id)) send(200, { name: `publishers/google/models/${id}`, versionId: "default", launchStage: "GA" });
        else send(404, { error: { code: 404, message: `Publisher Model \`publishers/google/models/${id}\` is not found.`, status: "NOT_FOUND" } });
        return true;
      }
      if (method === "POST" && (m = MODEL_PATH.exec(p)) && m[3] !== undefined) {
        const model = m[3];
        const scriptName = req.headers["x-stub-script"]?.toString() ?? url.searchParams.get("script") ?? DEFAULT_AGENT_SCRIPT;
        if (!isAgentScript(scriptName)) {
          send(400, { error: { code: 400, message: `unknown agent script ${scriptName}; one of ${AGENT_SCRIPTS.join(", ")}`, status: "INVALID_ARGUMENT" } });
          return true;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse((await body()).toString("utf8"));
        } catch {
          send(400, { error: { code: 400, message: "the request body is not JSON", status: "INVALID_ARGUMENT" } });
          return true;
        }
        const request = asRecord(parsed);
        const contents = Array.isArray(request["contents"]) ? request["contents"] : [];
        const pass: 1 | 2 = contents.length >= 3 ? 2 : 1;
        const userParts = Array.isArray(asRecord(contents[0])["parts"]) ? (asRecord(contents[0])["parts"] as unknown[]) : [];
        const parts: RecordedPart[] = userParts.map((raw) => {
          const part = asRecord(raw);
          if (typeof part["text"] === "string") return { kind: "text", head: part["text"].slice(0, 60) };
          const inline = asRecord(part["inlineData"]);
          const data = typeof inline["data"] === "string" ? Buffer.from(inline["data"], "base64") : Buffer.alloc(0);
          return { kind: "image", mimeType: typeof inline["mimeType"] === "string" ? inline["mimeType"] : "?", bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
        });
        const followUpParts = pass === 2 ? asRecord(contents[2])["parts"] : undefined;
        const followUpHead = Array.isArray(followUpParts) && typeof asRecord(followUpParts[0])["text"] === "string" ? (asRecord(followUpParts[0])["text"] as string).slice(0, 60) : undefined;
        const system = asRecord(request["systemInstruction"]);
        const systemParts = Array.isArray(system["parts"]) ? (system["parts"] as unknown[]) : [];
        const systemText = systemParts.map((x) => asRecord(x)["text"]).filter((t): t is string => typeof t === "string").join(" ");
        counter += 1;
        const run: RecordedRun = { id: String(counter), script: scriptName, pass, model, systemInstructionWords: systemText.trim() === "" ? 0 : systemText.trim().split(/\s+/).length, parts, ...(followUpHead === undefined ? {} : { followUpHead }), safetySettings: request["safetySettings"], generationConfig: request["generationConfig"], receivedAt: new Date().toISOString(), aborted: false };
        runs.push(run);
        const answer = (status: number, out: unknown): void => {
          if (run.aborted) return;
          send(status, out);
        };
        // the response's close before it finished = the client hung up (a Stop in the composer, an aborted request)
        res.on("close", () => {
          if (!res.writableFinished) run.aborted = true;
        });
        switch (scriptName) {
          case "clean":
            answer(200, pass === 1 ? reply(fixtures.draft, 9552, 399) : reply(fixtures.clean, 10120, 684));
            return true;
          case "warn":
            answer(200, pass === 1 ? reply(fixtures.draft, 9552, 399) : reply(warnText(fixtures.clean), 10120, 430));
            return true;
          case "chain":
            answer(200, reply(fixtures.chain, pass === 1 ? 9552 : 14603, pass === 1 ? 3351 : 3629));
            return true;
          case "chain-warn":
            answer(200, reply(pass === 1 ? fixtures.chain : chainWarnText(fixtures.chain), pass === 1 ? 9552 : 14603, 3300));
            return true;
          case "refusal":
            answer(200, { candidates: [{ finishReason: "SAFETY", index: 0, safetyRatings: [{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "HIGH", blocked: true }] }], usageMetadata: { promptTokenCount: 9552, candidatesTokenCount: 0, totalTokenCount: 9552 } });
            return true;
          case "refusal-text":
            answer(200, reply("I can't help with creating this kind of content. If you'd like, I can write a prompt for a different scene.", 9552, 28));
            return true;
          case "malformed":
            answer(200, reply("I can't see an image in this request.", 9552, 9));
            return true;
          case "slow":
            setTimeout(() => { answer(200, pass === 1 ? reply(fixtures.draft, 9552, 399) : reply(fixtures.clean, 10120, 684)); }, slowDelayMs);
            return true;
          case "quota":
            answer(429, { error: { code: 429, message: "Quota exceeded for aiplatform.googleapis.com/generate_content_requests_per_minute_per_project_per_base_model", status: "RESOURCE_EXHAUSTED" } });
            return true;
        }
      }
      if (method === "GET" && p === "/__stub/agent/runs") {
        send(200, { runs });
        return true;
      }
      return false;
    },
  };
}
