/** Pure helpers that turn raw measurements into the tokens file and its summary. */

export type Box = { x: number; y: number; w: number; h: number };

export type Measurement = {
  name: string;
  state: string;
  width: number;
  tag: string;
  text: string;
  box: Box;
  styles: Record<string, string>;
};

export type MissingMeasurement = { name: string; state: string; width: number; missing: string };

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

export type Tokens = {
  date: string;
  reference: string;
  bodyFontFamily: string;
  bodyBackground: string;
  fonts: FontFace[];
  notes: string[];
  cssVariables: Record<string, string>;
  breakpoints: { fromCss: number[]; observed: LayoutSignals[]; changesAt: number[] };
  palette: SeenOn[];
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

/** Custom properties declared on :root or html, first declaration wins. */
export function parseCssVariables(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  const blocks = css.matchAll(/(?<=^|[}\s;])(?::root|html)(?:\s*,\s*(?::root|html))?\s*\{([^}]*)\}/g);
  for (const block of blocks) {
    const body = block[1] ?? "";
    for (const decl of body.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g)) {
      const name = decl[1];
      const value = decl[2]?.trim();
      if (name && value && !(name in out)) out[name] = value;
    }
  }
  return out;
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
export function palette(measurements: Measurement[]): SeenOn[] {
  return collect(measurements, (m) => [m.styles["color"] ?? "", m.styles["backgroundColor"] ?? "", m.styles["borderTopColor"] ?? ""].filter((c, i) => !(i === 2 && (m.styles["borderTopStyle"] === "none" || px(m.styles["borderTopWidth"]) === 0))));
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
    token.seenOn.push(`${m.name}@${m.width}`);
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
    breakpoints: { fromCss: input.cssBreakpoints, observed: input.observed, changesAt: breakpointChanges(input.observed) },
    palette: palette(measured),
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
  lines.push("## Palette", "", "| colour | seen on |", "| --- | --- |");
  for (const p of t.palette) lines.push(`| \`${p.value}\` | ${seen(p.seenOn)} |`);
  lines.push("", "## Type scale", "", "| size | weight | line-height | family | seen on |", "| --- | --- | --- | --- | --- |");
  for (const s of t.typeScale) lines.push(`| ${s.fontSize} | ${s.fontWeight} | ${s.lineHeight} | \`${s.fontFamily.split(",")[0]?.trim() ?? ""}\` | ${seen(s.seenOn)} |`);
  lines.push("", "## Spacing (paddings and gaps)", "", t.spacing.map((s) => `\`${s.value}\``).join(", ") || "none", "");
  lines.push("## Radii", "", "| radius | seen on |", "| --- | --- |");
  for (const r of t.radii) lines.push(`| \`${r.value}\` | ${seen(r.seenOn)} |`);
  lines.push("", "## Shadows", "", "| shadow | seen on |", "| --- | --- |");
  for (const s of t.shadows) lines.push(`| \`${s.value}\` | ${seen(s.seenOn)} |`);
  lines.push("", "## Motion", "", "| duration | timing | seen on |", "| --- | --- | --- |");
  for (const m of t.motion) lines.push(`| ${m.duration} | ${m.timing} | ${seen(m.seenOn)} |`);
  const vars = Object.entries(t.cssVariables);
  lines.push("", "## CSS custom properties on :root", "", vars.length ? "| name | value |" : "None found in the fetched stylesheets.", ...(vars.length ? ["| --- | --- |", ...vars.map(([k, v]) => `| \`${k}\` | \`${v}\` |`)] : []));
  lines.push("", "## Elements", "", "| element | state | width | box (x,y,w,h) | font | colour | background | radius |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const e of t.elements) {
    if (isMissing(e)) {
      lines.push(`| ${e.name} | ${e.state} | ${e.width} | not found: ${e.missing} | | | | |`);
      continue;
    }
    const s = e.styles;
    lines.push(`| ${e.name} | ${e.state} | ${e.width} | ${e.box.x},${e.box.y},${e.box.w},${e.box.h} | ${s["fontSize"]}/${s["fontWeight"]} | \`${s["color"]}\` | \`${s["backgroundColor"]}\` | ${s["borderRadius"]} |`);
  }
  lines.push("");
  return lines.join("\n");
}
