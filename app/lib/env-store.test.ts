import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EnvKeyError, envFile, envValue, maskedEnv, readEnv, writeEnv } from "./env-store";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "env-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the environment variables store (STORY_035)", () => {
  it("lives beside the history file with mode 600, round-trips, keeps on null, removes what is absent, masks for the browser", () => {
    expect(envFile()).toBe(path.join(dir, "env.json"));
    expect(readEnv()).toEqual({});
    expect(maskedEnv()).toEqual([]);
    expect(writeEnv({ TELEGRAM_BOT_TOKEN: "123:abc", ZED: "z" })).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc", ZED: "z" });
    expect(statSync(envFile()).mode & 0o777).toBe(0o600);
    expect(envValue("TELEGRAM_BOT_TOKEN")).toBe("123:abc");
    expect(envValue("NOPE")).toBeUndefined();
    expect(maskedEnv()).toEqual([{ key: "TELEGRAM_BOT_TOKEN", masked: "••••••••" }, { key: "ZED", masked: "••••••••" }]);
    expect(writeEnv({ TELEGRAM_BOT_TOKEN: null })).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc" }); // kept, ZED removed
    expect(readEnv()).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc" });
    expect(existsSync(`${envFile()}.${String(process.pid)}.tmp`)).toBe(false);
  });

  it("refuses a bad name or a null for nothing stored, and ignores garbage on disk", () => {
    expect(() => writeEnv({ "bad-name": "x" })).toThrow(EnvKeyError);
    expect(() => writeEnv({ NEW: null })).toThrow(/no stored value/);
    expect(readEnv()).toEqual({});
    writeFileSync(envFile(), "not json");
    expect(readEnv()).toEqual({});
    writeFileSync(envFile(), JSON.stringify({ OK: "1", "not ok": "2", NUM: 3 }));
    expect(readEnv()).toEqual({ OK: "1" });
    expect(readFileSync(envFile(), "utf8")).toContain("not ok"); // only a write cleans the file
  });
});
