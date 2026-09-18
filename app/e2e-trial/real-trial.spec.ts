/**
 * One real image-to-video job through the UI: upload the owner's image, set the parameters, paste his prompt, Send,
 * follow the task page to done, check playback, download the file. Records timings in the report annotations.
 */
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/spark/data/input/01.jpg";
const PROMPT_FILE = process.env["TRIAL_PROMPT_FILE"] ?? "/work/spark/data/input/01-prompt.txt";
const DURATION = process.env["TRIAL_DURATION"] ?? "10";
const RATIO = process.env["TRIAL_RATIO"] ?? "16:9";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";

test("image-to-video through the real UI, adapter and ComfyUI", async ({ page }, testInfo) => {
  const prompt = readFileSync(PROMPT_FILE, "utf8").trim();
  const t0 = Date.now();
  const stamp = (label: string): void => {
    const line = `${label} at +${String(Math.round((Date.now() - t0) / 1000))}s`;
    testInfo.annotations.push({ type: "trial", description: line });
    console.log(`[trial] ${line}`);
  };

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "MiniMax" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Model:/ })).toBeEnabled({ timeout: 60_000 });
  stamp("capabilities loaded from the adapter");

  await page.getByRole("button", { name: /^Video parameters:/ }).click();
  await page.getByRole("radio", { name: RATIO }).click();
  await page.getByRole("radio", { name: `${DURATION}s` }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: `Video parameters: ${RATIO} 768P ${DURATION}s` })).toBeVisible();

  await page.getByTestId("reference-input").setInputFiles(IMAGE);
  await expect(page.getByRole("img", { name: "Reference image 1" })).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill(prompt);
  await page.screenshot({ path: path.join(testInfo.outputDir, "1-composer-ready.png"), fullPage: true });

  const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send message" }).click();
  const response = await created;
  expect(response.status(), await response.text()).toBe(202);
  const { id } = (await response.json()) as { id: string };
  stamp(`job ${id} created through the UI`);
  await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
  await expect(page.getByTestId("user-message")).toContainText("1 reference image attached");
  await expect(page.getByRole("button", { name: "Stop generation" })).toBeVisible();

  // Follow the indicator until a terminal state; note each new progress value.
  let last = "";
  const deadline = t0 + Number(process.env["TRIAL_TIMEOUT_MS"] ?? "3600000") - 120_000;
  for (;;) {
    const text = (await page.getByTestId("indicator").textContent())?.trim() ?? "";
    if (text !== last) {
      stamp(`indicator: ${text}`);
      last = text;
    }
    if (/ready|failed|refused|Cancelled|stopped answering/.test(text)) break;
    if (Date.now() > deadline) throw new Error(`trial timed out; last indicator: ${text}`);
    await page.waitForResponse((r) => r.url().endsWith(`/api/jobs/${id}`) && r.request().method() === "GET", { timeout: 120_000 }).catch(() => undefined);
  }
  await page.screenshot({ path: path.join(testInfo.outputDir, "2-task-terminal.png"), fullPage: true });
  await expect(page.getByTestId("indicator")).toHaveText(/Your video is ready/);
  stamp("done");

  const video = page.getByTestId("result-video");
  await expect(video).toBeVisible();
  const ready = await video.evaluate((el: HTMLVideoElement) => new Promise<number>((resolve) => {
    if (el.readyState >= 2) { resolve(el.readyState); return; }
    const t = setTimeout(() => { resolve(el.readyState); }, 30_000);
    el.addEventListener("canplay", () => { clearTimeout(t); resolve(el.readyState); }, { once: true });
  }));
  expect(ready).toBeGreaterThanOrEqual(2);
  stamp(`video element ready (readyState ${String(ready)})`);

  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("result").getByRole("link", { name: /Download/ }).click();
  const download = await downloadEvent;
  const tmp = await download.path();
  mkdirSync(OUT_DIR, { recursive: true });
  const target = path.join(OUT_DIR, `trial-${new Date(t0).toISOString().replace(/[:.]/g, "-")}-${id.slice(0, 8)}.mp4`);
  copyFileSync(tmp, target);
  stamp(`downloaded ${String(statSync(target).size)} bytes -> ${target}`);

  await page.goto("/assets");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible();
  await page.screenshot({ path: path.join(testInfo.outputDir, "3-assets.png"), fullPage: true });
  stamp("visible in Assets");
});
