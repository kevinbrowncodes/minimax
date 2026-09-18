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
  /** STORY_020: the shot changes the done result reports (contract v1.3 `result.cuts`); [] when absent. STORY_046 (v1.4): each with its kind. */
  readonly cuts?: readonly Cut[];
  /** STORY_046 (v1.4): what the prompt asked of the camera, as the done result reports it; "static" when absent. */
  readonly camera?: Camera;
}
export type CutKind = "cut" | "framing";
export type Camera = "static" | "moving" | "unknown";
export interface Cut {
  readonly frame: number;
  readonly seconds: number;
  readonly kind: CutKind;
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
  "done-with-cut": { steps: [q(0), r(33), r(66), done], cuts: [{ frame: 270, seconds: 11.25, kind: "cut" }], camera: "static" },
  // STORY_046: the office round's handheld draw of 2026-09-16 (`ecb286a6`) — the framing moved three times, as the prompt asked; no cut
  "done-with-framing-move": { steps: [q(0), r(33), r(66), done], cuts: [{ frame: 24, seconds: 1, kind: "framing" }, { frame: 100, seconds: 4.17, kind: "framing" }, { frame: 204, seconds: 8.5, kind: "framing" }], camera: "moving" },
  // STORY_046: the same, with a cut the model made at 5.92 s (STORY_020's `2f980101` frame 142) inside the move
  "done-with-cut-in-a-move": { steps: [q(0), r(33), r(66), done], cuts: [{ frame: 24, seconds: 1, kind: "framing" }, { frame: 100, seconds: 4.17, kind: "framing" }, { frame: 142, seconds: 5.92, kind: "cut" }, { frame: 204, seconds: 8.5, kind: "framing" }], camera: "moving" },
  // STORY_057: a cut at the join — the first new frame of an extension of the 2.0 s fixture (56 frames on the grid; last night's 7b2636b9 at frame 243)
  "done-with-cut-at-join": { steps: [q(0), done], cuts: [{ frame: 56, seconds: 2.33, kind: "cut" }], camera: "static" },
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
export function cutsFor(name: ScriptName): readonly Cut[] {
  const script: Script = SCRIPTS[name];
  return script.cuts ?? [];
}
export function cameraFor(name: ScriptName): Camera {
  const script: Script = SCRIPTS[name];
  return script.camera ?? "static";
}
