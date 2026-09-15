import { describe, expect, it, vi } from "vitest";
import { initialComposer, reduceComposer, type ComposerImage, type ComposerState } from "./composer-state";
import type { Capabilities } from "./job-api";
import { buildJobRequest, submitJob } from "./submit-job";

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const typed = (): ComposerState => reduceComposer(reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: caps }), { type: "enter-video-mode" }), { type: "text", text: " A boat " });
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
    expect(req.init.body).toBe(JSON.stringify({ prompt: "A boat", ratio: "16:9", resolution: "768P", durationSeconds: 10, model: "minimax-h3", continueFrom: "src", overlapFrames: 22 }));
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
