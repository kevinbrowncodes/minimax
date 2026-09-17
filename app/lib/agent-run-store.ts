/**
 * Runs that ended without a prompt (STORY_049): a refusal or an error the owner may have walked away from. `agent-runs.json`
 * beside `history.json` (the env and skills stores' pattern: read on every call, written atomically, /data in the
 * container), the last 200 kept, newest first. Never a prompt (that is the reply, in the composer), never an abort (the
 * owner's own act — the epic's list said Stop; corrected in the story). No image is stored: the skill, the notes, the
 * outcome and its message. STORY_050 merges them into the Inbox and stamps `openedAt` when a row is opened.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore } from "./history-store";

export type AgentRunOutcome = "refusal" | "error";
export interface AgentRun {
  readonly id: string;
  /** ISO. */
  readonly at: string;
  /** The skill's folder id (reopening the run selects it). */
  readonly skill: string;
  /** The skill's short name, for the Inbox row (STORY_050). */
  readonly skillName?: string;
  readonly notes: string;
  readonly outcome: AgentRunOutcome;
  /** The model's words verbatim, or the route's error message. */
  readonly message: string;
  readonly openedAt?: string;
}
export const AGENT_RUNS_MAX = 200;

export function agentRunsFile(): string {
  return path.join(path.dirname(historyStore().file), "agent-runs.json");
}

function isRun(v: unknown): v is AgentRun {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r["id"] === "string" && typeof r["at"] === "string" && typeof r["skill"] === "string" && (r["skillName"] === undefined || typeof r["skillName"] === "string") && typeof r["notes"] === "string" && (r["outcome"] === "refusal" || r["outcome"] === "error") && typeof r["message"] === "string" && (r["openedAt"] === undefined || typeof r["openedAt"] === "string");
}

/** Newest first; garbage on disk reads as empty. */
export function listAgentRuns(): readonly AgentRun[] {
  let text: string;
  try {
    text = readFileSync(agentRunsFile(), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRun).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  } catch {
    return [];
  }
}

function write(runs: readonly AgentRun[]): void {
  const file = agentRunsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(runs, null, 2));
  renameSync(tmp, file);
}

export function recordAgentRun(input: Omit<AgentRun, "id" | "at"> & { readonly at?: string }): AgentRun {
  const run: AgentRun = { id: randomUUID(), at: input.at ?? new Date().toISOString(), skill: input.skill, ...(input.skillName === undefined ? {} : { skillName: input.skillName }), notes: input.notes, outcome: input.outcome, message: input.message };
  write([run, ...listAgentRuns()].slice(0, AGENT_RUNS_MAX));
  return run;
}

/** Stamp when the owner opened the row; undefined when there is no such run. */
export function markAgentRunOpened(id: string, openedAt = new Date().toISOString()): AgentRun | undefined {
  const runs = listAgentRuns();
  const run = runs.find((r) => r.id === id);
  if (run === undefined) return undefined;
  const updated: AgentRun = { ...run, openedAt };
  write(runs.map((r) => (r.id === id ? updated : r)));
  return updated;
}

/** Forget every run (the e2e lane between specs; a Clear in the Inbox later if the owner wants one). */
export function clearAgentRuns(): void {
  write([]);
}
