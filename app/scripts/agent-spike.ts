/**
 * The spike (STORY_048): one photo through a director skill on Gemini, from the command line, printing what the
 * Done note needs — the model, the finish reason, the token counts (the image's share), the safety ratings, the
 * latency, and the reply verbatim between markers. Runs inside the `agent-spike` compose service (the gate image with
 * the key mounted read-only): spark/gcloud/spike.sh <skill-dir> <image> [notes…] [--safety default|least]
 * [--media low|medium|high] [--model <id>] [--out <dir>]; `--models` gets each candidate id from Vertex instead.
 *
 * Reads VERTEX_PROJECT, VERTEX_LOCATION and GOOGLE_APPLICATION_CREDENTIALS from the environment; never prints the token
 * or the key. Imports only lib/ and node: modules (a guard test keeps it so), so the assembly it sends is the route's.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assembleRequest, expandInstruction, readSkill } from "../lib/agent-request";
import { fetchToken, generateContent, getPublisherModel, readKeyFile, safetySettingsAt, type GenerateRequest, type HarmBlockThreshold, type MediaResolution, type Part, type SafetySetting, type VertexTarget } from "../lib/vertex";

/** The Flash ids Google's model page listed on 2026-09-17 (its navigation; the body is client-rendered); `get` says which exist and their stage. */
const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
const MIME: Readonly<Record<string, string>> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const MEDIA: Readonly<Record<string, MediaResolution>> = { low: "MEDIA_RESOLUTION_LOW", medium: "MEDIA_RESOLUTION_MEDIUM", high: "MEDIA_RESOLUTION_HIGH" };

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}
function has(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}
function env(name: string): string {
  const v = process.env[name]?.trim();
  if (v === undefined || v === "") throw new Error(`${name} is not set`);
  return v;
}
/** Paths are given from the repo root; pnpm runs this in app/, so resolve against where pnpm was invoked. */
function fromRoot(p: string): string {
  return path.resolve(process.env["INIT_CWD"] ?? process.cwd(), p);
}
function wordsOf(text: string): number {
  const m = /integrated_multimodal_description:([\s\S]*?)(?=\n\s*overall_soundscape:|$)/.exec(text);
  return m?.[1] === undefined ? 0 : m[1].trim().split(/\s+/).length;
}
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const listModels = has(args, "--models");
  const safety = flag(args, "--safety") ?? "default";
  const media = flag(args, "--media");
  const out = flag(args, "--out");
  const envModel = process.env["VERTEX_MODEL"]?.trim();
  const maxTokens = Number(flag(args, "--max-tokens") ?? "4096");
  const thinking = flag(args, "--thinking");
  const expand = has(args, "--expand");
  const model = flag(args, "--model") ?? (envModel !== undefined && envModel !== "" ? envModel : "gemini-3.8-flash");
  const location = process.env["VERTEX_LOCATION"]?.trim();
  const target: VertexTarget = { project: env("VERTEX_PROJECT"), location: location !== undefined && location !== "" ? location : "us-central1", model, ...(process.env["VERTEX_BASE_URL"] === undefined ? {} : { baseUrl: process.env["VERTEX_BASE_URL"] }) };
  const key = readKeyFile(env("GOOGLE_APPLICATION_CREDENTIALS"));
  const token = await fetchToken(key, { tokenUrl: process.env["VERTEX_TOKEN_URL"] });

  if (listModels) {
    console.log(`publishers.models.get, ${target.location}, ${new Date().toISOString().slice(0, 10)}:`);
    for (const id of CANDIDATE_MODELS) {
      const m = await getPublisherModel(target, token, id);
      console.log(m.ok ? `  ${id.padEnd(24)} ${m.launchStage.padEnd(8)} version ${m.versionId}` : `  ${id.padEnd(24)} ${String(m.status)} ${m.message.slice(0, 60)}`);
    }
    return 0;
  }

  const [skillDir, imagePath, ...noteWords] = args;
  if (skillDir === undefined || imagePath === undefined) {
    console.error("usage: agent:spike <skill-dir> <image> [notes…] [--safety default|least] [--media low|medium|high] [--model <id>] [--max-tokens N] [--thinking low|medium|high|minimal] [--expand] [--out <dir>] | --models");
    return 2;
  }
  const skill = readSkill(fromRoot(skillDir));
  const mimeType = MIME[path.extname(imagePath).toLowerCase()];
  if (mimeType === undefined) throw new Error(`${imagePath}: not a jpg, png or webp`);
  const image = { bytes: readFileSync(fromRoot(imagePath)), mimeType };
  const notes = noteWords.join(" ");
  const assembled = assembleRequest(skill, image, notes);
  const level = media === undefined ? undefined : MEDIA[media];
  if (media !== undefined && level === undefined) throw new Error(`--media ${media}: use low, medium or high`);
  const parts: Part[] = assembled.parts.map((p) => ("inlineData" in p && level !== undefined ? { ...p, mediaResolution: { level } } : p));

  const thresholds: HarmBlockThreshold[] = safety === "least" ? ["OFF", "BLOCK_NONE"] : [];
  let settings: readonly SafetySetting[] | undefined = safety === "least" ? safetySettingsAt("OFF") : undefined;
  const request = (s: readonly SafetySetting[] | undefined): GenerateRequest => ({ systemInstruction: assembled.systemInstruction, parts, safetySettings: s, generationConfig: { maxOutputTokens: maxTokens, ...(thinking === undefined ? {} : { thinkingConfig: { thinkingLevel: thinking.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "MINIMAL" } }) } });

  const header = `model ${target.model} · region ${target.location} · skill ${skill.id} v${skill.metadata["version"] ?? "?"} · image ${imagePath} (${String(image.bytes.length)} bytes, ${mimeType}) · notes: ${notes === "" ? "(none)" : notes} · safety: ${safety}${level === undefined ? "" : ` · media ${level}`} · maxOutputTokens ${String(maxTokens)}${thinking === undefined ? "" : ` · thinking ${thinking}`}${expand ? " · two-pass" : ""}`;
  console.log(header);
  let started = Date.now();
  let result = await generateContent(target, token, request(settings));
  // "least restrictive": OFF for every text category; a category that needs an allowlist for OFF is refused with a 400 naming it — fall back to BLOCK_NONE for that one and say so
  if (result.kind === "error" && result.status === 400 && settings !== undefined && thresholds.length === 2) {
    const named = settings.filter((s) => result.kind === "error" && result.message.includes(s.category)).map((s) => s.category);
    const fallback = named.length > 0 ? named : settings.map((s) => s.category);
    console.log(`safety: OFF refused (${result.message.slice(0, 120)}) — retrying with BLOCK_NONE for ${fallback.join(", ")}`);
    settings = settings.map((s) => (fallback.includes(s.category) ? { ...s, threshold: "BLOCK_NONE" } : s));
    started = Date.now();
    result = await generateContent(target, token, request(settings));
  }
  let seconds = ((Date.now() - started) / 1000).toFixed(1);
  const lines: string[] = [header];
  // the second pass: the draft goes back with the expansion turn; the draft's numbers are kept for the note
  if (expand && result.kind === "reply") {
    const draft = result;
    const draftWords = wordsOf(draft.text);
    lines.push(`DRAFT · finish ${draft.finishReason} · ${seconds} s · ${String(draftWords)} description words · candidates ${String(draft.usage.candidateTokens)} · thoughts ${String(draft.usage.thoughtTokens)}`);
    started = Date.now();
    result = await generateContent(target, token, { ...request(settings), followUp: { modelText: draft.text, userText: expandInstruction(450, 600) } });
    seconds = ((Date.now() - started) / 1000).toFixed(1);
  }
  if (result.kind === "error") {
    lines.push(`ERROR ${String(result.status)} after ${seconds} s: ${result.message}`);
  } else {
    const u = result.usage;
    const usage = u === undefined ? "usage: (none)" : `usage: prompt ${String(u.promptTokens)} (${Object.entries(u.promptByModality).map(([m, n]) => `${m.toLowerCase()} ${String(n)}`).join(", ")}) · candidates ${String(u.candidateTokens)} · thoughts ${String(u.thoughtTokens)} · total ${String(u.totalTokens)}`;
    const ratings = result.safetyRatings.map((r) => `${r.category.replace("HARM_CATEGORY_", "").toLowerCase()} ${r.probability.toLowerCase()}${r.blocked ? " BLOCKED" : ""}`).join(", ");
    lines.push(`${result.kind.toUpperCase()} · finish ${result.kind === "reply" ? result.finishReason : (result.finishReason ?? result.blockReason ?? "?")} · ${seconds} s${result.kind === "reply" && result.modelVersion !== undefined ? ` · model version ${result.modelVersion}` : ""}`);
    lines.push(usage);
    lines.push(`safety ratings: ${ratings === "" ? "(none)" : ratings}`);
    lines.push(`safety settings sent: ${settings === undefined ? "(model defaults)" : settings.map((s) => `${s.category.replace("HARM_CATEGORY_", "").toLowerCase()}=${s.threshold}`).join(" ")}`);
    lines.push("----- reply -----");
    lines.push(result.kind === "reply" ? result.text : result.message);
    lines.push("----- end -----");
    if (result.kind === "reply") {
      const words = wordsOf(result.text);
      lines.push(`description words: ${String(words)} · starts with the instruction line: ${result.text.startsWith("For the target video") ? "yes" : "NO"} · soundscape: ${result.text.includes("overall_soundscape:") ? "yes" : "NO"} · music: ${result.text.includes("non_diegetic_music:") ? "yes" : "NO"} · bracketed times: ${/\[\d{1,2}:\d{2}/.test(result.text) ? "YES" : "none"} · fences: ${result.text.includes("```") ? "YES" : "none"}`);
    }
  }
  for (const line of lines.slice(1)) console.log(line);
  if (out !== undefined) {
    mkdirSync(fromRoot(out), { recursive: true });
    const file = path.join(fromRoot(out), `${stamp()}-${path.basename(imagePath, path.extname(imagePath))}-${safety}${level === undefined ? "" : `-${media ?? ""}`}${expand ? "-expanded" : ""}.txt`);
    writeFileSync(file, `${lines.join("\n")}\n`);
    console.log(`saved: ${file}`);
  }
  return result.kind === "error" ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
