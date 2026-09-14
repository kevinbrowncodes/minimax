import { describe, expect, it } from "vitest";
import {
  boxesEqual,
  breakpointChanges,
  buildTokens,
  palette,
  parseCssVariables,
  parseMediaBreakpoints,
  parseThemedCssVariables,
  renderTokensMarkdown,
  spacingScale,
  typeScale,
  type LayoutSignals,
  type Measurement,
} from "./tokens-model.ts";

const m = (name: string, styles: Record<string, string>, width = 1440): Measurement => ({
  name,
  state: "home",
  width,
  tag: "div",
  text: name,
  box: { x: 0, y: 0, w: 10, h: 10 },
  styles,
});

describe("parseCssVariables", () => {
  it("reads custom properties from :root and html blocks, first declaration wins", () => {
    const css = `.x{color:red}:root{--bg:#fff;--fg: rgb(0,0,0) ;--radius:8px}html{--bg:#000;--extra:1}`;
    expect(parseCssVariables(css)).toEqual({ "--bg": "#fff", "--fg": "rgb(0,0,0)", "--radius": "8px", "--extra": "1" });
  });
  it("ignores custom properties declared on other selectors", () => {
    expect(parseCssVariables(`.dark{--bg:#000}`)).toEqual({});
  });
});

describe("parseThemedCssVariables (STORY_018)", () => {
  it("returns the light and dark scopes separately with the same names and different values", () => {
    const css = `:root{--bg:#fff;--fg:#000;--radius:8px}[data-theme="dark"]{--bg:#111;--fg:#eee}`;
    const t = parseThemedCssVariables(css);
    expect(t.light).toEqual({ "--bg": "#fff", "--fg": "#000", "--radius": "8px" });
    expect(t.dark).toEqual({ "--bg": "#111", "--fg": "#eee" });
    expect(t.darkScopes).toEqual(['[data-theme="dark"]']);
  });
  it("reads a root block inside a prefers-color-scheme dark media query as dark, and names the scope", () => {
    const css = `:root{--bg:#fff}@media (prefers-color-scheme: dark){:root{--bg:#000}.card{--x:1}}`;
    const t = parseThemedCssVariables(css);
    expect(t.light).toEqual({ "--bg": "#fff" });
    expect(t.dark).toEqual({ "--bg": "#000" });
    expect(t.darkScopes).toEqual(["@media (prefers-color-scheme: dark) :root"]);
  });
  it("accepts html.dark, :root.dark, .theme-dark and html[data-mode=dark] as dark scopes but not an unrelated class", () => {
    const css = `html.dark{--a:1}:root.dark{--b:2}.theme-dark{--c:3}html[data-mode=dark]{--d:4}.dark-pop-card{--e:5}.sidebar{--f:6}`;
    const t = parseThemedCssVariables(css);
    expect(t.dark).toEqual({ "--a": "1", "--b": "2", "--c": "3", "--d": "4" });
    expect(t.light).toEqual({});
  });
  it("keeps the first declaration within each theme and strips comments", () => {
    const css = `/* :root{--bg:#bad} */:root{--bg:#fff}html{--bg:#eee}.dark{--bg:#000}html.dark{--bg:#111}`;
    const t = parseThemedCssVariables(css);
    expect(t.light["--bg"]).toBe("#fff");
    expect(t.dark["--bg"]).toBe("#000");
  });
  it("is what parseCssVariables reads for light, so the 2026-09-12 reading is unchanged", () => {
    const css = `:root{--bg:#fff}.dark{--bg:#000}`;
    expect(parseCssVariables(css)).toEqual(parseThemedCssVariables(css).light);
  });
});

describe("parseMediaBreakpoints", () => {
  it("collects unique px widths from min/max-width queries, converting rem at 16px", () => {
    const css = `@media (min-width:640px){a{}}@media screen and (max-width: 1024px){b{}}@media (min-width:40rem){c{}}@media (min-width: 640px){d{}}`;
    expect(parseMediaBreakpoints(css)).toEqual([640, 1024]);
  });
});

describe("palette and scales", () => {
  it("collapses identical colours, keeps alpha variants distinct, drops transparent", () => {
    const p = palette([
      m("a", { color: "rgb(0, 0, 0)", backgroundColor: "rgba(0, 0, 0, 0)", borderTopColor: "rgb(0, 0, 0)", borderTopStyle: "none", borderTopWidth: "0px" }),
      m("b", { color: "rgb(0, 0, 0)", backgroundColor: "rgba(0, 0, 0, 0.5)", borderTopColor: "rgb(9, 9, 9)", borderTopStyle: "solid", borderTopWidth: "1px" }),
    ]);
    expect(p.map((x) => x.value)).toEqual(["rgb(0, 0, 0)", "rgb(9, 9, 9)", "rgba(0, 0, 0, 0.5)"]);
    expect(p[0]?.seenOn).toEqual(["a@1440", "b@1440"]);
  });
  it("orders the type scale by size descending and records where each was seen", () => {
    const t = typeScale([
      m("h1", { fontFamily: "Inter", fontSize: "32px", fontWeight: "600", lineHeight: "40px" }),
      m("p", { fontFamily: "Inter", fontSize: "14px", fontWeight: "400", lineHeight: "20px" }),
      m("p2", { fontFamily: "Inter", fontSize: "14px", fontWeight: "400", lineHeight: "20px" }),
    ]);
    expect(t.map((x) => x.fontSize)).toEqual(["32px", "14px"]);
    expect(t[1]?.seenOn).toEqual(["p@1440", "p2@1440"]);
  });
  it("builds an ascending spacing scale from paddings and gaps, dropping zero", () => {
    const s = spacingScale([m("a", { paddingTop: "8px", paddingRight: "12px", paddingBottom: "8px", paddingLeft: "12px", gap: "0px" }), m("b", { gap: "4px" })]);
    expect(s.map((x) => x.value)).toEqual(["4px", "8px", "12px"]);
  });
});

