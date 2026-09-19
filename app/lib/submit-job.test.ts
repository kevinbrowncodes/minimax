import { describe, expect, it, vi } from "vitest";
import { initialComposer, reduceComposer, type ComposerImage, type ComposerState } from "./composer-state";
import type { Capabilities } from "./job-api";
import { buildJobRequest, submitChain, submitDraws, submitJob } from "./submit-job";

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const typed = (): ComposerState => reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: caps }), { type: "text", text: " A boat " });
const img: ComposerImage = { id: "a", file: new File(["png"], "a.png", { type: "image/png" }), url: "", name: "a.png", type: "image/png", size: 3 };

describe("buildJobRequest with a project (STORY_031)", () => {
  it("posts projectId in JSON and in the multipart fields, and nothing without one", () => {
    const inProject = reduceComposer(typed(), { type: "project", projectId: "p1" });
    const jsonOf = (state: ComposerState): unknown => {
      const body = buildJobRequest(state).init.body;
      return JSON.parse(typeof body === "string" ? body : "{}");
    };
    expect(jsonOf(inProject)).toMatchObject({ projectId: "p1" });
    expect(jsonOf(typed())).not.toHaveProperty("projectId");
    const form = buildJobRequest(reduceComposer(inProject, { type: "add-images", images: [img] })).init.body;
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get("projectId")).toBe("p1");
  });
});

describe("buildJobRequest", () => {
  it("sends JSON without images and multipart with them, forwarding ?script= from the page URL", () => {
    const json = buildJobRequest(typed());
    expect(json.url).toBe("/api/jobs");
    expect(json.init.body).toBe(JSON.stringify({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" }));
    const withImage = buildJobRequest(reduceComposer(typed(), { type: "add-images", images: [img] }));
    expect(withImage.init.body).toBeInstanceOf(FormData);
    expect((withImage.init.body as FormData).getAll("referenceImage")).toHaveLength(1);
    window.history.replaceState(null, "", "/?script=done-after-1-poll");
    expect(buildJobRequest(typed()).url).toBe("/api/jobs?script=done-after-1-poll");
    window.history.replaceState(null, "", "/");
  });
});

describe("buildJobRequest in extend mode (STORY_017)", () => {
  it("always sends JSON with continueFrom and overlapFrames, even after images were attached", () => {
    const withImage = reduceComposer(typed(), { type: "add-images", images: [img] });
    const extending = reduceComposer(reduceComposer(withImage, { type: "extend-from", source: { id: "src", title: "t", durationSeconds: 2, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "/p" } }), { type: "overlap", overlapFrames: 22 });
    const req = buildJobRequest(extending);
    expect(req.url).toBe("/api/jobs");
    expect(req.init.body).toBe(JSON.stringify({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", continueFrom: "src", overlapFrames: 22, endAnchor: "source-last-frame" })); // STORY_061: pinned by default
    const free = buildJobRequest(reduceComposer(extending, { type: "end-anchor", endAnchor: "none" }));
    expect(JSON.parse(free.init.body as string)).toMatchObject({ continueFrom: "src", endAnchor: "none" });
  });
});

describe("buildJobRequest with a run-at time or an Edit (STORY_041)", () => {
  it("posts notBefore and replaces when set, in JSON and in the multipart fields, and nothing otherwise", () => {
    const jsonOf = (state: ComposerState): unknown => {
      const body = buildJobRequest(state).init.body;
      return JSON.parse(typeof body === "string" ? body : "{}");
    };
    const timed = reduceComposer(typed(), { type: "not-before", notBefore: "2026-09-16T06:00:00.000Z" });
    expect(jsonOf(timed)).toMatchObject({ notBefore: "2026-09-16T06:00:00.000Z" });
    expect(jsonOf(typed())).not.toHaveProperty("notBefore");
    const editing: ComposerState = { ...typed(), queueId: "q1" };
    expect(jsonOf(editing)).toMatchObject({ replaces: "q1" });
    const form = buildJobRequest(reduceComposer({ ...timed, queueId: "q1" }, { type: "add-images", images: [img] })).init.body;
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get("notBefore")).toBe("2026-09-16T06:00:00.000Z");
    expect((form as FormData).get("replaces")).toBe("q1");
  });
});

describe("submitJob", () => {
  it("returns the id on 202, the server's message and field on 400, a busy message on 503, and unreachable on a network error", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "j1", status: "queued", progress: 0 }), { status: 202 }));
    expect(await submitJob(typed(), ok)).toEqual({ ok: true, id: "j1" });
    const queued = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "q1", status: "queued", progress: 0, position: 3 }), { status: 202 }));
    expect(await submitJob(typed(), queued)).toEqual({ ok: true, id: "q1", position: 3 }); // STORY_041: the line's position comes back
    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "unsupported_option", message: "no 2K", field: "resolution" } }), { status: 400 }));
    expect(await submitJob(typed(), bad)).toEqual({ ok: false, status: 400, message: "no 2K", field: "resolution" });
    const busy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "busy", message: "ComfyUI is not running on the Spark — start it with spark/comfyui/run.sh" } }), { status: 503 }));
    expect(await submitJob(typed(), busy)).toMatchObject({ ok: false, status: 503, message: /ComfyUI is not running on the Spark/ });
    const bare503 = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    expect(await submitJob(typed(), bare503)).toMatchObject({ ok: false, status: 503, message: /busy/ });
    const down = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await submitJob(typed(), down)).toMatchObject({ ok: false, status: 0, message: /could not be reached/ });
  });
});

