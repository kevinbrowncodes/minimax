/** STORY_049's guard: no test file and no fixture carries a private-key block — the gate's key is generated per run. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|json|txt|md|mts)$/.test(name)) out.push(full);
  }
  return out;
}

describe("no private key in the repo's tests or fixtures", () => {
  it("scans app/ and the stub for a PEM private-key block", () => {
    const roots = [path.resolve(__dirname, ".."), path.resolve(__dirname, "../../tools/stub-generation-server")];
    const offenders = roots.flatMap((r) => walk(r)).filter((f) => !f.endsWith("no-private-keys.test.ts") && readFileSync(f, "utf8").includes("-----BEGIN " + "PRIVATE KEY-----"));
    expect(offenders).toEqual([]);
  });
});
