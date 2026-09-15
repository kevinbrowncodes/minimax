/**
 * The download watermark (STORY_034): a copy of a finished video with "AI-generated" burned in at the bottom-right,
 * made once per job by ffmpeg (the adapter image's one runtime dependency — see spark/README.md) and cached under
 * WATERMARK_DIR (the adapter's own volume; ComfyUI's output mount is read-only). The ffmpeg call is injectable so the
 * adapter's tests never need the binary.
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const WATERMARK_TEXT = "AI-generated";
/** White at 85 %, 5 % of the height, 2 % in from the bottom-right. */
export const DRAWTEXT = `drawtext=text='${WATERMARK_TEXT}':fontcolor=white@0.85:fontsize=h*0.05:x=w-tw-w*0.02:y=h-th-h*0.02`;

export function ffmpegArgs(input: string, output: string): readonly string[] {
  return ["-y", "-loglevel", "error", "-i", input, "-vf", DRAWTEXT, "-c:a", "copy", "-movflags", "+faststart", output];
}

export type WatermarkRunner = (input: string, output: string) => Promise<void>;

export const runFfmpeg: WatermarkRunner = async (input, output) => {
  await execFileAsync("ffmpeg", [...ffmpegArgs(input, output)]);
};

export function watermarkedPath(dir: string, jobId: string): string {
  return path.join(dir, `${jobId}.mp4`);
}

/** The cache: one marked copy per job, made on first request, shared between concurrent requests, never made twice. */
export class WatermarkCache {
  readonly dir: string;
  readonly #run: WatermarkRunner;
  readonly #inflight = new Map<string, Promise<string>>();

  constructor(dir: string, run: WatermarkRunner = runFfmpeg) {
    this.dir = dir;
    this.#run = run;
  }

  ensure(jobId: string, input: string): Promise<string> {
    const output = watermarkedPath(this.dir, jobId);
    if (existsSync(output)) return Promise.resolve(output);
    const pending = this.#inflight.get(jobId);
    if (pending) return pending;
    const work = (async () => {
      mkdirSync(this.dir, { recursive: true });
      const part = `${output}.part.mp4`;
      try {
        await this.#run(input, part);
        renameSync(part, output);
      } catch (error) {
        rmSync(part, { force: true });
        throw error;
      } finally {
        this.#inflight.delete(jobId);
      }
      return output;
    })();
    this.#inflight.set(jobId, work);
    return work;
  }
}
