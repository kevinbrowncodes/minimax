/** Pure helpers that turn raw measurements into the tokens file and its summary. */

export type Box = { x: number; y: number; w: number; h: number };

export type Theme = "light" | "dark";

export type Measurement = {
  name: string;
  state: string;
  width: number;
  /** Which theme the page was in when measured (STORY_018); absent in 2026-09-12 files means light. */
  theme?: Theme;
  tag: string;
  text: string;
  box: Box;
  styles: Record<string, string>;
};

export type MissingMeasurement = { name: string; state: string; width: number; theme?: Theme; missing: string };

export type FontFace = { family: string; weight: string; style: string; status: string };

export type LayoutSignals = {
  width: number;
  sidebarExpanded: boolean;
  composerWidth: number | null;
  showcaseColumns: number | null;
  paramsControlVisible: boolean;
};

export type SeenOn = { value: string; seenOn: string[] };

export type TypeToken = { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; seenOn: string[] };

export type MotionToken = { duration: string; timing: string; seenOn: string[] };

/** How the reference switches its theme, as observed (STORY_018): the control's wording and what changed on the document. */
export type ThemeMechanism = {
  control: string;
  documentBefore: string;
  documentAfter: string;
  bodyBackgroundLight: string;
  bodyBackgroundDark: string;
};

export type Tokens = {
  date: string;
  reference: string;
  bodyFontFamily: string;
  bodyBackground: string;
  fonts: FontFace[];
  notes: string[];
  cssVariables: Record<string, string>;
  /** The same names with their dark-scope values from the stylesheets (STORY_018); empty when none were declared. */
  cssVariablesDark: Record<string, string>;
  /** The selectors the dark values were declared under, so the clone knows what the switch sets. */
  darkScopes: string[];
  /** Every custom property's computed value on the root, read live in each theme — the ground truth the stylesheet parse is checked against. */
  computedVariables?: { light: Record<string, string>; dark: Record<string, string> };
  themeMechanism?: ThemeMechanism;
  breakpoints: { fromCss: number[]; observed: LayoutSignals[]; changesAt: number[] };
  palette: SeenOn[];
  paletteDark: SeenOn[];
  typeScale: TypeToken[];
  spacing: SeenOn[];
  radii: SeenOn[];
  shadows: SeenOn[];
  motion: MotionToken[];
  elements: (Measurement | MissingMeasurement)[];
};

export function isMissing(m: Measurement | MissingMeasurement): m is MissingMeasurement {
  return "missing" in m;
}

export type ThemedVariables = { light: Record<string, string>; dark: Record<string, string>; darkScopes: string[] };

const ROOT_SCOPE = /^(?::root|html|body)(?:\s*,\s*(?::root|html|body))*$/;
/** A root-level selector that names a dark theme: `[data-theme="dark"]`, `.dark`, `html.dark`, `:root[data-mode=dark]`, `.theme-dark`… */
const DARK_SCOPE = /^(?:(?::root|html|body)?(?:\[[^\]]*\bdark\b[^\]]*\]|\.(?:dark|theme-dark|dark-theme|dark-mode|mode-dark))(?:\s*,\s*)?)+$/i;
const DARK_MEDIA = /^@media\b.*prefers-color-scheme\s*:\s*dark/i;

/**
 * Custom properties declared at the root, split by theme (STORY_018). Light: a root selector outside any dark media
 * block. Dark: a root selector inside `@media (prefers-color-scheme: dark)`, or a dark-scope selector anywhere. First
 * declaration wins within each theme, as the 2026-09-12 parse did for light. Nesting is followed one `{}` at a time,
 * so a themed block inside a media query is read; strings holding braces are not expected in a custom property.
 */
export function parseThemedCssVariables(css: string): ThemedVariables {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  const darkScopes = new Set<string>();
  const stack: string[] = [];
  let buf = "";
  const flush = (text: string) => {
    const selector = [...stack].reverse().find((p) => !p.startsWith("@")) ?? "";
    const inDarkMedia = stack.some((p) => DARK_MEDIA.test(p));
    const rootish = ROOT_SCOPE.test(selector);
    const darkish = DARK_SCOPE.test(selector);
    if (!rootish && !darkish) return;
    // A root selector inside a light media block is still the light theme; anything else at the root is light too.
    const target = darkish || inDarkMedia ? dark : light;
    for (const decl of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+)/g)) {
      const name = decl[1];
      const value = decl[2]?.trim();
      if (!name || !value) continue;
      if (!(name in target)) target[name] = value;
      if (target === dark) darkScopes.add(inDarkMedia && !darkish ? `@media (prefers-color-scheme: dark) ${selector}` : selector);
    }
  };
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const ch of clean) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      flush(buf);
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      flush(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  return { light, dark, darkScopes: Array.from(darkScopes) };
}

