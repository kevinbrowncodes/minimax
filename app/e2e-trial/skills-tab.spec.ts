/**
 * STORY_054's manual verification, driven through the real UI: Management › Skills on the deployed app — the two
 * director folders with their meta lines read from the image's SKILL.md files, the Templates section, and Use on a
 * director landing on the composer with the chip on — screenshotted at 1440 in both themes and at the iPhone 13
 * descriptor for the Done note's side-by-side with behaviour-manage-tabs-03-tab-skills@1440. Nothing is changed but
 * the agentSkill setting, which is put back. Not part of the gate.
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_OUT_DIR (/work/spark/data/smoke)
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { devices, expect, test } from "@playwright/test";

const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

async function tabAt(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.goto("/skills");
  const rows = page.getByTestId("director-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId("director-meta")).toContainText("verified 2026-09-16");
  await expect(rows.nth(1).getByTestId("director-meta")).toContainText("verified 2026-09-17");
  await expect(page.getByTestId("templates")).toContainText("Short-to-script");
  console.log(`[trial] ${name}: ${(await rows.nth(0).getByTestId("director-meta").textContent()) ?? ""} | ${(await rows.nth(1).getByTestId("director-meta").textContent()) ?? ""}`);
  await page.screenshot({ path: path.join(OUT_DIR, `skills-tab-${name}-${STAMP}.png`), fullPage: false });
}

test.describe("the Skills tab on the deployed app (STORY_054)", () => {
  test("light at 1440, then Use on the chain director, then + › Skills", async ({ page }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await tabAt(page, "light-1440");
    const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await page.getByTestId("director-row").nth(1).getByRole("button", { name: "Use Chain director" }).click();
    await expect(page).toHaveURL(/\/\?agent=minimax-h3-director-thirst-trap-chain$/);
    expect(((await (await saved).json()) as { agentSkill: string }).agentSkill).toBe("minimax-h3-director-thirst-trap-chain");
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director");
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Skills" }).click();
    await expect(page.getByRole("menu", { name: "Skills" }).getByRole("menuitemradio").nth(1)).toHaveAttribute("aria-checked", "true");
    await page.screenshot({ path: path.join(OUT_DIR, `skills-menu-light-1440-${STAMP}.png`), fullPage: false });
    await page.keyboard.press("Escape");
    await page.request.patch("/api/settings", { data: { agentSkill: "minimax-h3-director-thirst-trap" } });
  });

  test("dark at 1440", async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem("minimax-local.theme", "dark"); });
    await tabAt(page, "dark-1440");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the rows stack at 390 (the iPhone 13 descriptor, a new context)", async ({ browser }) => {
    // a context takes the descriptor's viewport, touch, scale and agent; the browser type is the project's
    const { viewport, hasTouch, isMobile, deviceScaleFactor, userAgent } = devices["iPhone 13"];
    const context = await browser.newContext({ viewport, hasTouch, isMobile, deviceScaleFactor, userAgent, baseURL: process.env["TRIAL_BASE_URL"] ?? "http://minimax-app:3000" });
    const page = await context.newPage();
    await tabAt(page, "narrow-390");
    await page.getByTestId("director-row").nth(1).getByRole("button", { name: "Use Chain director" }).click();
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director");
    await page.screenshot({ path: path.join(OUT_DIR, `skills-use-narrow-390-${STAMP}.png`), fullPage: false });
    await page.request.patch("/api/settings", { data: { agentSkill: "minimax-h3-director-thirst-trap" } });
    await context.close();
  });
});
