import type { Page } from "playwright";
import { isDarkBackground, type Theme } from "./capture-plan.ts";

/**
 * STORY_018: switching the reference between its themes from our own browser, and recording how. Shared by the
 * capture and the tokens runs so both switch the same way and report the same mechanism.
 */

/** The reference's Appearance setting (Settings › General › Appearance, observed 2026-09-14): Light mode, Dark mode, System. */
export type Appearance = "light" | "dark" | "system";

export type ThemeMechanismRecord = {
  control: string;
  documentBefore: string;
  documentAfter: string;
  bodyBackgroundLight: string;
  bodyBackgroundDark: string;
  originalWasDark: boolean | null;
  /** Which Appearance option was selected when the run began, so the end of the run can put it back. */
  originalChoice: Appearance | null;
  /** Whether `control` describes a switch that actually changed the theme. */
  controlChanged: boolean;
  restored: boolean;
};

export function emptyThemeRecord(): ThemeMechanismRecord {
  return { control: "", documentBefore: "", documentAfter: "", bodyBackgroundLight: "", bodyBackgroundDark: "", originalWasDark: null, originalChoice: null, controlChanged: false, restored: false };
}

const mask = (text: string): string => text.replace(/MiniMax\d{4,}/g, "Owner");

/** The document element's attributes, its computed color-scheme and the body's class — what a theme switch changes. */
export async function documentSignature(page: Page): Promise<string> {
  return page
    .evaluate(() => {
      const root = document.documentElement;
      const attrs = Array.from(root.attributes).map((a) => `${a.name}="${a.value}"`).join(" ");
      const scheme = getComputedStyle(root).colorScheme;
      return `<html ${attrs}> color-scheme:${scheme} body.class="${document.body.className}"`;
    })
    .catch(() => "");
}

export async function bodyBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor).catch(() => "");
}

export async function pageIsDark(page: Page): Promise<boolean | null> {
  return isDarkBackground(await bodyBackground(page));
}

/** The footer chip: the display name (already masked to "Owner" once a capture has rewritten this page's text). */
export const userChip = (page: Page) => page.getByText(/^(MiniMax\d{4,}|Owner)$/).first();

export async function openUserMenu(page: Page): Promise<boolean> {
  const chip = userChip(page);
  if (!(await chip.isVisible().catch(() => false))) return false;
  await chip.click({ timeout: 10_000 });
  await page.waitForTimeout(800);
  return true;
}

const APPEARANCE_LABEL: Record<Appearance, RegExp> = { light: /^light mode$/i, dark: /^dark mode$/i, system: /^system$/i };

const appearanceHeading = (page: Page) => page.getByRole("heading", { name: /^appearance$/i }).or(page.getByText(/^appearance$/i)).first();
/** The Settings modal is open whenever its section nav is on screen (General / Account / Usage / Archived tasks), whichever section shows. */
const settingsNav = (page: Page) => page.getByRole("button", { name: /^archived tasks$/i }).first();

export async function settingsOpen(page: Page): Promise<boolean> {
  return settingsNav(page).isVisible().catch(() => false);
}

/** User menu › Settings › General; true once the Appearance section is visible. */
export async function openSettings(page: Page): Promise<boolean> {
  if (!(await settingsOpen(page))) {
    if (!(await openUserMenu(page))) return false;
    const settings = page.getByText(/^settings$/i).first();
    if (!(await settings.isVisible().catch(() => false))) {
      await page.keyboard.press("Escape");
      return false;
    }
    await settings.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
  }
  if (!(await appearanceHeading(page).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /^general$/i }).first().click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
  return appearanceHeading(page).isVisible().catch(() => false);
}

/** Escape first; the modal's icon-only close beside its title as the fallback; throws if it is still open. */
export async function closeSettings(page: Page): Promise<void> {
  for (let i = 0; i < 2 && (await settingsOpen(page)); i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  if (!(await settingsOpen(page))) return;
  // The modal's own close. At 1440 it is a centred dialog with an icon-only × beside its title; at 390 it is a bottom
  // sheet with no close control that a tap on the backdrop above it dismisses (both observed 2026-09-14).
  const close = await page
    .evaluate(() => {
      const nav = Array.from(document.querySelectorAll("button")).find((b) => /^archived tasks$/i.test((b.textContent || "").trim()));
      let modal: HTMLElement | null = nav?.parentElement ?? null;
      while (modal && (modal.getBoundingClientRect().width < Math.min(800, window.innerWidth * 0.8) || modal.getBoundingClientRect().height < 300)) modal = modal.parentElement;
      if (!modal || modal === document.body) return null;
      const m = modal.getBoundingClientRect();
      if (m.width < 800) return { kind: "backdrop" as const, x: window.innerWidth / 2, y: Math.max(8, m.y / 3) };
      let best: { x: number; y: number; score: number } | null = null;
      for (const e of Array.from(modal.querySelectorAll("button, [role=button]"))) {
        if ((e.textContent || "").trim()) continue;
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.y > m.y + 80) continue;
        const score = (m.right - r.right) + (r.y - m.y);
        if (!best || score < best.score) best = { x: r.x + r.width / 2, y: r.y + r.height / 2, score };
      }
      return best ? { kind: "close" as const, x: best.x, y: best.y } : null;
    })
    .catch(() => null);
  if (close) {
    await page.mouse.click(close.x, close.y);
    await page.waitForTimeout(700);
  }
  if (await settingsOpen(page)) throw new Error("Settings modal still open after Escape and its close control");
}

