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

  test("out-of-MVP rows are inert and do not navigate", async ({ page }, testInfo) => {
    await page.goto("/");
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Open sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    for (const name of ["Search", "Plugins", "Scheduled", "Connect Mobile"]) {
      const row = sidebar.getByRole("link", { name });
      await expect(row).toHaveAttribute("aria-disabled", "true");
      await row.click({ force: true });
      await expect(page).toHaveURL(/\/$/);
    }
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
