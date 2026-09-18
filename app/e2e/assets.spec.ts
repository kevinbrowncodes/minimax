import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/test";
import { clearHistory, listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE, REFERENCE_IMAGE_NAME } from "./fixtures/upload";
import { expectPlayable } from "./fixtures/video";

const FIXTURE_MP4 = path.resolve(process.cwd(), "../tools/stub-generation-server/fixtures/fixture.mp4");

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
});

async function finishOneJob(page: import("@playwright/test").Page, prompt: string): Promise<string> {
  await page.goto("/?script=done-after-1-poll");
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

  test("a finished job appears as a tile; Preview plays it, Download yields the file, Locate in task navigates, Delete removes it", async ({ page }, testInfo) => {
    const id = await finishOneJob(page, "Gallery clip");
    await page.goto("/assets");
    await settled(page);
    const tile = page.getByTestId("asset-tile").filter({ hasText: "Gallery clip.mp4" });
    await expect(tile).toBeVisible();
    await tile.getByRole("button", { name: "Preview Gallery clip.mp4" }).click();
    await settled(page);
    await expectPlayable(page.getByTestId("preview-video"), `/api/jobs/${id}/result`);
    // STORY_024: the preview's head is × · name · ⋯; Download and the tile's entries live in the ⋯ menu
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "More actions" }).click();
    const downloadEvent = page.waitForEvent("download");
    await dialog.getByRole("menuitem", { name: "Download" }).click();
    const download = await downloadEvent;
    expect(readFileSync(await download.path()).length).toBe(readFileSync(FIXTURE_MP4).length);
    expect(download.suggestedFilename()).toBe("Gallery clip.mp4"); // named by the server (BUG_004)
    await dialog.getByRole("button", { name: "More actions" }).click();
    await dialog.getByRole("menuitem", { name: "Locate in task" }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await page.goto("/assets");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      // narrow-assets-all@390: no ⋯ on the tile; the preview's ⋯ carries the actions
      await expect(page.getByRole("button", { name: "More actions for Gallery clip.mp4" })).toBeHidden();
      await tile.getByRole("button", { name: "Preview Gallery clip.mp4" }).click();
      await dialog.getByRole("button", { name: "More actions" }).click();
    } else {
      await page.getByRole("button", { name: "More actions for Gallery clip.mp4" }).click();
    }
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByTestId("assets-empty")).toBeVisible();
  });

  test("search filters by title and the other chips show their empty state", async ({ page }, testInfo) => {
    await finishOneJob(page, "Find me by name");
    await page.goto("/assets");
    await settled(page); // the bar's Search button mounts with the page (a click before that was flaky)
    if (testInfo.project.name === "narrow") await page.getByRole("button", { name: "Search" }).click(); // the bar's Search shows the field (STORY_024)
    await page.getByRole("searchbox").fill("nothing like it");
    await expect(page.getByTestId("assets-empty")).toBeVisible();
    await page.getByRole("searchbox").fill("find me");
    await expect(page.getByTestId("asset-tile")).toHaveCount(1);
    await page.getByRole("button", { name: "Images" }).click();
    await expect(page.getByTestId("assets-empty")).toHaveText(/No assets yet/); // the one empty state (STORY_024)
  });
});

