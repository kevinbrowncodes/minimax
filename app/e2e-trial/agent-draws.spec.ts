/**
 * STORY_055's manual verification, driven through the real UI: Draws x2 set in Agent settings on the deployed app, the
 * office photo through the thirst-trap director (the reply reviewed), Send ×2 → two jobs accepted against the real
 * adapter (the second waits in the line — the Spark takes one at a time). Stops after the two 202s and writes the ids
 * for the detached poller (agent-chain-poll.sh reads any ids json); the seeds are read from the adapter's log once both
 * are done. The setting is put back to x1. Not part of the gate.
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_IMAGE (/work/test/26-09-17-0800_office/01.jpeg)
 *   TRIAL_NOTES ("keep the camera still")  TRIAL_OUT_DIR (/work/spark/data/smoke)  TRIAL_DRAWS (2)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/test/26-09-17-0800_office/01.jpeg";
const NOTES = process.env["TRIAL_NOTES"] ?? "keep the camera still";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const DRAWS = Number(process.env["TRIAL_DRAWS"] ?? "2");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

const t0 = Date.now();
function stamper(testInfo: TestInfo) {
  return (label: string): void => {
    const line = `${label} at +${String(Math.round((Date.now() - t0) / 1000))}s`;
    testInfo.annotations.push({ type: "trial", description: line });
    console.log(`[trial] ${line}`);
  };
}

test("Draws x2: the director's prompt for the office photo goes out twice on the Spark", async ({ page }, testInfo) => {
  test.setTimeout(15 * 60_000);
  const stamp = stamper(testInfo);
  mkdirSync(OUT_DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT_DIR, `agent-draws-${name}-${STAMP}.png`), fullPage: false });

  await page.goto("/");
  const chip = page.getByTestId("agent-chip");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-label", "Agent on · Thirst trap");
  // Draws xN through the panel
  await page.getByRole("button", { name: "Agent settings" }).click();
  const panel = page.getByRole("dialog", { name: "Agent settings" });
  await panel.getByRole("radio", { name: `x${String(DRAWS)}` }).click();
  const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
  await shot("settings");
  await panel.getByRole("button", { name: "Save" }).click();
  expect(((await (await saved).json()) as { agentDraws: number }).agentDraws).toBe(DRAWS);
  await expect(panel).toBeHidden();
  stamp(`Draws x${String(DRAWS)} saved`);
  await page.getByTestId("reference-input").setInputFiles(IMAGE);
  await page.getByRole("textbox", { name: "Message" }).fill(NOTES);
  const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST", { timeout: 600_000 });
  await page.getByRole("button", { name: `Send message, ${String(DRAWS)} draws` }).click();
  const reply = (await (await run).json()) as { kind: string; prompt?: string; findings?: unknown[]; passes?: number };
  stamp(`the director answered: ${reply.kind}${reply.passes === undefined ? "" : ` in ${String(reply.passes)} passes`}, ${String(reply.findings?.length ?? 0)} findings`);
  expect(reply.kind).toBe("prompt");
  writeFileSync(path.join(OUT_DIR, `agent-draws-reply-${STAMP}.txt`), `${reply.prompt ?? ""}\n`);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/^For the target video/);
  const send = page.getByRole("button", { name: `Send message, ${String(DRAWS)} draws` });
  await expect(send).toContainText(`×${String(DRAWS)}`);
  stamp(`the line: ${(await page.getByTestId("spark-time").textContent()) ?? ""}`);
  await shot("reply");
  const created: { id: string; position?: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((body: { id: string; position?: number }) => created.push(body));
  });
  await send.click();
  await expect.poll(() => created.length, { timeout: 120_000 }).toBe(DRAWS);
  const ids = created.map((c) => c.id);
  stamp(`accepted: ${created.map((c) => `${c.id.slice(0, 8)}${c.position === undefined ? "" : ` (${String(c.position)} in line)`}`).join(", ")}`);
  await expect(page).toHaveURL(new RegExp(`/task/${ids[0] ?? ""}$`));
  await shot("queued");
  writeFileSync(path.join(OUT_DIR, `agent-draws-${STAMP}.json`), `${JSON.stringify({ stamp: STAMP, notes: NOTES, draws: DRAWS, ids, positions: created.map((c) => c.position ?? null) }, null, 2)}\n`);
  await page.request.patch("/api/settings", { data: { agentDraws: 1 } });
});
