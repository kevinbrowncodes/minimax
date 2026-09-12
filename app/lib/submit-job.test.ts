import { describe, expect, it, vi } from "vitest";
import { initialComposer, reduceComposer, type ComposerImage, type ComposerState } from "./composer-state";
import type { Capabilities } from "./job-api";
import { buildJobRequest, submitJob } from "./submit-job";

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const typed = (): ComposerState => reduceComposer(reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: caps }), { type: "enter-video-mode" }), { type: "text", text: " A boat " });
const img: ComposerImage = { id: "a", file: new File(["png"], "a.png", { type: "image/png" }), url: "", name: "a.png", type: "image/png", size: 3 };

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

describe("submitJob", () => {
  it("returns the id on 202, the server's message and field on 400, a busy message on 503, and unreachable on a network error", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "j1", status: "queued", progress: 0 }), { status: 202 }));
    expect(await submitJob(typed(), ok)).toEqual({ ok: true, id: "j1" });
    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "unsupported_option", message: "no 2K", field: "resolution" } }), { status: 400 }));
    expect(await submitJob(typed(), bad)).toEqual({ ok: false, status: 400, message: "no 2K", field: "resolution" });
    const busy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "busy", message: "x" } }), { status: 503 }));
    expect(await submitJob(typed(), busy)).toMatchObject({ ok: false, status: 503, message: /busy/ });
    const down = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await submitJob(typed(), down)).toMatchObject({ ok: false, status: 0, message: /could not be reached/ });
  });
});
