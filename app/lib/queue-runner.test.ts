import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { historyStore } from "./history-store";
import { submitDue, upstreamFields, upstreamJobId } from "./queue-runner";
import { enqueue, listQueue, waiting } from "./queue-store";

let dir = "";
const request = { prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", projectId: "p1", script: "done-after-1-poll" };
const params = { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "runner-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  for (const id of ["a", "b", "c"]) historyStore().create({ id, prompt: `${id} boat`, params, referenceImages: 0 });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the queue runner (STORY_041)", () => {
  it("sends the model server only its own fields, naming a source by the server's job id (BUG_007)", () => {
    expect(upstreamFields(request)).toEqual({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" });
    expect(upstreamFields({ ...request, continueFrom: "src", overlapFrames: 39 })).toMatchObject({ continueFrom: "src", overlapFrames: 39 }); // a source created directly keeps its id
    historyStore().patch("a", { jobId: "job-a" });
    expect(upstreamFields({ ...request, continueFrom: "a" })).toMatchObject({ continueFrom: "job-a" }); // a source that went through the queue is named by the server's id
  });

  it("submits the due requests in line order, stops at busy, skips a timed one, and records the model server's id", async () => {
    enqueue({ id: "a", request, referenceFiles: [] });
    enqueue({ id: "b", request, referenceFiles: [], notBefore: "2026-09-16T06:00:00.000Z" });
    enqueue({ id: "c", request, referenceFiles: [] });
    const sent: string[] = [];
    let accepts = 1;
    const submit = vi.fn((entry: { id: string }) => {
      sent.push(entry.id);
      if (accepts > 0) {
        accepts -= 1;
        return Promise.resolve(json({ id: `job-${entry.id}`, status: "queued", progress: 0 }, 202));
      }
      return Promise.resolve(json({ error: { code: "busy", message: "full" } }, 503));
    });
    expect(await submitDue({ now: new Date("2026-09-15T18:00:00.000Z"), submit })).toBe(1);
    expect(sent).toEqual(["a", "c"]); // b is timed: skipped, c tried next, refused as busy, the line waits
    expect(waiting().map((e) => e.id)).toEqual(["b", "c"]);
    expect(historyStore().get("a")).toMatchObject({ jobId: "job-a", status: "queued" });
    expect(upstreamJobId("a")).toBe("job-a");
    expect(upstreamJobId("c")).toBe("c");
    accepts = 5;
    expect(await submitDue({ now: new Date("2026-09-16T07:00:00.000Z"), submit })).toBe(2);
    expect(waiting()).toEqual([]);
    expect(listQueue().every((e) => e.jobId !== undefined)).toBe(true);
  });

  it("fails a request the server refuses for a reason of its own, leaves the line on unreachable, and runs once at a time", async () => {
    enqueue({ id: "a", request, referenceFiles: [] });
    enqueue({ id: "b", request, referenceFiles: [] });
    // a is refused for its own reason (it leaves the line, the runner moves on); b then meets a busy server (the line waits)
    const refuse = vi.fn((entry: { id: string }) => Promise.resolve(entry.id === "a" ? json({ error: { code: "validation", message: "prompt is empty" } }, 400) : json({ error: { code: "busy", message: "full" } }, 503)));
    expect(await submitDue({ submit: refuse })).toBe(0);
    expect(refuse).toHaveBeenCalledTimes(2);
    expect(historyStore().get("a")).toMatchObject({ status: "failed", error: { code: "validation", message: "prompt is empty" } });
    expect(waiting().map((e) => e.id)).toEqual(["b"]); // a left the line; b still waits
    const down = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(await submitDue({ submit: down })).toBe(0);
    expect(waiting().map((e) => e.id)).toEqual(["b"]); // unreachable: the line waits
    let resolve: ((value: Response) => void) | undefined;
    const slow = vi.fn(() => new Promise<Response>((r) => { resolve = r; }));
    const first = submitDue({ submit: slow });
    const second = submitDue({ submit: slow });
    expect(second).toBe(first); // the same run, not a second
    resolve?.(json({ id: "job-b", status: "queued", progress: 0 }, 202));
    expect(await first).toBe(1);
    expect(slow).toHaveBeenCalledTimes(1);
  });
});
