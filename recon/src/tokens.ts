import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "playwright";
import { dismissAnnouncement, openReference, readSessionSignals, waitForHome } from "./browser.ts";
import { NARROW, WIDE, dateStamp } from "./capture-plan.ts";
import { OUT_DIR, RECON_ROOT, REFERENCE_URL, VIEWPORT } from "./config.ts";
import { classifySession } from "./session.ts";
import {
  boxesEqual,
  buildTokens,
  isMissing,
  parseCssVariables,
  parseMediaBreakpoints,
  renderTokensMarkdown,
  type Box,
  type FontFace,
  type LayoutSignals,
  type Measurement,
  type MissingMeasurement,
} from "./tokens-model.ts";

/**
 * STORY_003: measures the reference's design tokens from computed styles in
 * our own browser. Never clicks Send, never types. Writes tokens.json and
 * tokens.md to docs/recon/<date>/ and the raw stylesheets to recon/out/<date>/css/.
 */

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
const elements: (Measurement | MissingMeasurement)[] = [];

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
      elements.push({ name, state, width, missing: rule ? "no ancestor matched the rule" : "measure API missing" });
      return;
    }
    elements.push({ name, state, width, ...raw, text: mask(raw.text) });
  } catch (error: unknown) {
    const reason = (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown";
    elements.push({ name, state, width, missing: reason });
  }
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
  await measure(page, "promo-card", s, page.getByRole("button", { name: /^download desktop$/i }).nth(1), { maxWidth: 320, minHeight: 200, visual: true });
  await measure(page, "primary-button", s, page.getByRole("button", { name: /^download desktop$/i }).nth(1));
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
  await measure(page, "menu", m, page.getByText(/^hailuo-2\.3$/i), { maxWidth: 500, minHeight: 60, visual: true });
  await measure(page, "menu-item", m, page.getByText(/^hailuo-2\.3$/i));
  await measure(page, "menu-item-selected", m, page.getByText(/^minimax-h3\.0$/i));
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

async function readStylesheets(page: Page): Promise<{ cssVariables: Record<string, string>; cssBreakpoints: number[]; files: number }> {
  const hrefs = await page.locator("link[rel=stylesheet]").evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  mkdirSync(RAW_CSS_DIR, { recursive: true });
  const cssVariables: Record<string, string> = {};
  const breakpoints = new Set<number>();
  let files = 0;
  for (const href of hrefs) {
    const response = await page.request.get(href).catch(() => null);
    if (!response || !response.ok()) continue;
    const css = await response.text();
    files += 1;
    writeFileSync(path.join(RAW_CSS_DIR, `${files}.css`), css);
    for (const [k, v] of Object.entries(parseCssVariables(css))) if (!(k in cssVariables)) cssVariables[k] = v;
    for (const b of parseMediaBreakpoints(css)) breakpoints.add(b);
  }
  return { cssVariables, cssBreakpoints: Array.from(breakpoints).sort((a, b) => a - b), files };
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
    console.log(`Measuring tokens into docs/recon/${stamp}/`);
    const { fonts, bodyFontFamily, bodyBackground } = await readFontsAndBody(page);
    const sheets = await readStylesheets(page);
    console.log(`  ${sheets.files} stylesheet(s): ${Object.keys(sheets.cssVariables).length} custom properties, ${sheets.cssBreakpoints.length} media widths`);
    await measureHome(page);
    if (await enterVideoMode(page)) await measureVideoMode(page);
    await measureAssets(page);
    await measureNarrow(page);
    console.log("  observing layout across widths:");
    const observed = await observeLayout(page);
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
    ];
    const tokens = buildTokens({
      date: stamp,
      reference: REFERENCE_URL,
      bodyFontFamily,
      bodyBackground,
      fonts,
      notes,
      cssVariables: sheets.cssVariables,
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
