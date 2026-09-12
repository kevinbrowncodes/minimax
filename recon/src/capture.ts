import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import { dismissAnnouncement, openReference, readSessionSignals, waitForHome } from "./browser.ts";
import { NARROW, WIDE, dateStamp, manifestEntry, screenshotFile, type ManifestEntry, type ReachedBy } from "./capture-plan.ts";
import { OUT_DIR, RECON_ROOT, REFERENCE_URL, VIEWPORT } from "./config.ts";
import { isNoise, sanitizePath, type NetworkEvent } from "./network-log.ts";
import { classifySession } from "./session.ts";

/**
 * STORY_002 part 1: captures every state of the video generation flow that
 * needs no generation. Never clicks Send, never presses Enter in the composer.
 * Curated screenshots → docs/recon/<date>/; raw network log → recon/out/<date>/.
 */

const args = process.argv.slice(2);
const generateIndex = args.indexOf("--generate");
const generate = generateIndex >= 0 ? Number(args[generateIndex + 1] ?? "0") : 0;
if (generate > 0) {
  console.error("--generate N is not implemented yet: part 2 of STORY_002 waits for the owner's approval of N.");
  process.exit(2);
}

const stamp = dateStamp(new Date());
const DOCS_DIR = path.join(RECON_ROOT, "..", "docs", "recon", stamp);
const RAW_DIR = path.join(OUT_DIR, stamp);
const NETWORK_LOG = path.join(RAW_DIR, "network.jsonl");

type Manifest = {
  date: string;
  reference: string;
  note: string;
  entries: ManifestEntry[];
  skipped: { state: string; width: number; reason: string }[];
};

const manifest: Manifest = {
  date: stamp,
  reference: REFERENCE_URL,
  note: "Narrow states are the same persistent context resized to 390×844 (layout only, no touch semantics).",
  entries: [],
  skipped: [],
};

function attachNetworkLog(context: BrowserContext): void {
  const write = (event: NetworkEvent) => appendFileSync(NETWORK_LOG, `${JSON.stringify(event)}\n`);
  context.on("request", (request) => {
    const url = request.url();
    if (isNoise(url)) return;
    write({ kind: "request", at: new Date().toISOString(), method: request.method(), host: new URL(url).host, path: sanitizePath(url) });
  });
  context.on("response", (response) => {
    const url = response.url();
    if (isNoise(url)) return;
    const contentType = (response.headers()["content-type"] ?? "").split(";")[0] ?? "";
    const base: NetworkEvent = {
      kind: "response",
      at: new Date().toISOString(),
      method: response.request().method(),
      host: new URL(url).host,
      path: sanitizePath(url),
      status: response.status(),
      contentType,
    };
    if (contentType.includes("json")) {
      response
        .json()
        .then((body: unknown) => write({ ...base, body }))
        .catch(() => write(base));
    } else {
      write(base);
    }
  });
}

/** Replaces the owner's display name in the page (our browser only) so captures carry no account name. */
async function maskPersonal(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        if (/^\s*MiniMax\d{4,}\s*$/.test(node.textContent ?? "")) node.textContent = "Owner";
      }
    })
    .catch(() => undefined);
}

let currentWidth: number = WIDE;

async function shot(page: Page, state: string, reachedBy: ReachedBy = "auto", note?: string): Promise<void> {
  await maskPersonal(page);
  await page.waitForTimeout(500);
  const file = screenshotFile(state, currentWidth);
  await page.screenshot({ path: path.join(DOCS_DIR, file) });
  manifest.entries.push(manifestEntry({ state, width: currentWidth, url: page.url(), capturedAt: new Date(), reachedBy, note }));
  console.log(`  captured ${file}`);
}

async function step(state: string, run: () => Promise<void>): Promise<boolean> {
  try {
    await run();
    return true;
  } catch (error: unknown) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown";
    manifest.skipped.push({ state, width: currentWidth, reason });
    console.log(`  skipped ${state}@${currentWidth}: ${reason}`);
    return false;
  }
}

async function escape(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}

async function gotoHome(page: Page): Promise<void> {
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForHome(page, 20_000);
  await page.waitForTimeout(2_000);
  await dismissAnnouncement(page);
}

async function enterVideoMode(page: Page): Promise<void> {
  await page.getByRole("button", { name: /video generation/i }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(2_000);
}

const modelButton = (page: Page) => page.getByRole("button", { name: /^model:/i }).first();
const paramsButton = (page: Page) => page.getByRole("button", { name: /^video parameters/i }).first();
const agentModelButton = (page: Page) => page.getByRole("button", { name: /^minimax-m\d/i }).first();
const attachButton = (page: Page) => page.getByRole("button", { name: /add attachment/i }).first();
const clearSceneButton = (page: Page) => page.getByRole("button", { name: /clear selected scene/i }).first();
const editor = (page: Page) => page.locator('[contenteditable="true"]').first();

const removeReferenceButtons = (page: Page) => page.getByRole("button", { name: /remove reference image/i });

/** Empties the composer: any attached reference images, then the editor text. Returns true when verified empty. */
async function clearComposer(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const clear = clearSceneButton(page);
    if (await clear.isVisible().catch(() => false)) await clear.click({ timeout: 5_000 }).catch(() => undefined);
    const removals = removeReferenceButtons(page);
    const count = await removals.count();
    for (let i = count - 1; i >= 0; i -= 1) {
      await removals.nth(i).click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }
    const box = editor(page);
    if (await box.isVisible().catch(() => false)) {
      await box.click({ timeout: 5_000 }).catch(() => undefined);
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(500);
    }
    const text = (await box.innerText().catch(() => "")).trim();
    const refs = await removeReferenceButtons(page).count();
    if (text === "" && refs === 0) return true;
  }
  return false;
}

