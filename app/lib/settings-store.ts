/**
 * The server-wide settings (STORY_034): a JSON file beside the history file (`settings.json`; /data in the container),
 * read on every call and written atomically. Today one setting — whether downloads are clean (the reference's
 * `update_water_mark_setting`); the default is the owner's reference account as found: on.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore } from "./history-store";
import { parseSettings, type Settings } from "./settings";

export { DEFAULT_SETTINGS, parseSettings, type Settings } from "./settings";

export function settingsFile(): string {
  return path.join(path.dirname(historyStore().file), "settings.json");
}

export function readSettings(): Settings {
  let raw: string | undefined;
  try {
    raw = readFileSync(settingsFile(), "utf8");
  } catch {
    raw = undefined;
  }
  return parseSettings(raw);
}

export function writeSettings(patch: Partial<Settings>): Settings {
  const next: Settings = { ...readSettings(), ...patch };
  const file = settingsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, file);
  return next;
}
