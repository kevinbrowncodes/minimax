/**
 * STORY_050: the Agent chip against the stub's fake Vertex (`?agentScript=` picks its outcome; `?script=` the job's).
 * At both widths. A reply reviewed then sent (the job waited to its terminal status); a refusal with no job and one
 * Inbox row that reopens the composer; Stop; findings as a warning that never blocks. STORY_051: straight through.
 * STORY_052: instructions. STORY_053: the chain director — a chain reply reviewed and sent all; straight through, all
 * clean → three segments with no click; one bad segment → nothing posted. STORY_054: the Skills tab's director rows,
 * Use → the chip on, and + › Skills picking the director. STORY_055: draws per prompt — x2 on a hand prompt and on a
 * straight-through reply, two jobs each, no seed in either request.
 */
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures/test";
import type { stub } from "./fixtures/stub";
import { clearHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";
import { expectPlayable } from "./fixtures/video";

const STUB = "http://127.0.0.1:4010";

const THIRST = "minimax-h3-director-thirst-trap";
const CHAIN = "minimax-h3-director-thirst-trap-chain";

test.beforeEach(async ({ request }) => {
  await clearHistory(request);
  await request.delete("/api/agent/runs"); // the Inbox's rows from earlier specs
  await request.patch("/api/settings", { data: { agentConfirm: "always", agentSkill: THIRST, agentDraws: 1 } }); // STORY_051's default, STORY_050's first skill and STORY_055's one draw, whatever the last spec left
});
test.afterEach(async ({ request }) => {
  await request.patch("/api/settings", { data: { agentConfirm: "always", agentSkill: THIRST, agentDraws: 1 } });
  await request.delete("/api/agent/runs"); // the Inbox's Messages rows: never left for the next spec
});

async function openVideoWithAgent(page: Page, url: string): Promise<void> {
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
    // the fake answers at once, so Thinking… and Stop are transient here — the `slow` case below asserts them
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

  // STORY_051 — Confirm before generating
  test("Never: a clean reply goes straight to a job with no review step; the panel saves the setting", async ({ page, stubApi }) => {
    await openVideoWithAgent(page, "/?agentScript=clean&script=done-after-1-poll");
    await page.getByRole("button", { name: "Agent settings" }).click();
    const panel = page.getByRole("dialog", { name: "Agent settings" });
    await expect(panel.getByRole("radio", { name: /Always/ })).toBeChecked();
    await expect(page.getByTestId("agent-settings-model")).toHaveText("Gemini 3.8 Flash · Vertex AI");
    await panel.getByRole("radio", { name: /Never/ }).click();
    const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await panel.getByRole("button", { name: "Save" }).click();
    expect(((await (await saved).json()) as { agentConfirm: string }).agentConfirm).toBe("never");
    await expect(panel).toBeHidden();
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("straight through");
    const terminal = waitForTerminalStatus(page);
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    const response = await created;
    expect(response.status()).toBe(202);
    const { id } = (await response.json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await terminal;
    const received = await stubApi.received(id);
    expect(received.request.prompt.startsWith("For the target video")).toBe(true);
    expect(received.request).toMatchObject({ durationSeconds: 10, referenceImages: 1 });
    await expectPlayable(page.getByTestId("preview-pane").getByTestId("result-video"), `/api/jobs/${id}/result`);
  });

  test("Never: a reply with findings is not sent, and a refusal is not either", async ({ page, request, stubApi }) => {
    await request.patch("/api/settings", { data: { agentConfirm: "never" } });
    await openVideoWithAgent(page, "/?agentScript=warn");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    await expect(page.getByTestId("agent-findings")).toContainText("Not sent — the reply misses the skill's format");
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/^For the target video/);
    expect(((await (await request.get(`${STUB}/__stub/jobs`)).json()) as { jobs: unknown[] }).jobs).toEqual([]);
    await page.goto("/?agentScript=refusal");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await page.getByTestId("agent-chip").click();
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const refused = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await refused).status()).toBe(200);
    await expect(page.getByTestId("agent-alert")).toContainText("The director declined");
    expect(((await (await request.get(`${STUB}/__stub/jobs`)).json()) as { jobs: unknown[] }).jobs).toEqual([]);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  // STORY_052 — Agent instructions
  test("an instruction with an uploaded reference is sent with the run, and not when toggled off", async ({ page, request, stubApi }) => {
    await openVideoWithAgent(page, "/?agentScript=clean");
    await expect(page.getByRole("button", { name: "Agent instructions" })).toBeVisible();
    await page.getByRole("button", { name: "Agent instructions" }).click();
    const panel = page.getByRole("dialog", { name: "Agent instructions" });
    await expect(panel.getByText(/No instructions yet/)).toBeVisible();
    await panel.getByRole("button", { name: "+ Add instruction" }).click();
    await panel.getByRole("textbox", { name: "Instruction title" }).fill("House rule");
    await panel.getByRole("textbox", { name: "Instruction text" }).fill("The camera stays fixed unless the script moves it.");
    await panel.getByRole("button", { name: "+ Reference" }).click();
    const picker = page.getByRole("dialog", { name: "Select reference image" });
    await expect(picker).toBeVisible();
    await page.getByTestId("instruction-upload").setInputFiles(REFERENCE_IMAGE);
    await expect(panel.getByRole("img", { name: "Reference for House rule" })).toBeVisible();
    await panel.getByRole("button", { name: "Done" }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Agent instructions, 1 active" })).toBeVisible();
    await expect(page.getByTestId("instructions-badge")).toHaveText("1");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    let fake = (await (await request.get(`${STUB}/__stub/agent/runs`)).json()) as { runs: { parts: { kind: string; head?: string }[] }[] };
    const heads = fake.runs[0]?.parts.map((p) => (p.kind === "text" ? p.head?.split("\n")[0] : "image")) ?? [];
    expect(heads.filter((h) => h === "image")).toHaveLength(2);
    expect(heads).toContain("Instruction — House rule:");
    expect(heads.indexOf('Reference image for the instruction "House rule":')).toBeLessThan(heads.indexOf("Instruction — House rule:"));
    expect(heads.indexOf("Instruction — House rule:")).toBeLessThan(heads.indexOf("The attached photo — the first frame:"));
    // toggled off: the run carries no instruction
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/^For the target video/); // the reply landed — the chip is off
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("agent-chip").click(); // on again
    await expect(page.getByRole("button", { name: /Agent instructions/ })).toBeVisible();
    await page.getByRole("button", { name: /Agent instructions/ }).click();
    await panel.getByRole("switch", { name: "Toggle instruction active" }).click();
    await panel.getByRole("button", { name: "Done" }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByTestId("instructions-badge")).toBeHidden();
    await stubApi.reset();
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const again = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await again).status()).toBe(200);
    fake = (await (await request.get(`${STUB}/__stub/agent/runs`)).json()) as { runs: { parts: { kind: string; head?: string }[] }[] };
    const off = fake.runs[0]?.parts.map((p) => (p.kind === "text" ? p.head?.split("\n")[0] : "image")) ?? [];
    expect(off.filter((h) => h === "image")).toHaveLength(1);
    expect(off.some((h) => h?.startsWith("Instruction"))).toBe(false);
  });

  // STORY_053 — The chain director
  /** The three 202s of a chain, collected from before the click that sends them. */
  function collectCreated(page: Page): { id: string; position?: number }[] {
    const created: { id: string; position?: number }[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((body: { id: string; position?: number }) => created.push(body));
    });
    return created;
  }
  /** Each segment waited to its terminal status in turn (the runner starts each after its source is done), then the received prompts checked: segment 1 with the instruction line and the photo, 2 and 3 at the marker continuing the id before them — the adapter adds nothing. */
  async function expectChainRan(page: Page, request: APIRequestContext, stubApi: ReturnType<typeof stub>, ids: readonly [string, string, string]): Promise<void> {
    const [first, second, third] = ids;
    // one-poll jobs finish before a page could register a waiter for their status response, so each terminal state is
    // polled through the app's job route (which records it) — bounded, never a sleep
    for (const id of [first, second, third]) {
      await expect.poll(async () => ((await (await request.get(`/api/jobs/${id}`)).json()) as { status: string }).status, { timeout: 60_000 }).toBe("done"); // GET /api/jobs/:id is what records a status (BUG_009): the poll is the page's own
    }
    const secondEntry = (await (await request.get(`/api/history/${second}`)).json()) as { jobId?: string; continuesFrom?: { id: string } };
    const thirdEntry = (await (await request.get(`/api/history/${third}`)).json()) as { jobId?: string; continuesFrom?: { id: string } };
    expect(secondEntry.continuesFrom?.id).toBe(first);
    expect(thirdEntry.continuesFrom?.id).toBe(second);
    const one = (await stubApi.received(first)).request;
    const two = (await stubApi.received(secondEntry.jobId ?? "")).request;
    const three = (await stubApi.received(thirdEntry.jobId ?? "")).request;
    expect(one.prompt.startsWith("For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.")).toBe(true);
    expect(one.referenceImages).toBe(1);
    expect(one.continueFrom).toBeUndefined();
    expect(two.prompt.startsWith("integrated_multimodal_description: [Shot 1]")).toBe(true);
    expect(two.prompt).not.toContain("<Picture");
    expect(two.continueFrom).toBe(first);
    expect(three.prompt.startsWith("integrated_multimodal_description: [Shot 1]")).toBe(true);
    expect(three.continueFrom).toBe(secondEntry.jobId);
    // the last segment's page plays the whole video
    await page.goto(`/task/${third}`);
    await settled(page);
    await page.getByTestId("result-card").getByRole("button", { name: "Open preview" }).click();
    await expectPlayable(page.getByTestId("result-video"), `/api/jobs/${third}/result`);
  }

  test("a chain reply is reviewed as the strip, then Send all runs the three segments in order — segment 1 with the photo, 2 and 3 at the marker (STORY_053)", async ({ page, request, stubApi }, testInfo) => {
    test.slow(); // three jobs of one poll each, one after another, with the runner's stale window between them
    const narrow = testInfo.project.name === "narrow";
    await openVideoWithAgent(page, "/?agentScript=chain&script=done-after-1-poll");
    // the Chain director chosen in the menu: the setting is written, the chip renames
    await page.getByRole("button", { name: "Choose the agent's skill" }).click();
    await settled(page);
    const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await page.getByRole("menu", { name: "Skills" }).getByRole("menuitemradio", { name: /Chain director/ }).click();
    expect(((await (await saved).json()) as { agentSkill: string }).agentSkill).toBe(CHAIN);
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director");
    if (narrow) {
      await page.getByRole("button", { name: "Choose the agent's skill" }).click();
      await expect(page.getByRole("menu", { name: "Skills" })).toContainText("Skills · Chain director");
      await page.keyboard.press("Escape");
    }
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("3 segments");
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    // the strip: three rows titled by their action sentence, 10 s each (the skill's clip length), Send all
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/^For the target video, at 0\.00 seconds/);
    await expect(page.getByTestId("chain-summary")).toHaveText("3 segments · 10 s each · ≈ 31.4 s in all · overlap 1.6 s");
    const rows = page.getByTestId("chain-strip").getByTestId("chain-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("from the image");
    await expect(rows.nth(1)).toContainText("continues 1");
    for (const i of [0, 1, 2]) {
      const words = (await rows.nth(i).textContent()) ?? "";
      expect(words).not.toContain("For the target video");
      expect(words).not.toContain("integrated_multimodal_description");
      expect(words).not.toMatch(/Live-action|The camera holds/);
    }
    await expect(page.getByTestId("agent-findings")).toBeHidden();
    await expect(page.getByTestId("spark-time")).toContainText("on the Spark");
    const created = collectCreated(page);
    await page.getByRole("button", { name: "Send all" }).click();
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(3);
    const ids = created.map((c) => c.id) as [string, string, string];
    await expect(page.getByTestId("toast")).toHaveText("Queued — 3 segments, ≈ 31.4 s");
    await expect(page).toHaveURL(new RegExp(`/task/${ids[2]}$`));
    await expectChainRan(page, request, stubApi, ids);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("Never + every segment clean: the chain goes straight to three segments with no click, and the last page follows (STORY_053)", async ({ page, request, stubApi }) => {
    test.slow();
    await request.patch("/api/settings", { data: { agentConfirm: "never", agentSkill: CHAIN } });
    await page.goto("/?agentScript=chain&script=done-after-1-poll");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await settled(page);
    await page.getByTestId("agent-chip").click();
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const created = collectCreated(page);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(3);
    const ids = created.map((c) => c.id) as [string, string, string];
    await expect(page.getByTestId("toast")).toHaveText("Queued — 3 segments, ≈ 31.4 s");
    await expect(page).toHaveURL(new RegExp(`/task/${ids[2]}$`));
    await expectChainRan(page, request, stubApi, ids);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("Never + one bad segment: nothing is posted — Not sent, Segment 2 named (STORY_053)", async ({ page, request, stubApi }) => {
    await request.patch("/api/settings", { data: { agentConfirm: "never", agentSkill: CHAIN } });
    await page.goto("/?agentScript=chain-warn");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await settled(page);
    await page.getByTestId("agent-chip").click();
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    expect((await run).status()).toBe(200);
    await expect(page.getByTestId("agent-findings")).toContainText("Not sent — Segment 2 misses the skill's format: the description is");
    await expect(page.getByTestId("agent-findings")).toContainText("Edit it and Send all.");
    await expect(page.getByTestId("chain-strip").getByTestId("chain-row")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Send all" })).toBeEnabled();
    expect(((await (await request.get(`${STUB}/__stub/jobs`)).json()) as { jobs: unknown[] }).jobs).toEqual([]);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  // STORY_054 — The Skills tab
  test("Management › Skills lists the two directors with their meta lines; Use opens the composer with the chip on; + › Skills shows it checked and picks the other (STORY_054)", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    await page.goto("/plugins?tab=Skills");
    await settled(page);
    const rows = page.getByTestId("director-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Thirst trap");
    await expect(rows.nth(0)).toContainText("Folder");
    await expect(rows.nth(0).getByTestId("director-meta")).toContainText("verified 2026-09-16");
    await expect(rows.nth(0).getByTestId("director-meta")).toContainText("minimax_h3_fl2va_int8_convrot");
    await expect(rows.nth(1)).toContainText("Chain director");
    await expect(rows.nth(1).getByTestId("director-meta")).toContainText("ComfyUI 0.35.1");
    await expect(rows.nth(0).getByRole("button", { name: /Edit|Delete/ })).toHaveCount(0);
    await expect(page.getByTestId("templates")).toContainText("Short-to-script");
    const templates = await page.getByTestId("skill-row").count(); // never a fixed number: the tab counts directors + whatever templates are stored
    await expect(page.getByRole("tab", { name: /^Skills/ })).toHaveText(new RegExp(`Skills\\s*${String(2 + templates)}$`));
    // Use on the chain director: the home composer in video mode, the chip on with it, the setting written
    const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await rows.nth(1).getByRole("button", { name: "Use Chain director" }).click();
    await expect(page).toHaveURL(/\/\?agent=minimax-h3-director-thirst-trap-chain$/);
    expect(((await (await saved).json()) as { agentSkill: string }).agentSkill).toBe(CHAIN);
    const chip = page.getByTestId("agent-chip");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(chip).toHaveAttribute("aria-label", "Agent on · Chain director");
    if (narrow) await expect(page.getByTestId("composer")).toBeVisible();
    // + › Skills: the two directors as radio rows, the chain director checked; picking Thirst trap changes the chip and the setting
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Skills" }).click();
    const menu = page.getByRole("menu", { name: "Skills" });
    const radios = menu.getByRole("menuitemradio");
    await expect(radios).toHaveText([/Thirst trap/, /Chain director/]);
    await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect(menu.getByRole("menuitem", { name: "Templates" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Add template" })).toBeVisible();
    const picked = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await radios.nth(0).click();
    expect(((await (await picked).json()) as { agentSkill: string }).agentSkill).toBe(THIRST);
    await expect(chip).toHaveAttribute("aria-label", "Agent on · Thirst trap");
    await expect(page.getByRole("menu", { name: "Add attachment" })).toBeHidden();
    // the search on the tab runs over both sections
    await page.goto("/plugins?tab=Skills");
    await settled(page);
    await page.getByRole("searchbox", { name: "Search skills" }).fill("Chain director"); // the first director's description mentions chains too
    await expect(page.getByTestId("director-row")).toHaveCount(1);
    await expect(page.getByTestId("templates")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search skills" }).fill("zzz-nothing");
    await expect(page.getByText("No matching results")).toBeVisible();
    expect(((await (await request.get("/api/settings")).json()) as { agentSkill?: string }).agentSkill).toBe(THIRST);
  });

  // STORY_055 — Draws per prompt
  test("Draws x2 saved in Agent settings: a hand prompt goes out twice — Send reads ×2, the toast counts, the first draw's page, both done, the same prompt and no seed in either request (STORY_055)", async ({ page, request, stubApi }) => {
    test.slow();
    await openVideoWithAgent(page, "/?script=done-after-1-poll");
    await page.getByRole("button", { name: "Agent settings" }).click();
    const panel = page.getByRole("dialog", { name: "Agent settings" });
    await expect(panel.getByRole("radio", { name: "x1" })).toBeChecked();
    await panel.getByRole("radio", { name: "x2" }).click();
    const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
    await panel.getByRole("button", { name: "Save" }).click();
    expect(((await (await saved).json()) as { agentDraws: number }).agentDraws).toBe(2);
    await expect(panel).toBeHidden();
    await page.getByTestId("agent-chip").click(); // off: a hand prompt, not the director
    await expect(page.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("integrated_multimodal_description: [Shot 1] Live-action. The camera holds a perfectly static shot. The man in the navy trunks breathes and holds there.\n\noverall_soundscape: room tone.\n\nnon_diegetic_music: None.");
    const send = page.getByRole("button", { name: "Send message, 2 draws" });
    await expect(send).toContainText("×2");
    await expect(page.getByTestId("spark-time")).toHaveText(/^≈ 2 × \d+ min on the Spark$/);
    const created = collectCreated(page);
    await send.click();
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(2);
    const [first, second] = created.map((c) => c.id) as [string, string];
    await expect(page.getByTestId("toast")).toHaveText("Queued — 2 draws"); // the stub takes both at once, so no place in the line; the Spark's adapter would hold the second (the manual verification)
    await expect(page).toHaveURL(new RegExp(`/task/${first}$`));
    // both jobs recorded as their own history rows, neither an extension; both done
    for (const id of [first, second]) {
      await expect.poll(async () => ((await (await request.get(`/api/jobs/${id}`)).json()) as { status: string }).status, { timeout: 60_000 }).toBe("done"); // GET /api/jobs/:id is what records a status (BUG_009): the poll is the page's own
    }
    const secondEntry = (await (await request.get(`/api/history/${second}`)).json()) as { continuesFrom?: unknown; title: string };
    const firstEntry = (await (await request.get(`/api/history/${first}`)).json()) as { title: string };
    expect(secondEntry.continuesFrom).toBeUndefined(); // a draw, not an extension
    expect(secondEntry.title).toBe(firstEntry.title); // draws share a title, as a Retry and its original do
    const one = (await stubApi.received(first)).request as { prompt: string; seed?: unknown; referenceImages?: number };
    const two = (await stubApi.received(second)).request as { prompt: string; seed?: unknown; referenceImages?: number };
    expect(two.prompt).toBe(one.prompt);
    // the stub, like the adapter, draws a seed when the request carries none (the unit lane proves the body has none): two draws, two seeds
    expect(typeof one.seed).toBe("number");
    expect(two.seed).not.toBe(one.seed);
    expect(one.referenceImages).toBe(1);
    expect(two.referenceImages).toBe(1);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("Never + Draws x2: the director's clean reply becomes two jobs with no click (STORY_055)", async ({ page, request, stubApi }) => {
    test.slow();
    await request.patch("/api/settings", { data: { agentConfirm: "never", agentDraws: 2 } });
    await openVideoWithAgent(page, "/?agentScript=clean&script=done-after-1-poll");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    const created = collectCreated(page);
    const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message, 2 draws" }).click();
    expect((await run).status()).toBe(200);
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(2);
    const [first, second] = created.map((c) => c.id) as [string, string];
    await expect(page.getByTestId("toast")).toHaveText("Queued — 2 draws");
    await expect(page).toHaveURL(new RegExp(`/task/${first}$`));
    for (const id of [first, second]) {
      await expect.poll(async () => ((await (await request.get(`/api/jobs/${id}`)).json()) as { status: string }).status, { timeout: 60_000 }).toBe("done"); // GET /api/jobs/:id is what records a status (BUG_009): the poll is the page's own
    }
    const one = (await stubApi.received(first)).request as { prompt: string; seed?: unknown; durationSeconds?: number };
    const two = (await stubApi.received(second)).request as { prompt: string; seed?: unknown; durationSeconds?: number };
    expect(one.prompt.startsWith("For the target video")).toBe(true);
    expect(two.prompt).toBe(one.prompt);
    expect(one.durationSeconds).toBe(10);
    expect(typeof one.seed).toBe("number");
    expect(two.seed).not.toBe(one.seed); // the stub's own draws, as the adapter's would be
    expect(await stubApi.openJobs()).toEqual([]);
  });
});
