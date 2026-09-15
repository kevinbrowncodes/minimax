import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BrowserContext, Locator, Page } from "playwright";
import { RECON_AGENT, RECON_PROJECT, RENAME_SUFFIX, mergeActions, redactBody, selectActions, summarizeCalls, type Action, type ActionId, type CallSummary } from "./behaviour-plan.ts";
import { dismissAnnouncement, openReference, readSessionSignals, waitForHome } from "./browser.ts";
import { dateStamp, parseSessionArgFrom, pathOnly, screenshotFile } from "./capture-plan.ts";
import { OUT_DIR, RECON_ROOT, REFERENCE_URL } from "./config.ts";
import { isNoise, sanitizePath, type NetworkEvent } from "./network-log.ts";
import { closeSettings, openSettings, openUserMenu } from "./theme.ts";
import { classifySession } from "./session.ts";

/**
 * STORY_027: performs each kept surface's action once on the owner's account — reversibly, with his approval of
 * 2026-09-15 — and records what changes on screen and what the reference sends. 1440 light, headless, on the saved
 * profile. Every action is a step that records a skip rather than aborting; what it created it deletes. `--chat 1`
 * runs the one credit-spending text turn; `--only <regex>` narrows to matching action ids; `--session <regex>` picks
 * the Recents row acted on (default: the finished 2026-09-12 "paper boat" session).
 */

const args = process.argv.slice(2);
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? new RegExp(args[onlyIndex + 1] ?? ".", "i") : null;
const chatIndex = args.indexOf("--chat");
const chat = chatIndex >= 0 && Number(args[chatIndex + 1] ?? "0") > 0;
const session = parseSessionArgFrom(args);
const actions = selectActions(only, chat);

const stamp = dateStamp(new Date());
const DOCS_DIR = path.join(RECON_ROOT, "..", "docs", "recon", stamp);
const RAW_DIR = path.join(OUT_DIR, stamp);
const STATES_DIR = path.join(RAW_DIR, "states");
const NETWORK_LOG = path.join(RAW_DIR, "network-behaviour.jsonl");
const FIXTURE_IMAGE = path.join(RECON_ROOT, "..", "tools", "stub-generation-server", "fixtures", "fixture-reference.png");
const WIDTH = 1440;

type Saw = { path: string; dialog: boolean; menu: boolean; textbox: boolean; newTab?: string };
type StepRecord = { n: number; label: string; file: string; saw: Saw; text: string; calls: CallSummary[] };
type ActionRecord = { id: ActionId; surface: string; steps: StepRecord[]; undone: boolean | null; notes: string[]; skipped?: string };
type Behaviour = { date: string; reference: string; session: string; chat: boolean; actions: ActionRecord[] };

const behaviour: Behaviour = { date: stamp, reference: REFERENCE_URL, session: session.source, chat, actions: [] };
const events: NetworkEvent[] = [];
let current: ActionRecord | undefined;
let stepCount = 0;
let eventMark = 0;

const mask = (text: string): string => text.replace(/MiniMax\d{4,}/g, "Owner").replace(/(UID\s*[:：]\s*)\d{6,}/g, "$1000000000000000000").replace(/\b\d{15,}\b/g, "000000000000000000");

function attachNetworkLog(context: BrowserContext): void {
  const write = (event: NetworkEvent) => {
    events.push(event);
    appendFileSync(NETWORK_LOG, `${JSON.stringify(event)}\n`);
  };
  context.on("request", (request) => {
    const url = request.url();
    if (isNoise(url)) return;
    const base: NetworkEvent = { kind: "request", at: new Date().toISOString(), method: request.method(), host: new URL(url).host, path: sanitizePath(url) };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      let body: unknown;
      try {
        body = request.postDataJSON();
      } catch {
        const raw = request.postData();
        body = raw === null ? undefined : `<${String(raw.length)} bytes, not JSON>`;
      }
      if (body !== undefined && body !== null) base.requestBody = redactBody(body);
    }
    write(base);
  });
  context.on("response", (response) => {
    const url = response.url();
    if (isNoise(url)) return;
    const contentType = (response.headers()["content-type"] ?? "").split(";")[0] ?? "";
    const base: NetworkEvent = { kind: "response", at: new Date().toISOString(), method: response.request().method(), host: new URL(url).host, path: sanitizePath(url), status: response.status(), contentType };
    if (contentType.includes("json")) {
      response
        .json()
        .then((body: unknown) => write({ ...base, body: redactBody(body) }))
        .catch(() => write(base));
    } else write(base);
  });
  context.on("page", (page) => {
    page.on("websocket", (ws) => {
      const url = ws.url();
      write({ kind: "request", at: new Date().toISOString(), method: "WS", host: (() => { try { return new URL(url).host; } catch { return "?"; } })(), path: sanitizePath(url) });
      ws.on("framereceived", (frame) => { write({ kind: "response", at: new Date().toISOString(), method: "WS", host: "", path: sanitizePath(url), contentType: "ws-frame", body: typeof frame.payload === "string" ? redactBody(frame.payload.slice(0, 400)) : "<binary>" }); });
    });
  });
}

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
        else if (/\b\d{12,}\b/.test(text)) node.textContent = text.replace(/\b\d{12,}\b/g, "000000000000000000");
      }
      for (const input of Array.from(document.querySelectorAll("input"))) if (/MiniMax\d{4,}/.test(input.value)) input.value = input.value.replace(/MiniMax\d{4,}/g, "Owner");
    })
    .catch(() => undefined);
}

