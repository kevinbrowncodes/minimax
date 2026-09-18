/**
 * STORY_056's manual verification, driven through the real UI: the task page of a chain segment whose join cut on the
 * Spark (TRIAL_SEGMENT — 7b2636b9 of 2026-09-18, segment 2 of the straight-through chain), the notice reading
 * "Retry chain", the click, the toast, the redraw's page; the ids written for the detached poller
 * (agent-chain-poll.sh). Nothing else is changed. Not part of the gate.
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_SEGMENT (the history id)  TRIAL_OUT_DIR (/work/spark/data/smoke)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SEGMENT = process.env["TRIAL_SEGMENT"] ?? "7b2636b9-57d7-406f-bcfe-a3d5ccc33ddd";
const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

test("Retry chain on a segment that cut at its join redraws it and re-queues the rest on the Spark", async ({ page }) => {
  mkdirSync(OUT_DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT_DIR, `retry-chain-${name}-${STAMP}.png`), fullPage: false });
  const before = (await (await page.request.get(`/api/history/${SEGMENT}`)).json()) as { chainAfter: { id: string; title: string; status: string }[]; continuesFrom?: { id: string } };
  console.log(`[trial] segment ${SEGMENT.slice(0, 8)} continues ${before.continuesFrom?.id.slice(0, 8) ?? "—"}; after it: ${before.chainAfter.map((e) => `${e.id.slice(0, 8)} (${e.status})`).join(", ")}`);
  await page.goto(`/task/${SEGMENT}`);
  const notice = page.getByTestId("cut-notice");
  await expect(notice).toContainText("The shot changed at 00:10");
  await expect(notice).toContainText(`Retry redraws this segment and the ${String(before.chainAfter.length)} segment`);
  await shot("notice");
  const rechained = page.waitForResponse((r) => r.url().includes(`/api/jobs/${SEGMENT}/retry-chain`) && r.request().method() === "POST", { timeout: 120_000 });
  await notice.getByRole("button", { name: "Retry chain" }).click();
  const response = await rechained;
  expect(response.status()).toBe(202);
  const body = (await response.json()) as { id: string; rechained: string[]; refused?: { segment: number; message: string } };
  console.log(`[trial] redraw ${body.id.slice(0, 8)}, re-chained ${body.rechained.map((id) => id.slice(0, 8)).join(" → ")}${body.refused ? ` — refused at ${String(body.refused.segment)}: ${body.refused.message}` : ""}`);
  await expect(page.getByTestId("toast")).toHaveText(`Redrawing this segment and ${String(body.rechained.length)} after it`);
  await expect(page).toHaveURL(new RegExp(`/task/${body.id}`));
  await shot("redraw");
  const later = await Promise.all(before.chainAfter.map(async (e) => (await (await page.request.get(`/api/history/${e.id}`)).json()) as { id: string; status: string }));
  console.log(`[trial] the old later segments now: ${later.map((e) => `${e.id.slice(0, 8)} ${e.status}`).join(", ")}`);
  writeFileSync(path.join(OUT_DIR, `retry-chain-${STAMP}.json`), `${JSON.stringify({ stamp: STAMP, segment: SEGMENT, ids: [body.id, ...body.rechained], oldAfter: before.chainAfter }, null, 2)}\n`);
});