/** Custom properties declared on :root or html in the light theme, first declaration wins (the 2026-09-12 reading). */
export function parseCssVariables(css: string): Record<string, string> {
  return parseThemedCssVariables(css).light;
}

/** Pixel widths named in min-width/max-width media queries, ascending and unique. */
export function parseMediaBreakpoints(css: string): number[] {
  const widths = new Set<number>();
  for (const m of css.matchAll(/@media[^{]*?\((?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)\)/g)) {
    const raw = Number(m[1]);
    const unit = m[2];
    const px = unit === "px" ? raw : raw * 16;
    if (Number.isFinite(px) && px > 0) widths.add(Math.round(px));
  }
  return Array.from(widths).sort((a, b) => a - b);
}

const TRANSPARENT = /^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/;

function collect(measurements: Measurement[], pick: (m: Measurement) => string[]): SeenOn[] {
  const map = new Map<string, Set<string>>();
  for (const m of measurements) {
    for (const value of pick(m)) {
      if (!value || value === "none" || value === "normal" || value === "0px" || TRANSPARENT.test(value)) continue;
      const set = map.get(value) ?? new Set<string>();
      set.add(`${m.name}@${m.width}`);
      map.set(value, set);
    }
  }
  return Array.from(map.entries())
    .map(([value, seen]) => ({ value, seenOn: Array.from(seen).sort() }))
    .sort((a, b) => b.seenOn.length - a.seenOn.length || a.value.localeCompare(b.value));
}

const px = (s: string | undefined): number => Number.parseFloat(s ?? "");

/** Colours, sorted by how many elements share them. rgba alphas stay distinct from their rgb twins. */
export const themeOf = (m: { theme?: Theme }): Theme => m.theme ?? "light";

export function palette(measurements: Measurement[], theme: Theme = "light"): SeenOn[] {
  return collect(measurements.filter((m) => themeOf(m) === theme), (m) => [m.styles["color"] ?? "", m.styles["backgroundColor"] ?? "", m.styles["borderTopColor"] ?? ""].filter((c, i) => !(i === 2 && (m.styles["borderTopStyle"] === "none" || px(m.styles["borderTopWidth"]) === 0))));
}

export function typeScale(measurements: Measurement[]): TypeToken[] {
  const map = new Map<string, TypeToken>();
  for (const m of measurements) {
    const fontFamily = m.styles["fontFamily"] ?? "";
    const fontSize = m.styles["fontSize"] ?? "";
    const fontWeight = m.styles["fontWeight"] ?? "";
    const lineHeight = m.styles["lineHeight"] ?? "";
    if (!fontSize) continue;
    const key = [fontFamily, fontSize, fontWeight, lineHeight].join("|");
    const token = map.get(key) ?? { fontFamily, fontSize, fontWeight, lineHeight, seenOn: [] };
    token.seenOn.push(`${m.name}@${m.width}${themeOf(m) === "dark" ? " (dark)" : ""}`);
    map.set(key, token);
  }
  return Array.from(map.values()).sort((a, b) => px(b.fontSize) - px(a.fontSize) || a.fontWeight.localeCompare(b.fontWeight));
}

/** Unique padding and gap values, ascending. */
export function spacingScale(measurements: Measurement[]): SeenOn[] {
  return collect(measurements, (m) =>
    ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap", "rowGap", "columnGap"].map((p) => m.styles[p] ?? "").flatMap((v) => v.split(" ")),
  ).sort((a, b) => px(a.value) - px(b.value));
}

export function radii(measurements: Measurement[]): SeenOn[] {
  return collect(measurements, (m) => [m.styles["borderRadius"] ?? ""]).sort((a, b) => px(a.value) - px(b.value));
}

export function shadows(measurements: Measurement[]): SeenOn[] {
  return collect(measurements, (m) => [m.styles["boxShadow"] ?? ""]);
}

export function motion(measurements: Measurement[]): MotionToken[] {
  const map = new Map<string, MotionToken>();
  for (const m of measurements) {
    const duration = m.styles["transitionDuration"] ?? "";
    const timing = m.styles["transitionTimingFunction"] ?? "";
    if (!duration || /^0s(,\s*0s)*$/.test(duration)) continue;
    const key = `${duration}|${timing}`;
    const token = map.get(key) ?? { duration, timing, seenOn: [] };
    token.seenOn.push(`${m.name}@${m.width}`);
    map.set(key, token);
  }
  return Array.from(map.values()).sort((a, b) => b.seenOn.length - a.seenOn.length);
}

/** Widths at which any layout signal differs from the next-wider sample. */
export function breakpointChanges(observed: LayoutSignals[]): number[] {
  const sorted = [...observed].sort((a, b) => b.width - a.width);
  const changes: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const wider = sorted[i - 1];
    const narrower = sorted[i];
    if (!wider || !narrower) continue;
    const differs =
      wider.sidebarExpanded !== narrower.sidebarExpanded ||
      wider.showcaseColumns !== narrower.showcaseColumns ||
      wider.paramsControlVisible !== narrower.paramsControlVisible;
    if (differs) changes.push(narrower.width);
  }
  return changes;
}