describe("breakpointChanges", () => {
  const sig = (width: number, sidebarExpanded: boolean, showcaseColumns: number, paramsControlVisible: boolean): LayoutSignals => ({ width, sidebarExpanded, composerWidth: 700, showcaseColumns, paramsControlVisible });
  it("names the widths where a signal first differs from the wider sample", () => {
    expect(breakpointChanges([sig(1440, true, 4, true), sig(1024, true, 4, true), sig(768, false, 2, true), sig(390, false, 2, false)])).toEqual([768, 390]);
  });
  it("is empty when nothing changes", () => {
    expect(breakpointChanges([sig(1440, true, 4, true), sig(1280, true, 4, true)])).toEqual([]);
  });
});

describe("boxesEqual", () => {
  it("tolerates sub-pixel jitter and rejects a moved box", () => {
    expect(boxesEqual({ x: 1, y: 1, w: 10, h: 10 }, { x: 1.3, y: 1, w: 10, h: 10 })).toBe(true);
    expect(boxesEqual({ x: 1, y: 1, w: 10, h: 10 }, { x: 4, y: 1, w: 10, h: 10 })).toBe(false);
    expect(boxesEqual(null, { x: 1, y: 1, w: 10, h: 10 })).toBe(false);
  });
});

describe("buildTokens and renderTokensMarkdown", () => {
  it("renders every section and lists missing elements without crashing", () => {
    const tokens = buildTokens({
      date: "2026-09-12",
      reference: "https://agent.minimax.io/",
      bodyFontFamily: "ui-sans-serif",
      bodyBackground: "rgb(255, 255, 255)",
      fonts: [{ family: "Outfit", weight: "400", style: "normal", status: "loaded" }],
      notes: ["Outfit is loaded but unused on measured elements"],
      cssVariables: { "--radius": "8px" },
      cssBreakpoints: [640],
      observed: [],
      elements: [m("send-button", { fontSize: "14px", fontWeight: "500", lineHeight: "20px", fontFamily: "Inter", color: "rgb(255, 255, 255)", backgroundColor: "rgb(0, 0, 0)", borderRadius: "9999px", transitionDuration: "0.15s", transitionTimingFunction: "ease" }), { name: "ghost", state: "home", width: 1440, missing: "locator timed out" }],
    });
    const md = renderTokensMarkdown(tokens);
    for (const heading of ["## Fonts", "## Breakpoints", "## Palette", "## Type scale", "## Spacing", "## Radii", "## Shadows", "## Motion", "## CSS custom properties", "## Elements"]) expect(md).toContain(heading);
    expect(md).toContain("`Outfit`");
    expect(md).toContain("- Outfit is loaded but unused on measured elements");
    expect(md).toContain("640px");
    expect(md).toContain("not found: locator timed out");
    expect(tokens.motion[0]?.duration).toBe("0.15s");
    expect(tokens.paletteDark).toEqual([]);
    expect(md).not.toContain("## Palette (dark)");
  });
  it("stores a dark reading beside the light one without overwriting it, and prints both (STORY_018)", () => {
    const light = m("body", { color: "rgb(0, 0, 0)", backgroundColor: "rgb(255, 255, 255)", fontSize: "16px", fontWeight: "400", lineHeight: "24px", fontFamily: "Inter" });
    const dark: Measurement = { ...light, theme: "dark", styles: { ...light.styles, color: "rgb(255, 255, 255)", backgroundColor: "rgb(24, 24, 27)" } };
    const tokens = buildTokens({
      date: "2026-09-14",
      reference: "https://agent.minimax.io/",
      bodyFontFamily: "ui-sans-serif",
      bodyBackground: "rgb(255, 255, 255)",
      fonts: [],
      cssVariables: { "--bg": "#fff", "--radius": "8px" },
      cssVariablesDark: { "--bg": "#181818" },
      darkScopes: ['[data-theme="dark"]'],
      computedVariables: { light: { "--bg": "#fff", "--radius": "8px" }, dark: { "--bg": "#181818", "--radius": "8px" } },
      themeMechanism: { control: "Appearance › Dark", documentBefore: "html", documentAfter: 'html[data-theme="dark"]', bodyBackgroundLight: "rgb(255, 255, 255)", bodyBackgroundDark: "rgb(24, 24, 27)" },
      cssBreakpoints: [],
      observed: [],
      elements: [light, dark],
    });
    expect(tokens.palette.map((p) => p.value)).toEqual(["rgb(0, 0, 0)", "rgb(255, 255, 255)"]);
    expect(tokens.paletteDark.map((p) => p.value)).toEqual(["rgb(24, 24, 27)", "rgb(255, 255, 255)"]);
    expect(tokens.elements).toHaveLength(2);
    expect(tokens.cssVariables["--bg"]).toBe("#fff");
    expect(tokens.cssVariablesDark["--bg"]).toBe("#181818");
    const md = renderTokensMarkdown(tokens);
    expect(md).toContain("## Theme switch");
    expect(md).toContain("Control: Appearance › Dark");
    expect(md).toContain("## Palette (dark)");
    expect(md).toContain("| `--bg` | `#fff` | `#181818` |");
    expect(md).toContain("| `--radius` | `8px` | `—` |");
    expect(md).toContain("## Computed custom properties that differ between the themes");
    expect(md).not.toContain("| `--radius` | `8px` | `8px` |");
    expect(md).toContain("| body | home | 1440 | dark | ");
    expect(md).toContain("| body | home | 1440 | light | ");
  });
});
