import { describe, expect, it } from "vitest";
import { decide } from "./agent-decision";

const clean = { kind: "prompt" as const, prompt: "p", findings: [], segments: 1 };
const flagged = { ...clean, findings: [{ code: "no-soundscape", message: "m" }] };
const chain = { ...clean, segments: 3 };
const chainFlagged = { ...chain, findings: [{ code: "description-too-short", message: "Segment 2: m", segment: 2 }] };

describe("decide (STORY_051, STORY_053)", () => {
  it("always: every prompt is reviewed; never: a clean single prompt is queued, a clean chain is queued whole, any finding is reviewed as not sent", () => {
    expect(decide("always", clean)).toBe("review");
    expect(decide("always", flagged)).toBe("review");
    expect(decide("always", chain)).toBe("review");
    expect(decide("never", clean)).toBe("queue");
    expect(decide("never", flagged)).toBe("review-not-sent");
    expect(decide("never", chain)).toBe("queue-chain");
    expect(decide("never", chainFlagged)).toBe("review-not-sent");
  });
  it("a refusal or an error is shown, a stop is a stop, whatever the setting", () => {
    for (const setting of ["always", "never"] as const) {
      expect(decide(setting, { kind: "refusal", message: "no" })).toBe("alert");
      expect(decide(setting, { kind: "error", status: 502, message: "down" })).toBe("alert");
      expect(decide(setting, { kind: "stopped" })).toBe("stopped");
    }
  });
});
