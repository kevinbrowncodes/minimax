import { describe, expect, it } from "vitest";
import { chainOf, chainRoot, chainView, outcomeLabel, outcomeOf } from "./chain-outcome";
import type { HistoryEntry } from "./history-store";

const e = (id: string, over: Partial<HistoryEntry> = {}): HistoryEntry => ({ id, title: `title ${id}`, prompt: id, params: { ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3" }, referenceImages: 0, createdAt: `2026-09-18T01:00:0${id.length === 2 ? id[1] ?? "0" : "0"}Z`, status: "done", progress: 100, ...over });
const link = (id: string) => ({ id, title: `title ${id}` });
const done = (frames: number, cuts: { frame: number; kind: "cut" | "framing" }[] = []) => ({ url: "", posterUrl: "", mimeType: "video/mp4", frames, durationSeconds: frames / 24, width: 1344, height: 768, sizeBytes: 1, cuts: cuts.map((c) => ({ ...c, seconds: c.frame / 24 })), camera: "static" as const });

describe("outcomeOf (STORY_057)", () => {
  const source = e("s1", { result: done(243) });
  it("reads a done segment's cut at its source's last frame + 1 (give or take one) as cut at the join, any other cut as cut inside, none as done", () => {
    expect(outcomeOf(e("s2", { result: done(498, [{ frame: 243, kind: "cut" }]) }), source)).toBe("cut-at-join");
    expect(outcomeOf(e("s2", { result: done(498, [{ frame: 244, kind: "cut" }]) }), source)).toBe("cut-at-join");
    expect(outcomeOf(e("s2", { result: done(498, [{ frame: 242, kind: "cut" }]) }), source)).toBe("cut-at-join");
    expect(outcomeOf(e("s2", { result: done(498, [{ frame: 300, kind: "cut" }]) }), source)).toBe("cut-inside");
    expect(outcomeOf(e("s2", { result: done(498, [{ frame: 243, kind: "framing" }]) }), source)).toBe("done"); // a framing event is not a cut
    expect(outcomeOf(e("s2", { result: done(498) }), source)).toBe("done");
    expect(outcomeOf(e("s1", { result: done(243, [{ frame: 100, kind: "cut" }]) }), undefined)).toBe("cut-inside"); // no source: no join
  });
  it("a queued segment waits when its source is not done or when it sits in the app's line; running, failed and cancelled read as they are", () => {
    expect(outcomeOf(e("s2", { status: "queued", progress: 0 }), e("s1", { status: "running", progress: 40 }))).toBe("waiting");
    expect(outcomeOf(e("s2", { status: "queued", progress: 0 }), source)).toBe("queued");
    expect(outcomeOf(e("s2", { status: "queued", progress: 0 }), source, true)).toBe("waiting");
    expect(outcomeOf(e("s2", { status: "running", progress: 40 }), source)).toBe("running");
    expect(outcomeOf(e("s2", { status: "failed", progress: 40 }), source)).toBe("failed");
    expect(outcomeOf(e("s2", { status: "cancelled", progress: 0 }), source)).toBe("cancelled");
  });
});

describe("chainOf and chainView", () => {
  const entries = [e("s1", { result: done(243) }), e("s2", { continuesFrom: link("s1"), result: done(498, [{ frame: 243, kind: "cut" }]) }), e("s3", { continuesFrom: link("s2"), status: "queued", progress: 0 }), e("x9")];
  it("finds the same three from any segment, in order, judged against the one before; a clip with no links is a chain of one", () => {
    for (const id of ["s1", "s2", "s3"]) expect(chainOf(entries, id).map((x) => x.id)).toEqual(["s1", "s2", "s3"]);
    expect(chainRoot(entries, "s3")?.id).toBe("s1");
    const view = chainView(entries, "s2");
    expect(view.map((s) => [s.index, s.outcome])).toEqual([[1, "done"], [2, "cut-at-join"], [3, "queued"]]);
    expect(chainView(entries, "s2", (id) => id === "s3").map((s) => s.outcome)).toEqual(["done", "cut-at-join", "waiting"]);
    expect(chainView(entries, "x9")).toHaveLength(1);
    expect(chainOf(entries, "nope")).toEqual([]);
  });
  it("after a Retry chain the redraw's branch is the chain — the cancelled old links are not rows; a loop does not hang", () => {
    const forked = [...entries.slice(0, 2), e("s3", { continuesFrom: link("s2"), status: "cancelled", progress: 0 }), e("r2", { continuesFrom: link("s1"), status: "running", progress: 10, createdAt: "2026-09-18T02:00:00Z" }), e("r3", { continuesFrom: link("r2"), status: "queued", progress: 0, createdAt: "2026-09-18T02:00:01Z" })];
    expect(chainOf(forked, "r2").map((x) => x.id)).toEqual(["s1", "s2", "r2", "r3"]); // the bad s2 stays a row (done, cut at the join) until cancelled; the old s3 does not
    expect(chainOf(forked, "s3").map((x) => x.id)).toEqual(["s1", "s2", "r2", "r3"]);
    // BUG_012: the redraw r2 continues s1 (243 frames), not the row before it — a cut at 243 is a cut at ITS join; r3 waits after r2, not after 3
    const forkedCut = [...forked.slice(0, 3), e("r2", { continuesFrom: link("s1"), result: done(498, [{ frame: 243, kind: "cut" }]), createdAt: "2026-09-18T02:00:00Z" }), e("r3", { continuesFrom: link("r2"), status: "queued", progress: 0, createdAt: "2026-09-18T02:00:01Z" })];
    const view = chainView(forkedCut, "r2", (id) => id === "r3");
    expect(view.map((s) => [s.id, s.outcome, s.sourceIndex])).toEqual([["s1", "done", undefined], ["s2", "cut-at-join", 1], ["r2", "cut-at-join", 1], ["r3", "waiting", 3]]);
    expect(outcomeLabel(view[3] as (typeof view)[number], view)).toBe("waiting · after 3");
    const loop = [e("a", { continuesFrom: link("b") }), e("b", { continuesFrom: link("a") })];
    expect(chainRoot(loop, "a")).toBeDefined();
  });
  it("labels: waiting names the segment before, running carries its percentage, the cuts read in words", () => {
    const view = chainView(entries, "s3", (id) => id === "s3");
    expect(view.map((s) => outcomeLabel(s, view))).toEqual(["done", "cut at the join", "waiting · after 2"]);
    expect(view.map((s) => s.sourceIndex)).toEqual([undefined, 1, 2]);
    expect(outcomeLabel({ id: "r", index: 1, title: "t", status: "running", progress: 42.4, outcome: "running" }, [])).toBe("running · 42 %");
    expect(outcomeLabel({ id: "r", index: 1, title: "t", status: "queued", progress: 0, outcome: "waiting" }, [])).toBe("waiting");
    expect(outcomeLabel({ id: "r", index: 2, title: "t", status: "done", progress: 100, outcome: "cut-inside" }, [])).toBe("cut inside");
  });
});
