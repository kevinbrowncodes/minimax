/** Environment variables (STORY_035) — the pure part the dialog shares with the store: the key rule and the mask. */

/** A shell-style name: upper case, digits and underscores, not starting with a digit. */
export const KEY_RE = /^[A-Z_][A-Z0-9_]*$/;
export const MASK = "••••••••";

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

/** What the browser is told about a stored variable: its key, never its value. */
export interface MaskedVar {
  readonly key: string;
  readonly masked: typeof MASK;
}

/** The PUT body: a value replaces, null keeps the stored one, an absent key removes it. */
export type EnvPut = Readonly<Record<string, string | null>>;
