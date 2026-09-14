import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/test";
import { clearHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { expectPlayable } from "./fixtures/video";

const FIXTURE_MP4 = path.resolve(process.cwd(), "../tools/stub-generation-server/fixtures/fixture.mp4");

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
});

async function finishOneJob(page: import("@playwright/test").Page, prompt: string): Promise<string> {
  await page.goto("/?script=done-after-1-poll");
  await page.getByRole("button", { name: /Video generation/ }).click();
  await page.getByRole("textbox", { name: "Message" }).fill(prompt);
  const terminal = waitForTerminalStatus(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/\/task\/[^/]+$/);
  await terminal;
  return page.url().split("/task/")[1] ?? "";
}

test.describe("assets (STORY_015)", () => {
  test("with no finished job the empty state links to a new task", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByTestId("assets-empty")).toBeVisible();
    await expect(page.getByText("No assets yet")).toBeVisible();
    await page.getByRole("link", { name: "+ New task" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a finished job appears as a tile; Preview plays it, Download yields the file, Open task navigates, Delete removes it", async ({ page }, testInfo) => {
    const id = await finishOneJob(page, "Gallery clip");
    await page.goto("/assets");
    await settled(page);
    const tile = page.getByTestId("asset-tile").filter({ hasText: "Gallery clip.mp4" });
    await expect(tile).toBeVisible();
    await tile.getByRole("button", { name: "Preview Gallery clip.mp4" }).click({ force: testInfo.project.name === "narrow" });
    await settled(page);
    await expectPlayable(page.getByTestId("preview-video"), `/api/jobs/${id}/result`);
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("link", { name: "Download" }).click();
    const download = await downloadEvent;
    expect(readFileSync(await download.path()).length).toBe(readFileSync(FIXTURE_MP4).length);
    expect(download.suggestedFilename()).toBe("Gallery clip.mp4"); // named by the server (BUG_004)
    await page.getByRole("dialog").getByRole("link", { name: "Open task" }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await page.goto("/assets");
    await settled(page);
    await page.getByRole("button", { name: "More actions for Gallery clip.mp4" }).click();
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("menuitem", { name: "Delete from history" }).click();
    await expect(page.getByTestId("assets-empty")).toBeVisible();
  });

  test("search filters by title and the other chips show their empty state", async ({ page }) => {
    await finishOneJob(page, "Find me by name");
    await page.goto("/assets");
    await page.getByRole("searchbox").fill("nothing like it");
    await expect(page.getByTestId("assets-empty")).toBeVisible();
    await page.getByRole("searchbox").fill("find me");
    await expect(page.getByTestId("asset-tile")).toHaveCount(1);
    await page.getByRole("button", { name: "Images" }).click();
    await expect(page.getByText("No images yet")).toBeVisible();
  });
});
