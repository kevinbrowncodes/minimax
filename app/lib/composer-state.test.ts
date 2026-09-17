import { describe, expect, it } from "vitest";
import type { Capabilities } from "./job-api";
import { canSend, durationOptions, findingsNotice, initialComposer, isModelEnabled, isResolutionEnabled, overlapOptions, paramsLabel, reduceComposer, type ComposerImage, type ComposerState, type ExtendSource, agentSkill, agentSkillLabel, skillClipSeconds, type AgentSkill } from "./composer-state";

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

describe("the project choice (STORY_031)", () => {
  it("starts from initialComposer's project, changes with the action, survives mode changes and Stop extending, clears with No project", () => {
    expect(initialComposer().projectId).toBeUndefined();
    let s = reduceComposer(initialComposer("p1"), { type: "capabilities", capabilities: caps });
    expect(s.projectId).toBe("p1");
    expect(reduceComposer(s, { type: "project", projectId: "p1" })).toBe(s); // no-op keeps identity
    s = reduceComposer(s, { type: "project", projectId: "p2" });
    s = reduceComposer(s, { type: "enter-video-mode" });
    s = reduceComposer(s, { type: "leave-video-mode" });
    s = reduceComposer(s, { type: "clear-extend" });
    expect(s.projectId).toBe("p2");
    expect(reduceComposer(s, { type: "project", projectId: undefined }).projectId).toBeUndefined();
  });
});

