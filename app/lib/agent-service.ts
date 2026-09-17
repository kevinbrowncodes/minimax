/**
 * The director run (STORY_049), as one server-side function the route wraps: the skill from disk, the request assembled
 * in STORY_048's order, two passes on Vertex (the draft, then the draft sent back with the expansion turn), the format
 * check on the result, and one of three answers — a prompt with its findings, the model's refusal verbatim, or an error
 * naming the cause. A run that ends without a prompt is recorded for the Inbox (never an abort). Nothing here logs a
 * token, a key or a URL; the route turns the answer into HTTP.
 */
import path from "node:path";
import { readAgentConfig, type AgentConfig } from "./agent-config";
import { assembleRequest, directorGenerationConfig, DIRECTOR_EXPAND_WORDS, DIRECTOR_SAFETY_SETTINGS, expandChainInstruction, expandInstruction, readSkill, type ImageInput, type InstructionInput, type SkillFolder } from "./agent-request";
import { recordAgentRun } from "./agent-run-store";
import { checkPromptFormat, splitSegments, type Finding } from "./prompt-format";
import { generateContent, tokenFor, type GenerateRequest, type GenerateResult, type Token, type VertexTarget } from "./vertex";

export type RunOutcome =
  | { readonly kind: "prompt"; readonly prompt: string; readonly findings: readonly Finding[]; readonly segments: number; readonly passes: 1 | 2 }
  | { readonly kind: "refusal"; readonly message: string }
  | { readonly kind: "error"; readonly code: "not_configured" | "unknown_skill" | "unreachable" | "quota" | "bad_reply" | "timeout" | "upstream"; readonly status: number; readonly message: string };

export interface RunInput {
  readonly skillId: string;
  readonly image: ImageInput;
  readonly notes: string;
  /** STORY_052's active instructions; none today. */
  readonly instructions?: readonly InstructionInput[];
  readonly signal?: AbortSignal;
  /** The e2e lane's script name, forwarded to the fake as `x-stub-script`. */
  readonly script?: string;
}
export interface RunDeps {
  readonly config?: AgentConfig;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly record?: typeof recordAgentRun;
}

function fetchWithScript(base: typeof fetch, script: string | undefined): typeof fetch {
  if (script === undefined) return base;
  return (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("x-stub-script", script);
    return base(input, { ...init, headers });
  };
}

/** The number of segments the notes ask for ("6 segments", "four scripts"), else the skill's default, else 1. */
function segmentsAsked(skill: SkillFolder, notes: string): number {
  const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const m = /\b(\d|two|three|four|five|six)\s+(?:segments?|scripts?|clips?|parts?)\b/i.exec(notes);
  if (m?.[1] !== undefined) return words[m[1].toLowerCase()] ?? Number(m[1]);
  const fallback = Number(skill.metadata["minimax-segments-default"]);
  return Number.isFinite(fallback) && fallback > 1 ? fallback : 1;
}

export async function runDirector(input: RunInput, { config = readAgentConfig(), fetch: fetchImpl = fetch, now = Date.now, record = recordAgentRun }: RunDeps = {}): Promise<RunOutcome> {
  if (!config.configured) return { kind: "error", code: "not_configured", status: 503, message: config.reason };
  let skill: SkillFolder;
  try {
    skill = readSkill(path.join(config.skillsDir, path.basename(input.skillId)));
  } catch {
    return { kind: "error", code: "unknown_skill", status: 400, message: `${input.skillId} is not a skill under the agent's skills directory` };
  }
  const doFetch = fetchWithScript(fetchImpl, input.script);
  let token: Token;
  try {
    token = await tokenFor(config.keyFile, { fetch: doFetch, now, ...(config.tokenUrl === undefined ? {} : { tokenUrl: config.tokenUrl }) });
  } catch (error) {
    return fail("unreachable", 502, `the credential could not be exchanged for a token: ${error instanceof Error ? error.message : String(error)}`);
  }
  const target: VertexTarget = { project: config.project, location: config.location, model: config.model, ...(config.vertexBaseUrl === undefined ? {} : { baseUrl: config.vertexBaseUrl }) };
  const assembled = assembleRequest(skill, input.image, input.notes, input.instructions ?? []);
  const base: GenerateRequest = { systemInstruction: assembled.systemInstruction, parts: assembled.parts, safetySettings: DIRECTOR_SAFETY_SETTINGS, generationConfig: directorGenerationConfig(config.thinking) };
  const timeoutMs = config.timeoutMs;
  const timer = AbortSignal.timeout(timeoutMs);
  const signal = input.signal === undefined ? timer : AbortSignal.any([input.signal, timer]);
  const call = (request: GenerateRequest): Promise<GenerateResult> => generateContent(target, token, request, { fetch: doFetch, signal });
  const isChain = segmentsAsked(skill, input.notes) > 1;

  const first = await call(base);
  const early = judge(first);
  if (early !== undefined) return early;
  if (first.kind !== "reply") return fail("bad_reply", 502, "the model answered without a reply"); // unreachable: judge returned for the other kinds
  // the second pass: the model expands its own draft (STORY_048: it writes ≈ 250 words otherwise)
  const followUp = { modelText: first.text, userText: isChain ? expandChainInstruction(splitSegments(first.text).length, 400, 550) : expandInstruction(DIRECTOR_EXPAND_WORDS.min, DIRECTOR_EXPAND_WORDS.max) };
  const second = await call({ ...base, followUp });
  const text = second.kind === "reply" ? second.text : first.text; // a refusal or error on the expansion keeps the draft
  const check = checkPromptFormat(text, { chain: isChain });
  if (!check.isPrompt) {
    // the model spoke instead of directing: an empty reply is a bad reply; words are shown as the model's refusal
    if (text.trim() === "") return fail("bad_reply", 502, "the model returned no text");
    record({ skill: input.skillId, skillName: skillName(), notes: input.notes, outcome: "refusal", message: text.trim() });
    return { kind: "refusal", message: text.trim() };
  }
  return { kind: "prompt", prompt: check.prompt, findings: check.findings, segments: check.segments, passes: second.kind === "reply" ? 2 : 1 };

  function skillName(): string {
    return skill.metadata["minimax-short-name"] ?? skill.name;
  }
  function fail(code: Exclude<RunOutcome, { kind: "prompt" | "refusal" }>["code"], status: number, message: string): RunOutcome {
    if (!input.signal?.aborted) record({ skill: input.skillId, skillName: skillName(), notes: input.notes, outcome: "error", message });
    return { kind: "error", code, status, message };
  }
  function judge(result: GenerateResult): RunOutcome | undefined {
    if (result.kind === "reply") return undefined;
    if (result.kind === "refusal") {
      record({ skill: input.skillId, skillName: skillName(), notes: input.notes, outcome: "refusal", message: result.message });
      return { kind: "refusal", message: result.message };
    }
    if (input.signal?.aborted) return { kind: "error", code: "timeout", status: 499, message: "the run was stopped" };
    if (timer.aborted) return fail("timeout", 504, `the model did not answer within ${String(Math.round(timeoutMs / 1000))} s`);
    if (result.status === 429) return fail("quota", 429, result.message);
    if (result.status === 0) return fail("unreachable", 502, result.message);
    return fail("upstream", 502, result.message);
  }
}
