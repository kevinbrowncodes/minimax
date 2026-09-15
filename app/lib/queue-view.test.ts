import { describe, expect, it } from "vitest";
import { filterSections, formatNotBefore, isEmpty, modelNotice, runningLabel, scheduleSections, toLocalInput, waitingLabel, type QueueRow } from "./queue-view";
import type { RecentEntry } from "./route-title";

const now = new Date(2026, 8, 15, 19, 0);
const at = (h: number, m: number, day = 15) => new Date(2026, 8, day, h, m).toISOString();
const queue: QueueRow[] = [
  { id: "w1", position: 1, title: "Same boat, wider", createdAt: at(19, 2), referenceImages: 0 },
  { id: "w2", position: 2, title: "Neon street at night", createdAt: at(19, 5), notBefore: at(2, 0, 16), referenceImages: 1 },
];
const history: RecentEntry[] = [
  { id: "r1", title: "Paper boat on rain puddle", createdAt: at(19, 1), status: "running", progress: 41 },
  { id: "r2", title: "Just submitted", createdAt: at(19, 3), status: "queued", progress: 0 },
  { id: "w1", title: "Same boat, wider", createdAt: at(19, 2), status: "queued", progress: 0 }, // the waiting one's history entry
  { id: "d1", title: "Forest dawn fly-through", createdAt: at(17, 30), finishedAt: at(17, 52), status: "done", progress: 100 },
  { id: "d0", title: "Yesterday's clip", createdAt: at(10, 0, 14), finishedAt: at(10, 30, 14), status: "done", progress: 100 },
  { id: "f1", title: "Failed one", createdAt: at(18, 0), finishedAt: at(18, 5), status: "failed", progress: 40 },
  { id: "c1", title: "Cancelled one", createdAt: at(18, 10), finishedAt: at(18, 12), status: "cancelled", progress: 20 },
];

describe("the Scheduled page's sections (STORY_041)", () => {
  it("splits running (not waiting), waiting, done and failed in the last day", () => {
    const s = scheduleSections(queue, history, now);
    expect(s.running.map((e) => e.id)).toEqual(["r1", "r2"]); // w1 is in the line, not running
    expect(s.waiting.map((e) => e.id)).toEqual(["w1", "w2"]);
    expect(s.done.map((e) => e.id)).toEqual(["d1"]); // d0 is older than a day
    expect(s.failed.map((e) => e.id)).toEqual(["f1", "c1"]);
    expect(isEmpty(s)).toBe(false);
    expect(isEmpty(scheduleSections([], [], now))).toBe(true);
  });

  it("the search narrows every section by title and the filter keeps one", () => {
    const s = scheduleSections(queue, history, now);
    expect(filterSections(s, "boat", "All").waiting.map((e) => e.id)).toEqual(["w1"]);
    expect(filterSections(s, "boat", "All").running.map((e) => e.id)).toEqual(["r1"]);
    const waitingOnly = filterSections(s, "", "Waiting");
    expect(waitingOnly.waiting).toHaveLength(2);
    expect(waitingOnly.running).toEqual([]);
    expect(waitingOnly.done).toEqual([]);
    expect(isEmpty(filterSections(s, "nothing like it", "All"))).toBe(true);
  });

  it("names the waiting row's state: next, waiting, after its source, or not before a time (STORY_041, STORY_043)", () => {
    const [first, second] = queue;
    if (!first || !second) throw new Error("fixture");
    expect(waitingLabel(first, now)).toBe("Waiting · next");
    expect(waitingLabel({ ...first, position: 2 }, now)).toBe("Waiting");
    expect(waitingLabel(second, now)).toBe("Not before Sep 16, 02:00");
    expect(waitingLabel({ ...first, continueFrom: { id: "r1", title: "Paper boat on rain puddle", createdAt: at(19, 1) } }, now)).toBe("Waiting · after 26-09-15-1901");
    expect(waitingLabel({ ...first, continueFrom: { id: "r1", title: "Paper boat on rain puddle" } }, now)).toBe("Waiting · after Paper boat on rain puddle"); // no stamp without a creation time
  });

  it("says why the line waits when the adapter or the model is down, and nothing when both answer (CHORE_011)", () => {
    expect(modelNotice(undefined)).toBeUndefined();
    expect(modelNotice({ adapter: true, comfyui: true })).toBeUndefined();
    expect(modelNotice({ adapter: true, comfyui: false })).toBe("The Spark's model is not running — the line waits; start it with spark/comfyui/run.sh.");
    expect(modelNotice({ adapter: false, comfyui: false })).toMatch(/adapter is not reachable/);
  });

  it("formats the run-at as today's clock or a dated stamp, the input value in local time, and the running label", () => {
    expect(formatNotBefore(at(2, 0), now)).toBe("Not before 02:00");
    expect(formatNotBefore(at(2, 0, 16), now)).toBe("Not before Sep 16, 02:00");
    expect(formatNotBefore(undefined, now)).toBe("");
    expect(formatNotBefore("nope", now)).toBe("");
    expect(toLocalInput(at(2, 5, 16))).toBe("2026-09-16T02:05");
    expect(toLocalInput(undefined)).toBe("");
    expect(runningLabel({ status: "running", progress: 41 })).toBe("Generating 41 %");
    expect(runningLabel({ status: "queued", progress: 0 })).toBe("Queued");
  });
});
