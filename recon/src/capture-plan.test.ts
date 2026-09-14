import { describe, expect, it } from "vitest";
import {
  NARROW,
  PASSES,
  WIDE,
  classifyClick,
  dateStamp,
  isDarkBackground,
  luminance,
  manifestEntry,
  parseThemeArg,
  parseWidthArg,
  passFiles,
  pathOnly,
  screenshotFile,
  selectPasses,
  stateName,
} from "./capture-plan.ts";

describe("screenshotFile", () => {
  it("builds <state>@<width>.png", () => {
    expect(screenshotFile("composer-video-mode", 1440)).toBe("composer-video-mode@1440.png");
  });
  it("inserts -dark before the @ for a dark capture (STORY_018)", () => {
    expect(screenshotFile("home-signed-in", 1440, "dark")).toBe("home-signed-in-dark@1440.png");
    expect(screenshotFile("narrow-home", 390, "dark")).toBe("narrow-home-dark@390.png");
  });
  it("refuses a theme baked into the state name", () => {
    expect(() => screenshotFile("home-dark", 1440)).toThrow(/theme is a parameter/);
    expect(() => screenshotFile("home-dark", 1440, "dark")).toThrow(/theme is a parameter/);
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

describe("stateName", () => {
  it("prefixes narrow states and leaves wide ones bare", () => {
    expect(stateName("home", WIDE)).toBe("home");
    expect(stateName("home", NARROW)).toBe("narrow-home");
  });
});

describe("passFiles", () => {
  it("lists every state once per pass with no duplicate file names", () => {
    const files = passFiles(["home", "assets"]);
    expect(files).toHaveLength(2 * PASSES.length);
    expect(new Set(files).size).toBe(files.length);
    expect(files).toContain("home@1440.png");
    expect(files).toContain("home-dark@1440.png");
    expect(files).toContain("narrow-home-dark@390.png");
    expect(files).toContain("narrow-assets@390.png");
  });
  it("throws when two states would collide", () => {
    expect(() => passFiles(["home", "home"])).toThrow(/duplicate/);
  });
  it("switches the theme as few times as possible across the four passes", () => {
    const themes = PASSES.map((p) => p.theme).join(",");
    expect(themes).toBe("light,dark,dark,light");
  });
});

describe("theme and width arguments", () => {
  it("default to both", () => {
    expect(parseThemeArg([])).toEqual(["light", "dark"]);
    expect(parseWidthArg([])).toEqual([WIDE, NARROW]);
  });
  it("restrict the passes", () => {
    expect(selectPasses(parseThemeArg(["--theme", "light"]), parseWidthArg(["--width", "1440"]))).toEqual([{ width: WIDE, theme: "light" }]);
    expect(selectPasses(parseThemeArg(["--theme", "dark"]), parseWidthArg([]))).toEqual([
      { width: WIDE, theme: "dark" },
      { width: NARROW, theme: "dark" },
    ]);
  });
  it("reject unknown values", () => {
    expect(() => parseThemeArg(["--theme", "blue"])).toThrow();
    expect(() => parseWidthArg(["--width", "1024"])).toThrow();
  });
});

describe("classifyClick", () => {
  const base = { pathBefore: "/", pathAfter: "/", dialogVisible: false, menuVisible: false, newTab: false };
  it("reports a navigation, a dialog, a menu, a new tab, or nothing", () => {
    expect(classifyClick({ ...base, pathAfter: "/plugins" })).toBe("navigates");
    expect(classifyClick({ ...base, dialogVisible: true })).toBe("opens-dialog");
    expect(classifyClick({ ...base, menuVisible: true })).toBe("opens-menu");
    expect(classifyClick({ ...base, newTab: true })).toBe("opens-new-tab");
    expect(classifyClick(base)).toBe("nothing");
  });
  it("ranks a new tab and a navigation above an overlay left behind", () => {
    expect(classifyClick({ ...base, newTab: true, dialogVisible: true })).toBe("opens-new-tab");
    expect(classifyClick({ ...base, pathAfter: "/x", menuVisible: true })).toBe("navigates");
  });
});

describe("luminance and isDarkBackground", () => {
  it("reads white as light and near-black as dark", () => {
    expect(luminance("rgb(255, 255, 255)")).toBeCloseTo(1, 5);
    expect(luminance("rgb(0, 0, 0)")).toBe(0);
    expect(isDarkBackground("rgb(255, 255, 255)")).toBe(false);
    expect(isDarkBackground("rgba(24, 24, 27, 1)")).toBe(true);
  });
  it("is null for a colour it cannot parse", () => {
    expect(luminance("transparent")).toBeNull();
    expect(isDarkBackground("var(--bg)")).toBeNull();
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
  it("carries the path only, the derived file name, the theme, and an ISO timestamp", () => {
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
      theme: "light",
      file: "assets-empty@1440.png",
      path: "/assets",
      capturedAt: "2026-09-12T16:00:00.000Z",
      reachedBy: "auto",
    });
    expect(JSON.stringify(entry)).not.toContain("secret");
  });
  it("names the dark file when the theme is dark", () => {
    const entry = manifestEntry({ state: "home", width: 1440, theme: "dark", url: "https://agent.minimax.io/", capturedAt: new Date(), reachedBy: "auto" });
    expect(entry.file).toBe("home-dark@1440.png");
    expect(entry.theme).toBe("dark");
  });
  it("keeps a note only when one is given", () => {
    const withNote = manifestEntry({ state: "home", width: 390, url: "https://agent.minimax.io/", capturedAt: new Date(), reachedBy: "owner", note: "resized" });
    expect(withNote.note).toBe("resized");
  });
});
