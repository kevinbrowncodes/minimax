import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";

test.describe("smoke: browser → app container → stub", () => {
  test("the home page renders the placeholder heading", async ({ page }) => {
    await page.goto("/");
    await settled(page);
    await expect(page.getByRole("heading", { level: 1, name: "MiniMax Local" })).toBeVisible();
  });

  test("the app answers /api/capabilities with the stub's capabilities", async ({ page, request }) => {
    await page.goto("/");
    const viaBrowser = await page.evaluate(async () => (await fetch("/api/capabilities")).json() as Promise<{ resolutions: string[]; ratios: string[] }>);
    expect(viaBrowser.resolutions).toEqual(["768P"]);
    expect(viaBrowser.ratios).toContain("16:9");
    const viaApi = await request.get("/api/capabilities");
    expect(viaApi.ok()).toBe(true);
  });

  test("the narrow project is a touch device", async ({ page }, testInfo) => {
    await page.goto("/");
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0 || "ontouchstart" in window);
    expect(touch).toBe(testInfo.project.name === "narrow");
  });
});
