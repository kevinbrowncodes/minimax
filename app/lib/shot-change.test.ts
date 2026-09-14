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
    expect(shotChangeNotice([{ frame: 270, seconds: 11.25 }])).toBe("The shot changed at 00:11 — the set or the framing is no longer what it was. Retry generates this again with a new seed.");
    expect(shotChangeNotice([{ frame: 142, seconds: 5.92 }, { frame: 270, seconds: 11.25 }, { frame: 521, seconds: 21.71 }])).toMatch(/^The shot changed at 00:05, 00:11 and 00:21 — /);
    expect(shotChangeNotice([])).toBeUndefined();
    expect(shotChangeNotice(undefined)).toBeUndefined();
  });
});
