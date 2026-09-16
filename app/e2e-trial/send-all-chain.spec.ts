/**
 * STORY_044's manual verification, driven through the real UI: one image and one text holding a scene and three
 * "[0:00-" scripts, Send all, then every segment waited on against the real adapter and ComfyUI, with timings. Not
 * part of the gate. Env (under /work in the gate container):
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_IMAGE (/work/spark/data/input/01.jpg)
 *   TRIAL_TEXT_FILE (/work/spark/data/input/chain5s/text.txt)  TRIAL_DURATION (5)  TRIAL_OUT_DIR (/work/spark/data/smoke)
 *   TRIAL_SUBMIT_ONLY (1: screenshot the strip and Send all, then stop after the three 202s — no wait for the GPU)
 */
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/spark/data/input/01.jpg";
const TEXT_FILE = process.env["TRIAL_TEXT_FILE"] ?? "/work/spark/data/input/chain5s/text.txt";
const DURATION = process.env["TRIAL_DURATION"] ?? "5";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const SUBMIT_ONLY = process.env["TRIAL_SUBMIT_ONLY"] === "1";

const t0 = Date.now();
function stamper(testInfo: TestInfo) {
  return (label: string): void => {
    const line = `${label} at +${String(Math.round((Date.now() - t0) / 1000))}s`;
    testInfo.annotations.push({ type: "trial", description: line });
    console.log(`[trial] ${line}`);
  };
}

/** Follow a segment's task page to a terminal state: each of the page's own polls is the clock, never a sleep. */
async function waitDone(page: Page, id: string, stamp: (l: string) => void): Promise<{ status: string; frames?: number; durationSeconds?: number; cuts?: unknown }> {
  await page.goto(`/task/${id}`);
  let last = "";
  for (;;) {
    const body = (await (await page.request.get(`/api/jobs/${id}`)).json()) as { status: string; progress?: number; result?: { frames?: number; durationSeconds?: number; cuts?: unknown }; error?: { message?: string } };
    if (body.status === "done") return { status: "done", ...body.result };
    if (body.status === "failed" || body.status === "cancelled") { stamp(`${id.slice(0, 8)} ${body.status}: ${body.error?.message ?? ""}`); return { status: body.status }; }
    const line = `${body.status} ${String(body.progress ?? 0)}%`;
    if (line !== last && (body.progress ?? 0) % 25 === 0) { stamp(`${id.slice(0, 8)} ${line}`); last = line; }
    await page.waitForResponse((r) => r.url().endsWith(`/api/jobs/${id}`) && r.request().method() === "GET", { timeout: 180_000 }).catch(() => undefined);
  }
}

test("one image and three scripts go out in one Send and run as a chain on the Spark (STORY_044)", async ({ page }, testInfo) => {
  const stamp = stamper(testInfo);
  mkdirSync(OUT_DIR, { recursive: true });
  const text = readFileSync(TEXT_FILE, "utf8").trim();
  await page.goto("/");
  await page.getByRole("button", { name: /Video generation/ }).click();
  await expect(page.getByRole("button", { name: /^Model:/ })).toBeEnabled({ timeout: 30_000 });
  await page.getByTestId("reference-input").setInputFiles(IMAGE);
  await page.getByRole("button", { name: /^Video parameters:/ }).click();
  await page.getByRole("radio", { name: `${DURATION}s`, exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Message" }).fill(text);
  await expect(page.getByTestId("chain-strip")).toBeVisible();
  const summary = await page.getByTestId("chain-summary").textContent();
  stamp(`strip: ${summary ?? ""}`);
  await page.getByTestId("composer").screenshot({ path: path.join(OUT_DIR, `send-all-strip-${new Date().toISOString().replace(/[:.]/g, "-")}.png`) });
  const created: { id: string; position?: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((b: { id: string; position?: number }) => created.push(b));
  });
  await page.getByRole("button", { name: "Send all" }).click();
  await expect.poll(() => created.length, { timeout: 60_000 }).toBe(3);
  const ids = created.map((c) => c.id);
  stamp(`sent: ${ids.map((i) => i.slice(0, 8)).join(" → ")} (positions ${created.map((c) => String(c.position ?? "-")).join(", ")})`);
  await expect(page.getByTestId("toast")).toContainText("Queued — 3 segments");
  await expect(page).toHaveURL(new RegExp(`/task/${ids[2] ?? ""}$`));
  stamp(`on the last segment's page: ${(await page.getByTestId("indicator").textContent()) ?? ""}`);
  await page.goto("/scheduled");
  await expect(page.getByTestId("waiting-row")).toHaveCount(2);
  stamp("Scheduled: 1 running, 2 waiting");
  if (SUBMIT_ONLY) return;
  for (const [n, id] of ids.entries()) {
    const r = await waitDone(page, id, stamp);
    stamp(`segment ${String(n + 1)} ${id.slice(0, 8)} ${r.status} frames=${String(r.frames)} seconds=${String(r.durationSeconds)} cuts=${JSON.stringify(r.cuts)}`);
    expect(r.status).toBe("done");
  }
  await page.goto(`/task/${ids[2] ?? ""}`);
  await expect(page.getByTestId("continues")).toBeVisible();
  stamp("the last page holds the whole video");
});
