/**
 * STORY_052's manual verification, driven through the real UI: the ≡ beside the Agent chip on the deployed app with
 * the instructions the owner saved (through the API or the panel) — the badge with the active count, the panel with
 * each row, its switch, title and text, and the reference tile where a row has one. Nothing is changed and the
 * director is not run; the run itself is checked over the API (the story's Done note). Not part of the gate.
 *   TRIAL_BASE_URL (http://minimax-app:3000)  TRIAL_OUT_DIR (/work/spark/data/smoke)
 *   TRIAL_EXPECT_ACTIVE (the badge's number; unset: only that the panel matches the API)
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const OUT_DIR = process.env["TRIAL_OUT_DIR"] ?? "/work/spark/data/smoke";
const EXPECT_ACTIVE = process.env["TRIAL_EXPECT_ACTIVE"];

interface Row { readonly id: string; readonly title: string; readonly text: string; readonly active: boolean; readonly reference?: { readonly kind: string } }

test("the ≡ shows the saved instructions on the deployed app", async ({ page, request }) => {
  mkdirSync(OUT_DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT_DIR, `agent-instructions-${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`), fullPage: false });
  const saved = (await (await request.get("/api/agent/instructions")).json()) as { readonly instructions: readonly Row[] };
  const active = saved.instructions.filter((r) => r.active).length;
  if (EXPECT_ACTIVE !== undefined) expect(active).toBe(Number(EXPECT_ACTIVE));

  await page.goto("/");
  const chip = page.getByTestId("agent-chip");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-label", "Agent on · Thirst trap");
  const menu = page.getByRole("button", { name: active === 0 ? "Agent instructions" : `Agent instructions, ${String(active)} active` });
  await expect(menu).toBeVisible();
  if (active > 0) await expect(page.getByTestId("instructions-badge")).toHaveText(String(active));
  else await expect(page.getByTestId("instructions-badge")).toHaveCount(0);
  await shot("badge");

  await menu.click();
  const panel = page.getByRole("dialog", { name: "Agent instructions" });
  await expect(panel).toBeVisible();
  const rows = panel.getByTestId("instruction-row");
  await expect(rows).toHaveCount(saved.instructions.length);
  for (const [i, row] of saved.instructions.entries()) {
    const li = rows.nth(i);
    await expect(li.getByRole("switch", { name: "Toggle instruction active" })).toHaveAttribute("aria-checked", String(row.active));
    await expect(li.getByRole("textbox", { name: "Instruction title" })).toHaveValue(row.title);
    await expect(li.getByRole("textbox", { name: "Instruction text" })).toHaveValue(row.text);
    const tile = li.getByRole("img", { name: /reference/i });
    if (row.reference === undefined) await expect(tile).toHaveCount(0);
    else {
      await expect(tile).toBeVisible();
      await expect.poll(() => tile.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
  }
  await shot("panel");
  console.log(`[trial] ${String(saved.instructions.length)} rows, ${String(active)} active, ${String(saved.instructions.filter((r) => r.reference !== undefined).length)} with a reference`);
  await page.keyboard.press("Escape"); // discards nothing — no edit was made
  await expect(panel).toBeHidden();
  // nothing was changed: the store still answers the same rows
  const after = (await (await request.get("/api/agent/instructions")).json()) as { readonly instructions: readonly Row[] };
  expect(after.instructions.map((r) => [r.id, r.title, r.active])).toEqual(saved.instructions.map((r) => [r.id, r.title, r.active]));
});
