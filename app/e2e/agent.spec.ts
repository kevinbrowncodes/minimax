/**
 * STORY_050: the Agent chip against the stub's fake Vertex (`?agentScript=` picks its outcome; `?script=` the job's).
 * At both widths. A reply reviewed then sent (the job waited to its terminal status); a refusal with no job and one
 * Inbox row that reopens the composer; Stop; findings as a warning that never blocks.
 */
import { expect, test } from "./fixtures/test";
import { clearHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";
import { expectPlayable } from "./fixtures/video";

const STUB = "http://127.0.0.1:4010";

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
  await request.delete("/api/agent/runs"); // the Inbox's rows from earlier specs
});

async function openVideoWithAgent(page: import("@playwright/test").Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByRole("button", { name: /Video generation/ }).click();
  await settled(page);
  const chip = page.getByTestId("agent-chip");
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-label", "Agent on · Thirst trap");
}

test.describe("the Agent chip (STORY_050)", () => {
  test("a reply comes back for review, the duration becomes the skill's, and Send makes the job", async ({ page, stubApi }, testInfo) => {
    await openVideoWithAgent(page, "/?agentScript=clean&script=done-after-1-poll");
    const narrow = testInfo.project.name === "narrow";
    // the chip's menu: the two skills, the first checked; the right-hand pill names the agent's model
    await page.getByRole("button", { name: "Choose the agent's skill" }).click();
    await settled(page);
    const rows = page.getByRole("menu", { name: "Skills" }).getByRole("menuitemradio");
    await expect(rows).toHaveText([/Thirst trap/, /Chain director/]);
    await expect(rows.first()).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    if (!narrow) await expect(page.getByRole("button", { name: "Agent model: Gemini 3.8 Flash" })).toBeVisible();
    await expect(page.getByTestId("agent-hint")).toHaveText("Attach the photo the director starts from.");
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("keep the camera still");
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("agent-status")).toHaveText("Thinking…");
    await expect(page.getByRole("button", { name: "Stop the agent" })).toBeVisible();
    expect((await run).status()).toBe(200);
    // the reply in the box, the chip off, the photo kept, 10 s, the line under Send
    const box = page.getByRole("textbox", { name: "Message" });
    await expect(box).toHaveValue(/^For the target video, at 0\.00 seconds/);
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Video parameters: 16:9 768P 10s" })).toBeVisible();
    await expect(page.getByTestId("spark-time")).toHaveText("≈ 50 min on the Spark");
    await expect(page.getByTestId("agent-findings")).toBeHidden();
    // what the fake was sent: two passes, the photo's bytes, the notes last
    const fake = (await (await page.request.get(`${STUB}/__stub/agent/runs`)).json()) as { runs: { pass: number; parts: { kind: string; head?: string }[] }[] };
    expect(fake.runs.map((r) => r.pass)).toEqual([1, 2]);
    expect(fake.runs[0]?.parts.at(-1)?.head).toBe("Notes: keep the camera still");
    expect(fake.runs[0]?.parts.some((p) => p.kind === "image")).toBe(true);
    // Send is today's Send: the job, its terminal status, the result playing
    const terminal = waitForTerminalStatus(page);
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    const { id } = (await (await created).json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await terminal;
    const received = await stubApi.received(id);
    expect(received.request.prompt.startsWith("For the target video")).toBe(true);
    expect(received.request).toMatchObject({ durationSeconds: 10, referenceImages: 1 });
    await expectPlayable(page.getByTestId("preview-pane").getByTestId("result-video"), `/api/jobs/${id}/result`);
  });

  test("a refusal is shown in the model's words, makes no job, and is one Inbox row that reopens the composer", async ({ page, request, stubApi }, testInfo) => {
    await openVideoWithAgent(page, "/?agentScript=refusal");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("blue trunks under the crop");
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    await expect(page.getByTestId("agent-alert")).toHaveText(/The director declined: "The model stopped for safety"/);
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("blue trunks under the crop");
    expect(await stubApi.openJobs()).toEqual([]);
    expect(((await (await request.get(`${STUB}/__stub/jobs`)).json()) as { jobs: unknown[] }).jobs).toEqual([]);
    // the Inbox: one unread, under Messages; opening it reopens the composer with the notes and the words
    if (testInfo.project.name === "narrow") await page.getByRole("button", { name: "Expand sidebar" }).click();
    const bell = page.getByRole("button", { name: "Inbox, 1 unread" });
    await expect(bell).toBeVisible();
    await bell.click();
    const inbox = page.getByRole("dialog", { name: "Inbox" });
    await inbox.getByRole("tab", { name: "Messages" }).click();
    const row = inbox.getByTestId("inbox-row");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("The director declined");
    await expect(row).toContainText("Thirst trap — blue trunks under the crop");
    await row.click();
    await expect(page).toHaveURL(/\/\?agentRun=/);
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("blue trunks under the crop");
    await expect(page.getByTestId("agent-alert")).toContainText("The director declined");
    const runs = (await (await request.get("/api/agent/runs")).json()) as { runs: { openedAt?: string }[] };
    expect(runs.runs[0]?.openedAt).toBeDefined();
  });

  test("Stop aborts the run: nothing sent, no Inbox row, the notes kept", async ({ page, request, stubApi }) => {
    await openVideoWithAgent(page, "/?agentScript=slow");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("notes for a stopped run");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("agent-status")).toHaveText("Thinking…");
    await page.getByRole("button", { name: "Stop the agent" }).click();
    await expect(page.getByTestId("agent-info")).toHaveText("Stopped — nothing was sent.");
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("notes for a stopped run");
    expect(await stubApi.openJobs()).toEqual([]);
    expect(((await (await request.get("/api/agent/runs")).json()) as { runs: unknown[] }).runs).toEqual([]);
    await expect.poll(async () => ((await (await request.get(`${STUB}/__stub/agent/runs`)).json()) as { runs: { aborted: boolean }[] }).runs[0]?.aborted).toBe(true);
  });

  test("findings come back as a warning that never blocks Send", async ({ page, stubApi }) => {
    await openVideoWithAgent(page, "/?agentScript=warn&script=done-after-1-poll");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    await expect(page.getByTestId("agent-findings")).toContainText("The reply misses the skill's format: the description is");
    await expect(page.getByTestId("agent-findings")).toContainText("no overall_soundscape: field. Edit it, or send it as it is.");
    await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
    const terminal = waitForTerminalStatus(page);
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await created).status()).toBe(202);
    await terminal;
    expect(await stubApi.openJobs()).toEqual([]);
  });
});
