import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INERT_NOTICE } from "./Inert";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { PromoCard } from "./PromoCard";
import { SearchDialog } from "./SearchDialog";
import { SettingsDialog } from "./SettingsDialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
});

const recents = [
  { id: "new", title: "Paper boat on rain puddle", finishedAt: "2026-09-13T12:00:00Z" },
  { id: "old", title: "Single candle on wooden table", finishedAt: "2026-08-01T12:00:00Z" },
];
const now = () => new Date("2026-09-14T12:00:00Z");

describe("SearchDialog (STORY_021; page-search@1440)", () => {
  it("groups the history by age, filters live, and a row opens the task", () => {
    const onClose = vi.fn();
    render(<SearchDialog open recents={recents} onClose={onClose} now={now} />);
    const dialog = screen.getByRole("dialog", { name: "Search tasks" });
    expect(within(dialog).getByText("Previous 7 days")).toBeInTheDocument();
    expect(within(dialog).getByText("Older")).toBeInTheDocument();
    const input = within(dialog).getByRole("searchbox", { name: "Search task titles" });
    expect(input).toHaveFocus();
    act(() => {
      fireEvent.change(input, { target: { value: "candle" } });
    });
    expect(within(dialog).queryByText("Previous 7 days")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Single candle on wooden table" })).toBeInTheDocument();
    act(() => {
      within(dialog).getByRole("button", { name: "Single candle on wooden table" }).click();
    });
    expect(push).toHaveBeenCalledWith("/task/old");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says so when nothing matches, and closes on Escape, Close and the backdrop", () => {
    const onClose = vi.fn();
    render(<SearchDialog open recents={recents} onClose={onClose} now={now} />);
    act(() => {
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    });
    expect(screen.getByText("No matching tasks.")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    screen.getByRole("button", { name: "Close" }).click();
    fireEvent.mouseDown(screen.getByTestId("search-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(3);
    cleanup();
    render(<SearchDialog open={false} recents={recents} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("CreateProjectDialog (STORY_021; page-add-new-project@1440)", () => {
  it("renders the reference's dialog with Create inert", () => {
    const onClose = vi.fn();
    render(<CreateProjectDialog open onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Final Essay")).toHaveFocus();
    act(() => {
      screen.getByRole("button", { name: "Create" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    screen.getByRole("button", { name: "Close" }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("PromoCard (STORY_021; home-signed-in@1440, promo-carousel-page-2@1440)", () => {
  it("has two pages behind dots named 1 and 2, an inert Download desktop on page 2, and a close", () => {
    const onDismiss = vi.fn();
    render(<PromoCard onDismiss={onDismiss} />);
    expect(screen.getByText(/H3 takes the stage/)).toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "2" }).click();
    });
    expect(screen.getByText("New MiniMax Desktop")).toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "Download desktop" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    screen.getByRole("button", { name: "Close" }).click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("SettingsDialog sections (STORY_021; settings-account/usage/archived-tasks@1440)", () => {
  it("the nav switches sections and every control in them is inert", () => {
    render(<SettingsDialog open choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    act(() => {
      screen.getByRole("button", { name: "Account" }).click();
    });
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    for (const name of ["Edit avatar", "Edit nickname", "Manage", "Delete account", "Cancel", "Save"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    act(() => {
      screen.getByRole("button", { name: "Usage" }).click();
    });
    expect(screen.getByText("No Token Plan subscribed")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Use Credits after Token Plan limit" })).toHaveAttribute("aria-disabled", "true");
    act(() => {
      screen.getByRole("button", { name: "Recharge" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    act(() => {
      screen.getByRole("button", { name: "Archived tasks" }).click();
    });
    expect(screen.getByPlaceholderText("Search archived tasks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All projects" })).toHaveAttribute("aria-disabled", "true");
    act(() => {
      screen.getByRole("button", { name: "General" }).click();
    });
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument();
  });
});

describe("SearchDialog rows named by creation minute (CHORE_008)", () => {
  it("shows the stamp, keeps the title as tooltip and accessible name, and still matches the title when searching", () => {
    const created = new Date(2026, 8, 14, 18, 30).toISOString();
    render(<SearchDialog open recents={[{ id: "c1", title: "Find me by title", createdAt: created, finishedAt: created }]} onClose={() => undefined} now={now} />);
    const dialog = screen.getByRole("dialog", { name: "Search tasks" });
    act(() => {
      fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "find me" } });
    });
    const row = within(dialog).getByRole("button", { name: "26-09-14-1830, Find me by title" });
    expect(row).toHaveTextContent("26-09-14-1830");
    expect(row).toHaveAttribute("title", "Find me by title");
    expect(within(dialog).getByRole("button", { name: /Find me by title/ })).toBe(row);
  });
});
