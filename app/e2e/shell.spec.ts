import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";

test.describe("shell (STORY_012)", () => {
  test("New task is active on the home page and Assets navigates", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Open sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("link", { name: "New task" })).toHaveAttribute("aria-current", "page");
    await sidebar.getByRole("link", { name: "Assets" }).click();
    await expect(page).toHaveURL(/\/assets$/);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Open sidebar" }).click();
      await settled(page);
    }
    await expect(sidebar.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
  });

  test("out-of-MVP rows are inert, do not navigate, and answer a click with the notice (STORY_019)", async ({ page }, testInfo) => {
    await page.goto("/");
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Open sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    // force: Playwright's actionability check treats aria-disabled as not enabled; the control does respond — that is the point.
    for (const name of ["Search", "Plugins", "Scheduled", "Connect Mobile"]) {
      const row = sidebar.getByRole("link", { name });
      await expect(row).toHaveAttribute("aria-disabled", "true");
      await row.click({ force: true });
      await expect(row.getByRole("status")).toHaveText(/Not part of MiniMax Local/);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("the top bar's Changelog is inert with the notice and never leaves the page (STORY_019)", async ({ page }) => {
    await page.goto("/");
    await settled(page);
    const changelog = page.getByRole("button", { name: "Changelog" });
    await expect(changelog).toHaveAttribute("title", "Not part of MiniMax Local");
    await changelog.click({ force: true });
    await expect(page.getByRole("status")).toHaveText("Not part of MiniMax Local — video generation only");
    await expect(page).toHaveURL(/\/$/);
  });

  test("narrow: the sidebar is a drawer with a large enough toggle; Escape closes it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow", "drawer exists only below 900 px");
    await page.goto("/");
    await settled(page);
    const toggle = page.getByRole("button", { name: "Open sidebar" });
    const box = await toggle.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await settled(page);
    await expect(sidebar).toBeVisible();
    await page.keyboard.press("Escape");
    await settled(page);
    await expect(sidebar).toBeHidden();
  });

  test("desktop: the sidebar is visible without a toggle", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open sidebar" })).toBeHidden();
    const width = await page.getByRole("navigation", { name: "Sidebar" }).evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBe(260);
  });
});

const DARK_BODY = "rgb(28, 28, 28)"; // --bg_default_primary_elevated, dark (docs/recon/2026-09-14/tokens.md)
const LIGHT_BODY = "rgb(255, 255, 255)";
const bodyBackground = (page: Parameters<typeof settled>[0]) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** User chip → Settings, opening the drawer first at 390 (the chip lives in the sidebar). */
async function openSettings(page: Parameters<typeof settled>[0], narrow: boolean): Promise<void> {
  if (narrow) {
    await page.getByRole("button", { name: "Open sidebar" }).click();
    await settled(page);
  }
  await page.getByRole("button", { name: "Owner" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "General" })).toBeVisible();
  await settled(page);
}

test.describe("theme (STORY_019)", () => {
  test.describe("with a dark system preference", () => {
    test.use({ colorScheme: "dark" });

    test("the page is dark by default, Settings shows System chosen, and Light mode flips it and survives a reload", async ({ page }, testInfo) => {
      await page.goto("/");
      await settled(page);
      expect(await bodyBackground(page)).toBe(DARK_BODY);
      await openSettings(page, testInfo.project.name === "narrow");
      await expect(page.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
      await page.getByRole("radio", { name: "Light mode" }).click();
      await settled(page);
      expect(await bodyBackground(page)).toBe(LIGHT_BODY);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.reload();
      await settled(page);
      expect(await bodyBackground(page)).toBe(LIGHT_BODY);
      await openSettings(page, testInfo.project.name === "narrow");
      await expect(page.getByRole("radio", { name: "Light mode" })).toHaveAttribute("aria-checked", "true");
      await page.getByRole("radio", { name: "System" }).click();
      await settled(page);
      expect(await bodyBackground(page)).toBe(DARK_BODY);
    });
  });

  test("with a light system preference, Dark mode makes every surface dark and Escape closes Settings", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    expect(await bodyBackground(page)).toBe(LIGHT_BODY);
    await openSettings(page, testInfo.project.name === "narrow");
    await page.getByRole("radio", { name: "Dark mode" }).click();
    await settled(page);
    expect(await bodyBackground(page)).toBe(DARK_BODY);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "General" })).toBeHidden();
    // The sidebar follows the switch too (tokens.md: sidebar #1c1c1c in dark). A CSS locator: at 390 the closed drawer is aria-hidden.
    expect(await page.locator('nav[aria-label="Sidebar"]').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(DARK_BODY);
    await page.goto("/assets");
    await settled(page);
    expect(await bodyBackground(page)).toBe(DARK_BODY);
  });
});