/**
 * Which Appearance option is selected: the option whose preview card carries the accent-coloured border (observed
 * 2026-09-14: the chosen card is outlined in blue, the others in a light grey). Null when it cannot be told.
 */
export async function readAppearance(page: Page): Promise<Appearance | null> {
  return page
    .evaluate(() => {
      const labels: [string, RegExp][] = [
        ["light", /^light mode$/i],
        ["dark", /^dark mode$/i],
        ["system", /^system$/i],
      ];
      const accent = (color: string) => {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
        if (!m) return false;
        const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return Math.max(r, g, b) - Math.min(r, g, b) > 60; // a saturated colour, not a grey
      };
      const all = Array.from(document.querySelectorAll("span, div, p, label"));
      let best: { name: string; score: number } | null = null;
      for (const [name, re] of labels) {
        const label = all.find((e) => re.test((e.textContent || "").trim()) && e.children.length === 0);
        if (!label) continue;
        // Walk up until the container is wide enough to hold the preview card, then look for an accent border inside it.
        let node: HTMLElement | null = label.parentElement;
        for (let up = 0; node && up < 5; up += 1) {
          const width = node.getBoundingClientRect().width;
          if (width >= 150) break;
          node = node.parentElement;
        }
        if (!node) continue;
        const bordered = Array.from(node.querySelectorAll("*")).some((e) => {
          const cs = getComputedStyle(e);
          return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && accent(cs.borderTopColor);
        }) || (() => { const cs = getComputedStyle(node); return parseFloat(cs.borderTopWidth) > 0 && accent(cs.borderTopColor); })();
        if (bordered && (!best || best.score < 1)) best = { name, score: 1 };
      }
      return (best?.name as "light" | "dark" | "system" | undefined) ?? null;
    })
    .catch(() => null);
}

export async function chooseAppearance(page: Page, choice: Appearance): Promise<void> {
  const label = page.getByText(APPEARANCE_LABEL[choice]).first();
  await label.waitFor({ state: "visible", timeout: 5_000 });
  await label.click({ timeout: 5_000 });
  await page.waitForTimeout(900);
}

/**
 * Switches the reference to `theme` through Settings › General › Appearance (the reference's own control, observed
 * 2026-09-14), falling back to emulating prefers-color-scheme if that section cannot be reached. Verified by the body
 * background's luminance; the control's wording, the original choice and the document's attributes before and after go
 * into `record`. Returns the current theme.
 */
export async function setTheme(page: Page, theme: Theme, record: ThemeMechanismRecord, log: (line: string) => void = () => undefined): Promise<Theme> {
  const wantDark = theme === "dark";
  const before = await documentSignature(page);
  let control = "";
  let changed = false;
  if (await openSettings(page)) {
    const current = await readAppearance(page);
    if (record.originalChoice === null) record.originalChoice = current;
    if (current !== theme) {
      await chooseAppearance(page, theme);
      changed = true;
    }
    control = `Settings › General › Appearance › "${theme === "dark" ? "Dark mode" : "Light mode"}"${current ? ` (was "${current}")` : ""}`;
    await closeSettings(page);
    await page.waitForTimeout(500);
  }
  if ((await pageIsDark(page)) !== wantDark) {
    await page.emulateMedia({ colorScheme: theme });
    await page.waitForTimeout(800);
    if ((await pageIsDark(page)) !== wantDark) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(2_000);
    }
    control = control ? `${control} (did not take; then emulated prefers-color-scheme: ${theme})` : `Settings not reachable; emulated prefers-color-scheme: ${theme}`;
  }
  const after = await documentSignature(page);
  const nowDark = await pageIsDark(page);
  if (nowDark !== wantDark) throw new Error(`theme did not switch to ${theme} (body background ${await bodyBackground(page)})`);
  // The record keeps the wording of the first switch that changed something (a no-op says nothing about the control).
  if (!record.control || (changed && !record.controlChanged)) {
    record.control = control;
    record.controlChanged = changed;
  }
  if (!record.documentBefore) record.documentBefore = before;
  if (wantDark) {
    record.documentAfter = after;
    record.bodyBackgroundDark = await bodyBackground(page);
  } else {
    record.bodyBackgroundLight = await bodyBackground(page);
  }
  log(`theme → ${theme} via ${control || "already"}`);
  return theme;
}

/** Puts the Appearance setting back to what the run found (light, dark or system); true when verified. */
export async function restoreAppearance(page: Page, record: ThemeMechanismRecord): Promise<boolean> {
  const choice = record.originalChoice ?? (record.originalWasDark ? "dark" : "light");
  if (!(await openSettings(page))) return false;
  await chooseAppearance(page, choice).catch(() => undefined);
  const now = await readAppearance(page);
  await closeSettings(page);
  await page.emulateMedia({ colorScheme: null }).catch(() => undefined);
  return now === choice;
}
