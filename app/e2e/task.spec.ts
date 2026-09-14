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
  test("a text prompt goes queued → generating → a playable, downloadable result", async ({ page, stubApi }, testInfo) => {
    const { id, terminal } = await submit(page, "done-after-3-polls", "A small paper boat drifting across a rain puddle");
    await expect(page.getByTestId("user-message")).toContainText("A small paper boat drifting");
    await expect(page.getByTestId("indicator")).toContainText(/Queued|Generating/);
    await expect(page.getByRole("button", { name: "Stop generation" })).toBeVisible();
    const status = await terminal;
    expect(status.status).toBe("done");
    await expect(page.getByTestId("indicator")).toHaveText(/^Done — /);
    // the job finished on the page, so the preview pane opened by itself with the video (STORY_023)
    await expectPlayable(page.getByTestId("preview-pane").getByTestId("result-video"), `/api/jobs/${id}/result`);
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("preview-pane")).toBeHidden();
    await page.getByRole("button", { name: /^Processed \d+s/ }).click(); // the Processed row unfolds the steps at every width
    await expect(page.locator('[data-step-state="done"]')).toHaveCount(testInfo.project.name === "narrow" ? 4 : 8); // + the Work Area panel's list at ≥ 900
    await page.getByTestId("result-card").getByRole("button", { name: "More" }).click();
    const download = page.getByRole("menu", { name: "Result actions" }).getByRole("menuitem", { name: /Download/ });
    await expect(download).toHaveAttribute("href", `/api/jobs/${id}/result?download`); // the server names the save (BUG_004)
    await expect(download).toHaveAttribute("download", /\.mp4$/);
    await page.keyboard.press("Escape");
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
    await page.getByRole("button", { name: /^Processed \d+s/ }).click();
    await expect(page.locator('[data-step-state="failed"]').first()).toBeVisible();
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
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Reopen me later/ }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    // reopened from history the result is the file card (task-page@1440); Open preview plays it
    await expect(page.getByTestId("result-card")).toContainText("Reopen me later.mp4");
    await expect(page.getByTestId("result-video")).toBeHidden();
    await page.getByTestId("result-card").getByRole("button", { name: "Open preview" }).click();
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${id}/result`);
    expect((await stubApi.jobs()).length).toBe(before);
    expect((await listHistory(page.request)).find((e) => e.id === id)?.status).toBe("done");
  });

  test("Download yields the fixture's bytes", async ({ page }) => {
    const { terminal } = await submit(page, "done-after-1-poll", "Save my clip");
    await terminal;
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("result-card").getByRole("button", { name: "More" }).click();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: /Download/ }).click();
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

test.describe("the task page matches the reference (STORY_023)", () => {
  test("desktop: the Work area button hides and shows the panel, the preview pane yields to it, and the button brings the panel back", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the panel and the button exist only at ≥ 900 px");
    const { terminal } = await submit(page, "done-after-1-poll", "Show me the panel");
    await terminal;
    const pane = page.getByTestId("preview-pane");
    const panel = page.getByTestId("work-area");
    const button = page.getByRole("button", { name: "Work area" });
    await expect(pane).toBeVisible();
    await expect(panel).toBeHidden();
    await pane.getByRole("button", { name: "Close" }).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "Show me the panel.mp4" })).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await button.click();
    await expect(panel).toBeHidden();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Show me the panel.mp4" }).click();
    await expect(pane).toBeVisible();
    await expect(panel).toBeHidden(); // the pane covers the top bar's button, as on the reference; Escape closes it
    await page.keyboard.press("Escape");
    await expect(pane).toBeHidden();
    await expect(panel).toBeVisible();
  });

  test("the thread rows: the Processed row, Copy, the inert Like / Dislike, the credits notice dismisses, the disclaimer", async ({ page }, testInfo) => {
    // the clipboard is stubbed: headless WebKit has no permission to write it, and what matters is what Copy hands it
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: (text: string) => { (window as unknown as { copied?: string }).copied = text; return Promise.resolve(); } } });
    });
    const { terminal } = await submit(page, "done-after-1-poll", "Row by row");
    await terminal;
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("button", { name: /^Processed \d+s/ })).toBeVisible();
    const like = page.getByRole("button", { name: "Like", exact: true });
    await expect(like).toHaveAttribute("aria-disabled", "true");
    await like.click({ force: true });
    await expect(page.getByRole("status").filter({ hasText: "Not part of MiniMax Local" })).toBeVisible();
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { copied?: string }).copied)).toBe("Row by row");
    const notice = page.getByTestId("credits-notice");
    await expect(notice).toContainText("Fewer than 1,000 Credits remain.");
    if (testInfo.project.name === "narrow") {
      const box = await notice.getByRole("button", { name: "Subscribe" }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await notice.getByRole("button", { name: "Dismiss usage notice" }).click();
    await expect(notice).toBeHidden();
    await expect(page.getByText("MiniMax Agent is AI and can make mistakes")).toBeVisible();
  });

  test("a result the server flagged for a shot change carries the notice; its Retry re-posts without a seed (STORY_020, CHORE_009)", async ({ page, stubApi }) => {
    const { id, terminal } = await submit(page, "done-with-cut", "Hold the shot");
    await terminal;
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    const notice = page.getByTestId("cut-notice");
    await expect(notice).toContainText("The shot changed at 00:11");
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    const terminal2 = waitForTerminalStatus(page);
    await notice.getByRole("button", { name: "Retry" }).click();
    const response = await created;
    const posted = JSON.parse(response.request().postData() ?? "{}") as Record<string, unknown>;
    expect(posted).not.toHaveProperty("seed");
    expect(posted).toMatchObject({ prompt: "Hold the shot" });
    const { id: id2 } = (await response.json()) as { id: string };
    expect(id2).not.toBe(id);
    await expect(page).toHaveURL(new RegExp(`/task/${id2}$`));
    expect((await terminal2).status).toBe("done");
    expect((await stubApi.received(id2)).request.prompt).toBe("Hold the shot");
  });
});
