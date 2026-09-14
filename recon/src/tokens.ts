import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "playwright";
import { dismissAnnouncement, openReference, readSessionSignals, waitForHome } from "./browser.ts";
import { NARROW, WIDE, dateStamp, parseSessionArgFrom, parseThemeArg, type Theme } from "./capture-plan.ts";
import { OUT_DIR, RECON_ROOT, REFERENCE_URL, VIEWPORT } from "./config.ts";
import { classifySession } from "./session.ts";
import { closeSettings, emptyThemeRecord, openSettings, pageIsDark, restoreAppearance, setTheme } from "./theme.ts";
import {
  boxesEqual,
  buildTokens,
  isMissing,
  parseMediaBreakpoints,
  parseThemedCssVariables,
  renderTokensMarkdown,
  type Box,
  type FontFace,
  type LayoutSignals,
  type Measurement,
  type MissingMeasurement,
} from "./tokens-model.ts";

/**
 * STORY_003, extended by STORY_018: measures the reference's design tokens from computed styles in our own browser, in
 * the light theme and then the dark one — every custom property per theme scope from the stylesheets and computed live
 * on the root, every element in both themes, the hover and focus states of the main controls, the pages behind the
 * sidebar, and a finished task page. Never clicks Send, never types. Writes tokens.json and tokens.md to
 * docs/recon/<date>/ and the raw stylesheets to recon/out/<date>/css/.
 */

const args = process.argv.slice(2);
const themes = parseThemeArg(args);
const taskSession = parseSessionArgFrom(args);
const stamp = dateStamp(new Date());
const DOCS_DIR = path.join(RECON_ROOT, "..", "docs", "recon", stamp);
const RAW_CSS_DIR = path.join(OUT_DIR, stamp, "css");

const STYLE_PROPS = [
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign",
  "color", "backgroundColor", "borderTopWidth", "borderTopStyle", "borderTopColor", "borderRadius", "boxShadow", "opacity",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap", "rowGap", "columnGap",
  "display", "alignItems", "justifyContent", "cursor",
  "transitionProperty", "transitionDuration", "transitionTimingFunction", "animationName", "animationDuration",
];

type AncestorRule = { maxWidth: number; minWidth?: number; minHeight?: number; visual?: boolean };
type RawMeasurement = Omit<Measurement, "name" | "state" | "width">;

declare global {
  interface Window {
    __recon?: {
      measure: (el: Element) => RawMeasurement;
      ancestor: (el: Element, rule: AncestorRule) => Element | null;
    };
  }
}

/** Installed into the page as plain JavaScript; runs in the browser, not in Node. */
const INSTALL = `(() => {
  const PROPS = ${JSON.stringify(STYLE_PROPS)};
  const measure = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const styles = {};
    for (const p of PROPS) styles[p] = cs[p];
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40),
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      styles,
    };
  };
  const ancestor = (el, rule) => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      const bordered = cs.borderTopStyle !== "none" && parseFloat(cs.borderTopWidth) > 0;
      const shadowed = cs.boxShadow !== "none";
      const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)";
      const sizeOk = r.width <= rule.maxWidth && r.width >= (rule.minWidth || 0) && r.height >= (rule.minHeight || 0);
      if (sizeOk && (!rule.visual || bordered || shadowed || filled)) return n;
      n = n.parentElement;
    }
    return null;
  };
  window.__recon = { measure, ancestor };
})();`;

let currentWidth: number = WIDE;
let currentTheme: Theme = "light";
const elements: (Measurement | MissingMeasurement)[] = [];
const themeRecord = emptyThemeRecord();

async function install(page: Page): Promise<void> {
  await page.evaluate(INSTALL);
}

async function settle(locator: Locator): Promise<void> {
  let previous: Box | null = null;
  for (let i = 0; i < 12; i += 1) {
    const b = await locator.boundingBox().catch(() => null);
    const box = b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    if (box && boxesEqual(previous, box)) return;
    previous = box;
    await locator.page().waitForTimeout(150);
  }
}

