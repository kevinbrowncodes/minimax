import { describe, expect, it } from "vitest";
import { interpret } from "./progress.ts";

const id = "p1";

describe("interpret", () => {
  it("maps sampling steps to 5–95 and decode nodes to 95–99, and starts at 2", () => {
    expect(interpret({ type: "execution_start", data: { prompt_id: id } }, id)).toEqual({ kind: "started" });
    expect(interpret({ type: "executing", data: { prompt_id: id, node: "unet" } }, id)).toEqual({ kind: "progress", percent: 2 });
    expect(interpret({ type: "executing", data: { prompt_id: id, node: "sample" } }, id)).toEqual({ kind: "progress", percent: 5 });
    expect(interpret({ type: "progress", data: { prompt_id: id, node: "sample", value: 0, max: 20 } }, id)).toEqual({ kind: "progress", percent: 5 });
    expect(interpret({ type: "progress", data: { prompt_id: id, node: "sample", value: 10, max: 20 } }, id)).toEqual({ kind: "progress", percent: 50 });
    expect(interpret({ type: "progress", data: { prompt_id: id, node: "sample", value: 20, max: 20 } }, id)).toEqual({ kind: "progress", percent: 95 });
    expect(interpret({ type: "executing", data: { prompt_id: id, node: "decode_video" } }, id)).toEqual({ kind: "progress", percent: 95 });
    expect(interpret({ type: "progress", data: { prompt_id: id, node: "decode_video", value: 3, max: 4 } }, id)).toEqual({ kind: "progress", percent: 98 });
    expect(interpret({ type: "progress", data: { prompt_id: id, node: "decode_video", value: 4, max: 4 } }, id)).toEqual({ kind: "progress", percent: 99 });
  });

  it("recognises the end states and ignores other prompts, the finished marker and unknown events", () => {
    expect(interpret({ type: "execution_success", data: { prompt_id: id } }, id)).toEqual({ kind: "success" });
    expect(interpret({ type: "execution_error", data: { prompt_id: id, node_type: "UNETLoader", exception_message: "boom" } }, id)).toEqual({ kind: "error", message: "UNETLoader: boom" });
    expect(interpret({ type: "execution_error", data: { prompt_id: id } }, id)).toMatchObject({ kind: "error" });
    expect(interpret({ type: "execution_interrupted", data: { prompt_id: id } }, id)).toEqual({ kind: "interrupted" });
    expect(interpret({ type: "progress", data: { prompt_id: "other", node: "sample", value: 1, max: 2 } }, id)).toEqual({ kind: "ignore" });
    expect(interpret({ type: "executing", data: { prompt_id: id, node: null } }, id)).toEqual({ kind: "ignore" });
    expect(interpret({ type: "status", data: {} }, id)).toEqual({ kind: "ignore" });
    expect(interpret({ type: "progress", data: { prompt_id: id, value: 1 } }, id)).toEqual({ kind: "ignore" });
  });
});