async function observe(page: Page): Promise<Saw> {
  const dialog = await page.getByRole("dialog").last().isVisible().catch(() => false);
  const menu = await page.getByRole("menu").last().isVisible().catch(() => false);
  const textbox = await page.locator("input:focus, textarea:focus, [contenteditable=true]:focus").first().isVisible().catch(() => false);
  return { path: pathOnly(page.url()), dialog, menu, textbox };
}

async function dumpState(page: Page, file: string): Promise<string> {
  const dump = await page
    .evaluate(() => {
      const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const name = (e: Element) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.getAttribute("placeholder") || (e as HTMLInputElement).value || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100);
      const controls = Array.from(document.querySelectorAll("button, a, input, textarea, select, [contenteditable], [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], [role=radio], [role=switch], [role=checkbox], [role=link], [role=dialog], [role=menu], h1, h2, h3"))
        .filter(vis)
        .map((e) => {
          const r = e.getBoundingClientRect();
          const role = e.getAttribute("role");
          const state = [e.getAttribute("aria-checked"), e.getAttribute("aria-selected"), e.getAttribute("aria-expanded"), e.getAttribute("aria-disabled")].filter((v) => v !== null).join("/");
          return `${e.tagName.toLowerCase()}${role ? `[${role}]` : ""} "${name(e)}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}${state ? ` (${state})` : ""}`;
        });
      const clickable = Array.from(document.querySelectorAll("div, span, li, p, label"))
        .filter((e) => vis(e) && getComputedStyle(e).cursor === "pointer")
        .filter((e) => { const t = (e.textContent || "").trim(); return t.length > 0 && t.length <= 60 && !Array.from(e.children).some((c) => getComputedStyle(c).cursor === "pointer" && (c.textContent || "").trim() === t); })
        .slice(0, 120)
        .map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}[pointer] "${name(e)}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; });
      const main = (document.querySelector("main") ?? document.body) as HTMLElement;
      return { path: location.pathname, controls: [...controls, ...clickable], text: main.innerText.replace(/\s+/g, " ").slice(0, 3000) };
    })
    .catch(() => ({ path: "", controls: [] as string[], text: "" }));
  writeFileSync(path.join(STATES_DIR, `${file.replace(/\.png$/, "")}.json`), `${mask(JSON.stringify(dump, null, 2))}\n`);
  return mask(dump.text).slice(0, 240);
}

/** One screenshot + state dump + the API calls since the previous step, appended to the current action. */
async function shot(page: Page, label: string): Promise<StepRecord> {
  if (!current) throw new Error("shot outside an action");
  await maskPersonal(page);
  await page.waitForTimeout(500);
  stepCount += 1;
  const state = `behaviour-${current.id}-${String(stepCount).padStart(2, "0")}-${label}`;
  const file = screenshotFile(state, WIDTH, "light");
  await page.screenshot({ path: path.join(DOCS_DIR, file) });
  const text = await dumpState(page, file);
  const record: StepRecord = { n: stepCount, label, file, saw: await observe(page), text, calls: summarizeCalls(events.slice(eventMark)) };
  eventMark = events.length;
  current.steps.push(record);
  console.log(`  ${file}${record.saw.dialog ? " [dialog]" : ""}${record.saw.menu ? " [menu]" : ""}${record.saw.textbox ? " [textbox]" : ""} ${record.calls.map((c) => `${c.method} ${c.path.replace("/minimax-cloud/api/v1", "…")}`).join(", ")}`);
  return record;
}

function note(line: string): void {
  current?.notes.push(line);
  console.log(`  note: ${line}`);
}

async function action(def: Action, run: () => Promise<boolean | null>): Promise<void> {
  current = { id: def.id, surface: def.surface, steps: [], undone: def.changes ? false : null, notes: [] };
  stepCount = 0;
  eventMark = events.length;
  console.log(`▶ ${def.id} — ${def.surface}`);
  try {
    current.undone = await run();
  } catch (error: unknown) {
    current.skipped = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown";
    console.log(`  skipped: ${current.skipped}`);
  }
  behaviour.actions.push(current);
  writeManifest();
  current = undefined;
}

/** The day's behaviour.json with this run's actions merged over an earlier run's (a rerun after a fix keeps the rest). */
function writeManifest(): void {
  const file = path.join(DOCS_DIR, "behaviour.json");
  let previous: ActionRecord[] = [];
  if (existsSync(file)) {
    try {
      previous = (JSON.parse(readFileSync(file, "utf8")) as { actions?: ActionRecord[] }).actions ?? [];
    } catch {
      previous = [];
    }
  }
  const merged = { ...behaviour, actions: mergeActions(previous, behaviour.actions) };
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
}

// ---------------------------------------------------------------------------------------------------------------------
// page helpers

async function gotoHome(page: Page): Promise<void> {
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForHome(page, 20_000);
  await page.waitForTimeout(2_000);
  await dismissAnnouncement(page);
}