const mask = (text: string): string => text.replace(/MiniMax\d{4,}/g, "Owner");

async function measure(page: Page, name: string, state: string, locator: Locator, rule?: AncestorRule): Promise<void> {
  const width = currentWidth;
  const target = locator.first();
  try {
    await target.waitFor({ state: "visible", timeout: 6_000 });
    await settle(target);
    const raw = await target.evaluate((el, r: AncestorRule | null) => {
      const api = window.__recon;
      if (!api) return null;
      const node = r ? api.ancestor(el, r) : el;
      return node ? api.measure(node) : null;
    }, rule ?? null);
    if (!raw) {
      elements.push({ name, state, width, theme: currentTheme, missing: rule ? "no ancestor matched the rule" : "measure API missing" });
      return;
    }
    elements.push({ name, state, width, theme: currentTheme, ...raw, text: mask(raw.text) });
  } catch (error: unknown) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown";
    elements.push({ name, state, width, theme: currentTheme, missing: reason });
  }
}

/** The same element under the pointer, then with keyboard focus (STORY_018): `<name>:hover` and `<name>:focus`. */
async function measureHoverFocus(page: Page, name: string, state: string, locator: Locator, rule?: AncestorRule): Promise<void> {
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) {
    elements.push({ name: `${name}:hover`, state, width: currentWidth, theme: currentTheme, missing: "not visible" });
    return;
  }
  await target.hover({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(350);
  await measure(page, `${name}:hover`, state, locator, rule);
  await page.mouse.move(currentWidth / 2, 5);
  await target.focus({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
  await measure(page, `${name}:focus`, state, locator, rule);
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.mouse.move(currentWidth / 2, 5);
}

async function gotoHome(page: Page): Promise<void> {
  await page.goto(REFERENCE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForHome(page, 20_000);
  await page.waitForTimeout(1_500);
  await dismissAnnouncement(page);
  await install(page);
}

async function enterVideoMode(page: Page): Promise<boolean> {
  const chip = page.getByRole("button", { name: /video generation/i }).first();
  if (!(await chip.isVisible().catch(() => false))) return false;
  await chip.click({ timeout: 10_000 });
  await page.waitForTimeout(1_500);
  return true;
}

async function escape(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

const newTask = (page: Page) => page.getByRole("button", { name: /^new task$/i }).first();
const editor = (page: Page) => page.locator('[contenteditable="true"]').first();
const paramsButton = (page: Page) => page.getByRole("button", { name: /^video parameters/i }).first();
const modelButton = (page: Page) => page.getByRole("button", { name: /^model:/i }).first();
const showcaseCards = (page: Page) => page.getByRole("button", { name: /dark-pop cyber music video|futuristic technology brand film|product concept system montage|cyberpunk game character customization/i });

const COMPOSER: AncestorRule = { maxWidth: 1000, minWidth: 300, minHeight: 80, visual: true };

async function measureHome(page: Page): Promise<void> {
  const s = "home";
  await measure(page, "body", s, page.locator("body"));
  await measure(page, "sidebar", s, newTask(page), { maxWidth: 400, minHeight: 600 });
  await measure(page, "sidebar-item-active", s, newTask(page));
  await measure(page, "sidebar-item", s, page.getByRole("button", { name: /^plugins$/i }));
  await measure(page, "sidebar-section-label", s, page.getByRole("button", { name: /^more$/i }));
  await measure(page, "sidebar-user-chip", s, page.getByText(/^MiniMax\d{4,}$/), { maxWidth: 300, minHeight: 28, minWidth: 100 });
  await measure(page, "heading", s, page.getByText(/makes your work easier/i));
  await measure(page, "composer", s, editor(page), COMPOSER);
  await measure(page, "editor", s, editor(page));
  await measure(page, "attach-button", s, page.getByRole("button", { name: /add attachment/i }));
  await measure(page, "agent-team-switch", s, page.getByRole("switch", { name: /agent team/i }));
  await measure(page, "agent-model-button", s, page.getByRole("button", { name: /^minimax-m\d/i }));
  await measure(page, "send-button", s, page.getByRole("button", { name: /send message/i }));
  await measure(page, "mode-chip-video", s, page.getByRole("button", { name: /video generation/i }));
  await measure(page, "mode-chip", s, page.getByRole("button", { name: /^document$/i }));
  await measure(page, "top-download-button", s, page.getByRole("button", { name: /^download$/i }));
  await measure(page, "promo-card", s, page.getByText(/h3 takes the stage|new minimax desktop/i).first(), { maxWidth: 320, minHeight: 200, visual: true });
  await measure(page, "primary-button", s, page.getByRole("button", { name: /^subscribe$/i }).or(page.getByRole("button", { name: /^download desktop$/i }).nth(1)).first());
}

async function measureVideoMode(page: Page): Promise<void> {
  const s = "video-mode";
  await measure(page, "composer-video", s, editor(page), COMPOSER);
  await measure(page, "reference-tile", s, page.getByRole("button", { name: /add reference/i }));
  await measure(page, "plugin-tag", s, page.getByRole("button", { name: /^video-creator$/i }));
  await measure(page, "model-button", s, modelButton(page));
  await measure(page, "params-button", s, paramsButton(page));
  await measure(page, "showcase-title", s, page.getByText(/^showcase$/i));
  await measure(page, "showcase-card", s, showcaseCards(page).first());
  await measure(page, "showcase-caption", s, page.getByText(/^dark-pop cyber music/i));

  await paramsButton(page).click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const p = "params-open";
  await measure(page, "popover", p, page.getByRole("radio", { name: /^21:9$/ }), { maxWidth: 700, minHeight: 150, visual: true });
  await measure(page, "popover-section-label", p, page.getByText(/^ratio$/i));
  await measure(page, "radio-selected", p, page.getByRole("radio", { name: /^16:9$/ }));
  await measure(page, "radio", p, page.getByRole("radio", { name: /^4:3$/ }));
  await measure(page, "radio-resolution", p, page.getByRole("radio", { name: /^768P$/i }));
  await measure(page, "radio-duration-selected", p, page.getByRole("radio", { name: /^5s$/ }));
  await measure(page, "radio-duration", p, page.getByRole("radio", { name: /^9s$/ }));
  await escape(page);

  await modelButton(page).click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const m = "model-open";
  // Entries observed 2026-09-14 as menuitemradio: MiniMax-H3 (checked), MiniMax-H3-Max, MiniMax-H2.3 (2026-09-12: "MiniMax-H3.0", "Hailuo-2.3").
  await measure(page, "menu", m, page.getByRole("menu").first());
  await measure(page, "menu-item", m, page.getByRole("menuitemradio", { name: /h2\.3|hailuo/i }));
  await measure(page, "menu-item-selected", m, page.getByRole("menuitemradio", { checked: true }));
  await escape(page);
}

async function measureAssets(page: Page): Promise<void> {
  await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2_500);
  await install(page);
  const s = "assets";
  await measure(page, "page-title", s, page.locator("h1, h2, h3").filter({ hasText: /^\s*assets\s*$/i }));
  await measure(page, "tab-active", s, page.getByRole("tab", { name: /from agent/i }));
  await measure(page, "tab", s, page.getByRole("tab", { name: /from you/i }));
  await measure(page, "filter-active", s, page.getByRole("button", { name: /^all$/i }));
  await measure(page, "filter", s, page.getByRole("button", { name: /^videos$/i }));
  await measure(page, "search-input", s, page.getByPlaceholder(/search by file/i));
  await measure(page, "empty-title", s, page.getByText(/no assets yet/i));
  await measure(page, "empty-subtitle", s, page.getByText(/files generated by ai/i));
  await measure(page, "empty-cta", s, page.getByRole("button", { name: /^new task$/i }).last());
  await page.getByRole("button", { name: /^videos$/i }).first().click({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200);
  await measure(page, "asset-tile", s, page.getByRole("button", { name: /^preview .*\.mp4$/i }), { maxWidth: 320, minWidth: 200, minHeight: 150 });
  await measure(page, "asset-tile-name", s, page.getByText(/\.mp4$/i).first());
}

const SIDEBAR_PAGES: { state: string; name: RegExp; section?: RegExp }[] = [
  { state: "page-search", name: /^search$/i },
  { state: "page-plugins", name: /^plugins$/i },
  { state: "page-scheduled", name: /^scheduled$/i },
  { state: "page-connect-mobile", name: /^connect mobile$/i },
  { state: "page-maxhermes", name: /^maxhermes$/i, section: /^more$/i },
  { state: "page-maxclaw", name: /^maxclaw$/i, section: /^more$/i },
];

/** A generic reading of whatever a sidebar destination renders: the page, its headings, tabs, first controls, inputs and a card. */
async function measurePage(page: Page, state: string): Promise<void> {
  const main = page.locator("main").first();
  const scope = (await main.isVisible().catch(() => false)) ? main : page.locator("body");
  await measure(page, "page", state, scope);
  await measure(page, "page-heading", state, scope.locator("h1, h2").first());
  await measure(page, "page-subheading", state, scope.locator("h3").first());
  await measure(page, "page-tab-active", state, scope.getByRole("tab", { selected: true }).first());
  await measure(page, "page-tab", state, scope.getByRole("tab", { selected: false }).first());
  await measure(page, "page-input", state, scope.locator("input, textarea").first());
  await measure(page, "page-primary-button", state, scope.getByRole("button").filter({ hasText: /\S/ }).first());
  await measure(page, "page-card", state, scope.locator("h3, h4, img").first(), { maxWidth: 700, minWidth: 160, minHeight: 60, visual: true });
  await measure(page, "page-body-text", state, scope.locator("p").first());
}

async function measurePages(page: Page): Promise<void> {
  for (const p of SIDEBAR_PAGES) {
    await gotoHome(page);
    if (p.section) {
      const header = page.getByRole("button", { name: p.section }).first();
      if ((await header.getAttribute("aria-expanded").catch(() => null)) === "false") {
        await header.click({ timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(500);
      }
    }
    const item = page.getByRole("button", { name: p.name }).or(page.getByRole("link", { name: p.name })).first();
    if (!(await item.isVisible().catch(() => false))) {
      elements.push({ name: "page", state: p.state, width: currentWidth, theme: currentTheme, missing: "sidebar item not visible" });
      continue;
    }
    const before = page.url();
    await item.click({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(1_800);
    if (page.url() === before && !(await page.getByRole("dialog").first().isVisible().catch(() => false))) {
      elements.push({ name: "page", state: p.state, width: currentWidth, theme: currentTheme, missing: "click neither navigated nor opened a dialog" });
      continue;
    }
    await install(page);
    await measurePage(page, p.state);
    await page.keyboard.press("Escape").catch(() => undefined);
  }
}

/** The finished 2026-09-12 session reopened from Recents: thread, result card, Work Area panel, docked composer. */
async function measureTaskPage(page: Page): Promise<void> {
  await gotoHome(page);
  const row = page.getByRole("button", { name: taskSession }).first();
  if (!(await row.isVisible().catch(() => false))) {
    elements.push({ name: "thread", state: "task", width: currentWidth, theme: currentTheme, missing: `no Recents row matching ${taskSession}` });
    return;
  }
  await row.click({ timeout: 10_000 });
  await page.waitForTimeout(3_000);
  await install(page);
  const s = "task";
  await measure(page, "top-bar-title", s, page.getByText(taskSession).nth(1));
  await measure(page, "work-area-button", s, page.getByRole("button", { name: /work ?area/i }));
  await measure(page, "user-bubble", s, page.getByRole("button", { name: /^view all$/i }).last(), { maxWidth: 800, minWidth: 300, minHeight: 60, visual: true });
  await measure(page, "processed-row", s, page.getByRole("button", { name: /^processed \d+s$/i }).last());
  await measure(page, "result-card", s, page.getByRole("button", { name: /\.mp4$/i }).first(), { maxWidth: 800, minWidth: 400, minHeight: 60, visual: true });
  await measure(page, "result-file-name", s, page.getByRole("button", { name: /\.mp4$/i }).first());
  await measure(page, "result-open-preview", s, page.getByRole("button", { name: /^open preview$/i }).first());
  await measure(page, "message-actions", s, page.getByRole("button", { name: /^like$/i }).last());
  await measure(page, "jump-button", s, page.getByRole("button", { name: /jump to top|jump to start/i }));
  await measure(page, "credits-notice", s, page.getByText(/fewer than .* credits remain/i), { maxWidth: 900, minWidth: 400, minHeight: 40, visual: true });
  await measure(page, "credits-buy", s, page.getByRole("button", { name: /^buy credits$/i }));
  await measure(page, "credits-subscribe", s, page.getByRole("button", { name: /^subscribe$/i }));
  await measure(page, "composer-docked", s, editor(page), COMPOSER);
  await measure(page, "footer-disclaimer", s, page.getByText(/can make mistakes/i));
  await measure(page, "work-area-panel", s, page.getByRole("button", { name: /^progress$/i }).first(), { maxWidth: 420, minWidth: 200, minHeight: 200 });
  await measure(page, "work-area-section", s, page.getByRole("button", { name: /^progress$/i }).first());
  await measure(page, "work-area-deliverable", s, page.getByRole("button", { name: /\.mp4$/i }).last());
  await measureHoverFocus(page, "result-open-preview", s, page.getByRole("button", { name: /^open preview$/i }).first());
}

/** User menu › Settings (observed 2026-09-14): the modal, its section nav, the Appearance cards and the Preferences switches. */
async function measureSettings(page: Page): Promise<void> {
  await gotoHome(page);
  if (!(await openSettings(page))) {
    elements.push({ name: "settings-modal", state: "settings", width: currentWidth, theme: currentTheme, missing: "Settings did not open" });
    return;
  }
  await install(page);
  const s = "settings";
  await measure(page, "settings-modal", s, page.getByRole("button", { name: /^archived tasks$/i }), { maxWidth: 1200, minWidth: 800, minHeight: 400, visual: true });
  await measure(page, "settings-nav-active", s, page.getByRole("button", { name: /^general$/i }).first());
  await measure(page, "settings-nav-item", s, page.getByRole("button", { name: /^account$/i }).first());
  await measure(page, "settings-title", s, page.getByRole("heading", { name: /^general$/i }));
  await measure(page, "settings-section-heading", s, page.getByRole("heading", { name: /^appearance$/i }).or(page.getByText(/^appearance$/i)));
  await measure(page, "appearance-option-label", s, page.getByText(/^dark mode$/i));
  // The preview card sits before its label inside the option; the option container itself is what a click selects.
  await measure(page, "appearance-option", s, page.getByText(/^system$/i), { maxWidth: 260, minWidth: 150, minHeight: 120 });
  await measure(page, "appearance-card-selected", s, page.getByText(currentTheme === "dark" ? /^dark mode$/i : /^light mode$/i).locator("xpath=./preceding-sibling::*[1]"));
  await measure(page, "appearance-card", s, page.getByText(/^system$/i).locator("xpath=./preceding-sibling::*[1]"));
  await measure(page, "preference-row", s, page.getByText(/^help improve our services$/i), { maxWidth: 800, minWidth: 400, minHeight: 40, visual: true });
  await measure(page, "preference-switch", s, page.getByRole("switch").first());
  await measure(page, "preference-description", s, page.getByText(/allow your content to help improve/i));
  await closeSettings(page).catch(() => undefined);
}

async function measureHoverSet(page: Page): Promise<void> {
  await gotoHome(page);
  const s = "home";
  await measureHoverFocus(page, "sidebar-item", s, page.getByRole("button", { name: /^plugins$/i }));
  await measureHoverFocus(page, "mode-chip", s, page.getByRole("button", { name: /^document$/i }));
  await measureHoverFocus(page, "primary-button", s, page.getByRole("button", { name: /^download$/i }).first());
  await measureHoverFocus(page, "send-button", s, page.getByRole("button", { name: /send message/i }));
  await measureHoverFocus(page, "sidebar-user-chip", s, page.getByText(/^(MiniMax\d{4,}|Owner)$/), { maxWidth: 300, minHeight: 28, minWidth: 100 });
  await measureHoverFocus(page, "top-download-button", s, page.getByRole("button", { name: /^download$/i }));
  await page.goto(`${REFERENCE_URL}assets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2_500);
  await install(page);
  await page.getByRole("button", { name: /^videos$/i }).first().click({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200);
  await measureHoverFocus(page, "asset-tile", "assets", page.getByRole("button", { name: /^preview .*\.mp4$/i }), { maxWidth: 320, minWidth: 200, minHeight: 150 });
  await measureHoverFocus(page, "filter", "assets", page.getByRole("button", { name: /^images$/i }));
}

async function measureNarrow(page: Page): Promise<void> {
  currentWidth = NARROW;
  await page.setViewportSize({ width: NARROW, height: 844 });
  await gotoHome(page);
  const s = "narrow-video-mode";
  await measure(page, "heading", s, page.getByText(/makes your work easier/i));
  if (await enterVideoMode(page)) {
    await measure(page, "composer-video", s, editor(page), COMPOSER);
    await measure(page, "reference-tile", s, page.getByRole("button", { name: /add reference/i }));
    await measure(page, "send-button", s, page.getByRole("button", { name: /send message/i }));
    await measure(page, "showcase-card", s, showcaseCards(page).first());
  }
  await page.setViewportSize({ ...VIEWPORT });
  currentWidth = WIDE;
}

const SAMPLE_WIDTHS = [1440, 1280, 1100, 1024, 900, 820, 768, 700, 640, 560, 480, 430, 390, 360];

async function observeLayout(page: Page): Promise<LayoutSignals[]> {
  const observed: LayoutSignals[] = [];
  for (const width of SAMPLE_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await gotoHome(page);
    await enterVideoMode(page);
    await page.waitForTimeout(500);
    // Expanded means the item sits inside the viewport; a collapsed drawer still reports visible off-canvas.
    const nt = await newTask(page).boundingBox().catch(() => null);
    const sidebarExpanded = !!nt && nt.x >= 0 && nt.x + nt.width <= width && nt.width > 40;
    const composerBox = await editor(page)
      .evaluate((el, rule: AncestorRule) => {
        const api = window.__recon;
        const node = api ? api.ancestor(el, rule) : null;
        return node ? node.getBoundingClientRect().width : null;
      }, COMPOSER)
      .catch(() => null);
    const cards = showcaseCards(page);
    const boxes: Box[] = [];
    const count = await cards.count();
    for (let i = 0; i < count; i += 1) {
      const b = await cards.nth(i).boundingBox().catch(() => null);
      if (b) boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height });
    }
    const firstRowY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : null;
    const showcaseColumns = firstRowY === null ? null : boxes.filter((b) => Math.abs(b.y - firstRowY) < 2).length;
    const pb = await paramsButton(page).boundingBox().catch(() => null);
    const paramsControlVisible = !!pb && pb.x >= 0 && pb.x + pb.width <= width;
    observed.push({ width, sidebarExpanded, composerWidth: composerBox === null ? null : Math.round(composerBox), showcaseColumns, paramsControlVisible });
    console.log(`  ${width}px: sidebar ${sidebarExpanded ? "expanded" : "collapsed"}, composer ${composerBox === null ? "?" : Math.round(composerBox)}px, showcase ${showcaseColumns ?? "?"} col, params ${paramsControlVisible ? "visible" : "off-screen"}`);
  }
  await page.setViewportSize({ ...VIEWPORT });
  currentWidth = WIDE;
  return observed;
}

async function readFontsAndBody(page: Page): Promise<{ fonts: FontFace[]; bodyFontFamily: string; bodyBackground: string }> {
  return page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const fonts = Array.from(document.fonts).map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
    return { fonts, bodyFontFamily: cs.fontFamily, bodyBackground: cs.backgroundColor };
  });
}

async function readStylesheets(page: Page): Promise<{ cssVariables: Record<string, string>; cssVariablesDark: Record<string, string>; darkScopes: string[]; cssBreakpoints: number[]; files: number }> {
  // Linked sheets and inline <style> blocks both count: a framework may inject the themed variables inline.
  const hrefs = await page.locator("link[rel=stylesheet]").evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  const inline = await page.locator("style").evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
  mkdirSync(RAW_CSS_DIR, { recursive: true });
  const cssVariables: Record<string, string> = {};
  const cssVariablesDark: Record<string, string> = {};
  const darkScopes = new Set<string>();
  const breakpoints = new Set<number>();
  let files = 0;
  const absorb = (css: string) => {
    const themed = parseThemedCssVariables(css);
    for (const [k, v] of Object.entries(themed.light)) if (!(k in cssVariables)) cssVariables[k] = v;
    for (const [k, v] of Object.entries(themed.dark)) if (!(k in cssVariablesDark)) cssVariablesDark[k] = v;
    for (const scope of themed.darkScopes) darkScopes.add(scope);
    for (const b of parseMediaBreakpoints(css)) breakpoints.add(b);
  };
  for (const href of hrefs) {
    const response = await page.request.get(href).catch(() => null);
    if (!response || !response.ok()) continue;
    const css = await response.text();
    files += 1;
    writeFileSync(path.join(RAW_CSS_DIR, `${files}.css`), css);
    absorb(css);
  }
  inline.forEach((css, i) => {
    if (!css.trim()) return;
    writeFileSync(path.join(RAW_CSS_DIR, `inline-${i + 1}.css`), css);
    absorb(css);
  });
  return { cssVariables, cssVariablesDark, darkScopes: Array.from(darkScopes), cssBreakpoints: Array.from(breakpoints).sort((a, b) => a - b), files: files + inline.filter((c) => c.trim()).length };
}

/** Every named custom property's computed value on the root, in the theme the page is in now. */
async function readComputedVariables(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate((list: string[]) => {
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of list) out[n] = cs.getPropertyValue(n).trim();
    return out;
  }, names);
}

async function main(): Promise<number> {
  mkdirSync(DOCS_DIR, { recursive: true });
  const { context, page } = await openReference(true);
  try {
    await gotoHome(page);
    const state = classifySession(await readSessionSignals(page));
    if (state !== "signed-in") {
      console.error(`session: ${state} — run pnpm recon:login first.`);
      return 1;
    }
    console.log(`Measuring tokens into docs/recon/${stamp}/ (themes: ${themes.join(", ")})`);
    const originalDark = await pageIsDark(page);
    themeRecord.originalWasDark = originalDark;
    const { fonts, bodyFontFamily, bodyBackground: bodyBg } = await readFontsAndBody(page);
    const sheets = await readStylesheets(page);
    console.log(`  ${sheets.files} stylesheet(s): ${Object.keys(sheets.cssVariables).length} light custom properties, ${Object.keys(sheets.cssVariablesDark).length} dark (${sheets.darkScopes.join(", ") || "no dark scope"}), ${sheets.cssBreakpoints.length} media widths`);
    const names = Array.from(new Set([...Object.keys(sheets.cssVariables), ...Object.keys(sheets.cssVariablesDark)]));
    const computed: { light: Record<string, string>; dark: Record<string, string> } = { light: {}, dark: {} };
    let observed: LayoutSignals[] = [];
    for (const theme of themes) {
      await gotoHome(page);
      currentTheme = await setTheme(page, theme, themeRecord, (line) => console.log(`  ${line}`));
      await gotoHome(page);
      computed[theme] = await readComputedVariables(page, names);
      console.log(`— ${theme}: ${Object.keys(computed[theme]).length} computed custom properties on the root`);
      await measureHome(page);
      if (await enterVideoMode(page)) await measureVideoMode(page);
      await measureAssets(page);
      await measureSettings(page);
      await measureHoverSet(page);
      await measurePages(page);
      await measureTaskPage(page);
      await measureNarrow(page);
      if (theme === themes[0]) {
        console.log("  observing layout across widths:");
        observed = await observeLayout(page);
      }
    }
    if (originalDark !== null) {
      await gotoHome(page);
      themeRecord.restored = await restoreAppearance(page, themeRecord).catch(() => false);
    }
    const bodyBackground = bodyBg;
    const familiesUsed = new Map<string, number>();
    for (const e of elements) {
      if (isMissing(e)) continue;
      const family = e.styles["fontFamily"]?.split(",")[0]?.trim() ?? "";
      familiesUsed.set(family, (familiesUsed.get(family) ?? 0) + 1);
    }
    const loaded = new Set(fonts.map((f) => f.family));
    const notes = [
      `Font families actually used on the ${elements.length} measured elements: ${Array.from(familiesUsed.entries()).map(([f, n]) => `\`${f}\` (${n})`).join(", ")}.`,
      ...(loaded.has("Outfit") ? ["Outfit is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element."] : []),
      ...(loaded.has("SourceSerif") ? ["Source Serif is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element."] : []),
      "KaTeX faces come from the maths renderer and are not part of the product's own type system.",
      "The body stack is a system sans-serif stack, so no substitute font is needed for the clone: the same stack renders the same on the owner's Mac.",
      ...(themes.length > 1 ? [`Both themes measured; the reference was found in ${themeRecord.originalWasDark ? "dark" : "light"} and ${themeRecord.restored ? "put back" : "NOT put back — check the user menu"}.`] : []),
    ];
    const tokens = buildTokens({
      date: stamp,
      reference: REFERENCE_URL,
      bodyFontFamily,
      bodyBackground,
      fonts,
      notes,
      cssVariables: sheets.cssVariables,
      cssVariablesDark: sheets.cssVariablesDark,
      darkScopes: sheets.darkScopes,
      ...(themes.length > 1 ? { computedVariables: computed } : {}),
      ...(themeRecord.control || themeRecord.documentAfter
        ? { themeMechanism: { control: themeRecord.control, documentBefore: themeRecord.documentBefore, documentAfter: themeRecord.documentAfter, bodyBackgroundLight: themeRecord.bodyBackgroundLight, bodyBackgroundDark: themeRecord.bodyBackgroundDark } }
        : {}),
      cssBreakpoints: sheets.cssBreakpoints,
      observed,
      elements,
    });
    writeFileSync(path.join(DOCS_DIR, "tokens.json"), `${JSON.stringify(tokens, null, 2)}\n`);
    writeFileSync(path.join(DOCS_DIR, "tokens.md"), renderTokensMarkdown(tokens));
    const missing = elements.filter(isMissing);
    console.log(`Done: ${elements.length - missing.length} elements measured, ${missing.length} missing${missing.length ? ` (${missing.map((m) => `${m.name}@${m.state}`).join(", ")})` : ""}.`);
    return missing.length === 0 ? 0 : 3;
  } finally {
    await context.close();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("recon:tokens failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  },
);
