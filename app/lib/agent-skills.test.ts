import { describe, expect, it } from "vitest";
import { searchDirectors, skillMetaLine } from "./agent-skills";

const meta = { "minimax-model": "MiniMax-H3 (open weights, Comfy-Org quantized)", "minimax-checkpoint": "minimax_h3_fl2va_int8_convrot", "minimax-comfyui": "0.35.1", "minimax-adapter": "1.5.0", "minimax-verified-on": "2026-09-16", "minimax-short-name": "Thirst trap" };

describe("skillMetaLine (STORY_054)", () => {
  it("joins the five keys with middots, labelling ComfyUI, the adapter and the verified date", () => {
    expect(skillMetaLine(meta)).toBe("MiniMax-H3 (open weights, Comfy-Org quantized) · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.5.0 · verified 2026-09-16");
  });
  it("skips a missing or blank key, and is empty with none", () => {
    expect(skillMetaLine({ "minimax-model": "MiniMax-H3", "minimax-verified-on": "draft", "minimax-comfyui": " " })).toBe("MiniMax-H3 · verified draft");
    expect(skillMetaLine({})).toBe("");
    expect(skillMetaLine({ author: "kevinbrowncodes", version: "1.1" })).toBe("");
  });
});

describe("searchDirectors", () => {
  const a = { id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "Directs one thirst-trap short from one attached photo", metadata: { "minimax-short-name": "Thirst trap" } };
  const b = { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "Directs a whole video as a chain of segments", metadata: { "minimax-short-name": "Chain director" } };
  it("matches the short name, the folder name or the description, case-insensitively; an empty query keeps all", () => {
    expect(searchDirectors([a, b], "")).toEqual([a, b]);
    expect(searchDirectors([a, b], "  ")).toEqual([a, b]);
    expect(searchDirectors([a, b], "CHAIN")).toEqual([b]);
    expect(searchDirectors([a, b], "thirst")).toEqual([a, b]);
    expect(searchDirectors([a, b], "one attached")).toEqual([a]);
    expect(searchDirectors([a, b], "nothing here")).toEqual([]);
  });
});
