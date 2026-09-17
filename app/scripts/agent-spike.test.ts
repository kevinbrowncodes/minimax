/** STORY_048's guard: the spike imports only lib/ and node: modules, so what it sends is what the route (STORY_049) sends. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("the spike script", () => {
  it("imports only from ../lib and node:", () => {
    const source = readFileSync(path.join(__dirname, "agent-spike.ts"), "utf8");
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
    expect(specifiers.length).toBeGreaterThan(0);
    for (const spec of specifiers) expect(spec.startsWith("node:") || spec.startsWith("../lib/")).toBe(true);
  });
});
