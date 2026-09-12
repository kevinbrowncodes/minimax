import type { APIRequestContext } from "@playwright/test";

/** The stub's test hooks (tools/stub-generation-server/README.md), as one-liners for specs. */
export const STUB_URL = "http://127.0.0.1:4010";
export type StubScript =
  | "done-after-3-polls"
  | "done-after-1-poll"
  | "slow-done-after-10-polls"
  | "fails-after-2-polls"
  | "moderated"
  | "cancel-midway"
  | "rejects-upload";

export interface StubJob {
  readonly id: string;
  readonly script: string;
  readonly status: string;
  readonly progress: number;
}
export interface Received {
  readonly id: string;
  readonly script: string;
  readonly request: { readonly prompt: string; readonly referenceImages: number };
  readonly uploads: readonly { readonly filename: string; readonly contentType: string; readonly size: number; readonly sha256: string }[];
}

export function stub(request: APIRequestContext) {
  return {
    /** Forget every job. Call in beforeEach. */
    reset: async (): Promise<void> => {
      const res = await request.post(`${STUB_URL}/__stub/reset`);
      if (!res.ok()) throw new Error(`stub reset failed: ${String(res.status())}`);
    },
    /** What the stub was sent for a job (uploads included). */
    received: async (id: string): Promise<Received> => (await request.get(`${STUB_URL}/__stub/jobs/${id}/received`)).json() as Promise<Received>,
    /** Every job the stub knows, with its current state. */
    jobs: async (): Promise<readonly StubJob[]> => ((await (await request.get(`${STUB_URL}/__stub/jobs`)).json()) as { jobs: StubJob[] }).jobs,
    /** Jobs that are not done, failed or cancelled — must be empty when a spec ends. */
    openJobs: async (): Promise<readonly StubJob[]> => {
      const all = ((await (await request.get(`${STUB_URL}/__stub/jobs`)).json()) as { jobs: StubJob[] }).jobs;
      return all.filter((j) => !["done", "failed", "cancelled"].includes(j.status));
    },
    /** The query string to put on POST /api/jobs so the app forwards the script choice to the stub. */
    scriptQuery: (script: StubScript): string => `?script=${script}`,
    /** A fixture file straight from the stub, whatever it serves by default. */
    fixtureUrl: (file: "fixture.mp4" | "fixture.webm" | "fixture-poster.png" | "fixture-reference.png"): string => `${STUB_URL}/__stub/fixtures/${file}`,
  };
}