export function boxesEqual(a: Box | null, b: Box | null, tolerance = 0.5): boolean {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.w - b.w) <= tolerance && Math.abs(a.h - b.h) <= tolerance;
}

export function buildTokens(input: {
  date: string;
  reference: string;
  bodyFontFamily: string;
  bodyBackground: string;
  fonts: FontFace[];
  notes?: string[];
  cssVariables: Record<string, string>;
  cssVariablesDark?: Record<string, string>;
  darkScopes?: string[];
  computedVariables?: { light: Record<string, string>; dark: Record<string, string> };
  themeMechanism?: ThemeMechanism;
  cssBreakpoints: number[];
  observed: LayoutSignals[];
  elements: (Measurement | MissingMeasurement)[];
}): Tokens {
  const measured = input.elements.filter((m): m is Measurement => !isMissing(m));
  return {
    date: input.date,
    reference: input.reference,
    bodyFontFamily: input.bodyFontFamily,
    bodyBackground: input.bodyBackground,
    fonts: input.fonts,
    notes: input.notes ?? [],
    cssVariables: input.cssVariables,
    cssVariablesDark: input.cssVariablesDark ?? {},
    darkScopes: input.darkScopes ?? [],
    ...(input.computedVariables ? { computedVariables: input.computedVariables } : {}),
    ...(input.themeMechanism ? { themeMechanism: input.themeMechanism } : {}),
    breakpoints: { fromCss: input.cssBreakpoints, observed: input.observed, changesAt: breakpointChanges(input.observed) },
    palette: palette(measured, "light"),
    paletteDark: palette(measured, "dark"),
    typeScale: typeScale(measured),
    spacing: spacingScale(measured),
    radii: radii(measured),
    shadows: shadows(measured),
    motion: motion(measured),
    elements: input.elements,
  };
}

const seen = (s: string[]): string => (s.length > 4 ? `${s.slice(0, 4).join(", ")} +${s.length - 4}` : s.join(", "));

