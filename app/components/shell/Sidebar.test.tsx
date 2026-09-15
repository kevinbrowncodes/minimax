import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SHELL_PREFS } from "@/lib/shell-prefs";
import { Sidebar } from "./Sidebar";

afterEach(cleanup);

const recents = [
  { id: "j1", title: "Paper boat on rain puddle", finishedAt: "2026-09-12T18:00:00Z" },
  { id: "j2", title: "Paper boat in rain puddle", finishedAt: "2026-09-12T18:00:00Z", openedAt: "2026-09-12T19:00:00Z" },
];

describe("Sidebar", () => {
  it("renders the captured rows in order with More and Projects folded by default (2026-09-14); the rows lead to our pages (STORY_025)", () => {
    const { container } = render(<Sidebar pathname="/" recents={[]} />);
    const texts = [...container.querySelectorAll('[class*="rowLabel"]')].map((el) => el.textContent);
    expect(texts).toEqual(["New task", "Search", "Plugins", "Assets", "Connect mobile"]); // STORY_026: no Scheduled
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("href", "/assets");
    expect(screen.getByRole("link", { name: "Plugins" })).toHaveAttribute("href", "/plugins");
    expect(screen.getByRole("link", { name: "Connect mobile" })).toHaveAttribute("href", "/connect-mobile");
    expect(screen.getByRole("link", { name: "View now" })).toHaveAttribute("href", "/plugins"); // Management lives at /plugins (STORY_026)
    const search = screen.getByText("Search").closest("[role=link]");
    expect(search).toHaveAttribute("aria-disabled", "true"); // Search without a handler stays inert
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument(); // STORY_028: no More section
    expect(screen.getByRole("button", { name: "Projects" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Recents" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No task history.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Inbox/ })).toBeInTheDocument();
    expect(screen.getByTestId("agents-guide")).toHaveTextContent("You can now find Agents in Plugins");
  });

  it("unfolded sections show their rows; the header reports the toggle (STORY_021)", () => {
    const onToggleSection = vi.fn();
    const prefs = { ...DEFAULT_SHELL_PREFS, folded: { projects: false, recents: true } };
    render(<Sidebar pathname="/" recents={recents} prefs={prefs} onToggleSection={onToggleSection} onOpenCreateProject={() => undefined} />);
    for (const name of ["MaxHermes", "MaxClaw"]) expect(screen.queryByRole("link", { name })).not.toBeInTheDocument(); // STORY_028
    expect(screen.getByRole("button", { name: "Add new project" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Paper boat/ })).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Recents" }).click();
    expect(onToggleSection).toHaveBeenCalledWith("recents");
  });

  it("marks the active row from the path and lists recents with the unread dot", () => {
    const { rerender } = render(<Sidebar pathname="/assets" recents={recents} />);
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "New task" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Paper boat on rain puddle/ })).toHaveAttribute("href", "/task/j1");
    expect(screen.getAllByLabelText("New result")).toHaveLength(1);
    rerender(<Sidebar pathname="/task/j1" recents={recents} />);
    expect(screen.getByRole("link", { name: /Paper boat on rain puddle/ })).toHaveAttribute("aria-current", "page");
  });

  it("a Recents row's ⋯ opens the reference's menu; Delete calls the handler, the rest show the notice (STORY_021)", () => {
    const onDeleteRecent = vi.fn();
    render(<Sidebar pathname="/" recents={recents} onDeleteRecent={onDeleteRecent} />);
    act(() => {
      screen.getByRole("button", { name: "More actions for Paper boat on rain puddle" }).click();
    });
    const menu = screen.getByRole("menu", { name: "Actions for Paper boat on rain puddle" });
    const items = within(menu).getAllByRole("menuitem").map((el) => el.getAttribute("aria-label") ?? el.textContent.trim());
    expect(items).toEqual(["Rename", "Pin", "Copy conversation ID", "Move to project", "Archive", "Delete"]);
    act(() => {
      within(menu).getByRole("menuitem", { name: "Rename" }).click();
    });
    expect(within(menu).getByRole("status")).toHaveTextContent("Not part of MiniMax Local");
    act(() => {
      within(menu).getByRole("menuitem", { name: "Delete" }).click();
    });
    expect(onDeleteRecent).toHaveBeenCalledWith(recents[0]);
    expect(screen.queryByRole("menu", { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it("the menu closes on Escape", () => {
    render(<Sidebar pathname="/" recents={recents} />);
    act(() => {
      screen.getByRole("button", { name: "More actions for Paper boat on rain puddle" }).click();
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.queryByRole("menu", { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it("shows six recents, then all after Show more (STORY_021)", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `j${String(i)}`, title: `Title ${String(i)}` }));
    render(<Sidebar pathname="/" recents={many} />);
    expect(screen.getAllByRole("link", { name: /^Title/ })).toHaveLength(6);
    act(() => {
      screen.getByRole("button", { name: "Show more" }).click();
    });
    expect(screen.getAllByRole("link", { name: /^Title/ })).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("the guide card dismisses; Search and Add new project open our dialogs; the Inbox opens its popover", () => {
    const onDismissGuide = vi.fn();
    const onOpenSearch = vi.fn();
    const onOpenCreateProject = vi.fn();
    const prefs = { ...DEFAULT_SHELL_PREFS, folded: { ...DEFAULT_SHELL_PREFS.folded, projects: false } };
    render(<Sidebar pathname="/" recents={[]} prefs={prefs} onDismissGuide={onDismissGuide} onOpenSearch={onOpenSearch} onOpenCreateProject={onOpenCreateProject} />);
    screen.getByRole("button", { name: "Dismiss Agents guide" }).click();
    expect(onDismissGuide).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Search" }).click();
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Add new project" }).click();
    expect(onOpenCreateProject).toHaveBeenCalledTimes(1);
    act(() => {
      screen.getByRole("button", { name: /^Inbox/ }).click();
    });
    expect(screen.getByRole("dialog", { name: "Inbox" })).toHaveTextContent("No messages yet");
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog", { name: "Inbox" })).not.toBeInTheDocument();
  });

  it("the rail renders icon pills only and the logo expands (STORY_021; sidebar-collapsed@1440)", () => {
    const onExpand = vi.fn();
    const { container } = render(<Sidebar pathname="/assets" recents={recents} rail onExpand={onExpand} />);
    expect(container.querySelectorAll('[class*="rowLabel"]')).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Paper boat/ })).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Expand sidebar" }).click();
    expect(onExpand).toHaveBeenCalledTimes(1);
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

  it("an inert row answers a click with the notice (STORY_019); the page rows light up on their paths (STORY_025)", () => {
    render(<Sidebar pathname="/" recents={[]} />);
    act(() => {
      screen.getByRole("link", { name: "Search" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Not part of MiniMax Local");
    cleanup();
    render(<Sidebar pathname="/plugins" recents={[]} />);
    expect(screen.getByRole("link", { name: "Plugins" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Download desktop" })).not.toBeInTheDocument(); // STORY_026
    cleanup();
    render(<Sidebar pathname="/connect-mobile" recents={[]} rail />);
    expect(screen.getByRole("link", { name: "Connect mobile" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Recents rows named by creation minute (CHORE_008)", () => {
  it("shows the stamp as the label, keeps the prompt as the tooltip and in the accessible name, and falls back to the title without createdAt", () => {
    const created = new Date(2026, 8, 14, 12, 0).toISOString();
    render(<Sidebar pathname="/" recents={[{ id: "s1", title: "[0:00-0:03] From his standing stance, he…", createdAt: created, finishedAt: created }, { id: "s2", title: "Old store entry", finishedAt: created }]} />);
    const row = screen.getByRole("link", { name: "26-09-14-1200, [0:00-0:03] From his standing stance, he…" });
    expect(row).toHaveAttribute("href", "/task/s1");
    expect(row).toHaveTextContent("26-09-14-1200");
    expect(row).not.toHaveTextContent("standing stance");
    expect(screen.getByTitle("[0:00-0:03] From his standing stance, he…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /From his standing stance/ })).toBe(row);
    expect(screen.getByRole("link", { name: "Old store entry" })).toHaveTextContent("Old store entry");
  });
});
