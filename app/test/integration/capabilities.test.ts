/**
 * STORY_047 integration lane: GET /api/capabilities relays the stub's JSON unchanged and merges `agent` — configured
 * with the four variables and a key file present, the reason when the project is unset, the existing 502 when the
 * generation server is down. The key file is a temp file with nothing in it: presence is all the config checks.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/capabilities/route";

let stub: StubServer;
let stubUrl = "";
let dir = "";

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "caps-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json"); // the env store lives beside it; empty here
  process.env["MODEL_BASE_URL"] = stubUrl;
  writeFileSync(path.join(dir, "key.json"), "{}");
  process.env["VERTEX_PROJECT"] = "proj-it";
  process.env["VERTEX_LOCATION"] = "us-central1";
  process.env["VERTEX_MODEL"] = "gemini-it";
  process.env["GOOGLE_APPLICATION_CREDENTIALS"] = path.join(dir, "key.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
  delete process.env["MODEL_BASE_URL"];
  delete process.env["VERTEX_PROJECT"];
  delete process.env["VERTEX_LOCATION"];
  delete process.env["VERTEX_MODEL"];
  delete process.env["GOOGLE_APPLICATION_CREDENTIALS"];
});

describe("GET /api/capabilities with the agent flag", () => {
  it("relays the stub's capabilities unchanged plus agent.configured true and no reason", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown> & { agent: { configured: boolean; reason?: string } };
    const upstream = (await (await fetch(`${stubUrl}/capabilities`)).json()) as Record<string, unknown>;
    const { agent, ...rest } = body;
    expect(rest).toEqual(upstream);
    expect(agent).toEqual({ configured: true });
  });
  it("says why when VERTEX_PROJECT is unset", async () => {
    delete process.env["VERTEX_PROJECT"];
    const body = (await (await GET()).json()) as { agent: { configured: boolean; reason?: string } };
    expect(body.agent.configured).toBe(false);
    expect(body.agent.reason).toContain("VERTEX_PROJECT is not set");
  });
  it("says why when the key file is missing", async () => {
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] = path.join(dir, "absent.json");
    const body = (await (await GET()).json()) as { agent: { configured: boolean; reason?: string } };
    expect(body.agent).toEqual({ configured: false, reason: expect.stringContaining("not mounted at") as string });
  });
  it("keeps the 502 unreachable path when the generation server is down", async () => {
    process.env["MODEL_BASE_URL"] = "http://127.0.0.1:1";
    const res = await GET();
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unreachable");
  });
});
