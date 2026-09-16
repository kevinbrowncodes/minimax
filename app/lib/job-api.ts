/** Types of docs/contracts/job-api.md v1, as the UI sees them through its own routes (STORY_009). */
export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export type Ratio = "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

export interface JobError {
  readonly code: string;
  readonly message: string;
}
/** What an extension carried from its source into the new clip's own first frames (v1.2). */
export interface Overlap {
  readonly frames: number;
  readonly seconds: number;
}
/** STORY_046 (contract v1.4): a cut is a single-frame jump of the picture's border; framing is the set or the framing changing over a second or three. */
export type CutKind = "cut" | "framing";
/** STORY_046 (contract v1.4): what the prompt asked of the camera, as the server read it. */
export type Camera = "static" | "moving" | "unknown";
/** STORY_020 (contract v1.3): where the server measured a shot change — the first frame of the new shot and its time. */
export interface Cut {
  readonly frame: number;
  readonly seconds: number;
  /** Absent from a server older than v1.4 — read as "framing". */
  readonly kind?: CutKind;
}
export interface JobResult {
  readonly url: string;
  readonly posterUrl: string;
  readonly mimeType: string;
  readonly frames?: number;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  /** Absent from a server older than v1.3 or when the measure was unavailable; [] when the shot held. */
  readonly cuts?: readonly Cut[];
  /** Absent from a server older than v1.4 — read as "unknown". */
  readonly camera?: Camera;
}
export interface JobRequest {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  readonly referenceImages: number;
  /** v1.1/v1.2 (STORY_016/017): set on an extension. */
  readonly continueFrom?: string;
  readonly overlapFrames?: number;
  readonly overlap?: Overlap;
  readonly seed?: number;
}
export interface JobStatusResponse {
  readonly id: string;
  readonly status: JobStatus;
  readonly progress: number;
  /** STORY_041 (ours, never from the model server): a request still in the app's queue — 1 = next. */
  readonly position?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly request?: JobRequest;
  readonly error?: JobError;
  readonly result?: JobResult;
}
export interface CreateJobResponse {
  readonly id: string;
  readonly status: "queued";
  readonly progress: number;
  /** STORY_041: the request went into the app's queue — 1 = next. */
  readonly position?: number;
}
export interface Capabilities {
  readonly models: readonly { readonly id: string; readonly label: string }[];
  readonly ratios: readonly string[];
  readonly resolutions: readonly string[];
  readonly durationsSeconds: { readonly min: number; readonly max: number; readonly step: number };
  readonly referenceImages: { readonly max: number };
  /** v1.1 (STORY_016): how a finished video can be extended; absent on a server without extensions. */
  readonly extension?: ExtensionCapabilities;
}
export interface ExtensionCapabilities {
  readonly durationsSeconds: { readonly min: number; readonly max: number; readonly step: number; readonly default: number };
  readonly overlapFrames: { readonly options: readonly number[]; readonly default: number };
  readonly maxFrames: number;
  readonly maxSourceSeconds: number;
}
export interface ApiError {
  readonly error: { readonly code: string; readonly message: string; readonly field?: string };
}

const TERMINAL: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);
export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}
