import { describe, expect, it } from "vitest";
import { estimateMinutes, formatMinutes, sparkTimeLine } from "./spark-time";

describe("spark-time (STORY_050)", () => {
  it("reproduces the three measured points", () => {
    expect(estimateMinutes({ seconds: 5 })).toBe(17);
    expect(estimateMinutes({ seconds: 10, fromImage: true })).toBe(50);
    expect(estimateMinutes({ seconds: 10, extension: true })).toBe(67);
  });
  it("scales between and beyond them", () => {
    expect(estimateMinutes({ seconds: 8, fromImage: true })).toBe(40);
    expect(estimateMinutes({ seconds: 14, extension: true })).toBe(94);
    expect(estimateMinutes({ seconds: 0 })).toBe(3);
  });
  it("formats minutes and hours, and sums a chain", () => {
    expect(formatMinutes(50)).toBe("≈ 50 min");
    expect(formatMinutes(120)).toBe("≈ 2 h");
    expect(sparkTimeLine([{ seconds: 10, fromImage: true }])).toBe("≈ 50 min on the Spark");
    expect(sparkTimeLine([{ seconds: 10, fromImage: true }, { seconds: 10, extension: true }, { seconds: 10, extension: true }])).toBe("≈ 3 h 4 min on the Spark");
    // STORY_055: draws multiply the line; one draw leaves it as it was
    expect(sparkTimeLine([{ seconds: 10, fromImage: true }], 2)).toBe("≈ 2 × 50 min on the Spark");
    expect(sparkTimeLine([{ seconds: 10, extension: true }], 4)).toBe("≈ 4 × 1 h 7 min on the Spark");
    expect(sparkTimeLine([{ seconds: 10, fromImage: true }], 1)).toBe("≈ 50 min on the Spark");
  });
});
