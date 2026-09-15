import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DRAWTEXT, WatermarkCache, ffmpegArgs, watermarkedPath } from "./watermark.ts";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "watermark-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("the download watermark (STORY_034)", () => {
  it("draws 'AI-generated' in white at 5 % of the height, 2 % in from the bottom-right, keeps the audio, and names the cache by job", () => {
    expect(DRAWTEXT).toBe("drawtext=text='AI-generated':fontcolor=white@0.85:fontsize=h*0.05:x=w-tw-w*0.02:y=h-th-h*0.02");
    expect(ffmpegArgs("/in/a.mp4", "/out/a.mp4")).toEqual(["-y", "-loglevel", "error", "-i", "/in/a.mp4", "-vf", DRAWTEXT, "-c:a", "copy", "-movflags", "+faststart", "/out/a.mp4"]);
    expect(watermarkedPath("/comfy/adapter/watermarked", "job-1")).toBe("/comfy/adapter/watermarked/job-1.mp4");
  });

  it("makes the copy once, shares it between concurrent requests, reuses it after, and leaves nothing behind when ffmpeg fails", async () => {
    const input = path.join(dir, "in.mp4");
    writeFileSync(input, "clean");
    let runs = 0;
    const cache = new WatermarkCache(path.join(dir, "cache"), async (from, to) => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      writeFileSync(to, `${readFileSync(from, "utf8")}+mark`);
    });
    const [a, b] = await Promise.all([cache.ensure("job-1", input), cache.ensure("job-1", input)]);
    expect(a).toBe(path.join(dir, "cache", "job-1.mp4"));
    expect(b).toBe(a);
    expect(runs).toBe(1);
    expect(readFileSync(a, "utf8")).toBe("clean+mark");
    expect(await cache.ensure("job-1", input)).toBe(a);
    expect(runs).toBe(1);
    expect(existsSync(`${a}.part.mp4`)).toBe(false);
    const failing = new WatermarkCache(path.join(dir, "cache2"), (_from, to) => {
      writeFileSync(to, "half");
      return Promise.reject(new Error("ffmpeg: no such filter"));
    });
    await expect(failing.ensure("job-2", input)).rejects.toThrow("no such filter");
    expect(existsSync(path.join(dir, "cache2", "job-2.mp4"))).toBe(false);
    expect(existsSync(path.join(dir, "cache2", "job-2.mp4.part.mp4"))).toBe(false);
    // after a failure the next request tries again
    await expect(failing.ensure("job-2", input)).rejects.toThrow("no such filter");
  });
});
