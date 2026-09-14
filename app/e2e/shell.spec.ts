import { expect, test } from "./fixtures/test";
import { listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";

test.describe("shell (STORY_012)", () => {
  test("New task is active on the home page and Assets navigates", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("link", { name: "New task" })).toHaveAttribute("aria-current", "page");
    await sidebar.getByRole("link", { name: "Assets" }).click();
    await expect(page).toHaveURL(/\/assets$/);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await expect(sidebar.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
  });

  test("out-of-MVP rows are inert, do not navigate, and answer a click with the notice (STORY_019)", async ({ page }, testInfo) => {
    await page.goto("/");
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    // force: Playwright's actionability check treats aria-disabled as not enabled; the control does respond — that is the point.
    // Search is ours since STORY_021 (it opens the Search dialog), so it is no longer in this list.
    for (const name of ["Plugins", "Scheduled", "Connect Mobile"]) {
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
    const toggle = page.getByRole("button", { name: "Expand sidebar" });
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
    // The page's own Expand sidebar toggle exists only at 390; the rail's is inside the sidebar and shows only when collapsed.
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeHidden();
    const width = await page.getByRole("navigation", { name: "Sidebar" }).evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBe(260);
  });
});

test.describe("shell (STORY_021)", () => {
  const sidebarWidth = (page: Parameters<typeof settled>[0]) => page.locator('nav[aria-label="Sidebar"]').evaluate((el) => Math.round(el.getBoundingClientRect().width));

  test("desktop: Collapse sidebar leaves a 52 px rail, Expand sidebar restores 260, and the choice survives a reload", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the rail exists only at ≥ 900 px");
    await page.goto("/");
    await settled(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(52);
    await expect(page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: "New task" })).toHaveAttribute("aria-current", "page");
    await page.reload();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(52);
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(260);
  });

  test("More starts folded, a click unfolds it, and the fold survives a reload", async ({ page }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    const openDrawer = async () => {
      if (narrow) {
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await settled(page);
      }
    };
    await page.goto("/");
    await settled(page);
    await openDrawer();
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar.getByText("MaxHermes")).toBeHidden();
    await sidebar.getByRole("button", { name: "More" }).click();
    await settled(page);
    await expect(sidebar.getByText("MaxHermes")).toBeVisible();
    await page.reload();
    await settled(page);
    await openDrawer();
    await expect(sidebar.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar.getByText("MaxHermes")).toBeVisible();
  });

  test("Search finds a job by title and opens it; the Recents menu's Delete forgets it", async ({ page, stubApi }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    // A finished job to find and then delete (the stub finishes it in one poll).
    await page.goto("/?script=done-after-1-poll");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await page.getByRole("textbox", { name: "Message" }).fill("Find me by title");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const id = page.url().split("/task/")[1] ?? "";
    await terminal;
    await page.goto("/");
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("button", { name: "Search" }).click();
    const dialog = page.getByRole("dialog", { name: "Search tasks" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("searchbox").fill("find me");
    await expect(dialog.getByText("Previous 7 days")).toBeVisible();
    await dialog.getByRole("button", { name: "Find me by title" }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    // Delete from the row menu: confirm, then the row is gone and the page leaves the task.
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    page.once("dialog", (d) => void d.accept());
    const row = page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Find me by title/ });
    await row.hover();
    await page.getByRole("button", { name: "More actions for Find me by title" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Find me by title/ })).toHaveCount(0);
    expect((await listHistory(page.request)).find((e) => e.id === id)).toBeUndefined();
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("the Inbox opens its popover and Escape closes it", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("button", { name: /^Inbox/ }).click();
    const inbox = page.getByRole("dialog", { name: "Inbox" });
    await expect(inbox).toBeVisible();
    await expect(inbox).toHaveText(/No messages yet/);
    await page.keyboard.press("Escape");
    await expect(inbox).toBeHidden();
  });

  test("narrow: the page's toggle is the reference's Expand sidebar icon with a 44 px hit area", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow", "drawer exists only below 900 px");
    await page.goto("/");
    await settled(page);
    const toggle = page.getByRole("button", { name: "Expand sidebar" });
    await expect(toggle).toHaveAttribute("title", "Expand sidebar");
    const box = await toggle.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(page.getByTestId("promo-card")).toHaveCount(0);
  });

  test("desktop: the promo card shows two pages and Close hides it for the browser", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the card is not shown at 390");
    await page.goto("/");
    await settled(page);
    const card = page.getByTestId("promo-card");
    await expect(card).toContainText("H3 takes the stage");
    await card.getByRole("button", { name: "2" }).click();
    await expect(card).toContainText("New MiniMax Desktop");
    await card.getByRole("button", { name: "Close" }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await settled(page);
    await expect(page.getByTestId("promo-card")).toHaveCount(0);
  });
});

const DARK_BODY = "rgb(28, 28, 28)"; // --bg_default_primary_elevated, dark (docs/recon/2026-09-14/tokens.md)
const LIGHT_BODY = "rgb(255, 255, 255)";
const bodyBackground = (page: Parameters<typeof settled>[0]) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** User chip → Settings, opening the drawer first at 390 (the chip lives in the sidebar). */
async function openSettings(page: Parameters<typeof settled>[0], narrow: boolean): Promise<void> {
  if (narrow) {
    await page.getByRole("button", { name: "Expand sidebar" }).click();
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
