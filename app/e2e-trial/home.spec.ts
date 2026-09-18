/**
 * STORY_058 / STORY_059's manual verification on the deployed app: the home as it opens — video mode, the heading
 * "MiniMax", the placeholder, no chips row, no Showcase, no promo card, no video-creator tag, no MiniMax-M3 pill — and
 * the sidebar's Skills row; screenshotted at 1440 in both themes and at the iPhone 13 descriptor for the Done notes.
 * Nothing is changed. Not part of the gate.
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_OUT_DIR (/work/spark/data/smoke)
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { devices, expect, test } from "@playwright/test";

const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

async function home(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "MiniMax" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add reference image" })).toBeVisible();
  await expect(page.getByTestId("agent-chip")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveAttribute("placeholder", "Describe the video — or attach a photo and turn Agent on");
  for (const gone of ["Video generation", "MiniMax-M3", "Remove video-creator"]) await expect(page.getByRole("button", { name: gone })).toHaveCount(0);
  await expect(page.getByText("video-creator", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("showcase")).toHaveCount(0);
  await expect(page.getByTestId("promo-card")).toHaveCount(0);
  await expect(page.getByTestId("agents-guide")).toHaveCount(0);
  console.log(`[trial] ${name}: the home opens in video mode with nothing of the reference's left over`);
  await page.screenshot({ path: path.join(OUT_DIR, `home-${name}-${STAMP}.png`), fullPage: false });
}

test.describe("the home on the deployed app (STORY_058, STORY_059)", () => {
  test("light at 1440, then the Skills row", async ({ page }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await home(page, "light-1440");
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("link", { name: "Plugins" })).toHaveCount(0);
    await sidebar.getByRole("link", { name: "Skills" }).click();
    await expect(page).toHaveURL(/\/skills$/);
    await expect(page.getByRole("heading", { level: 1, name: "Skills" })).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await page.screenshot({ path: path.join(OUT_DIR, `skills-page-light-1440-${STAMP}.png`), fullPage: false });
  });
  test("dark at 1440", async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem("minimax-local.theme", "dark"); });
    await home(page, "dark-1440");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
  test("the iPhone 13 descriptor", async ({ browser }) => {
    const { viewport, hasTouch, isMobile, deviceScaleFactor, userAgent } = devices["iPhone 13"];
    const context = await browser.newContext({ viewport, hasTouch, isMobile, deviceScaleFactor, userAgent, baseURL: process.env["TRIAL_BASE_URL"] ?? "http://minimax-app:3000" });
    const page = await context.newPage();
    await home(page, "narrow-390");
    await context.close();
  });
});
