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
    expect(DEFAULT_SETTINGS).toEqual({ removeWatermark: true, videoEnabled: true, agentConfirm: "always" }); // videoEnabled: STORY_040
    expect(settingsFile()).toBe(path.join(dir, "settings.json"));
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(writeSettings({ removeWatermark: false })).toEqual({ removeWatermark: false, videoEnabled: true, agentConfirm: "always" });
    expect(readSettings()).toEqual({ removeWatermark: false, videoEnabled: true, agentConfirm: "always" });
    expect(JSON.parse(readFileSync(settingsFile(), "utf8"))).toEqual({ removeWatermark: false, videoEnabled: true, agentConfirm: "always" });
    expect(writeSettings({ videoEnabled: false })).toEqual({ removeWatermark: false, videoEnabled: false, agentConfirm: "always" });
    expect(parseSettings('{"videoEnabled":false}')).toEqual({ removeWatermark: true, videoEnabled: false, agentConfirm: "always" });
    writeFileSync(settingsFile(), "not json");
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"removeWatermark":"yes"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"agentConfirm":"never","agentSkill":"x"}')).toEqual({ ...DEFAULT_SETTINGS, agentConfirm: "never", agentSkill: "x" }); // STORY_050/051
    expect(parseSettings('{"agentConfirm":"sometimes","agentSkill":""}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});