test.describe("Assets — Star, From you and the preview's ⋯ (STORY_032)", () => {
  test("Star through the tile ⋯ → the Star tab and Unstar; From you lists the reference image, previews it and deletes the file only", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    // an image-to-video job: the fixture image is kept with it
    await page.goto("/?script=done-after-1-poll");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("Starry clip");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const id = page.url().split("/task/")[1] ?? "";
    await terminal;
    await page.goto("/assets");
    await settled(page);
    const tile = page.getByTestId("asset-tile").filter({ hasText: "Starry clip.mp4" });
    await expect(tile).toBeVisible();
    // Star: behaviour-assets-star-01..03 — the toast, the Star tab, Unstar
    const dialog = page.getByRole("dialog");
    const openTileMenu = async (name: string): Promise<void> => {
      if (narrow) {
        // narrow-assets-all@390: no ⋯ on the tile; the preview's ⋯ carries the actions
        await page.getByRole("button", { name: `Preview ${name}` }).click();
        await dialog.getByRole("button", { name: "More actions" }).click();
      } else await page.getByRole("button", { name: `More actions for ${name}` }).click();
    };
    const closeDialogIfOpen = async (): Promise<void> => {
      if (narrow && (await dialog.isVisible())) await dialog.getByRole("button", { name: "Close asset preview" }).click();
    };
    await openTileMenu("Starry clip.mp4");
    const starred = page.waitForResponse((r) => r.url().includes(`/api/history/${id}`) && r.request().method() === "PATCH");
    await page.getByRole("menuitem", { name: "Star" }).click();
    expect((await starred).ok()).toBe(true);
    await expect(page.getByTestId("toast")).toHaveText(/Starred/);
    await closeDialogIfOpen();
    expect(((await (await request.get(`/api/history/${id}`)).json()) as { starred?: boolean }).starred).toBe(true);
    if (narrow) await page.getByRole("button", { name: "Filter" }).click(); // the bar's Filter shows the tabs (STORY_024)
    await page.getByRole("tab", { name: "Star" }).click();
    await expect(page.getByTestId("asset-tile")).toHaveCount(1);
    await openTileMenu("Starry clip.mp4");
    await page.getByRole("menuitem", { name: "Unstar" }).click();
    await expect(page.getByTestId("toast")).toHaveText(/Unstarred/);
    await closeDialogIfOpen();
    await expect(page.getByTestId("assets-empty")).toBeVisible();
    // From you: the reference image, as an image tile; the Images chip finds it on From agent too
    await page.getByRole("tab", { name: "From you" }).click();
    const imageTile = page.getByTestId("asset-tile").filter({ hasText: REFERENCE_IMAGE_NAME });
    await expect(imageTile).toBeVisible();
    await expect(imageTile).toHaveAttribute("data-kind", "image");
    await page.getByRole("button", { name: `Preview ${REFERENCE_IMAGE_NAME}` }).click();
    await expect(page.getByTestId("preview-image")).toHaveAttribute("src", `/api/history/${id}/reference/1`);
    expect((await request.get(`/api/history/${id}/reference/1`)).headers()["content-type"]).toBe("image/png");
    await dialog.getByRole("button", { name: "Close asset preview" }).click();
    await page.getByRole("tab", { name: "From agent" }).click();
    await page.getByRole("button", { name: "Images" }).click();
    await expect(page.getByTestId("asset-tile").filter({ hasText: REFERENCE_IMAGE_NAME })).toBeVisible();
    // Delete the image: the file goes, the task stays
    await openTileMenu(REFERENCE_IMAGE_NAME);
    page.once("dialog", (d) => void d.accept());
    const removed = page.waitForResponse((r) => r.url().includes(`/api/history/${id}/reference/1`) && r.request().method() === "DELETE");
    await page.getByRole("menuitem", { name: "Delete" }).click();
    expect((await removed).status()).toBe(204);
    await expect(page.getByTestId("assets-empty")).toBeVisible();
    expect((await request.get(`/api/history/${id}/reference/1`)).status()).toBe(404);
    expect((await listHistory(request)).find((e) => e.id === id)?.status).toBe("done");
  });

  test("the preview's Copy link puts the result's URL on the clipboard", async ({ page }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      Object.defineProperty(window, "__copied", { value: copied });
      Object.defineProperty(navigator, "clipboard", { value: { writeText: (text: string) => { copied.push(text); return Promise.resolve(); } }, configurable: true });
    });
    const id = await finishOneJob(page, "Link me");
    await page.goto("/assets");
    await settled(page);
    await page.getByRole("button", { name: "Preview Link me.mp4" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "More actions" }).click();
    await dialog.getByRole("menuitem", { name: "Copy link" }).click();
    await expect(page.getByTestId("toast")).toHaveText(/Link copied/);
    expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([`${new URL(page.url()).origin}/api/jobs/${id}/result`]);
  });
});

test.describe("the Assets page matches the reference (STORY_024)", () => {
  test("From you shows the empty state and From agent the tiles; at 390 the bar's Search shows the field and filters, Filter shows the tabs", async ({ page }, testInfo) => {
    await finishOneJob(page, "Tab me");
    await page.goto("/assets");
    await settled(page);
    await expect(page.getByTestId("asset-tile")).toHaveCount(1);
    if (testInfo.project.name === "narrow") {
      await expect(page.getByRole("tab", { name: "From you" })).toBeHidden();
      await expect(page.getByRole("searchbox")).toBeHidden();
      await page.getByRole("button", { name: "Search" }).click();
      await expect(page.getByRole("searchbox")).toBeFocused();
      await page.getByRole("searchbox").fill("nothing like it");
      await expect(page.getByTestId("assets-empty")).toBeVisible();
      await page.getByRole("searchbox").fill("");
      await page.getByRole("button", { name: "Filter" }).click();
    }
    await page.getByRole("tab", { name: "From you" }).click();
    await expect(page.getByTestId("assets-empty")).toHaveText(/No assets yet/);
    await page.getByRole("tab", { name: "From agent" }).click();
    await expect(page.getByTestId("asset-tile")).toHaveCount(1);
  });

  test("desktop: the title, tabs, chips and tile sit where the capture has them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "positions are the 1440 × 900 capture's");
    await finishOneJob(page, "Measure me");
    await page.goto("/assets");
    await settled(page);
    // assets-all@1440: title 324,64; From agent 324,136 (99 × 32); All chip 324,193 (32 tall); tile 324,246 (252 × 182) — ± 2 px
    const title = await page.getByRole("heading", { name: "Assets" }).boundingBox();
    const tab = await page.getByRole("tab", { name: "From agent" }).boundingBox();
    const chip = await page.getByRole("button", { name: "All" }).boundingBox();
    const tile = await page.getByTestId("asset-tile").boundingBox();
    expect(Math.abs((title?.y ?? 0) - 64)).toBeLessThanOrEqual(2);
    expect(Math.abs((tab?.y ?? 0) - 136)).toBeLessThanOrEqual(2);
    expect(Math.abs((tab?.height ?? 0) - 32)).toBeLessThanOrEqual(1);
    expect(Math.abs((chip?.y ?? 0) - 193)).toBeLessThanOrEqual(2);
    expect(Math.abs((tile?.y ?? 0) - 246)).toBeLessThanOrEqual(2);
    expect(Math.abs((tile?.x ?? 0) - 324)).toBeLessThanOrEqual(2);
    expect(Math.abs((tile?.width ?? 0) - 252)).toBeLessThanOrEqual(1);
    expect(Math.abs((tile?.height ?? 0) - 182)).toBeLessThanOrEqual(1);
  });
});
