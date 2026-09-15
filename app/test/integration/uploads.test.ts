/** STORY_032 integration lane: a multipart job keeps its reference images beside the history file; they are served, deleted, and go with the job. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, DEFAULT_FIXTURES_DIR, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteHistory, GET as getHistoryEntry } from "@/app/api/history/[id]/route";
import { DELETE as deleteReference, GET as getReference } from "@/app/api/history/[id]/reference/[n]/route";
import { POST as createJob } from "@/app/api/jobs/route";
import type { HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";

let stub: StubServer;
let dir = "";
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const refCtx = (id: string, n: string) => ({ params: Promise.resolve({ id, n }) });
const fixture = () => readFileSync(`${DEFAULT_FIXTURES_DIR}/fixture-reference.png`);
const png = (name = "ref.png") => new File([fixture()], name, { type: "image/png" });
const multipart = (files: File[]) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(valid)) form.set(k, String(v));
  for (const f of files) form.append("referenceImage", f);
  return new Request("http://app/api/jobs?script=done-after-1-poll", { method: "POST", body: form });
};
const entryOf = async (id: string): Promise<HistoryEntry> => (await (await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).json()) as HistoryEntry;

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  process.env["MODEL_BASE_URL"] = `http://127.0.0.1:${String(await stub.listen(0))}`;
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "uploads-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  stub.reset();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("reference images through the app's routes", () => {
  it("a multipart job records its images, serves each with its type and name, deletes one on its own, and takes the rest with the entry", async () => {
    const res = await createJob(multipart([png("boat sketch.png"), png("second.png")]));
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as CreateJobResponse;
    const entry = await entryOf(id);
    expect(entry.referenceImages).toBe(2);
    expect(entry.referenceFiles).toEqual([
      { n: 1, name: "boat sketch.png", file: "1-boat sketch.png", size: fixture().length, type: "image/png" },
      { n: 2, name: "second.png", file: "2-second.png", size: fixture().length, type: "image/png" },
    ]);
    const stored = path.join(dir, "uploads", id, "1-boat sketch.png");
    expect(readFileSync(stored).equals(fixture())).toBe(true);
    const served = await getReference(new Request(`http://app/api/history/${id}/reference/1`), refCtx(id, "1"));
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("content-disposition")).toContain("inline");
    expect(Buffer.from(await served.arrayBuffer()).equals(fixture())).toBe(true);
    expect((await getReference(new Request(`http://app/api/history/${id}/reference/9`), refCtx(id, "9"))).status).toBe(404);
    expect((await deleteReference(new Request(`http://app/api/history/${id}/reference/1`, { method: "DELETE" }), refCtx(id, "1"))).status).toBe(204);
    expect(existsSync(stored)).toBe(false);
    expect((await entryOf(id)).referenceFiles?.map((r) => r.n)).toEqual([2]);
    expect((await getReference(new Request(`http://app/api/history/${id}/reference/1`), refCtx(id, "1"))).status).toBe(404);
    expect((await deleteReference(new Request(`http://app/api/history/${id}/reference/1`, { method: "DELETE" }), refCtx(id, "1"))).status).toBe(404);
    expect((await deleteHistory(new Request(`http://app/api/history/${id}`, { method: "DELETE" }), ctx(id))).status).toBe(204);
    expect(existsSync(path.join(dir, "uploads", id))).toBe(false);
  });

  it("a JSON job keeps no files and lists none", async () => {
    const res = await createJob(new Request("http://app/api/jobs?script=done-after-1-poll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(valid) }));
    const { id } = (await res.json()) as CreateJobResponse;
    expect((await entryOf(id)).referenceFiles).toBeUndefined();
    expect(existsSync(path.join(dir, "uploads"))).toBe(false);
  });
});
