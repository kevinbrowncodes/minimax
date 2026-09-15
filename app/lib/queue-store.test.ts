import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { due, enqueue, getQueued, listQueue, markSubmitted, moveQueued, queueFile, removeQueued, replaceQueued, setNotBefore, waiting } from "./queue-store";

let dir = "";
const request = { prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "queue-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("the queue store (STORY_041)", () => {
  it("keeps the line in order beside the history file, numbers the waiting ones, moves, times, submits, removes", () => {
    expect(queueFile()).toBe(path.join(dir, "queue.json"));
    const a = enqueue({ id: "a", request, referenceFiles: [] });
    const b = enqueue({ id: "b", request, referenceFiles: [] });
    const c = enqueue({ id: "c", request, referenceFiles: [], notBefore: "2026-09-16T06:00:00.000Z" });
    expect([a.position, b.position, c.position]).toEqual([1, 2, 3]);
    expect(waiting().map((e) => `${e.id}:${String(e.position)}`)).toEqual(["a:1", "b:2", "c:3"]);
    expect(moveQueued("c", "up")).toBe(true);
    expect(waiting().map((e) => e.id)).toEqual(["a", "c", "b"]);
    expect(moveQueued("a", "up")).toBe(false); // already first: a no-op
    expect(moveQueued("nope", "down")).toBe(false);
    expect(due(new Date("2026-09-16T05:00:00.000Z")).map((e) => e.id)).toEqual(["a", "b"]); // the timed one is skipped, not blocking
    expect(due(new Date("2026-09-16T06:00:00.000Z")).map((e) => e.id)).toEqual(["a", "c", "b"]);
    expect(setNotBefore("c", undefined)?.notBefore).toBeUndefined();
    expect(setNotBefore("b", "2026-09-17T00:00:00.000Z")?.notBefore).toBe("2026-09-17T00:00:00.000Z");
    expect(setNotBefore("nope", undefined)).toBeUndefined();
    expect(markSubmitted("a", "job-1", "2026-09-15T18:00:00.000Z")).toMatchObject({ jobId: "job-1", submittedAt: "2026-09-15T18:00:00.000Z" });
    expect(waiting().map((e) => e.id)).toEqual(["c", "b"]); // a left the waiting line but stays listed
    expect(listQueue().map((e) => e.id)).toEqual(["a", "c", "b"]);
    expect(getQueued("a")).toMatchObject({ jobId: "job-1", position: 0 });
    expect(getQueued("c")?.position).toBe(1);
    expect(replaceQueued("c", { request: { ...request, prompt: "Another boat" } })?.request.prompt).toBe("Another boat");
    expect(replaceQueued("a", { request })).toBeUndefined(); // submitted: no longer editable
    expect(moveQueued("a", "down")).toBe(false);
    expect(removeQueued("b")).toBe(true);
    expect(removeQueued("b")).toBe(false);
    expect(listQueue().map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("holds an extension until its source is done, without blocking the rows behind it (STORY_043)", () => {
    enqueue({ id: "x", request: { ...request, continueFrom: "src" }, referenceFiles: [] });
    enqueue({ id: "y", request, referenceFiles: [] });
    expect(due(new Date(), (id) => id !== "src").map((e) => e.id)).toEqual(["y"]); // src pending: x skipped, y goes
    expect(due(new Date(), () => true).map((e) => e.id)).toEqual(["x", "y"]);
    expect(due().map((e) => e.id)).toEqual(["x", "y"]); // without a lookup a source counts as done
  });

  it("ignores garbage on disk", () => {
    writeFileSync(queueFile(), "nope");
    expect(listQueue()).toEqual([]);
    writeFileSync(queueFile(), JSON.stringify([{ id: "x", request }, { id: 3 }, "y"]));
    expect(listQueue().map((e) => e.id)).toEqual(["x"]);
  });
});
