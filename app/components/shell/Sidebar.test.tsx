import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

afterEach(cleanup);

describe("Sidebar", () => {
  it("renders every captured row in order, with the out-of-MVP rows inert", () => {
    const { container } = render(<Sidebar pathname="/" recents={[]} />);
    const labels = ["New task", "Search", "Plugins", "Scheduled", "Assets", "Connect Mobile", "MaxHermes", "MaxClaw", "Add new project", "General", "Coder", "Verifier"];
    const texts = [...container.querySelectorAll('[class*="rowLabel"]')].map((el) => el.textContent);
    expect(texts).toEqual(labels);
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("href", "/assets");
    for (const name of ["Search", "Plugins", "Scheduled", "Connect Mobile"]) {
      const row = screen.getByText(name).closest("[role=link]");
      expect(row).toHaveAttribute("aria-disabled", "true");
      expect(row).not.toHaveAttribute("href");
    }
    expect(screen.getByText("No task history.")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("marks the active row from the path and lists recents with the unread dot", () => {
    const recents = [
      { id: "j1", title: "Paper boat on rain puddle", finishedAt: "2026-09-12T18:00:00Z" },
      { id: "j2", title: "Paper boat in rain puddle", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T19:00:00Z" },
    ];
    const { rerender } = render(<Sidebar pathname="/assets" recents={recents} />);
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "New task" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Paper boat on rain puddle/ })).toHaveAttribute("href", "/task/j1");
    expect(screen.getAllByLabelText("New result")).toHaveLength(1);
    rerender(<Sidebar pathname="/task/j1" recents={recents} />);
    expect(screen.getByRole("link", { name: /Paper boat on rain puddle/ })).toHaveAttribute("aria-current", "page");
  });

  it("calls onNavigate for a real link and onCollapse for the collapse button", () => {
    const onNavigate = vi.fn();
    const onCollapse = vi.fn();
    render(<Sidebar pathname="/" recents={[]} onNavigate={onNavigate} onCollapse={onCollapse} />);
    screen.getByRole("link", { name: "Assets" }).click();
    screen.getByRole("button", { name: "Collapse sidebar" }).click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});