describe("a chain's segments (STORY_044)", () => {
  const chainCaps: Capabilities = { ...caps, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 } };
  const ready = (): ComposerState => reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: chainCaps }), { type: "text", text: "Scene\n[0:00-0:03] one\n[0:00-0:03] two" });

  it("buildJobRequest with a segment: the segment's prompt, its images for the first, continueFrom + overlapFrames and no images for an extension", () => {
    const withImage = reduceComposer(ready(), { type: "add-images", images: [img] });
    const first = buildJobRequest(withImage, { prompt: "Scene\n\n[0:00-0:03] one", images: withImage.images, notBefore: "2026-09-16T20:00:00.000Z" });
    expect(first.init.body).toBeInstanceOf(FormData);
    expect((first.init.body as FormData).get("prompt")).toBe("Scene\n\n[0:00-0:03] one");
    expect((first.init.body as FormData).get("notBefore")).toBe("2026-09-16T20:00:00.000Z");
    expect((first.init.body as FormData).get("continueFrom")).toBeNull();
    const next = buildJobRequest(withImage, { prompt: "Scene\n\n[0:00-0:03] two", continueFrom: "j1" });
    expect(next.init.body).toBe(JSON.stringify({ prompt: "Scene\n\n[0:00-0:03] two", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3", continueFrom: "j1", overlapFrames: 39, endAnchor: "source-last-frame" })); // STORY_061: segments 2 and 3 end where they began; the first has no source
    expect((first.init.body as FormData).get("endAnchor")).toBeNull();
  });

  it("submitChain posts in order, each continueFrom the id just answered, the first with the images and the run-at", async () => {
    const state = reduceComposer(reduceComposer(ready(), { type: "add-images", images: [img] }), { type: "not-before", notBefore: "2026-09-16T20:00:00.000Z" });
    const bodies: unknown[] = [];
    let n = 0;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body;
      bodies.push(body instanceof FormData ? Object.fromEntries([...body.entries()].filter(([k]) => k !== "referenceImage")) : JSON.parse(typeof body === "string" ? body : "{}"));
      n += 1;
      return Promise.resolve(new Response(JSON.stringify({ id: `j${String(n)}`, status: "queued", progress: 0, ...(n > 1 ? { position: n - 1 } : {}) }), { status: 202, headers: { "content-type": "application/json" } }));
    }) as unknown as typeof fetch;
    const result = await submitChain(state, ["Scene\n\n[0:00-0:03] one", "Scene\n\n[0:00-0:03] two", "Scene\n\n[0:00-0:03] three"], fetchImpl);
    expect(result).toEqual({ ok: true, ids: ["j1", "j2", "j3"] });
    expect(bodies[0]).toMatchObject({ prompt: "Scene\n\n[0:00-0:03] one", notBefore: "2026-09-16T20:00:00.000Z" });
    expect(bodies[0]).not.toHaveProperty("continueFrom");
    expect(bodies[1]).toMatchObject({ prompt: "Scene\n\n[0:00-0:03] two", continueFrom: "j1", overlapFrames: 39 });
    expect(bodies[1]).not.toHaveProperty("notBefore");
    expect(bodies[2]).toMatchObject({ continueFrom: "j2" });
    // the first went multipart (the image), the rest JSON
    const inits = vi.mocked(fetchImpl).mock.calls.map((c) => c[1]?.body);
    expect(inits[0]).toBeInstanceOf(FormData);
    expect(typeof inits[1]).toBe("string");
  });

  it("submitChain in extend mode makes the first segment an extension of the source; a refusal stops the sequence and says which segment", async () => {
    const extending = reduceComposer(ready(), { type: "extend-from", source: { id: "src", title: "26-09-16-1100", durationSeconds: 5, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "" } });
    let n = 0;
    const fetchImpl = vi.fn(() => {
      n += 1;
      if (n === 3) return Promise.resolve(new Response(JSON.stringify({ error: { code: "unsupported_option", message: "the video is 31 s long; the Spark extends videos up to 30 s", field: "continueFrom" } }), { status: 400, headers: { "content-type": "application/json" } }));
      return Promise.resolve(new Response(JSON.stringify({ id: `j${String(n)}`, status: "queued", progress: 0, position: n }), { status: 202, headers: { "content-type": "application/json" } }));
    }) as unknown as typeof fetch;
    const result = await submitChain(extending, ["a", "b", "c", "d"], fetchImpl);
    expect(result).toEqual({ ok: false, sent: ["j1", "j2"], index: 2, message: "the video is 31 s long; the Spark extends videos up to 30 s", field: "continueFrom" });
    expect(vi.mocked(fetchImpl).mock.calls).toHaveLength(3); // nothing after the refusal
    const firstBody = vi.mocked(fetchImpl).mock.calls[0]?.[1]?.body;
    const first = JSON.parse(typeof firstBody === "string" ? firstBody : "{}") as { continueFrom?: string };
    expect(first.continueFrom).toBe("src");
  });
});

