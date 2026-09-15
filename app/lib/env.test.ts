import { describe, expect, it } from "vitest";
import { KEY_RE, MASK, isValidKey } from "./env";

describe("environment variable names (STORY_035)", () => {
  it("accept shell-style names and refuse the rest", () => {
    for (const ok of ["TELEGRAM_BOT_TOKEN", "A", "_X1", "KEY_2"]) expect(isValidKey(ok), ok).toBe(true);
    for (const bad of ["", "1ABC", "lower", "WITH-DASH", "WITH SPACE", "ÜMLAUT", "a.b"]) expect(isValidKey(bad), bad).toBe(false);
    expect(KEY_RE.source).toBe("^[A-Z_][A-Z0-9_]*$");
    expect(MASK).toBe("••••••••");
  });
});
