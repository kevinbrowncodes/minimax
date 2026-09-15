/** STORY_035 integration lane: the environment variables routes — values go in, only keys and a mask come out. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getEnv, PUT as putEnv } from "@/app/api/env/route";

let dir = "";
const put = (body: unknown) => putEnv(new Request("http://app/api/env", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "env-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("environment variables through the app's routes", () => {
  it("PUT stores, GET lists keys with a mask and never a value, null keeps, absence removes, bad input is a 400", async () => {
    expect(await (await getEnv()).json()).toEqual({ vars: [] });
    const saved = await put({ vars: { TELEGRAM_BOT_TOKEN: "123:abc", API_KEY: "k" } });
    expect(saved.status).toBe(200);
    const body = JSON.stringify(await saved.json());
    expect(body).not.toContain("123:abc");
    expect(JSON.parse(body)).toEqual({ vars: [{ key: "API_KEY", masked: "••••••••" }, { key: "TELEGRAM_BOT_TOKEN", masked: "••••••••" }] });
    expect(JSON.stringify(await (await getEnv()).json())).not.toContain("123:abc");
    expect(JSON.parse(readFileSync(path.join(dir, "env.json"), "utf8"))).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc", API_KEY: "k" });
    expect(await (await put({ vars: { TELEGRAM_BOT_TOKEN: null } })).json()).toEqual({ vars: [{ key: "TELEGRAM_BOT_TOKEN", masked: "••••••••" }] });
    expect(JSON.parse(readFileSync(path.join(dir, "env.json"), "utf8"))).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc" });
    for (const bad of [{ vars: { "bad-name": "x" } }, { vars: { NEW: null } }, { vars: { A: 1 } }, { vars: [] }, {}, { vars: null }]) {
      const res = await put(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect((await putEnv(new Request("http://app/api/env", { method: "PUT", body: "nope" }))).status).toBe(400);
    expect(JSON.parse(readFileSync(path.join(dir, "env.json"), "utf8"))).toEqual({ TELEGRAM_BOT_TOKEN: "123:abc" }); // a refused PUT changes nothing
    expect(await (await put({ vars: {} })).json()).toEqual({ vars: [] });
  });
});
