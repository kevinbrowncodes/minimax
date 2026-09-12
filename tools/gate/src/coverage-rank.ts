/**
 * Rank files by missing branches from a Vitest/istanbul coverage-summary.json (STORY_011), so that when a threshold
 * fails the defensible place to add a test is obvious (CLAUDE.md §4, the coverage-gate paragraph).
 *
 *   node tools/gate/src/coverage-rank.ts app/coverage/coverage-summary.json [limit]
 */
import { readFileSync } from "node:fs";

interface Metric {
  readonly total: number;
  readonly covered: number;
  readonly pct: number | "Unknown";
}
interface FileSummary {
  readonly lines: Metric;
  readonly branches: Metric;
  readonly functions: Metric;
  readonly statements: Metric;
}
export type CoverageSummary = Readonly<Record<string, FileSummary>>;

export interface Ranked {
  readonly file: string;
  readonly missingBranches: number;
  readonly missingLines: number;
  readonly branchPct: number;
  readonly linePct: number;
}

const pct = (m: Metric): number => (typeof m.pct === "number" ? m.pct : 0);

export function rank(summary: CoverageSummary, limit = 10): readonly Ranked[] {
  return Object.entries(summary)
    .filter(([file]) => file !== "total")
    .map(([file, s]) => ({
      file,
      missingBranches: s.branches.total - s.branches.covered,
      missingLines: s.lines.total - s.lines.covered,
      branchPct: pct(s.branches),
      linePct: pct(s.lines),
    }))
    .filter((r) => r.missingBranches > 0 || r.missingLines > 0)
    .sort((a, b) => b.missingBranches - a.missingBranches || b.missingLines - a.missingLines || a.file.localeCompare(b.file))
    .slice(0, limit);
}

export function format(ranked: readonly Ranked[], root = process.cwd()): string {
  if (ranked.length === 0) return "every file is fully covered";
  const rows = ranked.map((r) => `${String(r.missingBranches).padStart(4)} branches  ${String(r.missingLines).padStart(4)} lines missing  (${r.branchPct.toFixed(1)}% / ${r.linePct.toFixed(1)}%)  ${r.file.startsWith(root) ? r.file.slice(root.length + 1) : r.file}`);
  return ["files with the most uncovered branches (branches / lines missing):", ...rows].join("\n");
}

if (process.argv[1]?.endsWith("coverage-rank.ts")) {
  const file = process.argv[2];
  if (file === undefined) {
    console.error("usage: coverage-rank.ts <coverage-summary.json> [limit]");
    process.exit(2);
  }
  const summary = JSON.parse(readFileSync(file, "utf8")) as CoverageSummary;
  console.log(format(rank(summary, Number(process.argv[3] ?? "10"))));
}
