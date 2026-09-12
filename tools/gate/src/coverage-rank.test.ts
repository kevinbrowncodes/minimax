import { describe, expect, it } from "vitest";
import { format, rank, type CoverageSummary } from "./coverage-rank.ts";

const metric = (total: number, covered: number) => ({ total, covered, pct: total === 0 ? 100 : (covered / total) * 100 });
const file = (lines: [number, number], branches: [number, number]) => ({
  lines: metric(...lines),
  branches: metric(...branches),
  functions: metric(1, 1),
  statements: metric(...lines),
});
const summary: CoverageSummary = {
  total: file([100, 80], [40, 30]),
  "/work/app/lib/a.ts": file([50, 45], [20, 12]),
  "/work/app/lib/b.ts": file([30, 20], [10, 2]),
  "/work/app/lib/c.ts": file([20, 15], [10, 2]),
  "/work/app/lib/full.ts": file([10, 10], [4, 4]),
};

describe("rank", () => {
  it("orders by missing branches, then missing lines, then name, and skips fully covered files and the total", () => {
    expect(rank(summary).map((r) => [r.file, r.missingBranches, r.missingLines])).toEqual([
      ["/work/app/lib/a.ts", 8, 5],
      ["/work/app/lib/b.ts", 8, 10],
      ["/work/app/lib/c.ts", 8, 5],
    ].sort((x, y) => (y[1] as number) - (x[1] as number) || (y[2] as number) - (x[2] as number) || String(x[0]).localeCompare(String(y[0]))));
    expect(rank(summary).some((r) => r.file === "total" || r.file.endsWith("full.ts"))).toBe(false);
  });

  it("honours the limit and formats paths relative to the root", () => {
    expect(rank(summary, 1)).toHaveLength(1);
    const text = format(rank(summary, 2), "/work");
    expect(text).toContain("app/lib/b.ts");
    expect(text).not.toContain("/work/app");
    expect(format([])).toBe("every file is fully covered");
  });
});
