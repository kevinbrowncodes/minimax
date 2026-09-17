/**
 * STORY_050's manual verification, driven through the real UI: the Agent chip on the deployed app, the office photo,
 * the real director on Vertex, the reply reviewed, then Send and the draw waited on against the real adapter and
 * ComfyUI. Not part of the gate. Env (under /work in the gate container):
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_IMAGE (/work/test/26-09-17-0800_office/01.jpeg)
 *   TRIAL_NOTES ("keep the camera still")  TRIAL_OUT_DIR (/work/spark/data/smoke)
 *   TRIAL_SUBMIT_ONLY (1: screenshot the chip's states and the reply, Send, then stop after the 202 — no wait for the GPU)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/test/26-09-17-0800_office/01.jpeg";
const NOTES = process.env["TRIAL_NOTES"] ?? "keep the camera still";
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

test("the Agent chip directs a clip from the office photo through the real director, and the draw runs on the Spark", async ({ page }, testInfo) => {
  test.setTimeout(SUBMIT_ONLY ? 10 * 60_000 : 90 * 60_000);
  const stamp = stamper(testInfo);
  mkdirSync(OUT_DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT_DIR, `agent-chip-${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`), fullPage: false });

  await page.goto("/");
  await page.getByRole("button", { name: /Video generation/ }).click();
  const chip = page.getByTestId("agent-chip");
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await shot("off");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-label", "Agent on · Thirst trap");
  await expect(page.getByRole("button", { name: "Agent model: Gemini 3.8 Flash" })).toBeVisible();
  await page.getByRole("button", { name: "Choose the agent's skill" }).click();
  await expect(page.getByRole("menu", { name: "Skills" }).getByRole("menuitemradio")).toHaveCount(2);
  await shot("menu");
  await page.keyboard.press("Escape");
  await page.getByTestId("reference-input").setInputFiles(IMAGE);
  await page.getByRole("textbox", { name: "Message" }).fill(NOTES);
  await shot("ready");
  stamp("Send to the director");
  const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST", { timeout: 300_000 });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("agent-status")).toHaveText("Thinking…");
  await shot("thinking");
  const reply = (await (await run).json()) as { kind: string; prompt?: string; findings?: unknown[]; passes?: number; message?: string };
  stamp(`the director answered: ${reply.kind}${reply.passes === undefined ? "" : ` in ${String(reply.passes)} passes`}${reply.findings === undefined ? "" : `, ${String(reply.findings.length)} findings`}`);
  expect(reply.kind).toBe("prompt");
  const box = page.getByRole("textbox", { name: "Message" });
  await expect(box).toHaveValue(/^For the target video/);
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Video parameters: 16:9 768P 10s" })).toBeVisible();
  await expect(page.getByTestId("spark-time")).toHaveText("≈ 50 min on the Spark");
  writeFileSync(path.join(OUT_DIR, `agent-chip-reply-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`), `${reply.prompt ?? ""}\n`);
  await shot("reply");

  const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send message" }).click();
  const { id } = (await (await created).json()) as { id: string };
  stamp(`job ${id.slice(0, 8)} accepted`);
  await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
  if (SUBMIT_ONLY) return;
  let last = "";
  for (;;) {
    const body = (await (await page.request.get(`/api/jobs/${id}`)).json()) as { status: string; progress?: number; result?: { frames?: number; durationSeconds?: number; cuts?: unknown; camera?: string }; error?: { message?: string } };
    if (body.status === "done") { stamp(`done: ${JSON.stringify(body.result)}`); await shot("done"); return; }
    if (body.status === "failed" || body.status === "cancelled") { stamp(`${body.status}: ${body.error?.message ?? ""}`); expect(body.status).toBe("done"); return; }
    const line = `${body.status} ${String(body.progress ?? 0)}%`;
    if (line !== last && (body.progress ?? 0) % 25 === 0) { stamp(`${id.slice(0, 8)} ${line}`); last = line; }
    await page.waitForResponse((r) => r.url().endsWith(`/api/jobs/${id}`) && r.request().method() === "GET", { timeout: 180_000 }).catch(() => undefined);
  }
});
