/**
 * STORY_053's manual verification, driven through the real UI: the Chain director chosen in the chip's menu on the
 * deployed app, the office photo, the real director on Vertex, the reply reviewed as the strip, then Send all — the
 * three segments accepted against the real adapter (segment 2 and 3 wait in the line for their source). The draws take
 * ≈ 3 h of GPU, so this spec stops after the three 202s and writes the ids for a detached poller
 * (spark/data/smoke/agent-chain-<stamp>.json); the seams and the strips are read once the poller reports done.
 * Not part of the gate. Env (under /work in the gate container):
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_IMAGE (/work/test/26-09-17-0800_office/01.jpeg)
 *   TRIAL_NOTES ("3 segments")  TRIAL_OUT_DIR (/work/spark/data/smoke)
 *   TRIAL_CONFIRM (never: STORY_053's straight-through — the three POSTs with no click; the setting is put back after)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";

const IMAGE = process.env["TRIAL_IMAGE"] ?? "/work/test/26-09-17-0800_office/01.jpeg";
const NOTES = process.env["TRIAL_NOTES"] ?? "3 segments";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const STRAIGHT_THROUGH = process.env["TRIAL_CONFIRM"] === "never";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

const t0 = Date.now();
function stamper(testInfo: TestInfo) {
  return (label: string): void => {
    const line = `${label} at +${String(Math.round((Date.now() - t0) / 1000))}s`;
    testInfo.annotations.push({ type: "trial", description: line });
    console.log(`[trial] ${line}`);
  };
}

test("the Chain director writes three segments from the office photo, and Send all queues them on the Spark", async ({ page }, testInfo) => {
  test.setTimeout(15 * 60_000);
  const stamp = stamper(testInfo);
  mkdirSync(OUT_DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT_DIR, `agent-chain-${name}-${STAMP}.png`), fullPage: false });

  await page.goto("/");
  const chip = page.getByTestId("agent-chip");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Choose the agent's skill" }).click();
  const saved = page.waitForResponse((r) => r.url().includes("/api/settings") && r.request().method() === "PATCH");
  await page.getByRole("menu", { name: "Skills" }).getByRole("menuitemradio", { name: /Chain director/ }).click();
  expect(((await (await saved).json()) as { agentSkill: string }).agentSkill).toBe("minimax-h3-director-thirst-trap-chain");
  await expect(chip).toHaveAttribute("aria-label", "Agent on · Chain director");
  if (STRAIGHT_THROUGH) {
    await page.getByRole("button", { name: "Agent settings" }).click();
    const panel = page.getByRole("dialog", { name: "Agent settings" });
    await panel.getByRole("radio", { name: /Never/ }).click();
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(panel).toBeHidden();
    stamp("Confirm before generating: Never");
  }
  await page.getByTestId("reference-input").setInputFiles(IMAGE);
  await page.getByRole("textbox", { name: "Message" }).fill(NOTES);
  await shot("ready");
  // every 202 is collected from before the click that sends them
  const created: { id: string; position?: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/jobs") && r.request().method() === "POST" && r.status() === 202) void r.json().then((body: { id: string; position?: number }) => created.push(body));
  });
  stamp("Send to the chain director");
  const run = page.waitForResponse((r) => r.url().includes("/api/agent/runs") && r.request().method() === "POST", { timeout: 600_000 });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("agent-status")).toHaveText(/^Thinking…/);
  await shot("thinking");
  const reply = (await (await run).json()) as { kind: string; prompt?: string; findings?: { message: string; segment?: number }[]; segments?: number; passes?: number; message?: string };
  stamp(`the director answered: ${reply.kind}${reply.segments === undefined ? "" : `, ${String(reply.segments)} segments`}${reply.passes === undefined ? "" : ` in ${String(reply.passes)} passes`}${reply.findings === undefined ? "" : `, ${String(reply.findings.length)} findings`}`);
  for (const f of reply.findings ?? []) stamp(`finding: ${f.message}`);
  writeFileSync(path.join(OUT_DIR, `agent-chain-reply-${STAMP}.txt`), `${reply.prompt ?? reply.message ?? ""}\n`);
  expect(reply.kind).toBe("prompt");
  if (!STRAIGHT_THROUGH) {
    const box = page.getByRole("textbox", { name: "Message" });
    await expect(box).toHaveValue(/^For the target video/);
    await expect(page.getByTestId("chain-summary")).toContainText(`${String(reply.segments ?? 3)} segments · 10 s each`);
    stamp(`the strip: ${(await page.getByTestId("chain-summary").textContent()) ?? ""}`);
    const rows = page.getByTestId("chain-strip").getByTestId("chain-row");
    for (let i = 0; i < (await rows.count()); i += 1) stamp(`row ${String(i + 1)}: ${((await rows.nth(i).textContent()) ?? "").replace(/\s+/g, " ").slice(0, 160)}`);
    await shot("reply");
    await page.getByRole("button", { name: "Send all" }).click();
  }
  await expect.poll(() => created.length, { timeout: 120_000 }).toBe(reply.segments ?? 3);
  const ids = created.map((c) => c.id);
  stamp(`accepted: ${ids.map((id) => id.slice(0, 8)).join(" → ")}`);
  await expect(page).toHaveURL(new RegExp(`/task/${ids[ids.length - 1] ?? ""}$`));
  await shot("queued");
  writeFileSync(path.join(OUT_DIR, `agent-chain-${STAMP}.json`), `${JSON.stringify({ stamp: STAMP, notes: NOTES, straightThrough: STRAIGHT_THROUGH, ids, segments: reply.segments, findings: reply.findings ?? [] }, null, 2)}\n`);
  if (STRAIGHT_THROUGH) await page.request.patch("/api/settings", { data: { agentConfirm: "always" } });
  await page.request.patch("/api/settings", { data: { agentSkill: "minimax-h3-director-thirst-trap" } });
});