async function escape(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

/** A visible element whose text matches, preferring one inside an open menu / dialog, then the one lowest on screen. */
const SIDEBAR_WIDTH = 260;

/** A visible element whose text matches, the one lowest on screen; `mainOnly` ignores the sidebar (its rows share names with the pages). */
async function visibleText(page: Page, re: RegExp, opts: { mainOnly?: boolean } = {}): Promise<Locator> {
  const candidates = page.getByRole("menuitem", { name: re }).or(page.getByRole("button", { name: re })).or(page.getByText(re));
  const count = await candidates.count();
  let best: { loc: Locator; y: number } | null = null;
  for (let i = 0; i < count; i += 1) {
    const loc = candidates.nth(i);
    if (!(await loc.isVisible().catch(() => false))) continue;
    const box = await loc.boundingBox().catch(() => null);
    if (!box || box.x < 0 || box.x + box.width > WIDTH) continue;
    if (opts.mainOnly && box.x < SIDEBAR_WIDTH) continue;
    if (!best || box.y > best.y) best = { loc, y: box.y };
  }
  if (!best) throw new Error(`no visible element matching ${re}${opts.mainOnly ? " outside the sidebar" : ""}`);
  return best.loc;
}

/** Settings › Archived tasks: presses Unarchive on every listed row whose title matches; returns how many. */
async function unarchiveAll(page: Page, re: RegExp): Promise<number> {
  if (!(await openSettings(page))) throw new Error("Settings did not open");
  await page.getByRole("button", { name: /^archived tasks$/i }).first().click({ timeout: 5_000 });
  await page.waitForTimeout(1_200);
  let n = 0;
  for (let i = 0; i < 6; i += 1) {
    const buttons = page.getByRole("button", { name: /^unarchive$/i });
    const count = await buttons.count();
    let clicked = false;
    for (let j = 0; j < count; j += 1) {
      const b = buttons.nth(j);
      if (!(await b.isVisible().catch(() => false))) continue;
      const rowText = await b.locator("xpath=ancestor::*[self::div or self::li][2]").innerText().catch(() => "");
      if (!re.test(rowText)) continue;
      await b.click({ timeout: 5_000 });
      await page.waitForTimeout(1_200);
      await confirmIfAsked(page, /^(confirm|ok|restore|unarchive|yes)$/i);
      n += 1;
      clicked = true;
      break;
    }
    if (!clicked) break;
  }
  await closeSettings(page).catch(() => undefined);
  return n;
}

const recentRow = (page: Page, re: RegExp) => page.getByRole("button", { name: re }).first();

/** Opens the Recents row's ⋯ menu (the ⋯ appears on hover as an icon-only control inside the row). */
async function openRowMenu(page: Page, re: RegExp): Promise<Locator> {
  const row = recentRow(page, re);
  await row.waitFor({ state: "visible", timeout: 8_000 });
  await row.hover({ timeout: 5_000 });
  await page.waitForTimeout(500);
  const inside = row.locator("button, [role=button]").filter({ hasNotText: /\S/ });
  const kebab = (await inside.count()) > 0 ? inside.last() : page.getByRole("button", { name: /more|options|actions|menu/i }).first();
  await kebab.waitFor({ state: "visible", timeout: 3_000 });
  await kebab.click({ timeout: 5_000, force: true });
  await page.waitForTimeout(700);
  return row;
}

/**
 * Presses the confirm of whatever asked: a role=dialog's button, or — the reference's own confirmations carry no role
 * (observed 2026-09-15: "Cancel" / "Delete" side by side at the same height) — the button matching `re` on the same
 * row as a visible Cancel.
 */
async function confirmIfAsked(page: Page, re = /^(confirm|ok|yes|delete|remove|archive|save|create)$/i): Promise<boolean> {
  const dialog = page.getByRole("dialog").last();
  if (await dialog.isVisible().catch(() => false)) {
    const button = dialog.getByRole("button", { name: re }).last();
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(1_200);
      return true;
    }
  }
  // more than one Cancel can be in the DOM (a mounted-but-hidden modal keeps its own); the visible one is the confirmation's
  const cancels = page.getByRole("button", { name: /^cancel$/i });
  let cancelBox: { x: number; y: number; width: number; height: number } | null = null;
  for (let i = 0; i < (await cancels.count()); i += 1) {
    if (await cancels.nth(i).isVisible().catch(() => false)) {
      cancelBox = await cancels.nth(i).boundingBox().catch(() => null);
      if (cancelBox) break;
    }
  }
  if (!cancelBox) return false;
  const buttons = page.getByRole("button", { name: re });
  const count = await buttons.count();
  for (let i = count - 1; i >= 0; i -= 1) {
    const box = await buttons.nth(i).boundingBox().catch(() => null);
    if (box && Math.abs(box.y - cancelBox.y) < 12 && box.x > cancelBox.x) {
      await buttons.nth(i).click({ timeout: 5_000 });
      await page.waitForTimeout(1_200);
      return true;
    }
  }
  return false;
}

/** Types into whatever textbox has focus (an inline rename, a dialog field), replacing its content. */
async function typeIntoFocused(page: Page, text: string, submit = true): Promise<boolean> {
  const focused = page.locator("input:focus, textarea:focus, [contenteditable=true]:focus").first();
  if (!(await focused.isVisible().catch(() => false))) return false;
  await page.keyboard.press("Control+a");
  await page.keyboard.type(text, { delay: 20 });
  if (submit) await page.keyboard.press("Enter");
  await page.waitForTimeout(1_200);
  return true;
}

async function firstEmptyTextbox(page: Page, within?: Locator): Promise<Locator | null> {
  const scope = within ?? page;
  const inputs = scope.locator("input[type=text], input:not([type]), textarea");
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    if ((await input.isVisible().catch(() => false)) && (await input.inputValue().catch(() => "x")) === "") return input;
  }
  return null;
}

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

const attachButton = (page: Page) => page.getByRole("button", { name: /add attachment/i }).first();
const editor = (page: Page) => page.locator('[contenteditable="true"]').first();

