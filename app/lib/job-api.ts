/** Types of docs/contracts/job-api.md v1, as the UI sees them through its own routes (STORY_009). */
export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export type Ratio = "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

export interface JobError {
  readonly code: string;
  readonly message: string;
}
export interface ContextFed {
  readonly frames: number;
  readonly seconds: number;
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
}
export interface JobRequest {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  readonly referenceImages: number;
  /** v1.1 (STORY_016): set on an extension. */
  readonly continueFrom?: string;
  readonly contextSeconds?: number;
  readonly contextFed?: ContextFed;
  readonly seed?: number;
}
export interface JobStatusResponse {
  readonly id: string;
  readonly status: JobStatus;
  readonly progress: number;
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
  readonly contextSeconds: { readonly min: number; readonly max: number; readonly default: number };
  readonly maxSourceSeconds: number;
}
export interface ApiError {
  readonly error: { readonly code: string; readonly message: string; readonly field?: string };
}

const TERMINAL: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);
export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.has(status);
}
