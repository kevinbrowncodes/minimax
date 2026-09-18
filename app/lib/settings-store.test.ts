import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, readSettings, settingsFile, writeSettings } from "./settings-store";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "settings-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the server-wide settings (STORY_034)", () => {
  it("default to clean downloads, live beside the history file, round-trip a write, and survive garbage", () => {
    expect(DEFAULT_SETTINGS).toEqual({ removeWatermark: true, agentConfirm: "always", agentDraws: 1 }); // STORY_059 retired STORY_040's videoEnabled
    expect(settingsFile()).toBe(path.join(dir, "settings.json"));
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(writeSettings({ removeWatermark: false })).toEqual({ removeWatermark: false, agentConfirm: "always", agentDraws: 1 });
    expect(readSettings()).toEqual({ removeWatermark: false, agentConfirm: "always", agentDraws: 1 });
    expect(JSON.parse(readFileSync(settingsFile(), "utf8"))).toEqual({ removeWatermark: false, agentConfirm: "always", agentDraws: 1 });
    expect(parseSettings('{"videoEnabled":false}')).toEqual(DEFAULT_SETTINGS); // an old file with STORY_040's key is read without it (STORY_059)
    writeFileSync(settingsFile(), "not json");
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"removeWatermark":"yes"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"agentConfirm":"never","agentSkill":"x"}')).toEqual({ ...DEFAULT_SETTINGS, agentConfirm: "never", agentSkill: "x" }); // STORY_050/051
    expect(parseSettings('{"agentConfirm":"sometimes","agentSkill":""}')).toEqual(DEFAULT_SETTINGS);
    // STORY_055: draws per prompt — 1..4, anything else (5, "2", 0) is the default
    expect(parseSettings('{"agentDraws":3}')).toEqual({ ...DEFAULT_SETTINGS, agentDraws: 3 });
    expect(parseSettings('{"agentDraws":5}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"agentDraws":"2"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"agentDraws":0}')).toEqual(DEFAULT_SETTINGS);
    expect(writeSettings({ agentDraws: 2 })).toMatchObject({ agentDraws: 2 });
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});
