import { chromium, type BrowserContext, type Page } from "playwright";
import { PROFILE_DIR, REFERENCE_URL, VIEWPORT } from "./config.js";
import type { SessionSignals } from "./session.js";

/**
 * Opens the reference in a persistent-profile Chromium. `channel: "chromium"`
 * makes the headed login and the headless check use the same binary, so the
 * profile one writes the other can read.
 */
export async function openReference(headless: boolean): Promise<{ context: BrowserContext; page: Page }> {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    channel: "chromium",
    viewport: { ...VIEWPORT },
    locale: "en-US",
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  return { context, page };
}

/**
 * The reference shows a first-visit announcement over the page that swallows
 * clicks until closed (observed 2026-09-12: "H3 takes the stage", with a
 * "Try it now" call to action and an icon-only close at its top right; it is
 * not role="dialog"). Returns true when a modal was closed.
 */
export async function dismissAnnouncement(page: Page): Promise<boolean> {
  const cta = page.getByRole("button", { name: /try it now/i }).first();
  if (!(await cta.isVisible().catch(() => false))) return false;

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  if (!(await cta.isVisible().catch(() => false))) return true;

  const ctaBox = await cta.boundingBox();
  if (!ctaBox) return false;
  const iconButtons = page.locator("button:has(svg)").filter({ hasNotText: /\S/ });
  const count = await iconButtons.count();
  let best: { index: number; x: number } | undefined;
  for (let i = 0; i < count; i += 1) {
    const box = await iconButtons.nth(i).boundingBox().catch(() => null);
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // The close sits above the call to action and to the right of its left edge.
    if (cy < ctaBox.y && cx >= ctaBox.x && (!best || cx > best.x)) best = { index: i, x: cx };
  }
  if (!best) return false;
  await iconButtons.nth(best.index).click({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  return !(await cta.isVisible().catch(() => false));
}

const HOME_MARKER = /^\s*new task\s*$/i;

/** Waits up to `timeoutMs` for the home to render (the "New task" sidebar item). */
export async function waitForHome(page: Page, timeoutMs: number): Promise<boolean> {
  return page
    .getByText(HOME_MARKER)
    .first()
    .waitFor({ state: "visible", timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

/** Reads the signals the session classifier needs. Never touches cookies or storage. */
export async function readSessionSignals(page: Page): Promise<SessionSignals> {
  const homeRendered = await page.getByText(HOME_MARKER).first().isVisible({ timeout: 1_000 }).catch(() => false);
  const control = page.getByText(/^\s*sign in\s*$/i).first();
  const signInControlVisible = await control.isVisible({ timeout: 1_000 }).catch(() => false);
  return { url: page.url(), homeRendered, signInControlVisible };
}
