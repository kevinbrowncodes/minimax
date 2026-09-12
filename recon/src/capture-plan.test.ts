import { describe, expect, it } from "vitest";
import { dateStamp, manifestEntry, pathOnly, screenshotFile } from "./capture-plan.ts";

describe("screenshotFile", () => {
  it("builds <state>@<width>.png", () => {
    expect(screenshotFile("composer-video-mode", 1440)).toBe("composer-video-mode@1440.png");
  });
  it("rejects names that are not kebab-case", () => {
    expect(() => screenshotFile("Composer Mode", 1440)).toThrow();
    expect(() => screenshotFile("a_b", 1440)).toThrow();
    expect(() => screenshotFile("-lead", 1440)).toThrow();
  });
  it("rejects a non-positive or fractional width", () => {
    expect(() => screenshotFile("home", 0)).toThrow();
    expect(() => screenshotFile("home", 12.5)).toThrow();
  });
});

describe("dateStamp", () => {
  it("formats a local date as YYYY-MM-DD with zero padding", () => {
    expect(dateStamp(new Date(2026, 8, 12, 9, 30))).toBe("2026-09-12");
    expect(dateStamp(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("pathOnly", () => {
  it("keeps the path and drops query string and hash", () => {
    expect(pathOnly("https://agent.minimax.io/assets?tab=videos&id=123#top")).toBe("/assets");
    expect(pathOnly("https://agent.minimax.io/")).toBe("/");
  });
  it("is empty for an unparsable URL rather than leaking it", () => {
    expect(pathOnly("not a url")).toBe("");
  });
});

describe("manifestEntry", () => {
  it("carries the path only, the derived file name, and an ISO timestamp", () => {
    const entry = manifestEntry({
      state: "assets-empty",
      width: 1440,
      url: "https://agent.minimax.io/assets?token=secret",
      capturedAt: new Date(Date.UTC(2026, 8, 12, 16, 0, 0)),
      reachedBy: "auto",
    });
    expect(entry).toEqual({
      state: "assets-empty",
      width: 1440,
      file: "assets-empty@1440.png",
      path: "/assets",
      capturedAt: "2026-09-12T16:00:00.000Z",
      reachedBy: "auto",
    });
    expect(JSON.stringify(entry)).not.toContain("secret");
  });
  it("keeps a note only when one is given", () => {
    const withNote = manifestEntry({ state: "home", width: 390, url: "https://agent.minimax.io/", capturedAt: new Date(), reachedBy: "owner", note: "resized" });
    expect(withNote.note).toBe("resized");
  });
});
