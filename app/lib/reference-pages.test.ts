import { describe, expect, it } from "vitest";
import { AGENTS, MANAGE_TABS, PLUGIN_CATEGORIES, PLUGINS, PLUGINS_TOTAL, PRODUCTS, SKILLS } from "./reference-pages";

describe("the reference pages' content (STORY_025)", () => {
  it("has the captured counts: 11 categories, 8 plugins of 27, 8 skills, 4 manage tabs, 3 agents, 3 features per product", () => {
    expect(PLUGIN_CATEGORIES).toHaveLength(11);
    expect(PLUGIN_CATEGORIES[0]).toBe("All");
    expect(PLUGINS).toHaveLength(8);
    expect(PLUGINS_TOTAL).toBe(27);
    expect(SKILLS).toHaveLength(8);
    expect(MANAGE_TABS.map((t) => `${t.label} ${String(t.count)}`)).toEqual(["Plugins 1", "Skills 10", "Apps 0", "Agents 3"]);
    expect(AGENTS).toEqual(["General", "Coder", "Verifier"]);
    for (const product of Object.values(PRODUCTS)) expect(product.features).toHaveLength(3);
    expect(PRODUCTS["max-claw"].availableOn).toBe("Telegram");
    expect(PRODUCTS["max-hermes"].availableOn).toBeUndefined();
  });
});