describe("draws per prompt (STORY_055)", () => {
  const collect = (refuseAt?: number) => {
    const bodies: Record<string, unknown>[] = [];
    let n = 0;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body;
      bodies.push(body instanceof FormData ? Object.fromEntries([...body.entries()].filter(([k]) => k !== "referenceImage")) : (JSON.parse(typeof body === "string" ? body : "{}") as Record<string, unknown>));
      n += 1;
      if (n === refuseAt) return Promise.resolve(new Response(JSON.stringify({ error: { code: "validation", message: "prompt is too long", field: "prompt" } }), { status: 400, headers: { "content-type": "application/json" } }));
      return Promise.resolve(new Response(JSON.stringify({ id: `j${String(n)}`, status: "queued", progress: 0, ...(n > 1 ? { position: n - 1 } : {}) }), { status: 202, headers: { "content-type": "application/json" } }));
    }) as unknown as typeof fetch;
    return { bodies, fetchImpl };
  };

  it("posts the same request N times in order — the prompt, the image and the parameters alike, never a seed; replaces only on the first, the run-at on every draw", async () => {
    const state = reduceComposer(reduceComposer(reduceComposer(typed(), { type: "add-images", images: [img] }), { type: "not-before", notBefore: "2026-09-16T20:00:00.000Z" }), { type: "capabilities", capabilities: caps });
    const editing: ComposerState = { ...state, queueId: "q1" };
    const { bodies, fetchImpl } = collect();
    const result = await submitDraws(editing, 3, fetchImpl);
    expect(result).toEqual({ ok: true, ids: ["j1", "j2", "j3"] });
    expect(bodies).toHaveLength(3);
    for (const body of bodies) {
      expect(body).toMatchObject({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: "5", model: "minimax-h3", notBefore: "2026-09-16T20:00:00.000Z" });
      expect(body).not.toHaveProperty("seed");
      expect(body).not.toHaveProperty("continueFrom");
    }
    expect(bodies[0]).toHaveProperty("replaces", "q1");
    expect(bodies[1]).not.toHaveProperty("replaces");
    expect(bodies[2]).not.toHaveProperty("replaces");
    // every draw went multipart with the image
    expect(vi.mocked(fetchImpl).mock.calls.every((c) => c[1]?.body instanceof FormData)).toBe(true);
    expect(vi.mocked(fetchImpl).mock.calls.every((c) => (c[1]?.body as FormData).get("referenceImage") instanceof File)).toBe(true);
  });

  it("a count of 1 posts once and carries the first's position; another prompt can be given (the director's) without touching the state's text", async () => {
    const { bodies, fetchImpl } = collect();
    const one = await submitDraws(typed(), 1, fetchImpl, "For the target video…");
    expect(one).toEqual({ ok: true, ids: ["j1"] });
    expect(bodies[0]).toMatchObject({ prompt: "For the target video…" });
    const { fetchImpl: again } = collect();
    // the position comes from the first draw's 202 (the stub gives none for the first here, n − 1 after)
    const two = await submitDraws(typed(), 2, again);
    expect(two).toEqual({ ok: true, ids: ["j1", "j2"] });
  });

  it("in extend mode every draw extends the same source; a refusal stops the sequence and says which draw", async () => {
    const extending = reduceComposer(typed(), { type: "extend-from", source: { id: "src", title: "26-09-16-1100", durationSeconds: 5, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "" } });
    const { bodies, fetchImpl } = collect(2);
    const result = await submitDraws(extending, 3, fetchImpl);
    expect(result).toEqual({ ok: false, sent: ["j1"], index: 1, message: "prompt is too long", field: "prompt" });
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toMatchObject({ continueFrom: "src", overlapFrames: 39 });
    expect(bodies[1]).toMatchObject({ continueFrom: "src" });
  });
});
