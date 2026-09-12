import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/test";

/**
 * The codec probe (STORY_010): which fixture each test browser can actually play. Playwright's Chromium ships no
 * H.264/AAC decoder and its WebKit build on Linux has its own set, so the answer is measured, not assumed, and
 * written to test-results/codec-probe-<project>.json for the Done note and README → Testing.
 */
const FILES = ["fixture.mp4", "fixture.webm"] as const;

test("records which fixture formats this browser plays", async ({ page, stubApi }, testInfo) => {
  await page.goto("/");
  const outcomes: Record<string, string> = {};
  for (const file of FILES) {
    outcomes[file] = await page.evaluate(
      (url) =>
        new Promise<string>((resolve) => {
          const video = document.createElement("video");
          video.muted = true;
          video.preload = "auto";
          const timer = setTimeout(() => {
            resolve(`timeout(readyState=${String(video.readyState)})`);
          }, 8000);
          video.addEventListener("canplay", () => { clearTimeout(timer); resolve(`canplay(readyState=${String(video.readyState)})`); }, { once: true });
          video.addEventListener("error", () => { clearTimeout(timer); resolve(`error(code=${String(video.error?.code ?? "?")})`); }, { once: true });
          video.src = url;
          document.body.appendChild(video);
          video.load();
        }),
      stubApi.fixtureUrl(file),
    );
  }
  const dir = path.resolve(process.cwd(), "test-results"); // Playwright runs from app/
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `codec-probe-${testInfo.project.name}.json`), JSON.stringify({ project: testInfo.project.name, browser: testInfo.project.use.defaultBrowserType, outcomes }, null, 2));
  for (const [file, outcome] of Object.entries(outcomes)) testInfo.annotations.push({ type: "codec", description: `${file}: ${outcome}` });
  expect(Object.values(outcomes).some((o) => o.startsWith("canplay")), `no fixture format plays in ${testInfo.project.name}: ${JSON.stringify(outcomes)}`).toBe(true);
});
