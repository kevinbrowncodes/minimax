import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BrowserContext, Locator, Page } from "playwright";
import { dismissAnnouncement, openReference, readSessionSignals, waitForHome } from "./browser.ts";
import {
  NARROW,
  WIDE,
  classifyClick,
  dateStamp,
  manifestEntry,
  parseThemeArg,
  parseWidthArg,
  pathOnly,
  screenshotFile,
  selectPasses,
  stateName,
  type ClickOutcome,
  type ManifestEntry,
  type Pass,
  type ReachedBy,
  type Theme,
} from "./capture-plan.ts";
import { OUT_DIR, RECON_ROOT, REFERENCE_URL, VIEWPORT } from "./config.ts";
import { isNoise, sanitizePath, type NetworkEvent } from "./network-log.ts";
import { closeSettings, emptyThemeRecord, openSettings, openUserMenu, pageIsDark, restoreAppearance, setTheme as switchTheme, type ThemeMechanismRecord } from "./theme.ts";
import { parseModeArg, parseModelArg, parseSessionArg } from "./generate-plan.ts";
import { GENERATION_SESSION, runGenerations } from "./generate.ts";
import { classifySession } from "./session.ts";

/**
 * STORY_002 part 1, extended by STORY_018: captures every surface a signed-in user sees, in light and dark, at 1440
 * and 390 — the shell and its menus, every sidebar destination, every composer mode, Assets, a task page — without
 * spending a generation (`--generate N` runs the generation path of generate.ts instead). Never presses Enter in the
 * composer; never clicks an entry of a menu whose entries could change the owner's data (Recents rows, Assets ⋯).
 * Curated screenshots → docs/recon/<date>/; raw control dumps and the network log → recon/out/<date>/.
 */

const args = process.argv.slice(2);
const generateIndex = args.indexOf("--generate");
const generate = generateIndex >= 0 ? Number(args[generateIndex + 1] ?? "0") : 0;
const APPROVED_GENERATIONS = 1; // owner, 2026-09-14: one at 768P, shortest duration, watched to completion; ask before more
const waitIndex = args.indexOf("--wait-minutes");
const waitMinutes = waitIndex >= 0 ? Number(args[waitIndex + 1] ?? "45") : 45;
const captureModel = parseModelArg(args);
const captureMode = parseModeArg(args);
const captureSession = parseSessionArg(args);
const themes = parseThemeArg(args);
const widths = parseWidthArg(args);
const restoreIndex = args.indexOf("--restore-to");
/** `--restore-to light|dark|system`: what to put the Appearance setting back to at the end, overriding what this run found (a rerun after an interrupted run). */
const restoreTo = restoreIndex >= 0 ? (args[restoreIndex + 1] ?? "") : "";
if (restoreTo && !["light", "dark", "system"].includes(restoreTo)) {
  console.error(`unknown --restore-to "${restoreTo}" (use light, dark or system)`);
  process.exit(2);
}
const onlyIndex = args.indexOf("--only");
/** `--only <regex>`: run only the steps whose state matches (a re-run after a fix); the manifest merges over the day's. */
const only = onlyIndex >= 0 ? new RegExp(args[onlyIndex + 1] ?? ".", "i") : null;
const passes = selectPasses(themes, widths);
if (generate > APPROVED_GENERATIONS) {
  console.error(`--generate ${generate} exceeds the ${APPROVED_GENERATIONS} generation(s) the owner approved on 2026-09-14; ask first.`);
  process.exit(2);
}

const stamp = dateStamp(new Date());
const DOCS_DIR = path.join(RECON_ROOT, "..", "docs", "recon", stamp);
const RAW_DIR = path.join(OUT_DIR, stamp);
const STATES_DIR = path.join(RAW_DIR, "states");
const generating = generate > 0 || captureMode !== "full";
const runLabel = generating ? (captureMode === "full" ? "generate" : captureMode) : "";
const NETWORK_LOG = path.join(RAW_DIR, runLabel ? `network-${runLabel}.jsonl` : "network.jsonl");

type ClickRecord = { state: string; width: number; theme: Theme; control: string; outcome: ClickOutcome; target?: string };

type Manifest = {
  date: string;
  reference: string;
  note: string;
  passes: Pass[];
  theme?: ThemeMechanismRecord;
  entries: ManifestEntry[];
  clicks: ClickRecord[];
  skipped: { state: string; width: number; theme: Theme; reason: string }[];
};

const manifest: Manifest = {
  date: stamp,
  reference: REFERENCE_URL,
  note: "Narrow states are the same persistent context resized to 390×844 (layout only, no touch semantics). Dark states carry -dark before the @; the theme was switched through the reference's own control where one was found (manifest.theme says which) and put back at the end.",
  passes: [], // filled as each pass actually starts, so a merged manifest lists only the passes that ran
  entries: [],
  clicks: [],
  skipped: [],
};

/**
 * A run may cover a subset of the passes (`--theme`, `--width`); its manifest is merged over the day's existing one so
 * every file in the folder keeps an entry: entries are replaced by file name, a state captured now drops its old skip,
 * skips and clicks are deduplicated, passes are the union.
 */
