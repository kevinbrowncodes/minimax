/**
 * STORY_016's manual verification, driven through the real UI: segment 1 from the owner's image and script1, then
 * Extend with script2, then Extend with script3 — each step waits for the real adapter and ComfyUI to finish, notes
 * timings, checks playback, and downloads the clip. Not part of the gate. Env (all under /work in the gate container):
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_IMAGE (/work/spark/data/input/01.jpg)
 *   TRIAL_SCRIPTS_DIR (/work/docs/scripts)   TRIAL_DURATION (10)  TRIAL_RATIO (16:9)
 *   TRIAL_OUT_DIR (/work/spark/data/smoke)    TRIAL_START_FROM (a done job id: skip segment 1 and extend it)
 *   TRIAL_STEPS (3)                           TRIAL_TIMEOUT_MS (14400000)
 */
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/spark/data/input/01.jpg";
const SCRIPTS = process.env["TRIAL_SCRIPTS_DIR"] ?? "/work/docs/scripts";
const DURATION = process.env["TRIAL_DURATION"] ?? "10";
const RATIO = process.env["TRIAL_RATIO"] ?? "16:9";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const START_FROM = process.env["TRIAL_START_FROM"];
const STEPS = Number(process.env["TRIAL_STEPS"] ?? "3");

const t0 = Date.now();
function stamper(testInfo: TestInfo) {
  return (label: string): void => {
    const line = `${label} at +${String(Math.round((Date.now() - t0) / 1000))}s`;
    testInfo.annotations.push({ type: "trial", description: line });
    console.log(`[trial] ${line}`);
  };
}

/** Follow the indicator to a terminal state; return the indicator text. */
async function followToTerminal(page: Page, id: string, stamp: (l: string) => void): Promise<string> {
  let last = "";
  const deadline = t0 + Number(process.env["TRIAL_TIMEOUT_MS"] ?? "14400000") - 120_000;
  for (;;) {
    const text = (await page.getByTestId("indicator").textContent())?.trim() ?? "";
    if (text !== last) {
      stamp(`indicator: ${text}`);
      last = text;
    }
    if (/ready|failed|refused|Cancelled|stopped answering/.test(text)) return text;
    if (Date.now() > deadline) throw new Error(`trial timed out; last indicator: ${text}`);
    await page.waitForResponse((r) => r.url().endsWith(`/api/jobs/${id}`) && r.request().method() === "GET", { timeout: 180_000 }).catch(() => undefined);
  }
}

async function checkAndDownload(page: Page, id: string, label: string, stamp: (l: string) => void): Promise<void> {
  const video = page.getByTestId("result-video");
  await expect(video).toBeVisible();
  const ready = await video.evaluate((el: HTMLVideoElement) => new Promise<number>((resolve) => {
    if (el.readyState >= 2) { resolve(el.readyState); return; }
    const t = setTimeout(() => { resolve(el.readyState); }, 60_000);
    el.addEventListener("canplay", () => { clearTimeout(t); resolve(el.readyState); }, { once: true });
  }));
  expect(ready).toBeGreaterThanOrEqual(2);
  const summary = (await page.getByTestId("result").locator("div").nth(0).textContent()) ?? "";
  stamp(`${label}: video ready (readyState ${String(ready)}); summary "${summary.trim()}"`);
  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("result").getByRole("link", { name: /Download/ }).click();
  const download = await downloadEvent;
  mkdirSync(OUT_DIR, { recursive: true });
  const target = path.join(OUT_DIR, `chain-${new Date(t0).toISOString().replace(/[:.]/g, "-")}-${label}-${id.slice(0, 8)}.mp4`);
  copyFileSync(await download.path(), target);
  stamp(`${label}: downloaded ${String(statSync(target).size)} bytes -> ${target}`);
}

test("the three-script chain through the real UI, adapter and ComfyUI", async ({ page }, testInfo) => {
  const stamp = stamper(testInfo);
  const script = (n: number): string => readFileSync(path.join(SCRIPTS, `script${String(n)}.txt`), "utf8").trim();
  let currentId: string;

  if (START_FROM) {
    currentId = START_FROM;
    await page.goto(`/task/${currentId}`);
    await expect(page.getByTestId("indicator")).toHaveText(/Your video is ready/);
    stamp(`starting from finished job ${currentId}`);
  } else {
    await page.goto("/");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await expect(page.getByRole("button", { name: /^Model:/ })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole("button", { name: /^Video parameters:/ }).click();
    await page.getByRole("radio", { name: RATIO }).click();
    await page.getByRole("radio", { name: `${DURATION}s` }).click();
    await page.keyboard.press("Escape");
    await page.getByTestId("reference-input").setInputFiles(IMAGE);
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeVisible();
    await page.getByRole("textbox", { name: "Message" }).fill(script(1));
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(202);
    currentId = ((await response.json()) as { id: string }).id;
    stamp(`segment 1: job ${currentId} created from ${path.basename(IMAGE)} with script1 (${DURATION} s)`);
    await expect(page).toHaveURL(new RegExp(`/task/${currentId}$`));
    const text = await followToTerminal(page, currentId, stamp);
    expect(text).toMatch(/Your video is ready/);
    await page.screenshot({ path: path.join(testInfo.outputDir, "1-segment1.png"), fullPage: true });
    await checkAndDownload(page, currentId, "segment1", stamp);
  }

  for (let n = 2; n <= STEPS; n += 1) {
    await page.getByTestId("result").getByRole("button", { name: /Extend/ }).click();
    await expect(page.getByTestId("continuation")).toBeVisible();
    const contextLine = (await page.getByTestId("context-line").textContent()) ?? "";
    stamp(`extend with script${String(n)}: ${contextLine.trim()}; parameters "${await page.getByRole("button", { name: /^Video parameters:/ }).getAttribute("aria-label") ?? ""}"`);
    await page.getByRole("textbox", { name: "Message" }).fill(script(n));
    await page.screenshot({ path: path.join(testInfo.outputDir, `${String(n)}-extend-ready.png`), fullPage: true });
    const created = page.waitForResponse((r) => r.url().endsWith("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(202);
    const previous = currentId;
    currentId = ((await response.json()) as { id: string }).id;
    stamp(`segment ${String(n)}: extension ${currentId} of ${previous} created`);
    await expect(page).toHaveURL(new RegExp(`/task/${currentId}$`));
    await expect(page.getByTestId("continues")).toContainText("Continues");
    const text = await followToTerminal(page, currentId, stamp);
    stamp(`bubble: ${((await page.getByTestId("continues").textContent()) ?? "").trim()}`);
    expect(text).toMatch(/Your video is ready/);
    await page.screenshot({ path: path.join(testInfo.outputDir, `${String(n)}-segment${String(n)}.png`), fullPage: true });
    await checkAndDownload(page, currentId, `segment${String(n)}`, stamp);
  }

  await page.goto("/assets");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible();
  await page.screenshot({ path: path.join(testInfo.outputDir, "9-assets.png"), fullPage: true });
  stamp("visible in Assets");
});
