import { describe, expect, it } from "vitest";
import { AGENTS, MANAGE_TABS, PRODUCTS } from "./reference-pages";

describe("the reference pages' content (STORY_025; STORY_026 dropped the marketplace and Schedules)", () => {
  it("has the captured counts: 4 manage tabs, 3 agents, 3 features per product", () => {
    expect(MANAGE_TABS.map((t) => `${t.label} ${String(t.count)}`)).toEqual(["Plugins 1", "Skills 10", "Apps 0", "Agents 3"]);
    expect(AGENTS).toEqual(["General", "Coder", "Verifier"]);
    for (const product of Object.values(PRODUCTS)) expect(product.features).toHaveLength(3);
    expect(PRODUCTS["max-claw"].availableOn).toBe("Telegram");
    expect(PRODUCTS["max-hermes"].availableOn).toBeUndefined();
  });
});
