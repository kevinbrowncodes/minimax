/** STORY_014 integration lane: the history routes and the jobs routes' recording, against a temp HISTORY_FILE and the in-process stub. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteHistory, GET as getHistoryEntry, PATCH as patchHistory } from "@/app/api/history/[id]/route";
import { GET as listHistory } from "@/app/api/history/route";
import { DELETE as cancelJob, GET as getJob } from "@/app/api/jobs/[id]/route";
import { POST as createJob } from "@/app/api/jobs/route";
import type { HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";

const valid = { prompt: "A small paper boat drifting across a rain puddle in soft morning light, gentle ripples", ratio: "16:9", resolution: "768P", durationSeconds: 5 };
let stub: StubServer;
let dir: string;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (path: string, body: unknown, method = "POST") => new Request(`http://app${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  process.env["MODEL_BASE_URL"] = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "history-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  stub.reset();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("history through the app's routes", () => {
  it("POST /api/jobs writes the entry before answering, with the title rule and the params", async () => {
    const res = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid));
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as CreateJobResponse;
    const onDisk = JSON.parse(readFileSync(process.env["HISTORY_FILE"] ?? "", "utf8")) as HistoryEntry[];
    expect(onDisk.map((e) => e.id)).toEqual([id]);
    const entry = (await (await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).json()) as HistoryEntry;
    expect(entry).toMatchObject({ id, title: "A small paper boat drifting across a rain puddle…", status: "queued", progress: 0, referenceImages: 0, params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" } });
    const list = (await (await listHistory()).json()) as { entries: HistoryEntry[] };
    expect(list.entries).toHaveLength(1);
  });

  it("a rejected create writes nothing", async () => {
    const res = await createJob(jsonRequest("/api/jobs", { ...valid, resolution: "2K" }));
    expect(res.status).toBe(400);
    expect(((await (await listHistory()).json()) as { entries: unknown[] }).entries).toEqual([]);
  });

  it("GET /api/jobs/:id records status, progress, result and finishedAt; DELETE records cancelled", async () => {
    const { id } = (await (await createJob(jsonRequest("/api/jobs?script=done-after-3-polls", valid))).json()) as CreateJobResponse;
    await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id));
    let entry = (await (await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).json()) as HistoryEntry;
    expect(entry).toMatchObject({ status: "running", progress: 33 });
    await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id));
    await getJob(new Request(`http://app/api/jobs/${id}`), ctx(id));
    entry = (await (await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).json()) as HistoryEntry;
    expect(entry).toMatchObject({ status: "done", progress: 100, result: { mimeType: "video/mp4" } });
    expect(entry.finishedAt).toBeDefined();

    const { id: c } = (await (await createJob(jsonRequest("/api/jobs?script=cancel-midway", valid))).json()) as CreateJobResponse;
    await getJob(new Request(`http://app/api/jobs/${c}`), ctx(c));
    const cancel = await cancelJob(new Request(`http://app/api/jobs/${c}`, { method: "DELETE" }), ctx(c));
    expect(cancel.status).toBe(202);
    const cancelled = (await (await getHistoryEntry(new Request(`http://app/api/history/${c}`), ctx(c))).json()) as HistoryEntry;
    expect(cancelled).toMatchObject({ status: "cancelled" });
    expect(cancelled.finishedAt).toBeDefined();
    // the sidebar's order: newest first
    const list = (await (await listHistory()).json()) as { entries: HistoryEntry[] };
    expect(list.entries.map((e) => e.id)).toEqual([c, id]);
  });

  it("PATCH sets openedAt and refuses other fields; DELETE forgets the entry; unknown ids are 404", async () => {
    const { id } = (await (await createJob(jsonRequest("/api/jobs", valid))).json()) as CreateJobResponse;
    const patched = await patchHistory(jsonRequest(`/api/history/${id}`, { openedAt: "2026-09-12T20:00:00Z" }, "PATCH"), ctx(id));
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as HistoryEntry).openedAt).toBe("2026-09-12T20:00:00Z");
    const refused = await patchHistory(jsonRequest(`/api/history/${id}`, { status: "done" }, "PATCH"), ctx(id));
    expect(refused.status).toBe(400);
    // STORY_029: a title is trimmed and never blank; pinned is a boolean that stamps and clears pinnedAt
    const renamed = (await (await patchHistory(jsonRequest(`/api/history/${id}`, { title: "  Renamed boat  " }, "PATCH"), ctx(id))).json()) as HistoryEntry;
    expect(renamed.title).toBe("Renamed boat");
    expect((await patchHistory(jsonRequest(`/api/history/${id}`, { title: "   " }, "PATCH"), ctx(id))).status).toBe(400);
    const pinned = (await (await patchHistory(jsonRequest(`/api/history/${id}`, { pinned: true }, "PATCH"), ctx(id))).json()) as HistoryEntry;
    expect(pinned.pinned).toBe(true);
    expect(typeof pinned.pinnedAt).toBe("string");
    expect((await patchHistory(jsonRequest(`/api/history/${id}`, { pinned: "x" }, "PATCH"), ctx(id))).status).toBe(400);
    const unpinned = (await (await patchHistory(jsonRequest(`/api/history/${id}`, { pinned: false }, "PATCH"), ctx(id))).json()) as HistoryEntry;
    expect(unpinned.pinned).toBe(false);
    expect(unpinned.pinnedAt).toBeUndefined();
    expect(((await (await listHistory()).json()) as { entries: HistoryEntry[] }).entries.find((e) => e.id === id)?.title).toBe("Renamed boat");
    expect((await deleteHistory(new Request(`http://app/api/history/${id}`, { method: "DELETE" }), ctx(id))).status).toBe(204);
    expect((await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).status).toBe(404);
    expect((await deleteHistory(new Request(`http://app/api/history/${id}`, { method: "DELETE" }), ctx(id))).status).toBe(404);
    expect((await patchHistory(jsonRequest(`/api/history/nope`, { openedAt: "x" }, "PATCH"), ctx("nope"))).status).toBe(404);
  });
});