/** Opens the + menu and hovers / clicks the entry whose text matches, below the + button (the entries carry no role). */
async function attachEntry(page: Page, re: RegExp, click: boolean): Promise<void> {
  await attachButton(page).click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const anchor = await attachButton(page).boundingBox();
  const candidates = page.getByText(re);
  const count = await candidates.count();
  for (let i = 0; i < count; i += 1) {
    const box = await candidates.nth(i).boundingBox().catch(() => null);
    if (box && anchor && box.y > anchor.y) {
      await candidates.nth(i).hover({ timeout: 5_000 });
      await page.waitForTimeout(700);
      if (click) {
        await candidates.nth(i).click({ timeout: 5_000 });
        await page.waitForTimeout(1_000);
      }
      return;
    }
  }
  throw new Error(`no + menu entry matching ${re}`);
}

async function withPopup(page: Page, context: BrowserContext, click: () => Promise<void>): Promise<string | undefined> {
  const popup = context.waitForEvent("page", { timeout: 6_000 }).catch(() => null);
  await click();
  const newPage = await popup;
  if (!newPage) return undefined;
  await newPage.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
  await newPage.waitForTimeout(1_500);
  let target = "?";
  try {
    const u = new URL(newPage.url());
    target = `${u.host}${u.pathname}`;
  } catch {
    target = "?";
  }
  await newPage.close().catch(() => undefined);
  return target;
}

// ---------------------------------------------------------------------------------------------------------------------
// the actions

