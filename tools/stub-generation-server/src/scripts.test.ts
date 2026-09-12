import { describe, expect, it } from "vitest";
import { DEFAULT_SCRIPT, SCRIPTS, isScriptName, isTerminal, stepFor, type ScriptName } from "./scripts.ts";

describe("scripts", () => {
  it("done-after-3-polls walks queued, running 33, running 66, done and then stays done", () => {
    const seen = [0, 1, 2, 3, 4, 9].map((n) => stepFor("done-after-3-polls", n));
    expect(seen.map((s) => `${s.status}/${String(s.progress)}`)).toEqual([
      "queued/0", "running/33", "running/66", "done/100", "done/100", "done/100",
    ]);
  });

  it("fails-after-2-polls ends failed with generation_failed and moderated fails on the first poll", () => {
    expect(stepFor("fails-after-2-polls", 2)).toMatchObject({ status: "failed", error: { code: "generation_failed" } });
    expect(stepFor("moderated", 0)).toMatchObject({ status: "queued" });
    expect(stepFor("moderated", 1)).toMatchObject({ status: "failed", error: { code: "moderated" } });
  });

  it("cancel-midway never reaches a terminal state on its own", () => {
    for (const n of [0, 1, 2, 3, 50]) expect(isTerminal(stepFor("cancel-midway", n).status)).toBe(false);
  });

  it("progress never decreases and every script except cancel-midway ends terminal", () => {
    for (const name of Object.keys(SCRIPTS) as ScriptName[]) {
      const steps = SCRIPTS[name].steps;
      for (let i = 1; i < steps.length; i++) {
        const prev = steps[i - 1];
        const cur = steps[i];
        if (prev && cur) expect(cur.progress).toBeGreaterThanOrEqual(prev.progress);
      }
      const last = steps[steps.length - 1];
      if (name !== "cancel-midway" && last) expect(isTerminal(last.status)).toBe(true);
    }
  });

  it("recognises script names and the default, and rejects unknown ones", () => {
    expect(isScriptName(DEFAULT_SCRIPT)).toBe(true);
    expect(isScriptName("rejects-upload")).toBe(true);
    expect(isScriptName("nope")).toBe(false);
    expect(isScriptName("constructor")).toBe(false);
  });
});
