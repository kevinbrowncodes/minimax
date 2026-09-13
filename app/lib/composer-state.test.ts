import { describe, expect, it } from "vitest";
import type { Capabilities } from "./job-api";
import { canSend, contextOptions, durationOptions, initialComposer, isModelEnabled, isResolutionEnabled, paramsLabel, reduceComposer, type ComposerImage, type ComposerState, type ExtendSource } from "./composer-state";

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const img = (id: string, type = "image/png", size = 1000): ComposerImage => ({ id, file: new File(["x"], `${id}.png`, { type }), url: "", name: `${id}.png`, type, size });
const ready = (): ComposerState => reduceComposer(initialComposer(), { type: "capabilities", capabilities: caps });

describe("reduceComposer", () => {
  it("takes model and resolution from capabilities and keeps the reference's ratio and duration defaults", () => {
    const s = ready();
    expect(s).toMatchObject({ model: "minimax-h3", resolution: "768P", ratio: "16:9", durationSeconds: 5 });
    expect(paramsLabel(s)).toBe("16:9 768P 5s");
    expect(durationOptions(s)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("enters and leaves video mode, clearing images on leave", () => {
    let s = reduceComposer(ready(), { type: "enter-video-mode" });
    s = reduceComposer(s, { type: "add-images", images: [img("a")] });
    expect(s.images).toHaveLength(1);
    s = reduceComposer(s, { type: "leave-video-mode" });
    expect(s).toMatchObject({ mode: "text", images: [] });
  });

  it("refuses a third image, a gif and an oversize file with the validation message and field", () => {
    let s = reduceComposer(ready(), { type: "add-images", images: [img("a"), img("b")] });
    expect(s.images).toHaveLength(2);
    const third = reduceComposer(s, { type: "add-images", images: [img("c")] });
    expect(third.images).toHaveLength(2);
    expect(third.error).toMatchObject({ field: "referenceImage", message: /at most 2/ });
    const gif = reduceComposer(ready(), { type: "add-images", images: [img("g", "image/gif")] });
    expect(gif.error?.message).toMatch(/PNG, JPEG or WebP/);
    const big = reduceComposer(ready(), { type: "add-images", images: [img("big", "image/png", 11 * 1024 * 1024)] });
    expect(big.error?.message).toMatch(/10 MB/);
    s = reduceComposer(s, { type: "remove-image", id: "a" });
    expect(s.images.map((i) => i.id)).toEqual(["b"]);
  });

  it("ignores disabled models and resolutions, accepts listed ratios, clamps the duration", () => {
    let s = ready();
    expect(isModelEnabled(s, "hailuo-2.3")).toBe(false);
    expect(isResolutionEnabled(s, "2K")).toBe(false);
    expect(reduceComposer(s, { type: "model", model: "hailuo-2.3" })).toBe(s);
    expect(reduceComposer(s, { type: "resolution", resolution: "2K" })).toBe(s);
    expect(reduceComposer(s, { type: "ratio", ratio: "2:1" })).toBe(s);
    s = reduceComposer(s, { type: "ratio", ratio: "9:16" });
    s = reduceComposer(s, { type: "duration", durationSeconds: 99 });
    expect(paramsLabel(s)).toBe("9:16 768P 15s");
  });

  it("canSend needs text, no submit in flight and capabilities in video mode", () => {
    const empty = ready();
    expect(canSend(empty)).toBe(false);
    const typed = reduceComposer(empty, { type: "text", text: "  a boat " });
    expect(canSend(typed)).toBe(true);
    expect(canSend(reduceComposer(typed, { type: "submit-start" }))).toBe(false);
    const noCaps = reduceComposer(reduceComposer(initialComposer(), { type: "enter-video-mode" }), { type: "text", text: "x" });
    expect(canSend(noCaps)).toBe(false);
    expect(reduceComposer(noCaps, { type: "capabilities-failed", message: "down" }).capabilitiesError).toBe("down");
  });
});

describe("reduceComposer edge branches", () => {
  it("keeps state identity for no-op actions and falls back when capabilities omit the current ratio", () => {
    const s = ready();
    expect(reduceComposer(reduceComposer(s, { type: "enter-video-mode" }), { type: "enter-video-mode" })).toEqual(reduceComposer(s, { type: "enter-video-mode" }));
    expect(reduceComposer(s, { type: "leave-video-mode" })).toBe(s);
    const narrowCaps: Capabilities = { ...caps, ratios: ["1:1"], models: [], resolutions: [] };
    const fallback = reduceComposer(initialComposer(), { type: "capabilities", capabilities: narrowCaps });
    expect(fallback).toMatchObject({ ratio: "1:1", model: "", resolution: "" });
    expect(paramsLabel(fallback)).toBe("1:1 768P 5s");
    expect(isModelEnabled(initialComposer(), "minimax-h3")).toBe(false);
    expect(isResolutionEnabled(initialComposer(), "768P")).toBe(false);
    expect(durationOptions(initialComposer())).toEqual([]);
  });

  it("clamps the duration only when capabilities are known and honours a smaller reference-image cap", () => {
    const noCaps = reduceComposer(initialComposer(), { type: "duration", durationSeconds: 99 });
    expect(noCaps.durationSeconds).toBe(99);
    const oneImageCaps: Capabilities = { ...caps, referenceImages: { max: 1 } };
    let s = reduceComposer(initialComposer(), { type: "capabilities", capabilities: oneImageCaps });
    s = reduceComposer(s, { type: "add-images", images: [img("a"), img("b")] });
    expect(s.images).toHaveLength(0);
    expect(s.error?.message).toMatch(/at most 1/);
    const anyRatio = reduceComposer(initialComposer(), { type: "ratio", ratio: "9:16" });
    expect(anyRatio.ratio).toBe("9:16");
  });

  it("records, clears and replaces errors around a submit", () => {
    let s = reduceComposer(ready(), { type: "text", text: "boat" });
    s = reduceComposer(s, { type: "submit-start" });
    expect(s.submitting).toBe(true);
    s = reduceComposer(s, { type: "error", error: { message: "busy" } });
    expect(s).toMatchObject({ submitting: false, error: { message: "busy" } });
    s = reduceComposer(s, { type: "clear-error" });
    expect(s.error).toBeUndefined();
    s = reduceComposer(reduceComposer(s, { type: "submit-start" }), { type: "submit-end" });
    expect(s.submitting).toBe(false);
    expect(reduceComposer(s, { type: "model", model: "minimax-h3" }).model).toBe("minimax-h3");
    expect(reduceComposer(s, { type: "resolution", resolution: "768P" }).resolution).toBe("768P");
    expect(reduceComposer(reduceComposer(s, { type: "text", text: "x" }), { type: "error", error: { message: "e" } }).error?.message).toBe("e");
    expect(reduceComposer(reduceComposer(s, { type: "error", error: { message: "e" } }), { type: "text", text: "y" }).error).toBeUndefined();
  });
});

describe("extend mode (STORY_016)", () => {
  const source: ExtendSource = { id: "src", title: "A boat", durationSeconds: 10.125, ratio: "9:16", resolution: "768P", model: "minimax-h3", posterUrl: "/api/jobs/src/poster" };
  const extCaps: Capabilities = { ...caps, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, contextSeconds: { min: 2, max: 15, default: 5 }, maxSourceSeconds: 30 } };

  it("extend-from takes the source's ratio/resolution/model and the extension defaults, locks the fixed fields and refuses images", () => {
    const s = reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: extCaps }), { type: "extend-from", source });
    expect(s).toMatchObject({ mode: "video", extend: source, ratio: "9:16", resolution: "768P", model: "minimax-h3", durationSeconds: 10, contextSeconds: 5, images: [] });
    expect(reduceComposer(s, { type: "ratio", ratio: "16:9" })).toBe(s);
    expect(reduceComposer(s, { type: "resolution", resolution: "768P" })).toBe(s);
    expect(reduceComposer(s, { type: "model", model: "minimax-h3" })).toBe(s);
    expect(reduceComposer(s, { type: "duration", durationSeconds: 15 }).durationSeconds).toBe(14);
    expect(reduceComposer(s, { type: "duration", durationSeconds: 4 }).durationSeconds).toBe(4);
    const refused = reduceComposer(s, { type: "add-images", images: [img("a")] });
    expect(refused.images).toHaveLength(0);
    expect(refused.error).toMatchObject({ field: "referenceImage", message: /takes no reference images/ });
    expect(paramsLabel(s)).toBe("9:16 768P +10s");
    expect(durationOptions(s)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(contextOptions(s)).toEqual([{ seconds: 2, label: "last 2s" }, { seconds: 5, label: "last 5s" }, { seconds: 10, label: "last 10s" }, { seconds: 15, label: "max" }]);
    expect(canSend(reduceComposer(s, { type: "text", text: "next" }))).toBe(true);
  });

  it("context changes only while extending and is clamped; clear-extend and leave-video-mode restore the normal composer", () => {
    const s = reduceComposer(ready(), { type: "extend-from", source });
    expect(reduceComposer(s, { type: "context", contextSeconds: 15 }).contextSeconds).toBe(15);
    expect(reduceComposer(s, { type: "context", contextSeconds: 99 }).contextSeconds).toBe(15);
    expect(reduceComposer(s, { type: "context", contextSeconds: 1 }).contextSeconds).toBe(2);
    const plain = ready();
    expect(reduceComposer(plain, { type: "context", contextSeconds: 10 })).toBe(plain);
    expect(reduceComposer(plain, { type: "clear-extend" })).toBe(plain);
    expect(contextOptions(plain)).toEqual([]);
    const cleared = reduceComposer(reduceComposer(s, { type: "context", contextSeconds: 10 }), { type: "clear-extend" });
    expect(cleared).toMatchObject({ extend: undefined, ratio: "16:9", resolution: "768P", model: "minimax-h3", durationSeconds: 5, contextSeconds: 5 });
    expect(paramsLabel(cleared)).toBe("16:9 768P 5s");
    expect(reduceComposer(s, { type: "leave-video-mode" })).toMatchObject({ mode: "text", extend: undefined });
    // capabilities that arrive while extending keep the source's values and clamp into the server's ranges
    const late = reduceComposer(reduceComposer(initialComposer(), { type: "extend-from", source }), { type: "capabilities", capabilities: extCaps });
    expect(late).toMatchObject({ extend: source, ratio: "9:16", model: "minimax-h3", durationSeconds: 10, contextSeconds: 5 });
  });
});
