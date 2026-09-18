/** STORY_057: the chain's rows under the user bubble. */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ChainSegmentView } from "@/lib/chain-outcome";
import { ChainOutcomes } from "./ChainOutcomes";

const rows: ChainSegmentView[] = [
  { id: "s1", index: 1, title: "In the first two seconds, the man…", status: "done", progress: 100, outcome: "done" },
  { id: "s2", index: 2, title: "For the first moment he holds…", status: "done", progress: 100, outcome: "cut-at-join" },
  { id: "s3", index: 3, title: "For the first moment he leans…", status: "queued", progress: 0, outcome: "waiting" },
];
afterEach(cleanup);

describe("ChainOutcomes (STORY_057)", () => {
  it("one row per segment with its index, outcome and title; the current one reads 'this' and is not a link; the others link to their pages", () => {
    render(<ChainOutcomes segments={rows} currentId="s2" />);
    expect(screen.getByTestId("chain-outcomes")).toHaveTextContent("Chain · 3 segments");
    const items = screen.getAllByTestId("chain-outcome-row");
    expect(items.map((r) => r.getAttribute("data-outcome"))).toEqual(["done", "cut-at-join", "waiting"]);
    expect(items[0]).toHaveTextContent("1 done In the first two seconds, the man…");
    expect(items[1]).toHaveTextContent("2 cut at the join For the first moment he holds… this");
    expect(items[2]).toHaveTextContent("3 waiting · after 2 For the first moment he leans…");
    expect(within(items[0] as HTMLElement).getByRole("link")).toHaveAttribute("href", "/task/s1");
    expect(within(items[1] as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByRole("link")).toHaveAttribute("href", "/task/s3");
  });
  it("renders nothing for a chain of one", () => {
    render(<ChainOutcomes segments={rows.slice(0, 1)} currentId="s1" />);
    expect(screen.queryByTestId("chain-outcomes")).not.toBeInTheDocument();
  });
});
