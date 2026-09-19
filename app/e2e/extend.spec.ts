import { expect, test } from "./fixtures/test";
import { clearHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { expectPlayable } from "./fixtures/video";

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
});

/** A finished job to extend: Send with a script that lands on the first poll, and wait for that terminal response. */
async function finishOne(page: import("@playwright/test").Page, prompt: string): Promise<string> {
  await page.goto("/?script=done-after-1-poll");
  await page.getByRole("textbox", { name: "Message" }).fill(prompt);
  const terminal = waitForTerminalStatus(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/\/task\/[^/?]+$/);
  await terminal;
  return page.url().split("/task/")[1] ?? "";
}

test.describe("extend a finished video (STORY_016, STORY_017)", () => {
  test("Extend continues a finished clip: the tile says what the new clip starts from, Send creates an extension, the result plays and can be extended again", async ({ page, stubApi }) => {
    const id1 = await finishOne(page, "The first clip");
    // the pane opened with the finished job (STORY_023) — at 390 it covers the page — so close it; Extend lives in the card's More menu
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("result-card").getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: /Extend/ }).click();
    await settled(page);
    await expect(page.getByTestId("continuation")).toContainText("Continues · 2.0 s");
    await expect(page.getByTestId("overlap-line")).toHaveText("carries its last 1.6 s into the new clip");
    await expect(page.getByRole("button", { name: "Add reference image" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Video parameters: 16:9 768P +10s" })).toBeVisible();
    await page.getByRole("button", { name: /^Video parameters:/ }).click();
    await settled(page);
    await expect(page.getByRole("radio", { name: "9:16" })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "1.6 s" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "+14s" })).toBeHidden(); // the 39-frame overlap leaves room for 13 s
    await page.getByRole("radio", { name: "0.9 s" }).click();
    await expect(page.getByTestId("overlap-line")).toHaveText("carries its last 0.9 s into the new clip");
    await expect(page.getByRole("radio", { name: "+14s" })).toBeVisible();
    // STORY_061: the End row — Where it began is the default; this one is sent with Anywhere and the next stays pinned
    await expect(page.getByRole("radio", { name: "Where it began" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Anywhere" }).click();
    await expect(page.getByRole("radio", { name: "Anywhere" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await page.getByRole("textbox", { name: "Message" }).fill("and then he bows");
    // Registered before the click (CLAUDE.md §6b); the new task polls with the stub's default script. The URL still
    // reads /task/<id1> until the app navigates, so the new id comes from the POST response, not from the URL.
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const { id: id2 } = (await (await created).json()) as { id: string };
    expect(id2).not.toBe(id1);
    await expect(page).toHaveURL(new RegExp(`/task/${id2}$`));
    await expect(page.getByTestId("continues")).toContainText("Continues The first clip · 2.0 s");
    expect((await terminal).status).toBe("done");
    await expect(page.getByTestId("continues")).toContainText("carried its last 0.9 s");
    await expect(page.getByTestId("continues")).not.toContainText("ends where it began");
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${id2}/result`);
    await page.getByTestId("preview-pane").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("result-card").getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("menuitem", { name: /Extend/ })).toBeVisible();
    await page.keyboard.press("Escape");
    const received = await stubApi.received(id2);
    expect(received.request).toMatchObject({ prompt: "and then he bows", continueFrom: id1, durationSeconds: 10, overlapFrames: 22, endAnchor: "none" });
  });

  test("Assets offers Send to new task, which opens the task extending; Stop extending restores the composer without creating a job", async ({ page, stubApi }, testInfo) => {
    const id = await finishOne(page, "Gallery clip");
    await page.goto("/assets");
    await settled(page);
    // STORY_024: the reference's entry is "Send to new task"; at 390 the tile has no ⋯, the preview's ⋯ carries it
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Preview Gallery clip.mp4" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "More actions" }).click();
    } else {
      await page.getByRole("button", { name: "More actions for Gallery clip.mp4" }).click();
    }
    await page.getByRole("menuitem", { name: "Send to new task" }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}\\?extend$`));
    await expect(page.getByTestId("continuation")).toBeVisible();
    const before = (await stubApi.jobs()).length;
    await page.getByRole("button", { name: "Stop extending" }).click();
    await expect(page.getByTestId("continuation")).toBeHidden();
    await expect(page.getByRole("button", { name: "Add reference image" })).toBeVisible();
    expect((await stubApi.jobs()).length).toBe(before);
  });

  test("a failed extension retries as an extension", async ({ page, stubApi }) => {
    const id1 = await finishOne(page, "Source clip");
    // ?extend opens the page extending; ?script= is forwarded by the composer to choose the stub's outcome.
    await page.goto(`/task/${id1}?extend&script=fails-after-2-polls`);
    await expect(page.getByTestId("continuation")).toBeVisible();
    await page.getByRole("textbox", { name: "Message" }).fill("fail me");
    const failed = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/?]+$/);
    expect((await failed).status).toBe("failed");
    await expect(page.getByRole("alert").filter({ hasText: "Request failed" })).toBeVisible();
    const retriedCreate = page.waitForResponse((r) => r.url().endsWith("/api/jobs") && r.request().method() === "POST");
    const retried = waitForTerminalStatus(page);
    await page.getByRole("button", { name: /Retry/ }).click();
    const { id: id3 } = (await (await retriedCreate).json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/task/${id3}$`));
    expect((await retried).status).toBe("done");
    expect((await stubApi.received(id3)).request).toMatchObject({ continueFrom: id1, overlapFrames: 39, prompt: "fail me", endAnchor: "source-last-frame" }); // STORY_061: the default, re-posted by Retry as stored
    await expect(page.getByTestId("continues")).toContainText("ends where it began");
  });
});
