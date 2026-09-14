import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/test";
import { clearHistory, listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";
import { expectPlayable } from "./fixtures/video";

const FIXTURE_MP4 = path.resolve(process.cwd(), "../tools/stub-generation-server/fixtures/fixture.mp4");

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
});

/** Enter video mode, type the prompt, register the terminal wait, click Send, land on the task page. */
async function submit(page: import("@playwright/test").Page, script: string, prompt: string, options: { readonly withImage?: boolean; readonly waitTerminal?: boolean } = {}) {
  await page.goto(`/?script=${script}`);
  await page.getByRole("button", { name: /Video generation/ }).click();
  if (options.withImage) await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
  await page.getByRole("textbox", { name: "Message" }).fill(prompt);
  // Registered before the click (CLAUDE.md §6b). A cancel ends with the DELETE response instead, so its spec opts out.
  const terminal = options.waitTerminal === false ? Promise.resolve({ id: "", status: "n/a", progress: 0 }) : waitForTerminalStatus(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/\/task\/[^/]+$/);
  const id = page.url().split("/task/")[1] ?? "";
  return { id, terminal };
}

test.describe("task page (STORY_014)", () => {
  test("a text prompt goes queued → generating → a playable, downloadable result", async ({ page, stubApi }) => {
    const { id, terminal } = await submit(page, "done-after-3-polls", "A small paper boat drifting across a rain puddle");
    await expect(page.getByTestId("user-message")).toContainText("A small paper boat drifting");
    await expect(page.getByTestId("indicator")).toContainText(/Queued|Generating/);
    await expect(page.getByRole("button", { name: "Stop generation" })).toBeVisible();
    const status = await terminal;
    expect(status.status).toBe("done");
    await expect(page.getByTestId("indicator")).toHaveText(/Your video is ready/);
    await expect(page.locator('[data-step-state="done"]')).toHaveCount(4);
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${id}/result`);
    const download = page.getByTestId("result").getByRole("link", { name: /Download/ });
    await expect(download).toHaveAttribute("href", `/api/jobs/${id}/result?download`); // the server names the save (BUG_004)
    await expect(download).toHaveAttribute("download", /\.mp4$/);
    await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
    expect((await stubApi.received(id)).request.prompt).toBe("A small paper boat drifting across a rain puddle");
  });

  test("Stop cancels a running job and the page says so; nothing is left running", async ({ page, stubApi }) => {
    await submit(page, "cancel-midway", "Cancel me", { waitTerminal: false });
    await expect(page.getByTestId("indicator")).toContainText(/Generating/);
    const cancelled = page.waitForResponse((r) => r.request().method() === "DELETE" && /\/api\/jobs\/[^/]+$/.test(r.url()));
    await page.getByRole("button", { name: "Stop generation" }).click();
    const response = await cancelled;
    expect(response.status()).toBe(202);
    expect(((await response.json()) as { status: string }).status).toBe("cancelled");
    await expect(page.getByRole("alert").filter({ hasText: "Cancelled at" })).toBeVisible();
    await expect(page.locator('[data-step-state="failed"]')).toHaveCount(1);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("a failed job shows Request failed with Retry; a moderated one shows the refusal without Retry", async ({ page }) => {
    const first = await submit(page, "fails-after-2-polls", "Fail me");
    expect((await first.terminal).status).toBe("failed");
    await expect(page.getByRole("alert").filter({ hasText: "Request failed" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry/ })).toBeVisible();
    const second = await submit(page, "moderated", "Refuse me");
    expect((await second.terminal).status).toBe("failed");
    await expect(page.getByRole("alert").filter({ hasText: "refused on content grounds" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry/ })).toBeHidden();
  });

  test("a finished job reopens from Recents with the video playable and no new job", async ({ page, stubApi }, testInfo) => {
    const { id, terminal } = await submit(page, "done-after-1-poll", "Reopen me later");
    await terminal;
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${id}/result`);
    const before = (await stubApi.jobs()).length;
    await page.goto("/");
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Open sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Reopen me later/ }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${id}/result`);
    expect((await stubApi.jobs()).length).toBe(before);
    expect((await listHistory(page.request)).find((e) => e.id === id)?.status).toBe("done");
  });

  test("Download yields the fixture's bytes", async ({ page }) => {
    const { terminal } = await submit(page, "done-after-1-poll", "Save my clip");
    await terminal;
    const downloadEvent = page.waitForEvent("download");
    await page.getByTestId("result").getByRole("link", { name: /Download/ }).click();
    const download = await downloadEvent;
    const file = await download.path();
    expect(readFileSync(file).length).toBe(readFileSync(FIXTURE_MP4).length);
    expect(download.suggestedFilename()).toBe("Save my clip.mp4"); // the server names the file (BUG_004)
  });

  test("image-to-video: the uploaded reference reaches the server and the bubble says so", async ({ page, stubApi }) => {
    const { id, terminal } = await submit(page, "done-after-1-poll", "Animate this", { withImage: true });
    await terminal;
    await expect(page.getByTestId("user-message")).toContainText("1 reference image attached");
    const received = await stubApi.received(id);
    expect(received.uploads).toHaveLength(1);
    expect(received.uploads[0]?.size).toBe(readFileSync(REFERENCE_IMAGE).length);
  });
});
