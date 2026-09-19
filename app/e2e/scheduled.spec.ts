import { expect, test } from "./fixtures/test";
import { clearHistory, listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";
import { expectPlayable } from "./fixtures/video";

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
    // CHORE_013: from 23:00 on the browser's clock (UTC in the gate container) an hour ahead is tomorrow and the row reads "Not before Sep 17, 00:43" (the date form), so the
    // date is not asserted — only the label and the clock time, which both forms carry
    await expect(rows.nth(0)).toContainText("Not before ");
    await expect(rows.nth(0)).toContainText(`${pad(inAnHour.getHours())}:${pad(inAnHour.getMinutes())}`);
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
    await expect(page.getByRole("button", { name: "Add reference image" })).toBeVisible(); // video mode (STORY_059: no tag)
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

  test("a waiting extension goes when its source finishes with no page watching it — the runner asks the stub itself (BUG_009)", async ({ page, request, stubApi }, testInfo) => {
    test.slow(); // ≈ 4 × 3.5 s of ticks for the source, then the extension's own polls
    const narrow = testInfo.project.name === "narrow";
    // the source and its extension are sent through the app's route with no page open: nothing will ever poll the source
    const src = (await (await request.post("/api/jobs?script=done-after-3-polls", { data: { prompt: "An unwatched clip", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" } })).json()) as { id: string; status: string };
    expect(src.status).toBe("queued");
    const ext = (await (await request.post("/api/jobs?script=done-after-3-polls", { data: { prompt: "and on it goes", ratio: "16:9", resolution: "768P", durationSeconds: 4, model: "minimax-h3", continueFrom: src.id, overlapFrames: 39 } })).json()) as { id: string; status: string; position?: number };
    expect(ext).toMatchObject({ status: "queued", position: 1 });
    expect((await stubApi.jobs()).map((j) => j.id)).toEqual([src.id]); // the extension waits in the app's line
    // the ticker is off under Playwright (QUEUE_TICK_MS=0); GET /api/history runs the same runner a tick runs and never
    // polls a job itself — each call, spaced past QUEUE_SOURCE_STALE_MS (3 s here), is one tick with every tab closed
    await expect
      .poll(
        async () => {
          await request.get("/api/history");
          return (await stubApi.jobs()).map((j) => j.id);
        },
        { intervals: [3_500], timeout: 60_000 },
      )
      .toHaveLength(2); // the runner heard the source finish and sent the extension
    const extEntry = (await (await request.get(`/api/history/${ext.id}`)).json()) as { status: string; jobId?: string; continuesFrom?: { id: string } };
    expect(extEntry.jobId).toBeDefined();
    expect(extEntry.continuesFrom?.id).toBe(src.id);
    expect(((await (await request.get(`/api/history/${src.id}`)).json()) as { status: string }).status).toBe("done"); // recorded by the runner, as a page's poll would
    expect((await stubApi.received(extEntry.jobId ?? "")).request.continueFrom).toBe(src.id);
    // the first page opened sees the extension past Waiting, and finishes it
    const extDone = waitForTerminalStatus(page, { id: ext.id, timeout: 60_000 });
    await page.goto("/scheduled");
    await settled(page);
    await expect(page.getByRole("region", { name: "Waiting" })).toHaveCount(0);
    expect((await extDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Done today" })).toContainText("and on it goes", { timeout: 15_000 });
    if (narrow) await expect(page.getByTestId("scheduled-page")).toBeVisible();
    for (const id of [ext.id, src.id]) await request.delete(`/api/history/${id}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("one image and three scripts go out in one Send and run as a chain (STORY_044)", async ({ page, request, stubApi }, testInfo) => {
    test.slow(); // three jobs of three polls each, one after another, with the runner's stale window between them
    const narrow = testInfo.project.name === "narrow";
    await page.goto("/?script=done-after-3-polls");
    await settled(page);
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    // the scene, then three scripts in the owner's convention; 5 s (the default) is the shortest chain
    const scene = "A red kite over a windy beach at golden hour.";
    const scripts = ["[0:00-0:02] The kite climbs.\n[0:02-0:05] It steadies against the wind.", "[0:00-0:02] The kite turns.\n[0:02-0:05] It dips toward the sand.", "[0:00-0:02] The kite rises again.\n[0:02-0:05] It holds high and still."];
    await page.getByRole("textbox", { name: "Message" }).fill(`${scene}\n\n${scripts.join("\n\n")}`);
    const strip = page.getByTestId("chain-strip");
    await expect(page.getByTestId("chain-summary")).toHaveText("3 segments · 5 s each · ≈ 16.5 s in all · overlap 1.6 s"); // 124 + 175 − 39 + 175 − 39 = 396 frames
    await expect(strip.getByTestId("chain-row")).toHaveCount(3);
    await expect(strip.getByTestId("chain-row").first()).toContainText("1 5 s from the image The kite climbs.");
    await expect(strip.getByTestId("chain-row").nth(2)).toContainText("3 +5 s continues 2 The kite rises again.");
    // every POST's answer is collected from before the click: three 202s, in order, each extension naming the id before it
    const created: { id: string; position?: number }[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((body: { id: string; position?: number }) => created.push(body));
    });
    await page.getByRole("button", { name: "Send all" }).click();
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(3);
    const [first, second, third] = created.map((c) => c.id) as [string, string, string];
    expect(created[1]?.position).toBe(1);
    expect(created[2]?.position).toBe(2);
    await expect(page.getByTestId("toast")).toHaveText("Queued — 3 segments, ≈ 16.5 s");
    await expect(page).toHaveURL(new RegExp(`/task/${third}$`)); // the last segment's page: the whole video's
    await expect(page.getByTestId("indicator")).toContainText("Waiting — 2nd in line");
    const history = await listHistory(request);
    expect(history.find((e) => e.id === second)?.status).toBe("queued");
    expect((await stubApi.jobs()).map((j) => j.id)).toEqual([first]); // only the first has reached the server
    // Scheduled: one Running, two waiting in order, each after its source
    const firstDone = waitForTerminalStatus(page, { id: first, timeout: 90_000 });
    await page.goto("/scheduled");
    await settled(page);
    await expect(page.getByRole("region", { name: "Running" })).toContainText("The kite climbs.");
    const rows = page.getByTestId("waiting-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("The kite turns.");
    await expect(rows.nth(0)).toContainText("Waiting · after");
    await expect(rows.nth(1)).toContainText("The kite rises again.");
    // the first finishes, the second goes and finishes, the third goes and finishes — each terminal waited on
    expect((await firstDone).status).toBe("done");
    const secondDone = waitForTerminalStatus(page, { id: second, timeout: 90_000 });
    expect((await secondDone).status).toBe("done");
    const thirdDone = waitForTerminalStatus(page, { id: third, timeout: 90_000 });
    expect((await thirdDone).status).toBe("done");
    await expect(page.getByRole("region", { name: "Waiting" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Done today" })).toContainText("The kite rises again.", { timeout: 15_000 });
    // each extension went up naming the segment before it
    const secondEntry = (await (await request.get(`/api/history/${second}`)).json()) as { jobId?: string; continuesFrom?: { id: string } };
    const thirdEntry = (await (await request.get(`/api/history/${third}`)).json()) as { jobId?: string; continuesFrom?: { id: string } };
    expect(secondEntry.continuesFrom?.id).toBe(first);
    expect(thirdEntry.continuesFrom?.id).toBe(second);
    expect((await stubApi.received(secondEntry.jobId ?? "")).request.continueFrom).toBe(first);
    expect((await stubApi.received(thirdEntry.jobId ?? "")).request.continueFrom).toBe(secondEntry.jobId);
    // STORY_061: segments 2 and 3 end where they began (the composer's default); the first has no source to pin to
    expect((await stubApi.received(secondEntry.jobId ?? "")).request.endAnchor).toBe("source-last-frame");
    expect((await stubApi.received(thirdEntry.jobId ?? "")).request.endAnchor).toBe("source-last-frame");
    expect((await stubApi.received(first)).request.endAnchor).toBeUndefined();
    // the scene with every segment; the first went multipart (the image), and FormData writes a field's newlines as CRLF
    expect((await stubApi.received(first)).request.prompt.replace(/\r\n/g, "\n")).toBe(`${scene}\n\n${scripts[0] ?? ""}`);
    expect((await stubApi.received(thirdEntry.jobId ?? "")).request.prompt).toBe(`${scene}\n\n${scripts[2] ?? ""}`);
    // the third segment's page holds the result, named after the segment before it
    await page.goto(`/task/${third}`);
    await settled(page);
    await expect(page.getByTestId("continues")).toContainText("Continues The kite turns.");
    // reopened, the result is the file card (task-page@1440); Open preview plays it
    await page.getByTestId("result-card").getByRole("button", { name: "Open preview" }).click();
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${third}/result`);
    if (narrow) await expect(page.getByTestId("composer")).toBeVisible();
    for (const id of [third, second, first]) await request.delete(`/api/history/${id}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("Retry chain: a cut at segment 2's join redraws it and re-queues segment 3 behind the redraw, the old segment 3 cancelled (STORY_056); the page lists the whole chain with each segment's outcome (STORY_057)", async ({ page, request, stubApi }) => {
    test.slow(); // a three-segment chain with a cut script, then a redraw and a re-chained segment — five jobs in all
    await page.goto("/?script=done-with-cut-at-join"); // every segment reports a cut at frame 56 — the fixture's length, so an extension's join; segment 2's notice is the one this story acts on
    await settled(page);
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const scene = "A red kite over a windy beach at golden hour.";
    const scripts = ["[0:00-0:02] The kite climbs.\n[0:02-0:05] It steadies.", "[0:00-0:02] The kite turns.\n[0:02-0:05] It dips.", "[0:00-0:02] The kite rises again.\n[0:02-0:05] It holds."];
    await page.getByRole("textbox", { name: "Message" }).fill(`${scene}\n\n${scripts.join("\n\n")}`);
    const created: { id: string }[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((body: { id: string }) => created.push(body));
    });
    await page.getByRole("button", { name: "Send all" }).click();
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(3);
    const [first, second, third] = created.map((c) => c.id) as [string, string, string];
    // segments 1 and 2 done (each after its polls) — the page's own polls, through the job route that records them
    for (const id of [first, second]) {
      await expect.poll(async () => ((await (await request.get(`/api/jobs/${id}`)).json()) as { status: string }).status, { timeout: 60_000 }).toBe("done");
    }
    // segment 2's page: the notice says the segment behind it goes again too; ?script= on the page URL is what the redraw and the re-chain use
    await page.goto(`/task/${second}?script=done-after-1-poll`);
    await settled(page);
    const notice = page.getByTestId("cut-notice");
    await expect(notice).toContainText("The shot changed at 00:02");
    await expect(notice).toContainText("Retry redraws this segment and the 1 segment queued after it with new seeds.");
    // STORY_057: the chain's rows — segment 1's cut has no join (cut inside), segment 2's is at its join, segment 3 is on its way
    const rows = page.getByTestId("chain-outcome-row");
    await expect(rows).toHaveCount(3);
    await expect(page.getByTestId("chain-outcomes")).toContainText("Chain · 3 segments");
    await expect(rows.nth(0)).toHaveAttribute("data-outcome", "cut-inside");
    await expect(rows.nth(1)).toHaveAttribute("data-outcome", "cut-at-join");
    await expect(rows.nth(1)).toContainText("this");
    expect(["waiting", "queued", "running", "cut-at-join"]).toContain(await rows.nth(2).getAttribute("data-outcome"));
    await expect(rows.nth(0).getByRole("link")).toHaveAttribute("href", `/task/${first}`);
    const rechained = page.waitForResponse((r) => r.url().includes(`/api/jobs/${second}/retry-chain`) && r.request().method() === "POST");
    await notice.getByRole("button", { name: "Retry chain" }).click();
    const body = (await (await rechained).json()) as { id: string; rechained: string[] };
    expect(body.rechained).toHaveLength(1);
    const [redraw, newThird] = [body.id, body.rechained[0] ?? ""];
    await expect(page.getByTestId("toast")).toHaveText("Redrawing this segment and 1 after it");
    await expect(page).toHaveURL(new RegExp(`/task/${redraw}`));
    // the old segment 3 is cancelled; the new one continues from the redraw; both new jobs finish, the new segment 3 after the redraw
    expect(((await (await request.get(`/api/history/${third}`)).json()) as { status: string }).status).toBe("cancelled");
    expect(((await (await request.get(`/api/history/${newThird}`)).json()) as { continuesFrom?: { id: string } }).continuesFrom?.id).toBe(redraw);
    expect(((await (await request.get(`/api/history/${redraw}`)).json()) as { continuesFrom?: { id: string } }).continuesFrom?.id).toBe(first);
    for (const id of [redraw, newThird]) {
      await expect.poll(async () => ((await (await request.get(`/api/jobs/${id}`)).json()) as { status: string }).status, { timeout: 60_000 }).toBe("done");
    }
    // STORY_057: the redraw's page lists the chain without the cancelled old segment 3
    await page.goto(`/task/${redraw}`);
    await settled(page);
    const after = page.getByTestId("chain-outcome-row");
    await expect(after).toHaveCount(4); // 1, the old 2 (its cut at the join, still a link), the redraw, the new 3
    const hrefs = await after.locator("a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).not.toContain(`/task/${third}`);
    expect(hrefs).toContain(`/task/${newThird}`);
    await expect(after.nth(2)).toContainText("this");
    const newThirdEntry = (await (await request.get(`/api/history/${newThird}`)).json()) as { jobId?: string };
    expect((await stubApi.received(redraw)).request.continueFrom).toBe(first);
    expect((await stubApi.received(newThirdEntry.jobId ?? newThird)).request.continueFrom).toBe(redraw);
    expect((await stubApi.received(redraw)).request.prompt).toBe(`${scene}\n\n${scripts[1] ?? ""}`);
    // Scheduled › Done today lists the redraw and the re-chained segment; the cancelled one is not waiting anywhere
    await page.goto("/scheduled");
    await settled(page);
    await expect(page.getByTestId("waiting-row")).toHaveCount(0);
    for (const id of [newThird, redraw, third, second, first]) await request.delete(`/api/history/${id}`);
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
