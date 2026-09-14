import { createServer, connect, type Server } from "node:net";
import { chromium, type BrowserContext, type Page } from "playwright";
import { PROFILE_DIR, REFERENCE_URL, VIEWPORT } from "./config.ts";
import type { SessionSignals } from "./session.ts";

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
 * The same persistent profile, headless, with Chromium's DevTools protocol published on `port` for every interface
 * (CHORE_005): the owner signs in through chrome://inspect's screencast because the Spark has no display. Headless is
 * required for `--remote-debugging-address`; `channel: "chromium"` keeps it the full browser, whose new headless mode
 * carries the screencast. Nothing else differs from openReference.
 */
export async function openReferenceRemote(port: number): Promise<{ context: BrowserContext; page: Page; relay: Server }> {
  // Under Playwright, Chromium keeps its DevTools server on 127.0.0.1 whatever --remote-debugging-address says
  // (measured 2026-09-14 in the gate container), so a plain TCP relay on every interface fronts it. Chromium's own
  // Host check still applies: the owner must address the Spark by IP, not by name.
  const inner = port + 1;
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chromium",
    viewport: { ...VIEWPORT },
    locale: "en-US",
    args: [`--remote-debugging-port=${String(inner)}`],
  });
  const relay = createServer((socket) => {
    const upstream = connect(inner, "127.0.0.1");
    socket.pipe(upstream).pipe(socket);
    const drop = (): void => {
      socket.destroy();
      upstream.destroy();
    };
    socket.on("error", drop);
    upstream.on("error", drop);
  });
  await new Promise<void>((resolve, reject) => {
    relay.once("error", reject);
    relay.listen(port, "0.0.0.0", () => { resolve(); });
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  return { context, page, relay };
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