describe("the run-at time and an Edit's queue id (STORY_041)", () => {
  it("start from initialComposer's extras, change with the action, and survive mode changes", () => {
    const s = initialComposer("p1", "A boat", { queueId: "q1", notBefore: "2026-09-16T06:00:00.000Z" });
    expect(s).toMatchObject({ projectId: "p1", text: "A boat", queueId: "q1", notBefore: "2026-09-16T06:00:00.000Z" });
    expect(initialComposer().queueId).toBeUndefined();
    let t = reduceComposer(initialComposer(), { type: "not-before", notBefore: "2026-09-16T06:00:00.000Z" });
    expect(t.notBefore).toBe("2026-09-16T06:00:00.000Z");
    expect(reduceComposer(t, { type: "not-before", notBefore: "2026-09-16T06:00:00.000Z" })).toBe(t);
    t = reduceComposer(reduceComposer(t, { type: "enter-video-mode" }), { type: "leave-video-mode" });
    expect(t.notBefore).toBe("2026-09-16T06:00:00.000Z");
    expect(reduceComposer(t, { type: "not-before", notBefore: undefined }).notBefore).toBeUndefined();
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

describe("extend mode (STORY_016, STORY_017)", () => {
  const source: ExtendSource = { id: "src", title: "A boat", durationSeconds: 10.125, ratio: "9:16", resolution: "768P", model: "minimax-h3", posterUrl: "/api/jobs/src/poster" };
  const extCaps: Capabilities = { ...caps, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 } };

  it("extend-from takes the source's ratio/resolution/model and the extension defaults, locks the fixed fields and refuses images", () => {
    const s = reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: extCaps }), { type: "extend-from", source });
    expect(s).toMatchObject({ mode: "video", extend: source, ratio: "9:16", resolution: "768P", model: "minimax-h3", durationSeconds: 10, overlapFrames: 39, images: [] });
    expect(reduceComposer(s, { type: "ratio", ratio: "16:9" })).toBe(s);
    expect(reduceComposer(s, { type: "resolution", resolution: "768P" })).toBe(s);
    expect(reduceComposer(s, { type: "model", model: "minimax-h3" })).toBe(s);
    expect(reduceComposer(s, { type: "duration", durationSeconds: 15 }).durationSeconds).toBe(13); // 39 frames of overlap leave room for 13 s
    expect(reduceComposer(s, { type: "duration", durationSeconds: 4 }).durationSeconds).toBe(4);
    const refused = reduceComposer(s, { type: "add-images", images: [img("a")] });
    expect(refused.images).toHaveLength(0);
    expect(refused.error).toMatchObject({ field: "referenceImage", message: /takes no reference images/ });
    expect(paramsLabel(s)).toBe("9:16 768P +10s");
    expect(durationOptions(s)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(overlapOptions(s)).toEqual([{ frames: 22, label: "0.9 s" }, { frames: 39, label: "1.6 s" }, { frames: 56, label: "2.3 s" }]);
    expect(canSend(reduceComposer(s, { type: "text", text: "next" }))).toBe(true);
  });

  it("the overlap re-clamps the duration while extending and is kept as the chain strip's outside it (STORY_044); clear-extend / leave-video-mode restore the normal composer", () => {
    const s = reduceComposer(ready(), { type: "extend-from", source });
    expect(reduceComposer(s, { type: "overlap", overlapFrames: 22 })).toMatchObject({ overlapFrames: 22 });
    expect(durationOptions(reduceComposer(s, { type: "overlap", overlapFrames: 22 }))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(durationOptions(reduceComposer(s, { type: "overlap", overlapFrames: 56 }))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const long = reduceComposer(reduceComposer(s, { type: "overlap", overlapFrames: 22 }), { type: "duration", durationSeconds: 14 });
    expect(reduceComposer(long, { type: "overlap", overlapFrames: 56 })).toMatchObject({ overlapFrames: 56, durationSeconds: 12 });
    // STORY_044: outside extend mode the overlap is the chain strip's — kept, the first clip's length untouched
    const fresh = reduceComposer(reduceComposer(initialComposer(), { type: "capabilities", capabilities: caps }), { type: "duration", durationSeconds: 10 });
    expect(reduceComposer(fresh, { type: "overlap", overlapFrames: 56 })).toMatchObject({ overlapFrames: 56, durationSeconds: 10, extend: undefined });
    expect(reduceComposer(s, { type: "overlap", overlapFrames: 30 }).overlapFrames).toBe(39);
    const plain = ready();
    // an overlap the server does not offer is snapped to one it does (39 stays 39: the same state object); the chain strip may set a real one outside extend mode (STORY_044)
    expect(reduceComposer(plain, { type: "overlap", overlapFrames: 30 })).toBe(plain);
    expect(reduceComposer(plain, { type: "overlap", overlapFrames: 22 })).toMatchObject({ overlapFrames: 22, extend: undefined, durationSeconds: 5 });
    expect(reduceComposer(plain, { type: "clear-extend" })).toBe(plain);
    expect(overlapOptions(plain)).toEqual([]);
    const cleared = reduceComposer(reduceComposer(s, { type: "overlap", overlapFrames: 22 }), { type: "clear-extend" });
    expect(cleared).toMatchObject({ extend: undefined, ratio: "16:9", resolution: "768P", model: "minimax-h3", durationSeconds: 5, overlapFrames: 39 });
    expect(paramsLabel(cleared)).toBe("16:9 768P 5s");
    expect(reduceComposer(s, { type: "leave-video-mode" })).toMatchObject({ mode: "text", extend: undefined });
    // capabilities that arrive while extending keep the source's values and clamp into the server's ranges
    const late = reduceComposer(reduceComposer(initialComposer(), { type: "extend-from", source }), { type: "capabilities", capabilities: extCaps });
    expect(late).toMatchObject({ extend: source, ratio: "9:16", model: "minimax-h3", durationSeconds: 10, overlapFrames: 39 });
  });
});

describe("the modes and the Showcase (STORY_022, STORY_026)", () => {
  it("text mode can send once there is text; video mode also needs capabilities; leave-video-mode returns to text (STORY_026: no other modes)", () => {
    let state = reduceComposer(initialComposer(), { type: "text", text: "hello" });
    expect(state.mode).toBe("text");
    expect(canSend(state)).toBe(true);
    state = reduceComposer(state, { type: "enter-video-mode" });
    expect(canSend(state)).toBe(false); // no capabilities yet
    state = reduceComposer(state, { type: "leave-video-mode" });
    expect(state.mode).toBe("text");
    expect(canSend(state)).toBe(true);
  });

  it("a scene types the prompt, enters video mode and takes the parameters the Spark allows; clear-scene empties", () => {
    const narrowCaps: Capabilities = { ...caps, ratios: ["16:9", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 5, max: 10, step: 1 } };
    let state = reduceComposer(initialComposer(), { type: "capabilities", capabilities: narrowCaps });
    state = reduceComposer(state, { type: "scene", prompt: "A neon street", ratio: "9:16", resolution: "2K", durationSeconds: 15 });
    expect(state.mode).toBe("video");
    expect(state.text).toBe("A neon street");
    expect(state.ratio).toBe("9:16");
    expect(state.resolution).toBe("768P"); // 2K is not offered by these capabilities
    expect(state.durationSeconds).toBe(10); // clamped to the Spark's maximum
    state = reduceComposer(state, { type: "clear-scene" });
    expect(state.text).toBe("");
    expect(state.mode).toBe("video");
  });

  it("without capabilities a scene's parameters are taken as given", () => {
    const state = reduceComposer(initialComposer(), { type: "scene", prompt: "p", ratio: "21:9", resolution: "2K", durationSeconds: 8 });
    expect([state.ratio, state.resolution, state.durationSeconds]).toEqual(["21:9", "2K", 8]);
  });
});

describe("the Agent chip (STORY_050)", () => {
  const skills: readonly AgentSkill[] = [
    { id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "Directs one…", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10" } },
    { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "Directs a whole…", metadata: { "minimax-short-name": "Chain director" } },
  ];
  const video = (): ComposerState => reduceComposer(ready(), { type: "enter-video-mode" });
  it("the skills arrive: the setting's is chosen, else the first; the label is the short name", () => {
    const first = reduceComposer(video(), { type: "agent-skills", skills });
    expect(first.agent.skillId).toBe("minimax-h3-director-thirst-trap");
    expect(agentSkillLabel(agentSkill(first))).toBe("Thirst trap");
    const chosen = reduceComposer(video(), { type: "agent-skills", skills, chosen: "minimax-h3-director-thirst-trap-chain" });
    expect(agentSkillLabel(agentSkill(chosen))).toBe("Chain director");
    expect(reduceComposer(video(), { type: "agent-skills", skills, chosen: "nope" }).agent.skillId).toBe("minimax-h3-director-thirst-trap");
    expect(reduceComposer(chosen, { type: "agent-skill", skillId: "nope" }).agent.skillId).toBe("minimax-h3-director-thirst-trap-chain");
    expect(skillClipSeconds(agentSkill(first))).toBe(10);
    expect(skillClipSeconds(agentSkill(chosen))).toBeUndefined();
  });
  it("Send with the chip on needs one photo, not text; a second photo is refused while on and allowed when off", () => {
    let state = reduceComposer(video(), { type: "agent-toggle" });
    expect(state.agent.on).toBe(true);
    expect(canSend(state)).toBe(false);
    state = reduceComposer(state, { type: "add-images", images: [img("a")] });
    expect(canSend(state)).toBe(true);
    const refused = reduceComposer(state, { type: "add-images", images: [img("b")] });
    expect(refused.images).toHaveLength(1);
    expect(refused.error?.message).toBe("The director takes one photo");
    const off = reduceComposer(state, { type: "agent-toggle" });
    expect(off.agent.on).toBe(false);
    expect(reduceComposer(off, { type: "add-images", images: [img("b")] }).images).toHaveLength(2);
    expect(canSend(off)).toBe(false); // no text
    // turning it on keeps only the first photo
    const two = reduceComposer(off, { type: "add-images", images: [img("b")] });
    expect(reduceComposer(two, { type: "agent-toggle" }).images.map((i) => i.id)).toEqual(["a"]);
  });
  it("the chip cannot turn on in extend mode, and turns off when extending or leaving video mode", () => {
    const source = { id: "s", title: "t", durationSeconds: 10, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "" };
    const extending = reduceComposer(video(), { type: "extend-from", source });
    expect(reduceComposer(extending, { type: "agent-toggle" }).agent.on).toBe(false);
    const on = reduceComposer(video(), { type: "agent-toggle" });
    expect(reduceComposer(on, { type: "extend-from", source }).agent.on).toBe(false);
    expect(reduceComposer(on, { type: "leave-video-mode" }).agent.on).toBe(false);
  });
  it("a run: start, then the reply into the box with the chip off, the photo kept, the duration the skill's, findings as a warning", () => {
    let state = reduceComposer(reduceComposer(video(), { type: "agent-skills", skills }), { type: "agent-toggle" });
    state = reduceComposer(state, { type: "add-images", images: [img("a")] });
    state = reduceComposer(state, { type: "text", text: "keep the camera still" });
    state = reduceComposer(state, { type: "agent-start" });
    expect(state.agent.running).toBe(true);
    expect(canSend(state)).toBe(false);
    expect(reduceComposer(state, { type: "agent-toggle" })).toBe(state); // nothing toggles mid-run
    const replied = reduceComposer(state, { type: "agent-reply", prompt: "For the target video…", findings: [], clipSeconds: 10 });
    expect(replied).toMatchObject({ text: "For the target video…", durationSeconds: 10, images: [{ id: "a" }], agent: { on: false, running: false, notice: undefined } });
    const warned = reduceComposer(state, { type: "agent-reply", prompt: "p", findings: [{ code: "no-soundscape", message: "no overall_soundscape: field" }, { code: "description-too-short", message: "the description is 300 words; the skill asks for 350–600" }] });
    expect(warned.agent.notice).toEqual({ tone: "warn", message: "The reply misses the skill's format: no overall_soundscape: field; the description is 300 words; the skill asks for 350–600. Edit it, or send it as it is." });
    expect(reduceComposer(state, { type: "agent-reply", prompt: "p", findings: [] }).durationSeconds).toBe(state.durationSeconds); // no clip length declared
    // STORY_051: not sent; STORY_053: a chain's findings name the segment, the server's own prefix dropped, and the tail says Send all
    expect(findingsNotice([{ code: "no-soundscape", message: "no overall_soundscape: field" }], true)).toBe("Not sent — the reply misses the skill's format: no overall_soundscape: field. Edit it and Send.");
    const chained = [{ code: "description-too-short", message: "Segment 2: the description is 296 words; the skill asks for 350–600", segment: 2 }, { code: "no-music", message: "Segment 2: no non_diegetic_music: field", segment: 2 }, { code: "instruction-line-on-extension", message: "Segment 3: an extension segment carries an instruction line", segment: 3 }];
    expect(findingsNotice(chained, true)).toBe("Not sent — Segment 2 misses the skill's format: the description is 296 words; the skill asks for 350–600; no non_diegetic_music: field. Segment 3 misses the skill's format: an extension segment carries an instruction line. Edit it and Send all.");
    expect(findingsNotice(chained.slice(0, 1), false)).toBe("Segment 2 misses the skill's format: the description is 296 words; the skill asks for 350–600. Edit it, or send it as it is.");
    expect(reduceComposer(state, { type: "agent-reply", prompt: "p", findings: [], notSent: true }).agent.notice).toBeUndefined(); // a clean reply held back is not a thing any more: it is queued
  });
  it("a refusal, an error and a stop keep the chip on and the notes, with their words; reopening a run puts the notes back", () => {
    let state = reduceComposer(video(), { type: "agent-toggle" });
    state = reduceComposer(reduceComposer(state, { type: "text", text: "notes" }), { type: "agent-start" });
    expect(reduceComposer(state, { type: "agent-declined", message: "I can't help with that." })).toMatchObject({ text: "notes", agent: { on: true, running: false, notice: { tone: "alert", message: 'The director declined: "I can\'t help with that."' } } });
    expect(reduceComposer(state, { type: "agent-failed", message: "Google's quota: exceeded" }).agent.notice).toEqual({ tone: "alert", message: "Google's quota: exceeded" });
    expect(reduceComposer(state, { type: "agent-stopped" }).agent.notice).toEqual({ tone: "info", message: "Stopped — nothing was sent." });
    const reopened = reduceComposer(ready(), { type: "agent-notes", notes: "blue trunks", message: 'The director declined: "no"' });
    expect(reopened).toMatchObject({ mode: "video", text: "blue trunks", agent: { on: true, notice: { tone: "alert" } } });
    // turning the chip off clears the notice
    expect(reduceComposer(reopened, { type: "agent-toggle" }).agent.notice).toBeUndefined();
  });
});