function mergeManifest(current: Manifest): Manifest {
  const file = path.join(DOCS_DIR, runLabel ? `manifest-${runLabel}.json` : "manifest.json");
  if (!existsSync(file)) return current;
  let previous: Manifest;
  try {
    previous = JSON.parse(readFileSync(file, "utf8")) as Manifest;
  } catch {
    return current;
  }
  const files = new Set(current.entries.map((e) => e.file));
  // An entry whose file is gone from the folder (deleted as wrong) is dropped; otherwise a capture, old or new, wins over a skip.
  const merged = [...(previous.entries ?? []).filter((e) => !files.has(e.file) && existsSync(path.join(DOCS_DIR, e.file))), ...current.entries];
  // One entry per file: a state shot twice in a run (narrow-video-params-open) keeps its last entry.
  const lastByFile = new Map<string, ManifestEntry>();
  for (const e of merged) lastByFile.set(e.file, e);
  const entries = merged.filter((e) => lastByFile.get(e.file) === e);
  const key = (s: { state: string; width: number; theme: Theme }) => `${s.state}@${s.width}/${s.theme}`;
  const captured = new Set(entries.map((e) => key(e)));
  const skippedNow = new Set(current.skipped.map((s) => key(s)));
  const passesRun = new Set(current.passes.map((p) => `${p.width}/${p.theme}`));
  // A skip from an earlier run survives unless this run captured or re-skipped the state, or re-ran its whole pass
  // (a `--only` run re-ran only the matching steps, so the other steps' skips still stand).
  const reran = (s: { state: string; width: number; theme: Theme }) => passesRun.has(`${s.width}/${s.theme}`) && (!only || only.test(s.state.replace(/^narrow-/, "")));
  const skipped = [
    ...(previous.skipped ?? []).filter((s) => !captured.has(key(s)) && !skippedNow.has(key(s)) && !reran(s)),
    ...current.skipped.filter((s) => !captured.has(key(s))),
  ];
  const clickKey = (c: ClickRecord) => `${c.state}@${c.width}/${c.theme}`;
  const clicksNow = new Set(current.clicks.map(clickKey));
  const clicks = [...(previous.clicks ?? []).filter((c) => !clicksNow.has(clickKey(c))), ...current.clicks];
  const passes = [...(previous.passes ?? [])];
  for (const p of current.passes) if (!passes.some((q) => q.width === p.width && q.theme === p.theme)) passes.push(p);
  // The theme record: keep the discovery a run made from the light side (control wording, document before/after),
  // fill any blank field from this run, and always take this run's word on whether the setting was put back.
  const base = previous.theme && previous.theme.originalWasDark === false ? previous.theme : (current.theme ?? previous.theme);
  const theme = base
    ? {
        ...base,
        control: base.control || current.theme?.control || "",
        documentBefore: base.documentBefore || current.theme?.documentBefore || "",
        documentAfter: base.documentAfter || current.theme?.documentAfter || "",
        bodyBackgroundLight: base.bodyBackgroundLight || current.theme?.bodyBackgroundLight || "",
        bodyBackgroundDark: base.bodyBackgroundDark || current.theme?.bodyBackgroundDark || "",
        restored: current.theme?.restored ?? base.restored,
      }
    : undefined;
  return { ...current, passes, entries, clicks, skipped, ...(theme ? { theme } : {}) };
}

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

const mask = (text: string): string => text.replace(/MiniMax\d{4,}/g, "Owner").replace(/(UID\s*[:：]\s*)\d{6,}/g, "$1000000000000000000");

/** Replaces the owner's display name and account id in the page (our browser only) so captures carry neither. */
async function maskPersonal(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        const text = node.textContent ?? "";
        if (/^\s*MiniMax\d{4,}\s*$/.test(text)) node.textContent = "Owner";
        else if (/UID\s*[:：]\s*\d{6,}/.test(text)) node.textContent = text.replace(/(UID\s*[:：]\s*)\d{6,}/, "$1000000000000000000");
        else if (/^\s*\d{15,}\s*$/.test(text) && node.parentElement && /UID/.test(node.parentElement.parentElement?.textContent ?? "")) node.textContent = "000000000000000000";
      }
      for (const input of Array.from(document.querySelectorAll("input"))) {
        if (/MiniMax\d{4,}/.test(input.value)) input.value = input.value.replace(/MiniMax\d{4,}/g, "Owner");
      }
    })
    .catch(() => undefined);
}

let currentWidth: number = WIDE;
let currentTheme: Theme = "light";

/**
 * Every visible control on the page with its accessible name and box, the main text, and the document element's
 * attributes — the inventory's raw material, one JSON per screenshot in recon/out/<date>/states/ (never committed).
 */
