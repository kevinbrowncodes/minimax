/**
 * The environment variables (STORY_035): a key / value file beside the history file (`env.json`, /data in the container),
 * mode 600, written atomically. Server-side only: the browser sees keys and a mask (`GET /api/env`); another server
 * module reads a value through `envValue` (the Telegram bot token first, STORY_039). Plain JSON on the Spark's own
 * disk — the dialog says so (Departures: no encryption).
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore } from "./history-store";
import { MASK, isValidKey, type EnvPut, type MaskedVar } from "./env";

export { KEY_RE, MASK, isValidKey, type EnvPut, type MaskedVar } from "./env";

export function envFile(): string {
  return path.join(path.dirname(historyStore().file), "env.json");
}

export function readEnv(): Readonly<Record<string, string>> {
  let text: string;
  try {
    text = readFileSync(envFile(), "utf8");
  } catch {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, string] => isValidKey(e[0]) && typeof e[1] === "string"));
  } catch {
    return {};
  }
}

export class EnvKeyError extends Error {
  readonly key: string;
  constructor(key: string, message: string) {
    super(message);
    this.key = key;
  }
}

/** Replace the set: a value replaces, null keeps what is stored (an error when nothing is), an absent key removes. */
export function writeEnv(put: EnvPut): Readonly<Record<string, string>> {
  const current = readEnv();
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(put)) {
    if (!isValidKey(key)) throw new EnvKeyError(key, `${key} is not a valid name (A-Z, 0-9 and _, not starting with a digit)`);
    if (value === null) {
      const kept = current[key];
      if (kept === undefined) throw new EnvKeyError(key, `${key} has no stored value to keep`);
      next[key] = kept;
    } else next[key] = value;
  }
  const file = envFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
  chmodSync(file, 0o600);
  return next;
}

/** Another server module's read (never a route). */
export function envValue(key: string): string | undefined {
  return readEnv()[key];
}

export function maskedEnv(vars: Readonly<Record<string, string>> = readEnv()): readonly MaskedVar[] {
  return Object.keys(vars).sort().map((key) => ({ key, masked: MASK }));
}