async function runRecents(page: Page, context: BrowserContext, defs: Map<ActionId, Action>): Promise<void> {
  const rename = defs.get("recents-rename");
  if (rename) await action(rename, async () => {
    await gotoHome(page);
    const row = recentRow(page, session);
    const original = ((await row.innerText().catch(() => "")) || "").trim();
    if (!original) throw new Error("the session row has no title");
    await openRowMenu(page, session);
    await shot(page, "menu");
    await (await visibleText(page, /^rename$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "after-rename-click");
    const target = original + RENAME_SUFFIX;
    let typed = await typeIntoFocused(page, target);
    if (!typed) {
      const box = await firstEmptyTextbox(page, page.getByRole("dialog").last());
      if (box) { await box.fill(target); await page.keyboard.press("Enter"); typed = true; }
    }
    if (!typed) throw new Error("Rename opened nothing to type into");
    await confirmIfAsked(page, /^(confirm|ok|save|rename)$/i);
    await page.waitForTimeout(1_000);
    await shot(page, "renamed");
    const renamed = await recentRow(page, new RegExp(RENAME_SUFFIX.replace(/[()]/g, "\\$&"), "i")).isVisible().catch(() => false);
    note(renamed ? "the row shows the new title" : "no row with the new title is visible");
    // undo
    await openRowMenu(page, new RegExp(RENAME_SUFFIX.replace(/[()]/g, "\\$&"), "i"));
    await (await visibleText(page, /^rename$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    if (!(await typeIntoFocused(page, original))) {
      const box = await firstEmptyTextbox(page, page.getByRole("dialog").last());
      if (box) { await box.fill(original); await page.keyboard.press("Enter"); }
    }
    await confirmIfAsked(page, /^(confirm|ok|save|rename)$/i);
    await page.waitForTimeout(1_000);
    await shot(page, "restored");
    return recentRow(page, new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).isVisible().catch(() => false);
  });

  const pin = defs.get("recents-pin");
  if (pin) await action(pin, async () => {
    await gotoHome(page);
    const before = await page.getByRole("button", { name: /.+/ }).allInnerTexts().catch(() => []);
    await openRowMenu(page, session);
    await (await visibleText(page, /^pin$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "pinned");
    const after = await page.getByRole("button", { name: /.+/ }).allInnerTexts().catch(() => []);
    note(`rows before: ${before.filter((t) => t.trim()).slice(0, 12).join(" | ").slice(0, 300)}`);
    note(`rows after pin: ${after.filter((t) => t.trim()).slice(0, 12).join(" | ").slice(0, 300)}`);
    await openRowMenu(page, session);
    await shot(page, "menu-while-pinned");
    await (await visibleText(page, /^(unpin|pin)$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "unpinned");
    return true;
  });

  const copy = defs.get("recents-copy-id");
  if (copy) await action(copy, async () => {
    await gotoHome(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: REFERENCE_URL }).catch(() => undefined);
    await page.evaluate(() => navigator.clipboard.writeText("recon-marker")).catch(() => undefined);
    await openRowMenu(page, session);
    await (await visibleText(page, /copy conversation id/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "after-copy");
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "<clipboard unreadable>");
    note(`clipboard: ${clip === "recon-marker" ? "<unchanged: nothing copied or readText blocked>" : `${clip.length} chars, shape ${clip.replace(/[0-9a-f]/gi, "x").slice(0, 60)}`}`);
    return null;
  });

  const archive = defs.get("recents-archive");
  if (archive) await action(archive, async () => {
    await gotoHome(page);
    // anything a previous run left archived comes back first, so the count below is this run's
    const leftover = await unarchiveAll(page, session);
    if (leftover) note(`unarchived ${String(leftover)} session(s) a previous run had left archived`);
    await gotoHome(page);
    const rowsBefore = await page.getByRole("button", { name: session }).count();
    await openRowMenu(page, session);
    await (await visibleText(page, /^archive$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);
    await shot(page, "after-archive-click");
    await confirmIfAsked(page, /^(confirm|ok|archive|yes)$/i);
    await page.waitForTimeout(1_500);
    await shot(page, "archived");
    const rowsAfter = await page.getByRole("button", { name: session }).count();
    note(`Recents rows matching the session: ${String(rowsBefore)} before, ${String(rowsAfter)} after Archive`);
    if (!(await openSettings(page))) throw new Error("Settings did not open");
    await page.getByRole("button", { name: /^archived tasks$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "archived-tasks");
    const search = page.getByPlaceholder(/search archived/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("boat");
      await page.waitForTimeout(1_200);
      await shot(page, "archived-tasks-search");
      await search.fill("zzzz");
      await page.waitForTimeout(1_000);
      await shot(page, "archived-tasks-no-match");
      await search.fill("");
      await page.waitForTimeout(800);
    }
    const unarchive = page.getByRole("button", { name: /^unarchive$/i }).first();
    const listed = await unarchive.isVisible().catch(() => false);
    note(listed ? "the archived row is listed with Unarchive and a trash icon; the head has Delete all" : "no Unarchive control under Settings › Archived tasks");
    await closeSettings(page).catch(() => undefined);
    const restored = await unarchiveAll(page, session);
    note(`unarchived ${String(restored)} row(s)`);
    await gotoHome(page);
    await shot(page, "recents-after-restore");
    const rowsRestored = await page.getByRole("button", { name: session }).count();
    note(`Recents rows matching the session after restore: ${String(rowsRestored)}`);
    return restored > 0 && rowsRestored >= rowsBefore;
  });
}

async function runProjects(page: Page, defs: Map<ActionId, Action>): Promise<void> {
  const create = defs.get("project-create");
  if (create) await action(create, async () => {
    await gotoHome(page);
    await setSectionExpanded(page, /^projects$/i, true);
    await page.getByRole("button", { name: /^add new project$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);
    await shot(page, "dialog");
    const box = (await firstEmptyTextbox(page, page.getByRole("dialog").last())) ?? (await firstEmptyTextbox(page));
    if (!box) throw new Error("no name field in the Create project dialog");
    await box.fill(RECON_PROJECT);
    await page.waitForTimeout(400);
    await shot(page, "named");
    await (await visibleText(page, /^create$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
    await shot(page, "created");
    note(`after Create the path is ${pathOnly(page.url())}`);
    await gotoHome(page);
    await setSectionExpanded(page, /^projects$/i, true);
    await shot(page, "projects-section");
    return false; // undone by project-delete
  });

  const move = defs.get("project-move");
  if (move) await action(move, async () => {
    await gotoHome(page);
    await openRowMenu(page, session);
    await (await visibleText(page, /move to project/i)).hover({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "recents-move-submenu");
    await escape(page, 2);
    await attachEntry(page, /^add to project/i, false);
    await shot(page, "attach-add-to-project-submenu");
    await escape(page, 2);
    await setSectionExpanded(page, /^projects$/i, true);
    const projectRow = page.getByText(RECON_PROJECT).first();
    if (await projectRow.isVisible().catch(() => false)) {
      await projectRow.click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
      await shot(page, "project-page");
      note(`the project row leads to ${pathOnly(page.url())}`);
      await gotoHome(page);
      await setSectionExpanded(page, /^projects$/i, true);
      const row = page.getByText(RECON_PROJECT).first();
      await row.hover({ timeout: 5_000 });
      await page.waitForTimeout(600);
      await shot(page, "project-row-hover");
    } else note("the test project is not listed under Projects");
    return null;
  });

  const del = defs.get("project-delete");
  if (del) await action(del, async () => {
    await gotoHome(page);
    await setSectionExpanded(page, /^projects$/i, true);
    const row = page.getByText(RECON_PROJECT).first();
    if (!(await row.isVisible().catch(() => false))) throw new Error("the test project is not listed; nothing to delete");
    await row.hover({ timeout: 5_000 });
    await page.waitForTimeout(500);
    // the row's hover controls are named "<project> Project actions" (the ⋯) and "<project> New task" (observed 2026-09-15)
    const actions = page.getByRole("button", { name: /project actions/i }).first();
    if (!(await actions.isVisible().catch(() => false))) throw new Error("no Project actions control on the project row");
    // one plain click on the ⋯ (a second toggles the menu shut); the menu's entries may carry no role, so look by text below the row
    const box = await actions.boundingBox();
    const findDelete = async (): Promise<Locator | null> => {
      const entries = page.getByText(/^(delete|remove)( project)?$/i);
      for (let i = 0; i < (await entries.count()); i += 1) {
        const b = await entries.nth(i).boundingBox().catch(() => null);
        if (b && b.x < 700 && (await entries.nth(i).isVisible().catch(() => false))) return entries.nth(i);
      }
      return null;
    };
    // three ways in, captured each: a pointer click on the ⋯, the keyboard (focus + Space), a right-click on the row
    let deleteEntry: Locator | null = null;
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(900);
    await shot(page, "project-menu-click");
    deleteEntry = await findDelete();
    if (!deleteEntry) {
      await actions.focus().catch(() => undefined);
      await page.keyboard.press("Space");
      await page.waitForTimeout(900);
      await shot(page, "project-menu-keyboard");
      deleteEntry = await findDelete();
    }
    if (!deleteEntry) {
      await page.keyboard.press("Escape");
      await row.click({ button: "right", timeout: 5_000 });
      await page.waitForTimeout(900);
      await shot(page, "project-menu-right-click");
      deleteEntry = await findDelete();
    }
    if (!deleteEntry) {
      // the project's own page: the row's name leads to it; a ⋯ beside its heading is the last place a Delete could live
      await page.keyboard.press("Escape");
      await row.click({ timeout: 5_000 });
      await page.waitForTimeout(2_000);
      await shot(page, "project-page");
      const icons = page.locator("main button, main [role=button]").filter({ hasNotText: /\S/ });
      const n = Math.min(await icons.count(), 6);
      for (let i = 0; i < n && !deleteEntry; i += 1) {
        await icons.nth(i).click({ timeout: 3_000, force: true }).catch(() => undefined);
        await page.waitForTimeout(700);
        deleteEntry = await findDelete();
        if (deleteEntry) await shot(page, "project-page-menu");
        else await page.keyboard.press("Escape");
      }
    }
    if (!deleteEntry) throw new Error("no Delete entry appeared: not after a click, Space or right-click on the row's ⋯, nor on the project page — delete \"Recon test project\" by hand");
    await deleteEntry.click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await shot(page, "after-delete-click");
    await confirmIfAsked(page, /^(confirm|ok|delete|remove|yes)$/i);
    await page.waitForTimeout(1_200);
    await gotoHome(page);
    await setSectionExpanded(page, /^projects$/i, true);
    await shot(page, "projects-after-delete");
    const gone = !(await page.getByText(RECON_PROJECT).first().isVisible().catch(() => false));
    note(gone ? "the test project is gone" : "the test project is STILL listed — delete it by hand");
    return gone;
  });
}

async function runAssets(page: Page, defs: Map<ActionId, Action>): Promise<void> {
  const tileMenu = async (name: RegExp): Promise<void> => {
    const preview = page.getByRole("button", { name }).first();
    await preview.waitFor({ state: "visible", timeout: 8_000 });
    await preview.hover({ timeout: 5_000 });
    await page.waitForTimeout(500);
    const more = page.getByRole("button", { name: /^more actions for /i }).first();
    await more.hover({ timeout: 5_000 });
    await more.click({ timeout: 10_000, force: true });
    await page.waitForTimeout(800);
  };
  const star = defs.get("assets-star");
  if (star) await action(star, async () => {
    await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await tileMenu(/^preview .*\.mp4$/i);
    await (await visibleText(page, /^star$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "starred");
    await page.getByRole("tab", { name: /^star/i }).or(page.getByRole("button", { name: /^star$/i })).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "star-tab");
    await page.getByRole("tab", { name: /from agent/i }).or(page.getByRole("button", { name: /from agent/i })).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await tileMenu(/^preview .*\.mp4$/i);
    await shot(page, "menu-while-starred");
    await (await visibleText(page, /^(unstar|star|unfavorite|remove from star)/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await page.getByRole("tab", { name: /^star/i }).or(page.getByRole("button", { name: /^star$/i })).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "star-tab-after-unstar");
    const empty = await page.getByText(/no assets yet/i).first().isVisible().catch(() => false);
    note(empty ? "the Star tab is empty again after a reload" : "the Star tab still lists something after a reload — unstar by hand");
    return empty;
  });

  const upload = defs.get("assets-upload");
  if (upload) await action(upload, async () => {
    if (!existsSync(FIXTURE_IMAGE)) throw new Error(`fixture image missing at ${FIXTURE_IMAGE}`);
    await gotoHome(page);
    const chooser = page.waitForEvent("filechooser", { timeout: 8_000 });
    await attachEntry(page, /^add files or photos/i, true);
    const fc = await chooser;
    await fc.setFiles(FIXTURE_IMAGE);
    await page.waitForTimeout(4_000);
    await shot(page, "attached");
    await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await page.getByRole("tab", { name: /from you/i }).or(page.getByRole("button", { name: /from you/i })).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "from-you");
    await page.getByRole("button", { name: /^images$/i }).first().click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(1_200);
    await shot(page, "from-you-images");
    const tile = page.getByRole("button", { name: /^preview .*\.(png|jpe?g|webp)$/i }).first();
    const listed = await tile.isVisible().catch(() => false);
    note(listed ? "the upload is listed under From you" : "no image tile under From you (the composer may upload only on Send)");
    if (!listed) {
      await gotoHome(page);
      return true;
    }
    await tileMenu(/^preview .*\.(png|jpe?g|webp)$/i);
    await shot(page, "upload-tile-menu");
    await (await visibleText(page, /^delete$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    await confirmIfAsked(page, /^(confirm|ok|delete|yes)$/i);
    await page.waitForTimeout(1_500);
    await shot(page, "after-delete");
    const gone = !(await page.getByRole("button", { name: /^preview .*\.(png|jpe?g|webp)$/i }).first().isVisible().catch(() => false));
    note(gone ? "the uploaded image is deleted" : "the uploaded image is STILL listed — delete it by hand");
    await gotoHome(page);
    return gone;
  });
}

async function runManage(page: Page, defs: Map<ActionId, Action>): Promise<void> {
  // A direct /plugins/manage load bounced to /plugins on 2026-09-15; the page's top-bar Manage button is the way in.
  const gotoManage = async () => {
    await page.goto(`${REFERENCE_URL}plugins`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await page.getByRole("button", { name: /^manage$/i }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(2_000);
    note(`Manage → ${pathOnly(page.url())}`);
  };
  const manageTab = async (name: string) => {
    const tab = await visibleText(page, new RegExp(`^${name}\\s*\\d*$`, "i"), { mainOnly: true });
    await tab.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
  };
  const tabs = defs.get("manage-tabs");
  if (tabs) await action(tabs, async () => {
    await gotoManage();
    await shot(page, "management");
    for (const name of ["Plugins", "Skills", "Apps", "Agents"]) {
      await manageTab(name);
      await shot(page, `tab-${name.toLowerCase()}`);
    }
    return null;
  });
  const agents = defs.get("manage-agents");
  if (agents) await action(agents, async () => {
    await gotoManage();
    await manageTab("Agents");
    for (const name of ["Coder", "Verifier", "General"]) {
      await (await visibleText(page, new RegExp(`^${name}$`), { mainOnly: true })).click({ timeout: 5_000 });
      await page.waitForTimeout(1_200);
      await shot(page, `agent-${name.toLowerCase()}`);
    }
    return null;
  });
  /** Deletes every agent row named RECON_AGENT (the row's menu: Chat with it / Pin / Delete, then Cancel / Delete); returns the count. */
  const deleteTestAgents = async (): Promise<number> => {
    let n = 0;
    for (let i = 0; i < 4; i += 1) {
      const row = page.getByRole("button", { name: new RegExp(`^${RECON_AGENT}$`) }).first();
      if (!(await row.isVisible().catch(() => false))) break;
      await row.hover({ timeout: 5_000 });
      await page.waitForTimeout(600);
      const more = page.getByRole("button", { name: /more actions/i }).last();
      if (await more.isVisible().catch(() => false)) await more.click({ timeout: 5_000, force: true });
      else await row.locator("button, [role=button]").filter({ hasNotText: /\S/ }).last().click({ timeout: 5_000, force: true });
      await page.waitForTimeout(700);
      if (i === 0) await shot(page, "agent-menu");
      await page.getByRole("menuitem", { name: /^delete$/i }).last().click({ timeout: 5_000 });
      await page.waitForTimeout(900);
      if (i === 0) await shot(page, "delete-confirmation");
      if (!(await confirmIfAsked(page, /^(confirm|ok|delete|remove|yes)$/i))) break;
      await page.waitForTimeout(1_500);
      n += 1;
    }
    return n;
  };
  const create = defs.get("manage-create-agent");
  if (create) await action(create, async () => {
    await gotoManage();
    await manageTab("Agents");
    const leftover = await deleteTestAgents();
    if (leftover) note(`deleted ${String(leftover)} test agent(s) a previous run had left`);
    await (await visibleText(page, /^create agent$/i, { mainOnly: true })).click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "create-agent");
    const nameBox = await firstEmptyTextbox(page);
    if (!nameBox) throw new Error("no empty text field after Create agent");
    await nameBox.fill(RECON_AGENT);
    await page.waitForTimeout(400);
    await shot(page, "named");
    await (await visibleText(page, /^save$/i, { mainOnly: true })).click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
    await shot(page, "saved");
    const listed = await page.getByRole("button", { name: new RegExp(`^${RECON_AGENT}$`) }).first().isVisible().catch(() => false);
    note(listed ? "the test agent is listed" : "the test agent is not listed after Save");
    if (!listed) return false;
    const deleted = await deleteTestAgents();
    note(`deleted ${String(deleted)} test agent(s)`);
    await shot(page, "after-delete");
    const gone = !(await page.getByRole("button", { name: new RegExp(`^${RECON_AGENT}$`) }).first().isVisible().catch(() => false));
    note(gone ? "the test agent is gone" : "the test agent is STILL listed — delete it by hand");
    return gone;
  });
}

async function runOneClicks(page: Page, context: BrowserContext, defs: Map<ActionId, Action>): Promise<void> {
  const skills = defs.get("attach-skills");
  if (skills) await action(skills, async () => {
    await gotoHome(page);
    await attachEntry(page, /^skills$/i, false);
    await (await visibleText(page, /^manage skills$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "manage-skills");
    note(`Manage skills → ${pathOnly(page.url())}`);
    await escape(page, 2);
    await gotoHome(page);
    await attachEntry(page, /^skills$/i, false);
    await (await visibleText(page, /^add skill$/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "add-skill");
    note(`Add skill → ${pathOnly(page.url())}`);
    await escape(page, 2);
    return null;
  });
  const env = defs.get("attach-env");
  if (env) await action(env, async () => {
    await gotoHome(page);
    await attachEntry(page, /^environment variables$/i, true);
    await page.waitForTimeout(800);
    await shot(page, "environment-variables");
    note(`Environment variables → ${pathOnly(page.url())}`);
    await escape(page, 2);
    return null;
  });
  const preview = defs.get("preview-more");
  if (preview) await action(preview, async () => {
    await gotoHome(page);
    await recentRow(page, session).click({ timeout: 8_000 });
    await page.waitForTimeout(4_000);
    await shot(page, "task-page");
    const open = page.getByRole("button", { name: /^open preview$/i }).first();
    await open.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => undefined);
    await open.click({ timeout: 15_000 });
    await page.waitForTimeout(2_000);
    await shot(page, "preview-open");
    // the pane's head: Download ▾, then the icon-only ⋯ and × (observed 2026-09-14); the ⋯ is the first icon right of Download
    const download = page.getByRole("button", { name: /^download$/i }).last();
    const dBox = await download.boundingBox().catch(() => null);
    if (!dBox) throw new Error("the preview pane's Download button was not found");
    const icons = page.locator("button").filter({ hasNotText: /\S/ });
    const count = await icons.count();
    let target: Locator | null = null;
    let bestX = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i += 1) {
      const box = await icons.nth(i).boundingBox().catch(() => null);
      if (box && Math.abs(box.y - dBox.y) < 14 && box.x > dBox.x + dBox.width && box.x < bestX) { target = icons.nth(i); bestX = box.x; }
    }
    if (!target) throw new Error("no icon button right of the pane's Download");
    await target.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    await shot(page, "preview-more-menu");
    await escape(page, 2);
    return null;
  });
  const connect = defs.get("connect-mobile");
  if (connect) await action(connect, async () => {
    await page.goto(`${REFERENCE_URL}connect-mobile`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await (await visibleText(page, /^connect$/i)).click({ timeout: 5_000, force: true }).catch(() => undefined);
    await page.waitForTimeout(1_000);
    await shot(page, "connect-empty-token");
    await (await visibleText(page, /create im bot/i)).click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "create-im-bot");
    note(`Create IM Bot → ${pathOnly(page.url())}`);
    await escape(page, 2);
    return null;
  });
  const start = defs.get("product-start");
  if (start) await action(start, async () => {
    for (const product of ["max-hermes", "max-claw"]) {
      await page.goto(`${REFERENCE_URL}${product}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(2_000);
      const target = await withPopup(page, context, async () => { await (await visibleText(page, /^start now$/i)).click({ timeout: 5_000 }); });
      await page.waitForTimeout(1_500);
      await shot(page, `${product}-start-now`);
      note(`${product} Start now → ${target ?? `same tab, ${pathOnly(page.url())}`}`);
    }
    return null;
  });
  const prefs = defs.get("settings-preferences");
  if (prefs) await action(prefs, async () => {
    await gotoHome(page);
    if (!(await openSettings(page))) throw new Error("Settings did not open");
    const switches = page.getByRole("dialog").last().getByRole("switch").or(page.getByRole("switch"));
    const count = Math.min(await switches.count(), 2);
    if (count === 0) throw new Error("no switches under Settings › General");
    for (let i = 0; i < count; i += 1) {
      const sw = switches.nth(i);
      const was = await sw.getAttribute("aria-checked");
      await sw.click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
      await shot(page, `switch-${String(i + 1)}-toggled`);
      note(`switch ${String(i + 1)}: aria-checked ${was ?? "?"} → ${(await sw.getAttribute("aria-checked")) ?? "?"}`);
      await sw.click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
      await shot(page, `switch-${String(i + 1)}-back`);
    }
    await closeSettings(page).catch(() => undefined);
    return true;
  });
  const inbox = defs.get("inbox");
  if (inbox) await action(inbox, async () => {
    await gotoHome(page);
    await page.getByRole("button", { name: /^inbox/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    await shot(page, "open");
    for (const tab of ["updates", "messages"]) {
      const t = page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") }).or(page.getByText(new RegExp(`^${tab}$`, "i"))).first();
      if (await t.isVisible().catch(() => false)) {
        await t.click({ timeout: 5_000 });
        await page.waitForTimeout(900);
        await shot(page, tab);
      }
    }
    await escape(page, 2);
    return null;
  });
}

async function runChat(page: Page, defs: Map<ActionId, Action>): Promise<void> {
  const def = defs.get("chat");
  if (!def) return;
  await action(def, async () => {
    await gotoHome(page);
    await editor(page).click({ timeout: 10_000 });
    await page.keyboard.type("In one short paragraph, what can you help me make? Reply in plain text.", { delay: 15 });
    await page.waitForTimeout(500);
    await shot(page, "typed");
    await page.keyboard.press("Enter");
    const started = Date.now();
    let i = 0;
    let done = false;
    while (Date.now() - started < 120_000) {
      await page.waitForTimeout(i < 3 ? 2_000 : 5_000);
      i += 1;
      await shot(page, `streaming-${String(i)}`);
      const stop = page.getByRole("button", { name: /stop/i }).first();
      const stopVisible = await stop.isVisible().catch(() => false);
      const working = await page.getByText(/thinking|generating|working/i).first().isVisible().catch(() => false);
      if (!stopVisible && !working && i >= 3) { done = true; break; }
    }
    note(done ? `the turn finished after ${String(Math.round((Date.now() - started) / 1000))} s` : "the turn was still going at 120 s");
    note(`path after Send: ${pathOnly(page.url())}`);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await shot(page, "reloaded");
    note("credits spent: 1 text turn");
    return true;
  });
}

async function main(): Promise<number> {
  mkdirSync(DOCS_DIR, { recursive: true });
  mkdirSync(STATES_DIR, { recursive: true });
  console.log(`behaviour recon → docs/recon/${stamp}/ (${actions.length} action(s)${chat ? ", including the text turn" : ", no credits"})`);
  const { context, page } = await openReference(true);
  attachNetworkLog(context);
  try {
    await waitForHome(page, 20_000);
    await page.waitForTimeout(1_500);
    await dismissAnnouncement(page);
    const state = classifySession(await readSessionSignals(page));
    if (state !== "signed-in") {
      console.error(`session: ${state} — run recon/login.sh, then again`);
      return 1;
    }
    const defs = new Map<ActionId, Action>(actions.map((a) => [a.id, a]));
    await runRecents(page, context, defs);
    await runProjects(page, defs);
    await runAssets(page, defs);
    await runManage(page, defs);
    await runOneClicks(page, context, defs);
    await runChat(page, defs);
  } finally {
    await context.close();
  }
  const undone = behaviour.actions.filter((a) => a.undone === false && !a.skipped);
  const skipped = behaviour.actions.filter((a) => a.skipped);
  console.log(`done: ${String(behaviour.actions.length)} action(s), ${String(skipped.length)} skipped, ${String(undone.length)} not undone${undone.length ? `: ${undone.map((a) => a.id).join(", ")}` : ""}`);
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (error: unknown) => {
    console.error("recon:behaviour failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  },
);