const TYPED_PROMPT =
  "A slow dolly shot across a rain-soaked neon street at night, reflections shimmering on the wet asphalt, steady 24 fps.";

async function captureWide(page: Page): Promise<void> {
  await gotoHome(page);
  await step("home-signed-in", () => shot(page, "home-signed-in"));

  await step("composer-video-mode", async () => {
    await enterVideoMode(page);
    await shot(page, "composer-video-mode");
  });

  await step("model-menu-open", async () => {
    await modelButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "model-menu-open");
    await escape(page);
  });

  await step("video-params-open", async () => {
    await paramsButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "video-params-open");
    await escape(page);
  });

  await step("agent-model-menu-open", async () => {
    await agentModelButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "agent-model-menu-open");
    await escape(page);
  });

  await step("attach-menu-open", async () => {
    await attachButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "attach-menu-open", "auto", "whatever the + control opens; a native file chooser would not be visible");
    await escape(page);
  });

  await step("scene-selected", async () => {
    await page.getByRole("button", { name: /dark-pop cyber music video/i }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(2_500);
    await shot(page, "scene-selected");
    if (!(await clearComposer(page))) throw new Error("composer not empty after clearing the selected scene");
  });

  await step("composer-typed", async () => {
    // Start from an empty video-mode composer: re-enter the mode if clearing removed the tag.
    if (!(await modelButton(page).isVisible().catch(() => false))) await enterVideoMode(page);
    if (!(await clearComposer(page))) throw new Error("composer not empty before typing");
    if (!(await modelButton(page).isVisible().catch(() => false))) await enterVideoMode(page);
    await editor(page).click({ timeout: 10_000 });
    await page.keyboard.press("End");
    await page.keyboard.type(TYPED_PROMPT, { delay: 5 });
    await page.waitForTimeout(800);
    await shot(page, "composer-typed", "auto", "typed by the script, never sent");
    if (!(await clearComposer(page))) throw new Error("composer not empty after typing");
  });

  await step("assets-empty", async () => {
    await page.getByRole("button", { name: /^assets$/i }).first().click({ timeout: 10_000 });
    await page.waitForURL(/\/assets/, { timeout: 15_000 });
    await page.waitForTimeout(2_000);
    await shot(page, "assets-empty");
  });

  await step("assets-videos-filter", async () => {
    await page.getByRole("button", { name: /^videos$/i }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "assets-videos-filter");
  });
}

async function captureNarrow(page: Page): Promise<void> {
  currentWidth = NARROW;
  await page.setViewportSize({ width: NARROW, height: 844 });
  await gotoHome(page);
  await step("narrow-home", () => shot(page, "narrow-home"));

  await step("narrow-video-mode", async () => {
    await enterVideoMode(page);
    await shot(page, "narrow-video-mode");
  });

  await step("narrow-video-params", async () => {
    await paramsButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "narrow-video-params");
    await escape(page);
  });

  await step("narrow-assets", async () => {
    await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await shot(page, "narrow-assets");
  });

  await page.setViewportSize({ ...VIEWPORT });
  currentWidth = WIDE;
}

/** Leaves the composer as it was found: reload the home and prove it is empty (drafts may persist). */
async function restoreComposer(page: Page): Promise<void> {
  await gotoHome(page);
  const text = (await editor(page).innerText().catch(() => "")).trim();
  const refs = await removeReferenceButtons(page).count();
  if (text === "" && refs === 0) {
    console.log("  composer restored: empty after reload");
    return;
  }
  console.log(`  composer still holds a draft after reload (text ${text.length} chars, ${refs} reference(s)); clearing`);
  if (!(await clearComposer(page))) throw new Error("could not restore the composer to empty");
  await gotoHome(page);
  const again = (await editor(page).innerText().catch(() => "")).trim();
  if (again !== "" || (await removeReferenceButtons(page).count()) > 0) throw new Error("composer draft persists after clearing");
  console.log("  composer restored: empty after clearing and reload");
}

async function main(): Promise<number> {
  mkdirSync(DOCS_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });
  const { context, page } = await openReference(true);
  attachNetworkLog(context);
  try {
    await gotoHome(page);
    const state = classifySession(await readSessionSignals(page));
    if (state !== "signed-in") {
      console.error(`session: ${state} — run pnpm recon:login first.`);
      return 1;
    }
    console.log(`Capturing to docs/recon/${stamp}/ (raw network log in recon/out/${stamp}/)`);
    await captureWide(page);
    await captureNarrow(page);
    await step("composer-restored", () => restoreComposer(page));
  } finally {
    writeFileSync(path.join(DOCS_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await context.close();
  }
  console.log(`Done: ${manifest.entries.length} captured, ${manifest.skipped.length} skipped.`);
  return manifest.skipped.length === 0 ? 0 : 3;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("recon:capture failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  },
);
