/** STORY_034 integration lane: the settings routes, and the download that asks the model server for the marked copy when the switch is off. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getJob } from "@/app/api/jobs/[id]/route";
import { GET as getResult } from "@/app/api/jobs/[id]/result/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";
import type { CreateJobResponse } from "@/lib/job-api";

let stub: StubServer;
let dir = "";
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (p: string, body: unknown, method = "POST") => new Request(`http://app${p}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const settingsOf = async (): Promise<unknown> => (await getSettings()).json();

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  process.env["MODEL_BASE_URL"] = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "settings-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  stub.reset();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("settings through the app's routes", () => {
  it("GET defaults to clean downloads; PATCH flips the switch and refuses anything else", async () => {
    expect(await settingsOf()).toEqual({ removeWatermark: true, videoEnabled: true });
    const off = await patchSettings(jsonRequest("/api/settings", { removeWatermark: false }, "PATCH"));
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ removeWatermark: false, videoEnabled: true });
    expect(await settingsOf()).toEqual({ removeWatermark: false, videoEnabled: true });
    expect(await (await patchSettings(jsonRequest("/api/settings", { videoEnabled: false }, "PATCH"))).json()).toEqual({ removeWatermark: false, videoEnabled: false }); // STORY_040
    expect((await patchSettings(jsonRequest("/api/settings", { videoEnabled: "off" }, "PATCH"))).status).toBe(400);
    expect((await patchSettings(jsonRequest("/api/settings", { removeWatermark: "no" }, "PATCH"))).status).toBe(400);
    expect((await patchSettings(jsonRequest("/api/settings", { other: true }, "PATCH"))).status).toBe(400);
    expect((await patchSettings(jsonRequest("/api/settings", {}, "PATCH"))).status).toBe(400);
    expect((await patchSettings(new Request("http://app/api/settings", { method: "PATCH", body: "nope" }))).status).toBe(400);
    expect(await settingsOf()).toEqual({ removeWatermark: false, videoEnabled: false });
  });

  it("with the switch off a download asks for the marked copy (the stub says x-watermark: 1); playback and a clean setting never do", async () => {
    const { id } = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid))).json()) as CreateJobResponse;
    await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id)); // one poll: the stub's job is done
    const clean = await getResult(new Request(`http://app/api/jobs/${id}/result?download`), ctx(id));
    expect(clean.status).toBe(200);
    expect(clean.headers.get("x-watermark")).toBeNull();
    await patchSettings(jsonRequest("/api/settings", { removeWatermark: false }, "PATCH"));
    const marked = await getResult(new Request(`http://app/api/jobs/${id}/result?download`), ctx(id));
    expect(marked.status).toBe(200);
    expect(marked.headers.get("x-watermark")).toBe("1");
    expect(marked.headers.get("content-disposition")).toContain("attachment"); // BUG_004 still names the file
    const playback = await getResult(new Request(`http://app/api/jobs/${id}/result`), ctx(id));
    expect(playback.headers.get("x-watermark")).toBeNull();
    const ranged = await getResult(new Request(`http://app/api/jobs/${id}/result?download`, { headers: { range: "bytes=0-9" } }), ctx(id));
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("x-watermark")).toBe("1");
  });
});
