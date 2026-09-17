/** STORY_049: the store of runs that ended without a prompt. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AGENT_RUNS_MAX, agentRunsFile, clearAgentRuns, listAgentRuns, markAgentRunOpened, recordAgentRun } from "./agent-run-store";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "agent-runs-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("agent-run-store", () => {
  it("lives beside the history file, records newest first, and stamps openedAt", () => {
    expect(agentRunsFile()).toBe(path.join(dir, "agent-runs.json"));
    expect(listAgentRuns()).toEqual([]);
    const a = recordAgentRun({ skill: "s", notes: "n1", outcome: "refusal", message: "no", at: "2026-09-17T10:00:00.000Z" });
    const b = recordAgentRun({ skill: "s", notes: "n2", outcome: "error", message: "boom", at: "2026-09-17T11:00:00.000Z" });
    expect(listAgentRuns().map((r) => r.id)).toEqual([b.id, a.id]);
    expect(markAgentRunOpened(a.id, "2026-09-17T12:00:00.000Z")).toMatchObject({ id: a.id, openedAt: "2026-09-17T12:00:00.000Z" });
    expect(listAgentRuns().find((r) => r.id === a.id)?.openedAt).toBe("2026-09-17T12:00:00.000Z");
    expect(markAgentRunOpened("nope")).toBeUndefined();
    expect(JSON.parse(readFileSync(agentRunsFile(), "utf8"))).toHaveLength(2);
  });
  it("keeps the last 200 and reads garbage as empty", () => {
    for (let i = 0; i < AGENT_RUNS_MAX + 5; i += 1) recordAgentRun({ skill: "s", notes: String(i), outcome: "error", message: "m", at: new Date(Date.UTC(2026, 8, 17, 0, i)).toISOString() });
    expect(listAgentRuns()).toHaveLength(AGENT_RUNS_MAX);
    expect(listAgentRuns()[0]?.notes).toBe(String(AGENT_RUNS_MAX + 4));
    writeFileSync(agentRunsFile(), "{not json");
    expect(listAgentRuns()).toEqual([]);
    writeFileSync(agentRunsFile(), JSON.stringify([{ id: 1 }, { id: "x", at: "2026-09-17T00:00:00Z", skill: "s", notes: "", outcome: "refusal", message: "m" }]));
    expect(listAgentRuns()).toHaveLength(1);
    clearAgentRuns();
    expect(listAgentRuns()).toEqual([]);
  });
});
