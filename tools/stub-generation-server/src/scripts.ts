/**
 * The stub's outcomes, chosen by name per job (STORY_008). Progress advances per status poll, never by wall clock, so
 * a test's timing cannot change an outcome. `stepFor(script, pollCount)` returns the state after `pollCount` polls;
 * every script holds its last step forever, so a non-terminal last step (cancel-midway) stays `running` until DELETE.
 */
export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export interface JobError {
  readonly code: "moderated" | "generation_failed";
  readonly message: string;
}
export interface Step {
  readonly status: JobStatus;
  readonly progress: number;
  readonly error?: JobError;
}
export interface Script {
  readonly steps: readonly Step[];
  /** POST /jobs answers 400 when the request carries a reference image. */
  readonly rejectsUpload?: boolean;
  /** STORY_020: the shot changes the done result reports (contract v1.3 `result.cuts`); [] when absent. */
  readonly cuts?: readonly { readonly frame: number; readonly seconds: number }[];
}

const q = (progress: number): Step => ({ status: "queued", progress });
const r = (progress: number): Step => ({ status: "running", progress });
const done: Step = { status: "done", progress: 100 };

export const SCRIPTS = {
  "done-after-3-polls": { steps: [q(0), r(33), r(66), done] },
  "done-after-1-poll": { steps: [q(0), done] },
  "slow-done-after-10-polls": { steps: [q(0), q(0), r(10), r(20), r(30), r(45), r(60), r(75), r(90), r(95), done] },
  "fails-after-2-polls": {
    steps: [q(0), r(40), { status: "failed", progress: 40, error: { code: "generation_failed", message: "The generation server reported a failure (scripted)." } }],
  },
  moderated: {
    steps: [q(0), { status: "failed", progress: 0, error: { code: "moderated", message: "The prompt was refused on content grounds (scripted)." } }],
  },
  "cancel-midway": { steps: [q(0), r(10), r(25), r(50)] },
  // STORY_020: done, but the server measured a shot change 11.25 s in (the 2026-09-14 chain's dissolve, frame 270)
  "done-with-cut": { steps: [q(0), r(33), r(66), done], cuts: [{ frame: 270, seconds: 11.25 }] },
  "rejects-upload": { steps: [q(0), r(50), done], rejectsUpload: true },
} as const satisfies Record<string, Script>;

export type ScriptName = keyof typeof SCRIPTS;
export const DEFAULT_SCRIPT: ScriptName = "done-after-3-polls";
export const TERMINAL: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);

export function isScriptName(name: string): name is ScriptName {
  return Object.hasOwn(SCRIPTS, name);
}

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}

/** The state after `pollCount` status polls (0 = right after creation). */
export function stepFor(script: ScriptName, pollCount: number): Step {
  const steps = SCRIPTS[script].steps;
  const index = Math.min(Math.max(pollCount, 0), steps.length - 1);
  const step = steps[index];
  if (step === undefined) throw new Error(`script ${script} has no steps`);
  return step;
}

/** STORY_020: the shot changes a script's done result reports ([] unless the script says otherwise). */
export function cutsFor(name: ScriptName): readonly { readonly frame: number; readonly seconds: number }[] {
  const script: Script = SCRIPTS[name];
  return script.cuts ?? [];
}
