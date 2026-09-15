import { describe, expect, it } from "vitest";
import { AGENTS, MANAGE_TABS } from "./reference-pages";

describe("the reference pages' content (STORY_025; STORY_026 dropped the marketplace and Schedules)", () => {
  it("has the captured counts: 4 manage tabs, 3 agents (STORY_028 removed the product pages)", () => {
    expect(MANAGE_TABS.map((t) => `${t.label} ${String(t.count)}`)).toEqual(["Plugins 1", "Skills 10", "Apps 0", "Agents 3"]);
    expect(AGENTS).toEqual(["General", "Coder", "Verifier"]);
  });
});