async function dumpState(page: Page, file: string): Promise<void> {
  const dump = await page
    .evaluate(() => {
      const vis = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const name = (e: Element) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.getAttribute("placeholder") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
      const controls = Array.from(document.querySelectorAll("button, a, input, textarea, select, [contenteditable], [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], [role=radio], [role=switch], [role=checkbox], [role=link], [role=dialog], [role=menu], video, h1, h2, h3"))
        .filter(vis)
        .map((e) => {
          const r = e.getBoundingClientRect();
          const role = e.getAttribute("role");
          const href = e instanceof HTMLAnchorElement ? (() => { try { return new URL(e.href).host + new URL(e.href).pathname; } catch { return ""; } })() : "";
          const state = [e.getAttribute("aria-checked"), e.getAttribute("aria-selected"), e.getAttribute("aria-expanded"), e.getAttribute("aria-disabled")].filter((v) => v !== null).join("/");
          return `${e.tagName.toLowerCase()}${role ? `[${role}]` : ""} "${name(e)}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}${state ? ` (${state})` : ""}${href ? ` → ${href}` : ""}`;
        });
      // Menu entries and cards the reference renders without a role: leaf-ish elements with a pointer cursor and short text.
      const clickable = Array.from(document.querySelectorAll("div, span, li, p, label"))
        .filter((e) => vis(e) && getComputedStyle(e).cursor === "pointer")
        .filter((e) => {
          const t = (e.textContent || "").trim();
          return t.length > 0 && t.length <= 60 && !Array.from(e.children).some((c) => getComputedStyle(c).cursor === "pointer" && (c.textContent || "").trim() === t);
        })
        .slice(0, 120)
        .map((e) => {
          const r = e.getBoundingClientRect();
          return `${e.tagName.toLowerCase()}[pointer] "${name(e)}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
        });
      const main = (document.querySelector("main") ?? document.body) as HTMLElement;
      const root = document.documentElement;
      const rootAttrs = Array.from(root.attributes).map((a) => `${a.name}="${a.value}"`).join(" ");
      return { path: location.pathname, root: `<html ${rootAttrs}>`, bodyClass: document.body.className, controls: [...controls, ...clickable], text: main.innerText.replace(/\s+/g, " ").slice(0, 2000) };
    })
    .catch(() => ({ path: "", root: "", bodyClass: "", controls: [] as string[], text: "" }));
  writeFileSync(path.join(STATES_DIR, `${file.replace(/\.png$/, "")}.json`), `${mask(JSON.stringify(dump, null, 2))}\n`);
}

async function shot(page: Page, base: string, reachedBy: ReachedBy = "auto", note?: string): Promise<void> {
  await maskPersonal(page);
  await page.waitForTimeout(500);
  const state = stateName(base, currentWidth);
  const file = screenshotFile(state, currentWidth, currentTheme);
  await page.screenshot({ path: path.join(DOCS_DIR, file) });
  await dumpState(page, file);
  manifest.entries.push(manifestEntry({ state, width: currentWidth, theme: currentTheme, url: page.url(), capturedAt: new Date(), reachedBy, note }));
  console.log(`  captured ${file}`);
}

async function step(state: string, run: () => Promise<void>): Promise<boolean> {
  if (only && !only.test(state) && !/-restored$/.test(state)) return false; // the restore steps always run
  try {
    await run();
    return true;
  } catch (error: unknown) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown";
    manifest.skipped.push({ state: stateName(state, currentWidth), width: currentWidth, theme: currentTheme, reason });
    console.log(`  skipped ${stateName(state, currentWidth)}@${currentWidth}${currentTheme === "dark" ? " (dark)" : ""}: ${reason}`);
    return false;
  }
}

/**
 * Escape, then whatever the reference's overlays that ignore it need (observed 2026-09-14): a dialog's own close
 * control (the Assets preview at 390 is `role=dialog` with "Close asset preview"), or a tap on the backdrop above a
 * bottom sheet (Select model at 390 has an unnamed ×). A page-level control named Close (the Assets page at 390 has one
 * that leaves the page) is never touched.
 */
async function escape(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  const dialog = page.getByRole("dialog").last();
  if (await dialog.isVisible().catch(() => false)) {
    const close = dialog.getByRole("button", { name: /close/i }).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }
  const sheet = await page
    .evaluate(() => {
      // A bottom sheet (fixed, nearly full-width, anchored to the bottom, room above it) or the full-viewport overlay
      // that wraps one: either way the top of the screen is backdrop, and a tap there dismisses it.
      let overlay: { top: number } | null = null;
      for (const e of Array.from(document.querySelectorAll("div, section"))) {
        const cs = getComputedStyle(e);
        if (cs.position !== "fixed" || cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") continue;
        const r = e.getBoundingClientRect();
        if (r.width < window.innerWidth * 0.8 || r.bottom < window.innerHeight - 8) continue;
        if (r.top > 80 && r.height >= 120) return { top: r.top };
        if (r.top <= 0 && r.height >= window.innerHeight - 8 && e.children.length > 0) overlay = { top: 80 };
      }
      return overlay;
    })
    .catch(() => null);
  if (sheet) {
    await page.mouse.click(currentWidth / 2, Math.max(8, sheet.top / 2));
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(200);
}

let promoDismissedThisPass = false;

async function gotoHome(page: Page): Promise<void> {
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForHome(page, 20_000);
  await page.waitForTimeout(2_000);
  await dismissAnnouncement(page);
  if (currentWidth === NARROW && promoDismissedThisPass) await dismissPromo(page);
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
const newTask = (page: Page) => page.getByRole("button", { name: /^new task$/i }).first();
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

// ---------------------------------------------------------------------------------------------------------------------
// Theme (STORY_018) — the switch itself lives in theme.ts, shared with the tokens run.

const themeRecord: ThemeMechanismRecord = emptyThemeRecord();

async function setTheme(page: Page, theme: Theme): Promise<void> {
  currentTheme = await switchTheme(page, theme, themeRecord, (line) => console.log(`  ${line}`));
}

// ---------------------------------------------------------------------------------------------------------------------
// Clicking an unknown control and recording what it did

type Visit = { outcome: ClickOutcome; target?: string };

/**
 * Clicks `control`, records where it went (a navigation, a dialog, a menu, a new tab, nothing), captures what appeared
 * (in the new tab too, then closes it), and captures each tab of a destination that has its own tabs. Puts the page
 * back where it found it.
 */
async function visit(page: Page, context: BrowserContext, state: string, label: string, control: Locator, opts: { tabs?: boolean } = {}): Promise<Visit> {
  const pathBefore = pathOnly(page.url());
  const popup = context.waitForEvent("page", { timeout: 2_500 }).catch(() => null);
  await control.first().click({ timeout: 10_000 });
  await page.waitForTimeout(1_800);
  const newPage = await popup;
  if (pathOnly(page.url()) !== pathBefore) await closeDrawer(page);
  const pathAfter = pathOnly(page.url());
  const dialogVisible = await page.getByRole("dialog").first().isVisible().catch(() => false);
  const menuVisible = await page.getByRole("menu").first().isVisible().catch(() => false);
  const outcome = classifyClick({ pathBefore, pathAfter, dialogVisible, menuVisible, newTab: !!newPage });
  let target: string | undefined;
  if (newPage) {
    await newPage.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
    await newPage.waitForTimeout(2_000);
    let host = "";
    try {
      host = new URL(newPage.url()).host;
    } catch {
      host = "?";
    }
    target = `${host}${pathOnly(newPage.url())}`;
    const file = screenshotFile(stateName(state, currentWidth), currentWidth, currentTheme);
    await newPage.setViewportSize({ width: currentWidth, height: currentWidth === NARROW ? 844 : VIEWPORT.height }).catch(() => undefined);
    await newPage.screenshot({ path: path.join(DOCS_DIR, file) }).catch(() => undefined);
    manifest.entries.push(manifestEntry({ state: stateName(state, currentWidth), width: currentWidth, theme: currentTheme, url: newPage.url(), capturedAt: new Date(), reachedBy: "auto", note: `${label}: opens a new tab at ${target}` }));
    console.log(`  captured ${file} (new tab: ${target})`);
    await newPage.close().catch(() => undefined);
  } else {
    if (outcome === "navigates") target = pathAfter;
    await shot(page, state, "auto", `${label}: ${outcome}${target ? ` → ${target}` : ""}`);
    if (opts.tabs !== false && outcome === "navigates") {
      const tabs = page.getByRole("tab");
      const count = Math.min(await tabs.count().catch(() => 0), 8);
      for (let i = 1; i < count; i += 1) {
        const tab = tabs.nth(i);
        const name = ((await tab.innerText().catch(() => "")) || `tab-${i + 1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tab-${i + 1}`;
        await tab.click({ timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(1_200);
        await shot(page, `${state}-tab-${name}`, "auto", `${label}: tab "${name}"`);
      }
    }
  }
  manifest.clicks.push({ state: stateName(state, currentWidth), width: currentWidth, theme: currentTheme, control: label, outcome, ...(target ? { target } : {}) });
  if (dialogVisible || menuVisible) await escape(page, 2);
  if (outcome === "navigates") await gotoHome(page);
  return { outcome, ...(target ? { target } : {}) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The surfaces

const TYPED_PROMPT =
  "A slow dolly shot across a rain-soaked neon street at night, reflections shimmering on the wet asphalt, steady 24 fps.";

/**
 * At 390 the sidebar is a drawer behind an "Expand sidebar" button at the top-left (observed 2026-09-14): open it if
 * the New task row is not inside the viewport. The sidebar's own "Collapse sidebar" button exists off-canvas too, so
 * the toggle is matched by its exact name and must itself be inside the viewport.
 */
async function ensureSidebar(page: Page): Promise<boolean> {
  const nt = newTask(page);
  const inView = async () => {
    const box = await nt.boundingBox().catch(() => null);
    return !!box && box.x >= 0 && box.x + box.width <= currentWidth && box.width > 40;
  };
  if (await inView()) return true;
  const toggles = page.getByRole("button", { name: /^(expand|open|show) sidebar$/i });
  const count = await toggles.count();
  for (let i = 0; i < count; i += 1) {
    const box = await toggles.nth(i).boundingBox().catch(() => null);
    if (!box || box.x < 0 || box.x + box.width > currentWidth) continue;
    await toggles.nth(i).click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    return inView();
  }
  return false;
}

/** The sidebar's More and Projects sections fold (observed 2026-09-14: both closed by default); returns the previous state. */
async function setSectionExpanded(page: Page, name: RegExp, expanded: boolean): Promise<boolean> {
  const header = page.getByRole("button", { name }).first();
  await header.waitFor({ state: "visible", timeout: 5_000 });
  const was = (await header.getAttribute("aria-expanded")) === "true";
  if (was !== expanded) {
    await header.click({ timeout: 5_000 });
    await page.waitForTimeout(600);
  }
  return was;
}

/**
 * The promo carousel is a fixed card over the bottom-right; at 390 it covers the lower half of the screen and swallows
 * clicks on the ShowCase and the composer's bottom bar. Its close control is labelled "关闭" (observed 2026-09-12 and
 * 2026-09-14). Dismissed once per narrow pass, after the home has been shot with it.
 */
async function dismissPromo(page: Page): Promise<boolean> {
  const close = page.getByRole("button", { name: /^关闭$/ }).first();
  if (!(await close.isVisible().catch(() => false))) return false;
  await close.click({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  return !(await close.isVisible().catch(() => false));
}

/**
 * At 390 the drawer stays open over whatever a row click navigated to (observed 2026-09-14: the task page renders behind
 * it) and covers the left 260 px; a user closes it with the sidebar's own Collapse sidebar icon. The scrim is a
 * full-screen button of the same name, so the icon is picked by its size.
 */
async function closeDrawer(page: Page): Promise<void> {
  if (currentWidth !== NARROW) return;
  const box = await newTask(page).boundingBox().catch(() => null);
  if (!box || box.x < 0 || box.x + box.width > currentWidth) return;
  const buttons = page.getByRole("button", { name: /^collapse sidebar$/i });
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const b = await buttons.nth(i).boundingBox().catch(() => null);
    if (b && b.width <= 48 && b.x >= 0 && b.x + b.width <= currentWidth) {
      await buttons.nth(i).click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      return;
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

/**
 * Scrolls the target to the middle of the viewport before clicking, so a fixed overlay at an edge cannot intercept it;
 * if a menu left open by an earlier step swallows the click, closes it and tries once more.
 */
async function clickCentred(locator: Locator, timeout = 10_000): Promise<void> {
  const target = locator.first();
  await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" })).catch(() => undefined);
  await target.page().waitForTimeout(300);
  try {
    await target.click({ timeout });
  } catch (error) {
    const page = target.page();
    if (await page.getByRole("menu").first().isVisible().catch(() => false)) await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await target.click({ timeout: 5_000 }).catch(() => {
      throw error;
    });
  }
}

async function captureShell(page: Page, context: BrowserContext): Promise<void> {
  await gotoHome(page);
  await step("home-signed-in", () => shot(page, "home-signed-in", "auto", "Recents populated with the 2026-09-12 sessions; More and Projects folded as found"));
  if (currentWidth === NARROW) {
    promoDismissedThisPass = await dismissPromo(page);
    console.log(`  promo card ${promoDismissedThisPass ? "dismissed for the rest of this narrow pass (it covers the lower half at 390)" : "not shown / not dismissed"}`);
  }

  for (const section of [
    { state: "sidebar-more-expanded", name: /^more$/i },
    { state: "sidebar-projects-expanded", name: /^projects$/i },
  ]) {
    await step(section.state, async () => {
      // At 390 a tap on the header closes the drawer instead of unfolding (observed 2026-09-14); the fold state is
      // remembered, so unfold at 1440, resize, and open the drawer.
      const was = await atWide(page, () => setSectionExpanded(page, section.name, true));
      try {
        if (currentWidth === NARROW) {
          await gotoHome(page);
          if (!(await ensureSidebar(page))) throw new Error("no drawer toggle found");
          const firstRow = page.getByRole("button", { name: section.name.source.includes("more") ? /^maxhermes$/i : /^add new project$/i }).first();
          const box = await firstRow.boundingBox().catch(() => null);
          if (!box || box.height === 0 || box.x < 0) throw new Error("the section is folded again in the drawer: the unfold does not survive the reload, and at 390 a tap on the header closes the drawer instead of unfolding it");
        }
        await shot(page, section.state, "auto", `the ${section.state.split("-")[1]} section unfolded${was ? " (it was already open)" : ""}${currentWidth === NARROW ? "; unfolded at 1440 first" : ""}`);
        await closeDrawer(page);
      } finally {
        await atWide(page, () => setSectionExpanded(page, section.name, was)).catch(() => undefined);
      }
    });
  }

  if (currentWidth === WIDE) {
    await step("sidebar-collapsed", async () => {
      const collapse = page.getByRole("button", { name: /collapse sidebar/i }).first();
      await collapse.click({ timeout: 10_000 });
      await page.waitForTimeout(900);
      await shot(page, "sidebar-collapsed", "auto", "after the Collapse sidebar button");
      const expand = page.getByRole("button", { name: /expand sidebar|open sidebar|show sidebar|collapse sidebar/i }).first();
      await expand.click({ timeout: 10_000 });
      await page.waitForTimeout(900);
      const box = await newTask(page).boundingBox().catch(() => null);
      if (!box || box.width < 40) throw new Error("sidebar did not expand again");
    });
    await step("hover-sidebar-row", async () => {
      await page.getByRole("button", { name: /^plugins$/i }).first().hover({ timeout: 5_000 });
      await page.waitForTimeout(400);
      await shot(page, "hover-sidebar-row", "auto", "pointer over the Plugins row");
      await page.mouse.move(720, 450);
    });
  } else {
    await step("sidebar-drawer-open", async () => {
      if (!(await ensureSidebar(page))) throw new Error("no drawer toggle found");
      await shot(page, "sidebar-drawer-open", "auto", "the drawer after its toggle");
      await escape(page);
    });
  }

  await step("user-menu-open", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    if (!(await openUserMenu(page))) throw new Error("user chip not found");
    await shot(page, "user-menu-open", "auto", "the user chip's menu");
    await escape(page, 2);
    await closeDrawer(page);
  });

  await step("recents-row-menu-open", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const row = page.getByRole("button", { name: captureSession }).first();
    await row.waitFor({ state: "visible", timeout: 5_000 });
    await row.hover({ timeout: 5_000 });
    await page.waitForTimeout(500);
    // The row is a div[role=button] wrapping a button; the ⋯ appears on hover as an icon-only control inside it.
    const inside = row.locator("button, [role=button]").filter({ hasNotText: /\S/ });
    const kebab = (await inside.count()) > 0 ? inside.last() : page.getByRole("button", { name: /more|options|actions|menu/i }).first();
    await kebab.waitFor({ state: "visible", timeout: 3_000 });
    await kebab.click({ timeout: 5_000, force: true });
    await page.waitForTimeout(700);
    await shot(page, "recents-row-menu-open", "auto", "a Recents row's own menu; entries never clicked");
    await escape(page, 2);
    await closeDrawer(page);
  });

  for (const section of [
    { state: "settings-general", name: /^general$/i },
    { state: "settings-account", name: /^account$/i },
    { state: "settings-usage", name: /^usage$/i },
    { state: "settings-archived-tasks", name: /^archived tasks$/i },
  ]) {
    await step(section.state, async () => {
      if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
      if (!(await openSettings(page))) throw new Error("Settings did not open");
      await page.getByRole("button", { name: section.name }).first().click({ timeout: 5_000 });
      await page.waitForTimeout(900);
      await shot(page, section.state, "auto", "user menu › Settings; this section");
      await closeSettings(page);
      await closeDrawer(page);
    });
  }

  await step("promo-carousel-page-2", async () => {
    // The carousel's page dots are buttons named "1" and "2" (observed 2026-09-14).
    const dot = page.getByRole("button", { name: /^2$/ }).first();
    await dot.waitFor({ state: "visible", timeout: 5_000 });
    await dot.click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "promo-carousel-page-2", "auto", "the promo card's second page");
    await page.getByRole("button", { name: /^1$/ }).first().click({ timeout: 5_000 }).catch(() => undefined);
  });

  await step("inbox-open", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const inbox = page.getByRole("button", { name: /^inbox/i }).first();
    await inbox.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "inbox-open", "sidebar footer: Inbox", inbox, { tabs: false });
    await closeDrawer(page);
  });

  await step("recents-show-more", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const more = page.getByRole("button", { name: /^show more$/i }).first();
    await more.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "recents-show-more", "sidebar › Recents: Show more", more, { tabs: false });
    await closeDrawer(page);
  });

  await step("agents-guide-view-now", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const view = page.getByRole("button", { name: /^view now$/i }).or(page.getByRole("link", { name: /^view now$/i })).first();
    await view.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "agents-guide-view-now", "sidebar: Agents guide card › View now", view);
  });

  await closeDrawer(page); // the top-bar controls sit under the drawer at 390
  await step("changelog-open", async () => {
    const link = page.getByRole("link", { name: /changelog|what's new|release notes/i }).or(page.getByRole("button", { name: /changelog|what's new|release notes/i })).first();
    await link.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "changelog-open", "top bar: Changelog", link, { tabs: false });
  });

  await step("download-open", async () => {
    const button = page.getByRole("button", { name: /^download$/i }).or(page.getByRole("link", { name: /^download$/i })).first();
    await button.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "download-open", "top bar: Download", button, { tabs: false });
  });

  await step("download-desktop-open", async () => {
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const button = page.getByRole("button", { name: /^download desktop$/i }).or(page.getByRole("link", { name: /^download desktop$/i })).first();
    await button.waitFor({ state: "visible", timeout: 5_000 });
    await visit(page, context, "download-desktop-open", "sidebar footer: Download desktop", button, { tabs: false });
  });
}

/**
 * Every sidebar row a click can follow. The Agent Team section the 2026-09-12 capture listed (General, Coder,
 * Verifier) is gone on 2026-09-14 — a card in its place says "You can now find Agents in Plugins".
 */
const SIDEBAR_DESTINATIONS: { state: string; label: string; name: RegExp; section?: RegExp; narrowPath?: string }[] = [
  { state: "page-search", label: "sidebar: Search", name: /^search$/i },
  { state: "page-plugins", label: "sidebar: Plugins", name: /^plugins$/i },
  { state: "page-scheduled", label: "sidebar: Scheduled", name: /^scheduled$/i },
  { state: "page-connect-mobile", label: "sidebar: Connect Mobile", name: /^connect mobile$/i },
  // At 390 the More and Projects rows cannot be unfolded in the drawer (a header tap closes it); the pages are reached by
  // the path the 1440 pass recorded, as a user following a link would.
  { state: "page-maxhermes", label: "sidebar › More: MaxHermes", name: /^maxhermes$/i, section: /^more$/i, narrowPath: "max-hermes" },
  { state: "page-maxclaw", label: "sidebar › More: MaxClaw", name: /^maxclaw$/i, section: /^more$/i, narrowPath: "max-claw" },
  { state: "page-add-new-project", label: "sidebar › Projects: Add new project", name: /^add new project$/i, section: /^projects$/i },
];

async function captureSidebarDestinations(page: Page, context: BrowserContext): Promise<void> {
  for (const d of SIDEBAR_DESTINATIONS) {
    await step(d.state, async () => {
      if (currentWidth === NARROW && d.section) {
        if (!d.narrowPath) throw new Error("folded under a section the drawer cannot unfold at 390 (a header tap closes the drawer); no direct path");
        await page.goto(`${REFERENCE_URL}${d.narrowPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(2_500);
        await shot(page, d.state, "auto", `${d.label}: reached by its path at 390 (the drawer cannot unfold the section)`);
        manifest.clicks.push({ state: stateName(d.state, currentWidth), width: currentWidth, theme: currentTheme, control: d.label, outcome: "navigates", target: `/${d.narrowPath}` });
        return;
      }
      const was = d.section ? await atWide(page, () => setSectionExpanded(page, d.section ?? /$^/, true)) : true;
      await gotoHome(page);
      if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
      const item = page.getByRole("button", { name: d.name }).or(page.getByRole("link", { name: d.name })).first();
      await item.waitFor({ state: "visible", timeout: 5_000 });
      await visit(page, context, d.state, d.label, item);
      if (d.section && !was) await atWide(page, () => setSectionExpanded(page, d.section ?? /$^/, false)).catch(() => undefined);
    });
  }
}

async function captureComposer(page: Page, context: BrowserContext): Promise<void> {
  await gotoHome(page);
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
    await clickCentred(attachButton(page));
    await page.waitForTimeout(800);
    await shot(page, "attach-menu-open", "auto", "whatever the + control opens; a native file chooser would not be visible");
    await escape(page);
  });

  // The attach menu's entries carry no ARIA role (observed 2026-09-14): find each by its text, below the + button so
  // the sidebar's own "Plugins" row is never the match. Hover reveals the submenu; a click is the fallback.
  for (const sub of [
    { state: "attach-add-to-project-submenu-open", name: /^add to project/i },
    { state: "attach-skills-submenu-open", name: /^skills$/i },
    { state: "attach-plugins-submenu-open", name: /^plugins$/i },
  ]) {
    await step(sub.state, async () => {
      await clickCentred(attachButton(page));
      await page.waitForTimeout(700);
      const anchor = await attachButton(page).boundingBox();
      const candidates = page.getByText(sub.name);
      const count = await candidates.count();
      let entry: Locator | null = null;
      for (let i = 0; i < count; i += 1) {
        const box = await candidates.nth(i).boundingBox().catch(() => null);
        if (box && anchor && box.y > anchor.y) {
          entry = candidates.nth(i);
          break;
        }
      }
      if (!entry) throw new Error(`no menu entry matching ${sub.name} below the + button`);
      await entry.hover({ timeout: 5_000 });
      await page.waitForTimeout(800);
      await shot(page, sub.state, "auto", "the attach menu's submenu on hover");
      await escape(page, 2);
    });
  }

  await step("scene-selected", async () => {
    await clickCentred(page.getByRole("button", { name: /dark-pop cyber music video/i }));
    await page.waitForTimeout(2_500);
    await shot(page, "scene-selected");
    if (!(await clearComposer(page))) throw new Error("composer not empty after clearing the selected scene");
  });

  await step("composer-typed", async () => {
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

  if (currentWidth === WIDE) {
    await step("hover-mode-chip", async () => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^document$/i }).first().hover({ timeout: 5_000 });
      await page.waitForTimeout(400);
      await shot(page, "hover-mode-chip", "auto", "pointer over the Document chip");
      await page.mouse.move(720, 200);
    });
  }

  for (const mode of [
    { state: "mode-document", name: /^document$/i },
    { state: "mode-website", name: /^website$/i },
    { state: "mode-image-generation", name: /^image generation$/i },
  ]) {
    await step(mode.state, async () => {
      await gotoHome(page);
      await clickCentred(page.getByRole("button", { name: mode.name }));
      await page.waitForTimeout(2_000);
      await shot(page, mode.state, "auto", "the composer after the mode chip");
      await clearComposer(page);
    });
  }

  await step("mode-more-open", async () => {
    await gotoHome(page);
    const chips = page.getByRole("button", { name: /^more$/i });
    const more = chips.last();
    const box = await more.boundingBox().catch(() => null);
    if (!box || box.width === 0 || (currentWidth === NARROW && box.x < 260 && (await chips.count()) < 2)) throw new Error("no More chip rendered at this width (the chip row shows three chips at 390)");
    await more.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" })).catch(() => undefined);
    await visit(page, context, "mode-more-open", "mode chips: More", more, { tabs: false });
    await clearComposer(page);
  });
}

