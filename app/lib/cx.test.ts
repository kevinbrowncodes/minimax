import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins strings and drops falsy values", () => {
    expect(cx("a", undefined, false, "b", null, "")).toBe("a b");
    expect(cx()).toBe("");
  });
});
