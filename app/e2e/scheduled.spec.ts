import { expect, test } from "./fixtures/test";
import { clearHistory, listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";

/**
 * The queue (STORY_041): with the stub refusing creates as busy (as the adapter does at its open-job limit), two prompts
 * wait in the line in order; the line is reordered and one is timed; the stub freed, the untimed one runs and finishes
 * while the timed one waits until its time is cleared; a third is edited through the composer and then removed. Every
 * job's terminal status is waited on (CLAUDE.md §6b); the spec ends with no job open and the stub free.
 */
test.describe("Scheduled — the queue of generations (STORY_041)", () => {
  test.beforeEach(async ({ request }) => {
    await clearHistory(request);
  });

  test("two prompts wait in line, reorder, one is timed; freed, they run one after another; Edit and Remove of a waiting one", async ({ page, request, stubApi }, testInfo) => {
    test.slow(); // three generations and several page polls: the ceiling covers the sum of the per-step waits below
    const narrow = testInfo.project.name === "narrow";
    const send = async (prompt: string, script = "done-after-1-poll"): Promise<string> => {
      await page.goto(`/?script=${script}`);
      await settled(page);
      await page.getByRole("button", { name: /Video generation/ }).click();
      await page.getByRole("textbox", { name: "Message" }).fill(prompt);
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page).toHaveURL(/\/task\/[^/]+$/);
      return page.url().split("/task/")[1] ?? "";
    };
    // the Spark is busy: both prompts go into the line, and the task page says where
    await stubApi.busy(true);
    const first = await send("First in line", "done-after-3-polls"); // three polls: long enough to be seen Running
    await expect(page.getByTestId("toast")).toHaveText("Queued — 1st in line");
    await expect(page.getByTestId("indicator")).toHaveText(/Waiting — 1st in line/);
    const second = await send("Second in line");
    await expect(page.getByTestId("toast")).toHaveText("Queued — 2nd in line");
    expect(await stubApi.jobs()).toEqual([]); // nothing reached the server
    // the Scheduled row, through the drawer at 390
    await page.goto("/");
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: "Scheduled" }).click();
    await expect(page).toHaveURL(/\/scheduled$/);
    await settled(page);
    const waiting = page.getByRole("region", { name: "Waiting" });
    const rows = waiting.getByTestId("waiting-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("First in line");
    await expect(rows.nth(0)).toContainText("Waiting · next");
    await expect(rows.nth(1)).toContainText("Second in line");
    // reorder: the second moves up
    const moved = page.waitForResponse((r) => r.url().includes(`/api/queue/${second}`) && r.request().method() === "PATCH");
    await rows.nth(1).getByRole("button", { name: "Move Second in line up" }).click();
    expect((await moved).ok()).toBe(true);
    await expect(rows.nth(0)).toContainText("Second in line");
    await expect(rows.nth(1)).toContainText("First in line");
    // time the one now first, an hour ahead: it reads "Not before …" and must not block the other
    await rows.nth(0).getByRole("button", { name: "Run Second in line at" }).click();
    const inAnHour = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number): string => String(n).padStart(2, "0");
    const timed = page.waitForResponse((r) => r.url().includes(`/api/queue/${second}`) && r.request().method() === "PATCH");
    await page.getByLabel("Run at time for Second in line").fill(`${String(inAnHour.getFullYear())}-${pad(inAnHour.getMonth() + 1)}-${pad(inAnHour.getDate())}T${pad(inAnHour.getHours())}:${pad(inAnHour.getMinutes())}`);
    expect((await timed).ok()).toBe(true);
    await expect(rows.nth(0)).toContainText(`Not before ${pad(inAnHour.getHours())}:${pad(inAnHour.getMinutes())}`);
    // the stub freed: the untimed one goes on the next poll and finishes; the timed one still waits
    const firstDone = waitForTerminalStatus(page, { id: first, timeout: 30_000 });
    await stubApi.busy(false);
    await expect(page.getByRole("region", { name: "Running" })).toContainText("First in line", { timeout: 15_000 });
    expect((await firstDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Done today" })).toContainText("First in line", { timeout: 15_000 });
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText("Not before");
    expect((await stubApi.jobs()).length).toBe(1);
    // clear the time: it goes and finishes
    const secondDone = waitForTerminalStatus(page, { id: second, timeout: 30_000 });
    const clear = page.getByRole("button", { name: "Clear the time for Second in line" });
    if (!(await clear.isVisible())) await rows.nth(0).getByRole("button", { name: "Run Second in line at" }).click(); // the picker toggles; it may still be open from the fill
    const cleared = page.waitForResponse((r) => r.url().includes(`/api/queue/${second}`) && r.request().method() === "PATCH");
    await clear.click();
    expect((await cleared).ok()).toBe(true);
    expect((await secondDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Done today" })).toContainText("Second in line", { timeout: 15_000 });
    await expect(page.getByRole("region", { name: "Waiting" })).toHaveCount(0);
    expect((await stubApi.jobs()).length).toBe(2);
    // the finished ones have their real files under our ids (the history id, mapped to the server's job)
    expect((await request.get(`/api/jobs/${first}/result`)).status()).toBe(200);
    // Edit: a third waits; its composer is prefilled; Send replaces the entry in place — no new job, no new history entry
    await stubApi.busy(true);
    const third = await send("Edit me later");
    const before = (await listHistory(request)).length;
    await page.goto("/scheduled");
    await settled(page);
    await page.getByRole("button", { name: "Edit Edit me later" }).click();
    await expect(page).toHaveURL(new RegExp(`/\\?queue=${third}$`));
    await expect(page.getByTestId("editing-banner")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("Edit me later");
    await expect(page.getByText("video-creator")).toBeVisible();
    await page.getByRole("textbox", { name: "Message" }).fill("Edited while waiting");
    const replaced = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await replaced).status()).toBe(202);
    await expect(page).toHaveURL(/\/scheduled$/);
    await expect(page.getByTestId("toast")).toHaveText("Queued — 1st in line");
    await settled(page);
    await expect(page.getByTestId("waiting-row")).toHaveCount(1);
    await expect(page.getByTestId("waiting-row").first()).toContainText("Edited while waiting");
    expect((await listHistory(request)).length).toBe(before);
    expect((await listHistory(request)).find((e) => e.id === third)?.title).toBe("Edited while waiting");
    // Remove: the row, its history entry — the server never asked
    const removed = page.waitForResponse((r) => r.url().includes(`/api/queue/${third}`) && r.request().method() === "DELETE");
    await page.getByRole("button", { name: "Remove Edited while waiting" }).click();
    expect((await removed).status()).toBe(204);
    await expect(page.getByTestId("waiting-row")).toHaveCount(0);
    expect((await listHistory(request)).find((e) => e.id === third)).toBeUndefined();
    expect((await stubApi.jobs()).length).toBe(2);
    await stubApi.busy(false);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("an extension queued against a clip still running waits for it, then goes and finishes (STORY_043)", async ({ page, request, stubApi }, testInfo) => {
    test.slow();
    const narrow = testInfo.project.name === "narrow";
    // a slow clip: ten polls to done — long enough to queue an extension against it
    await page.goto("/?script=slow-done-after-10-polls");
    await settled(page);
    await page.getByRole("button", { name: /Video generation/ }).click();
    await page.getByRole("textbox", { name: "Message" }).fill("A slow clip");
    const sourceDone = waitForTerminalStatus(page, { timeout: 90_000 });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const src = page.url().split("/task/")[1] ?? "";
    await expect(page.getByTestId("indicator")).toContainText(/Queued|Generating/);
    // Queue an extension from the running task page: the pending tile, +N s, Send → queued behind its source
    await page.getByRole("button", { name: /Queue an extension/ }).click();
    await expect(page.getByTestId("continuation")).toHaveAttribute("data-pending", "true");
    await expect(page.getByTestId("continuation")).toContainText("Continues · 5.0 s (not finished yet");
    await page.getByPlaceholder("Describe what happens next…").fill("and it drifts on");
    const queued = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await queued).status()).toBe(202);
    await expect(page.getByTestId("toast")).toHaveText("Queued — 1st in line");
    await page.waitForURL((url) => /\/task\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith(src)); // the new task's page, not the source's
    const ext = page.url().split("/task/")[1] ?? "";
    expect(ext).not.toBe(src);
    await expect(page.getByTestId("indicator")).toContainText("Waiting — 1st in line");
    expect((await listHistory(request)).find((e) => e.id === ext)?.status).toBe("queued");
    // on Scheduled the row names its source and waits while the source runs
    await page.goto("/scheduled");
    await settled(page);
    const rows = page.getByTestId("waiting-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Waiting · after");
    await expect(page.getByRole("region", { name: "Running" })).toContainText("A slow clip");
    // the source finishes (its status polled by this page), the extension goes and finishes
    const extDone = waitForTerminalStatus(page, { id: ext, timeout: 90_000 });
    expect((await sourceDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Waiting" })).toHaveCount(0, { timeout: 20_000 });
    expect((await extDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Done today" })).toContainText("and it drifts on", { timeout: 15_000 });
    const extEntry = (await (await request.get(`/api/history/${ext}`)).json()) as { continuesFrom?: { id: string }; jobId?: string };
    expect(extEntry.continuesFrom?.id).toBe(src);
    const received = await stubApi.received(extEntry.jobId ?? "");
    expect(received.request.continueFrom).toBe(src); // the source was created directly: its id is the stub's
    if (narrow) await expect(page.getByTestId("scheduled-page")).toBeVisible();
    for (const id of [ext, src]) await request.delete(`/api/history/${id}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("the empty page, its search and the status filter", async ({ page }) => {
    await page.goto("/scheduled");
    await settled(page);
    await expect(page.getByTestId("scheduled-empty")).toHaveText(/No scheduled tasks yet\./);
    await expect(page.getByRole("searchbox", { name: "Search scheduled tasks" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Scheduled task status" })).toHaveValue("All");
    await page.getByTestId("scheduled-empty").getByRole("link", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