export function renderTokensMarkdown(t: Tokens): string {
  const lines: string[] = [];
  lines.push(`# Design tokens — ${t.reference} — ${t.date}`, "");
  lines.push("Measured from computed styles in our own browser (see STORY_003). Values are what the reference rendered that day; cite this file's date.", "");
  lines.push("## Fonts", "", `Body font stack: \`${t.bodyFontFamily}\`  `, `Body background: \`${t.bodyBackground}\``, "");
  const families = Array.from(new Set(t.fonts.map((f) => f.family))).sort();
  lines.push(families.length ? `Loaded font faces: ${families.map((f) => `\`${f}\``).join(", ")}` : "Loaded font faces: none reported", "");
  for (const note of t.notes) lines.push(`- ${note}`);
  if (t.notes.length) lines.push("");
  lines.push("## Breakpoints", "");
  lines.push(`From the stylesheets (min/max-width queries): ${t.breakpoints.fromCss.length ? t.breakpoints.fromCss.map((b) => `${b}px`).join(", ") : "none found"}  `);
  lines.push(`Observed layout changes when narrowing: ${t.breakpoints.changesAt.length ? t.breakpoints.changesAt.map((b) => `at ${b}px`).join(", ") : "none within the sampled widths"}`, "");
  lines.push("| width | sidebar expanded | composer width | showcase columns | params control visible |", "| --- | --- | --- | --- | --- |");
  for (const o of t.breakpoints.observed) lines.push(`| ${o.width} | ${o.sidebarExpanded ? "yes" : "no"} | ${o.composerWidth ?? "—"} | ${o.showcaseColumns ?? "—"} | ${o.paramsControlVisible ? "yes" : "no"} |`);
  lines.push("");
  if (t.themeMechanism) {
    const tm = t.themeMechanism;
    lines.push("## Theme switch", "");
    lines.push(`Control: ${tm.control}  `, `Document before: \`${tm.documentBefore}\`  `, `Document after: \`${tm.documentAfter}\`  `);
    lines.push(`Body background light: \`${tm.bodyBackgroundLight}\` · dark: \`${tm.bodyBackgroundDark}\``, "");
  }
  lines.push("## Palette", "", "| colour | seen on |", "| --- | --- |");
  for (const p of t.palette) lines.push(`| \`${p.value}\` | ${seen(p.seenOn)} |`);
  if (t.paletteDark.length) {
    lines.push("", "## Palette (dark)", "", "| colour | seen on |", "| --- | --- |");
    for (const p of t.paletteDark) lines.push(`| \`${p.value}\` | ${seen(p.seenOn)} |`);
  }
  lines.push("", "## Type scale", "", "| size | weight | line-height | family | seen on |", "| --- | --- | --- | --- | --- |");
  for (const s of t.typeScale) lines.push(`| ${s.fontSize} | ${s.fontWeight} | ${s.lineHeight} | \`${s.fontFamily.split(",")[0]?.trim() ?? ""}\` | ${seen(s.seenOn)} |`);
  lines.push("", "## Spacing (paddings and gaps)", "", t.spacing.map((s) => `\`${s.value}\``).join(", ") || "none", "");
  lines.push("## Radii", "", "| radius | seen on |", "| --- | --- |");
  for (const r of t.radii) lines.push(`| \`${r.value}\` | ${seen(r.seenOn)} |`);
  lines.push("", "## Shadows", "", "| shadow | seen on |", "| --- | --- |");
  for (const s of t.shadows) lines.push(`| \`${s.value}\` | ${seen(s.seenOn)} |`);
  lines.push("", "## Motion", "", "| duration | timing | seen on |", "| --- | --- | --- |");
  for (const m of t.motion) lines.push(`| ${m.duration} | ${m.timing} | ${seen(m.seenOn)} |`);
  const names = Array.from(new Set([...Object.keys(t.cssVariables), ...Object.keys(t.cssVariablesDark)]));
  const hasDark = Object.keys(t.cssVariablesDark).length > 0;
  lines.push("", hasDark ? "## CSS custom properties on :root (light and dark)" : "## CSS custom properties on :root", "");
  if (hasDark) lines.push(`Dark values declared under: ${t.darkScopes.map((d) => `\`${d}\``).join(", ")}`, "");
  if (!names.length) lines.push("None found in the fetched stylesheets.");
  else if (hasDark) lines.push("| name | light | dark |", "| --- | --- | --- |", ...names.map((k) => `| \`${k}\` | \`${t.cssVariables[k] ?? "—"}\` | \`${t.cssVariablesDark[k] ?? "—"}\` |`));
  else lines.push("| name | value |", "| --- | --- |", ...names.map((k) => `| \`${k}\` | \`${t.cssVariables[k] ?? ""}\` |`));
  if (t.computedVariables) {
    const changed = Object.keys(t.computedVariables.light).filter((k) => t.computedVariables?.light[k] !== t.computedVariables?.dark[k]);
    lines.push("", "## Computed custom properties that differ between the themes (read live on the root)", "");
    if (!changed.length) lines.push("None — every computed value is the same in both themes.");
    else lines.push("| name | light | dark |", "| --- | --- | --- |", ...changed.map((k) => `| \`${k}\` | \`${t.computedVariables?.light[k] ?? ""}\` | \`${t.computedVariables?.dark[k] ?? ""}\` |`));
  }
  lines.push("", "## Elements", "", "| element | state | width | theme | box (x,y,w,h) | font | colour | background | radius |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const e of t.elements) {
    if (isMissing(e)) {
      lines.push(`| ${e.name} | ${e.state} | ${e.width} | ${themeOf(e)} | not found: ${e.missing} | | | | |`);
      continue;
    }
    const s = e.styles;
    lines.push(`| ${e.name} | ${e.state} | ${e.width} | ${themeOf(e)} | ${e.box.x},${e.box.y},${e.box.w},${e.box.h} | ${s["fontSize"]}/${s["fontWeight"]} | \`${s["color"]}\` | \`${s["backgroundColor"]}\` | ${s["borderRadius"]} |`);
  }
  lines.push("");
  return lines.join("\n");
}
