/**
 * The theme choice (STORY_019): `system` follows prefers-color-scheme, `light` and `dark` are explicit. The choice is
 * remembered per browser in localStorage and applied as `data-theme` on the document element, which globals.css keys
 * its dark token set to; `system` clears the attribute so the media query decides. The reference offers the same three
 * choices under Settings › General › Appearance ("Light mode", "Dark mode", "System"; captured 2026-09-14).
 */

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "minimax-local.theme";

/** In the reference's order: Light mode, Dark mode, System. */
export const THEME_CHOICES: readonly { readonly id: ThemeChoice; readonly label: string }[] = [
  { id: "light", label: "Light mode" },
  { id: "dark", label: "Dark mode" },
  { id: "system", label: "System" },
];

export const DEFAULT_CHOICE: ThemeChoice = "system";

/** Anything but the two explicit choices is the default, so a stale or foreign stored value can never break the page. */
export function parseChoice(value: string | null | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : DEFAULT_CHOICE;
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

/** The `data-theme` value for a choice; null means "no attribute" (the system preference decides). */
export function attributeFor(choice: ThemeChoice): ResolvedTheme | null {
  return choice === "system" ? null : choice;
}

export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export function applyChoice(root: ThemeRoot, choice: ThemeChoice): void {
  const value = attributeFor(choice);
  if (value === null) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", value);
}

export interface ChoiceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Reads the stored choice; a missing or unreadable storage (private mode, blocked site data) reads as the default. */
export function readStoredChoice(storage: ChoiceStorage | null | undefined): ThemeChoice {
  try {
    return parseChoice(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_CHOICE;
  }
}

/** Stores an explicit choice; the default is stored as an absence so a fresh browser and a reset one read the same. */
export function storeChoice(storage: ChoiceStorage | null | undefined, choice: ThemeChoice): void {
  try {
    if (choice === DEFAULT_CHOICE) storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // nothing to do: the choice still applies for this page
  }
}

/**
 * Runs inline in the document head before the first paint so a stored choice never flashes the other theme. Written as a
 * plain function so lib/theme.test.ts can call it against jsdom, and serialised to the script tag from its own source;
 * it therefore uses only globals and the literal key (asserted equal to THEME_STORAGE_KEY by the test).
 */
export function themeBoot(): void {
  try {
    const choice = localStorage.getItem("minimax-local.theme");
    if (choice === "light" || choice === "dark") document.documentElement.setAttribute("data-theme", choice);
  } catch {
    // no storage (private mode, blocked site data): the system preference decides
  }
}

export const THEME_BOOT_SCRIPT = `(${themeBoot.toString()})();`;