/**
 * A finished session reopened from Recents (the 2026-09-12 "Paper boat on rain puddle" job finished after that day's
 * 20-minute bound): the thread with the result file card, the right-hand Work Area panel (Progress + Deliverables,
 * open by default; the top-right button hides it), and each control on the card.
 */
async function captureTaskPage(page: Page): Promise<void> {
  await step("task-page", async () => {
    await gotoHome(page);
    if (currentWidth === NARROW && !(await ensureSidebar(page))) throw new Error("no drawer toggle found");
    const row = page.getByRole("button", { name: captureSession }).first();
    await row.waitFor({ state: "visible", timeout: 5_000 });
    await row.click({ timeout: 10_000 });
    await page.waitForTimeout(3_000);
    await closeDrawer(page);
    await shot(page, "task-page", "auto", `a finished 2026-09-12 session reopened from Recents (${captureSession}); Work Area panel as found`);
  });
  await step("work-area-toggled", async () => {
    const wa = page.getByRole("button", { name: /work ?area/i }).first();
    if (!(await wa.isVisible().catch(() => false))) throw new Error(currentWidth === NARROW ? "no Work area button at 390 (the panel does not exist in the narrow layout)" : "no Work area button");
    const panelBefore = await page.getByRole("button", { name: /^progress$/i }).first().isVisible().catch(() => false);
    await wa.click({ timeout: 10_000 });
    await page.waitForTimeout(1_500);
    const panelAfter = await page.getByRole("button", { name: /^progress$/i }).first().isVisible().catch(() => false);
    await shot(page, panelAfter ? "work-area-open" : "work-area-closed", "auto", `after the Work Area button: panel ${panelBefore ? "open" : "closed"} → ${panelAfter ? "open" : "closed"}`);
    await wa.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
  });
  await step("task-thread-top", async () => {
    const jump = page.getByRole("button", { name: /jump to top|jump to start/i }).first();
    await jump.waitFor({ state: "visible", timeout: 5_000 });
    await jump.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => undefined);
    await jump.dblclick({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "task-thread-top", "auto", "the thread scrolled to its top: the first user message and the agent's first turn");
  });
  await step("task-processed-expanded", async () => {
    const processed = page.getByRole("button", { name: /^processed \d+s$/i }).last();
    await processed.scrollIntoViewIfNeeded({ timeout: 5_000 });
    await processed.click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "task-processed-expanded", "auto", "the Processed N s row unfolded");
    await processed.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  });
  await step("task-result-card-hover", async () => {
    const card = page.getByRole("button", { name: /\.mp4$/i }).first();
    await card.scrollIntoViewIfNeeded({ timeout: 5_000 });
    await card.hover({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await shot(page, "task-result-card-hover", "auto", "pointer over the result file card in the thread");
  });
  await step("task-result-menu-open", async () => {
    const preview = page.getByRole("button", { name: /^open preview$/i }).first();
    await preview.waitFor({ state: "visible", timeout: 5_000 });
    const box = await preview.boundingBox();
    const more = page.getByRole("button", { name: /^more$/i }).filter({ hasNotText: /\S/ });
    const count = await more.count();
    let chevron: Locator | null = null;
    for (let i = 0; i < count; i += 1) {
      const b = await more.nth(i).boundingBox().catch(() => null);
      if (b && box && Math.abs(b.y - box.y) < 20 && b.x > box.x) chevron = more.nth(i);
    }
    if (!chevron) throw new Error("no More chevron beside Open preview");
    await chevron.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    await shot(page, "task-result-menu-open", "auto", "the result card's More menu; entries never clicked");
    await escape(page, 2);
  });
  await step("task-result-preview-open", async () => {
    const preview = page.getByRole("button", { name: /^open preview$/i }).first();
    await preview.click({ timeout: 5_000 });
    await page.waitForTimeout(2_500);
    await shot(page, "task-result-preview-open", "auto", "after Open preview on the result card");
    await escape(page, 2);
  });
  await step("work-area-deliverable-open", async () => {
    const files = page.getByRole("button", { name: /\.mp4$/i });
    const count = await files.count();
    let file: Locator | null = null;
    for (let i = 0; i < count; i += 1) {
      const b = await files.nth(i).boundingBox().catch(() => null);
      if (b && b.x > currentWidth * 0.7) file = files.nth(i);
    }
    if (!file) throw new Error("no deliverable row in the Work Area panel (narrow or panel closed)");
    await file.click({ timeout: 5_000 });
    await page.waitForTimeout(2_500);
    await shot(page, "work-area-deliverable-open", "auto", "after clicking the file under Deliverables in the Work Area panel");
    await escape(page, 2);
  });
}

async function captureAssets(page: Page): Promise<void> {
  await step("assets-all", async () => {
    await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await shot(page, "assets-all", "auto", "From Agent, All");
  });

  await step("assets-videos-filter", async () => {
    await page.getByRole("button", { name: /^videos$/i }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "assets-videos-filter");
  });

  await step("assets-video-tile-hover", async () => {
    const preview = page.getByRole("button", { name: /^preview .*\.mp4$/i }).first();
    await preview.waitFor({ state: "visible", timeout: 5_000 });
    await preview.hover({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await shot(page, "assets-video-tile-hover", "auto", "pointer over the video tile");
  });

  await step("assets-tile-menu-open", async () => {
    await page.getByRole("button", { name: /^preview .*\.mp4$/i }).first().hover({ timeout: 5_000 });
    await page.waitForTimeout(500);
    const more = page.getByRole("button", { name: /^more actions for .*\.mp4$/i }).first();
    if (!(await more.isVisible().catch(() => false)) && currentWidth === NARROW) throw new Error("the tile's ⋯ does not appear on hover at 390");
    await more.waitFor({ state: "visible", timeout: 5_000 });
    await more.hover({ timeout: 5_000 });
    await more.click({ timeout: 10_000, force: true });
    await page.waitForTimeout(800);
    await shot(page, "assets-tile-menu-open", "auto", "the tile's ⋯ menu; entries never clicked");
    await escape(page, 2);
  });

  await step("assets-video-preview", async () => {
    const preview = page.getByRole("button", { name: /^preview .*\.mp4$/i }).first();
    await preview.hover({ timeout: 5_000 });
    await preview.click({ timeout: 10_000 });
    await page.waitForTimeout(2_500);
    await shot(page, "assets-video-preview", "auto", "the preview modal");
    await escape(page);
  });

  for (const tab of [
    { state: "assets-tab-from-you", name: /from you/i },
    { state: "assets-tab-star", name: /^star/i },
  ]) {
    await step(tab.state, async () => {
      const t = page.getByRole("tab", { name: tab.name }).or(page.getByRole("button", { name: tab.name })).first();
      if (!(await t.isVisible().catch(() => false))) throw new Error(currentWidth === NARROW ? "no From you / Star tabs rendered at 390" : "tab not visible");
      await t.click({ timeout: 10_000 });
      await page.waitForTimeout(1_500);
      await shot(page, tab.state);
    });
  }

  if (currentWidth === WIDE && currentTheme === "light") {
    await page.getByRole("tab", { name: /from agent/i }).or(page.getByRole("button", { name: /from agent/i })).first().click({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);
    for (const chip of ["Websites", "Documents", "Excel", "PPT", "Images", "Audio"]) {
      await step(`assets-filter-${chip.toLowerCase()}`, async () => {
        await page.getByRole("button", { name: new RegExp(`^${chip}$`, "i") }).first().click({ timeout: 10_000 });
        await page.waitForTimeout(1_200);
        await shot(page, `assets-filter-${chip.toLowerCase()}`, "auto", `the ${chip} filter`);
      });
    }
  }
}

async function captureNarrowExtras(page: Page): Promise<void> {
  await step("video-params-open", async () => {
    await gotoHome(page);
    await enterVideoMode(page);
    await paramsButton(page).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, "video-params-open");
    await escape(page);
  });
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

/** The Settings modal is reached through the sidebar's user chip, which is off-canvas at 390: switch at the wide viewport, then resize. */
async function atWide<T>(page: Page, run: () => Promise<T>): Promise<T> {
  const width = currentWidth;
  if (width !== WIDE) {
    await page.setViewportSize({ ...VIEWPORT });
    currentWidth = WIDE;
    await gotoHome(page);
  }
  try {
    return await run();
  } finally {
    if (width !== WIDE) {
      await page.setViewportSize({ width: width, height: 844 });
      currentWidth = width;
    }
  }
}

async function applyPass(page: Page, pass: Pass): Promise<void> {
  promoDismissedThisPass = false;
  await atWide(page, async () => {
    await gotoHome(page);
    await setTheme(page, pass.theme);
  });
  if (pass.width !== currentWidth) {
    await page.setViewportSize(pass.width === NARROW ? { width: NARROW, height: 844 } : { ...VIEWPORT });
    currentWidth = pass.width;
  }
  await gotoHome(page);
  manifest.passes.push(pass);
  console.log(`— pass ${pass.width} / ${pass.theme}`);
}

async function captureSurfaces(page: Page, context: BrowserContext): Promise<void> {
  for (const pass of passes) {
    await applyPass(page, pass);
    await captureShell(page, context);
    await captureSidebarDestinations(page, context);
    await captureComposer(page, context);
    await captureTaskPage(page);
    await captureAssets(page);
    if (pass.width === NARROW) await captureNarrowExtras(page);
  }
}

async function captureWorkAreaOnTask(page: Page): Promise<void> {
  await step("work-area-toggled", async () => {
    const wa = page.getByRole("button", { name: /work ?area/i }).first();
    await wa.waitFor({ state: "visible", timeout: 5_000 });
    await wa.click({ timeout: 10_000 });
    await page.waitForTimeout(1_500);
    const panelAfter = await page.getByRole("button", { name: /^progress$/i }).first().isVisible().catch(() => false);
    await shot(page, panelAfter ? "work-area-open" : "work-area-closed", "auto", "after the Work Area button beside a finished thread");
    await wa.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
  });
}

async function main(): Promise<number> {
  mkdirSync(DOCS_DIR, { recursive: true });
  mkdirSync(STATES_DIR, { recursive: true });
  const { context, page } = await openReference(true);
  attachNetworkLog(context);
  let originalDark: boolean | null = null;
  try {
    await gotoHome(page);
    const state = classifySession(await readSessionSignals(page));
    if (state !== "signed-in") {
      console.error(`session: ${state} — run recon/login.sh first.`);
      return 1;
    }
    originalDark = await pageIsDark(page);
    themeRecord.originalWasDark = originalDark;
    currentTheme = originalDark ? "dark" : "light";
    console.log(`Capturing to docs/recon/${stamp}/ (raw dumps and network log in recon/out/${stamp}/); passes: ${passes.map((p) => `${p.width}/${p.theme}`).join(", ")}; found the reference in ${currentTheme}`);
    if (generating) {
      const deps = {
        page,
        rawDir: RAW_DIR,
        docsDir: DOCS_DIR,
        shot: (s: string, note?: string) => shot(page, s, "auto", note),
        step,
        gotoHome: () => gotoHome(page),
        enterVideoMode: () => enterVideoMode(page),
        clearComposer: () => clearComposer(page),
        editor: () => editor(page),
        paramsButton: () => paramsButton(page),
        modelButton: () => modelButton(page),
        afterResult: () => captureWorkAreaOnTask(page),
        model: captureModel,
        mode: captureMode,
        session: captureSession,
        maxWaitMs: waitMinutes * 60_000,
      };
      await setTheme(page, themes[0] ?? "light");
      await runGenerations(deps, generate);
      // The finished thread in the other theme: the same session, reopened (no second generation). A revisit run
      // keeps the --session it was given; a generation run reopens the session the generation just created.
      const session = captureMode === "revisit" ? captureSession : args.includes("--session") ? captureSession : GENERATION_SESSION;
      for (const theme of themes.slice(1)) {
        await gotoHome(page);
        await setTheme(page, theme);
        await runGenerations({ ...deps, mode: "revisit", session }, 0);
      }
    } else {
      await captureSurfaces(page, context);
    }
    await step("composer-restored", () => restoreComposer(page));
  } finally {
    if (originalDark !== null) {
      if (restoreTo === "light" || restoreTo === "dark" || restoreTo === "system") themeRecord.originalChoice = restoreTo;
      await step("theme-restored", () =>
        atWide(page, async () => {
          await gotoHome(page);
          themeRecord.restored = await restoreAppearance(page, themeRecord);
          if (!themeRecord.restored) throw new Error(`Appearance not verified back to ${themeRecord.originalChoice ?? "the original"}`);
        }),
      );
      manifest.theme = themeRecord;
    }
    writeFileSync(path.join(DOCS_DIR, runLabel ? `manifest-${runLabel}.json` : "manifest.json"), `${JSON.stringify(mergeManifest(manifest), null, 2)}\n`);
    await context.close();
  }
  console.log(`Done: ${manifest.entries.length} captured, ${manifest.skipped.length} skipped${manifest.skipped.length ? ` (${manifest.skipped.map((s) => `${s.state}@${s.width}${s.theme === "dark" ? "-dark" : ""}`).join(", ")})` : ""}.`);
  return 0;
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
