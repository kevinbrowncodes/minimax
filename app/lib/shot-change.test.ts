import { describe, expect, it } from "vitest";
import { listTimes, shotChangeNotice } from "./shot-change";

describe("listTimes (STORY_020)", () => {
  it("one time is mm:ss, floored to the second", () => {
    expect(listTimes([11.25])).toBe("00:11");
    expect(listTimes([5.92])).toBe("00:05");
    expect(listTimes([75.4])).toBe("01:15");
  });
  it("several are listed with commas and a final 'and'; none is empty", () => {
    expect(listTimes([5.92, 11.25, 21.71])).toBe("00:05, 00:11 and 00:21");
    expect(listTimes([5.92, 11.25])).toBe("00:05 and 00:11");
    expect(listTimes([])).toBe("");
  });
});

describe("shotChangeNotice", () => {
  it("says where the shot changed and what Retry does; nothing for [] or an older server without the field", () => {
    expect(shotChangeNotice([{ frame: 270, seconds: 11.25 }])).toMatchObject({ tone: "warning", retry: true, seconds: [11.25], text: "The shot changed at 00:11 — the set or the framing is no longer what it was. Retry generates this again with a new seed." });
    expect(shotChangeNotice([{ frame: 142, seconds: 5.92 }, { frame: 270, seconds: 11.25 }, { frame: 521, seconds: 21.71 }])?.text).toMatch(/^The shot changed at 00:05, 00:11 and 00:21 — /);
    expect(shotChangeNotice([])).toBeUndefined();
    expect(shotChangeNotice(undefined)).toBeUndefined();
  });
});

describe("shotChangeNotice (STORY_046): a cut is a warning on any camera; framing is a note only when the prompt asked for a moving camera", () => {
  const framing = [{ frame: 24, seconds: 1, kind: "framing" as const }, { frame: 100, seconds: 4.17, kind: "framing" as const }, { frame: 204, seconds: 8.5, kind: "framing" as const }];
  it("framing on a moving camera is the quiet note, listing every time, with no Retry", () => {
    expect(shotChangeNotice(framing, "moving")).toEqual({ tone: "note", retry: false, seconds: [1, 4.17, 8.5], text: "The framing moved at 00:01, 00:04 and 00:08, as the prompt asked; no cut." });
  });
  it("framing on a static, unknown or absent camera is the warning as today (an older server's events have no kind)", () => {
    for (const camera of ["static", "unknown", undefined] as const) {
      expect(shotChangeNotice(framing, camera), String(camera)).toMatchObject({ tone: "warning", retry: true, seconds: [1, 4.17, 8.5] });
    }
    // an event without a kind reads as framing, so on a moving camera it is the note (a job recorded before v1.4 on a new server)
    expect(shotChangeNotice([{ frame: 270, seconds: 11.25 }], "moving")).toMatchObject({ tone: "note", seconds: [11.25] });
  });
  it("a cut among framing events on a moving camera is a warning that lists the cut's time only", () => {
    const cuts = [...framing.slice(0, 2), { frame: 142, seconds: 5.92, kind: "cut" as const }, ...framing.slice(2)];
    expect(shotChangeNotice(cuts, "moving")).toMatchObject({ tone: "warning", retry: true, seconds: [5.92], text: expect.stringMatching(/^The shot changed at 00:05 — /) as string });
    expect(shotChangeNotice([{ frame: 142, seconds: 5.92, kind: "cut" }], "static")).toMatchObject({ tone: "warning", seconds: [5.92] });
  });
});
