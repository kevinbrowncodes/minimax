import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INERT_NOTICE } from "./Inert";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { SearchDialog } from "./SearchDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
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

describe("CreateProjectDialog with a handler (STORY_031; behaviour-project-create-01..02)", () => {
  it("Create is inactive until a name is typed, then posts the trimmed name on the button or Enter; an error shows", () => {
    const onCreate = vi.fn();
    const { rerender } = render(<CreateProjectDialog open onClose={() => undefined} onCreate={onCreate} />);
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Final Essay"), { target: { value: "  My film " } });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith("My film");
    fireEvent.submit(screen.getByRole("dialog", { name: "Create project" }));
    expect(onCreate).toHaveBeenCalledTimes(2);
    rerender(<CreateProjectDialog open onClose={() => undefined} onCreate={onCreate} busy error="That did not save" />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("That did not save");
  });
});

describe("DeleteProjectDialog (STORY_031; behaviour-project-delete-04)", () => {
  it("asks the reference's question, says the tasks stay, and Cancel / Delete / Escape do their jobs", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const project = { id: "p1", name: "My film", createdAt: "2026-09-15T09:00:00Z" };
    const { rerender } = render(<DeleteProjectDialog project={project} taskCount={3} onCancel={onCancel} onConfirm={onConfirm} />);
    const dialog = screen.getByRole("dialog", { name: "Delete project" });
    expect(dialog).toHaveTextContent('Are you sure you want to delete project "My film"? This action cannot be undone. Its 3 tasks stay in Recents.');
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledWith(project);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
    rerender(<DeleteProjectDialog project={{ ...project, name: "Empty" }} taskCount={0} onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByRole("dialog")).not.toHaveTextContent("stay in Recents");
    rerender(<DeleteProjectDialog project={undefined} taskCount={0} onCancel={onCancel} onConfirm={onConfirm} />);
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


describe("SettingsDialog sections (STORY_021; settings-archived-tasks@1440; STORY_026 removed Account and Usage)", () => {
  it("the nav is General and Archived tasks; Archived tasks has its search and the project filter (real since STORY_031)", () => {
    render(<SettingsDialog open choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getAllByRole("button", { name: /^(General|Account|Usage|Archived tasks)$/ }).map((el) => el.textContent.trim())).toEqual(["General", "Archived tasks"]);
    act(() => {
      screen.getByRole("button", { name: "Archived tasks" }).click();
    });
    expect(screen.getByRole("dialog", { name: "Archived tasks" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search archived tasks")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Project filter" })).toHaveDisplayValue("All projects");
    expect(screen.getByText("No archived tasks.")).toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "General" }).click();
    });
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument();
  });
});

describe("SettingsDialog › General's watermark switch (STORY_034)", () => {
  it("reflects the setting and asks for the flipped value; without a handler it keeps the notice", () => {
    const onRemoveWatermark = vi.fn();
    const { rerender } = render(<SettingsDialog open removeWatermark onRemoveWatermark={onRemoveWatermark} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    const toggle = screen.getByRole("switch", { name: "Remove watermark setting" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onRemoveWatermark).toHaveBeenCalledWith(false);
    rerender(<SettingsDialog open removeWatermark={false} onRemoveWatermark={onRemoveWatermark} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole("switch", { name: "Remove watermark setting" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("switch", { name: "Remove watermark setting" }));
    expect(onRemoveWatermark).toHaveBeenLastCalledWith(true);
    rerender(<SettingsDialog open choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole("switch", { name: "Remove watermark setting" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("SettingsDialog › Archived tasks (STORY_030; behaviour-recents-archive-03…05)", () => {
  const archived = [
    { id: "late", title: "Single candle on wooden table", createdAt: new Date(2026, 8, 15, 12, 24).toISOString(), finishedAt: "2026-09-15T12:30:00Z", archived: true, archivedAt: new Date(2026, 8, 15, 14, 0).toISOString() },
    { id: "early", title: "Paper boat on rain puddle", createdAt: new Date(2026, 8, 15, 12, 11).toISOString(), finishedAt: "2026-09-15T12:20:00Z", archived: true, archivedAt: new Date(2026, 8, 15, 12, 11).toISOString() },
  ];

  it("opens on the section it is told to, lists the rows with stamp, title and archive time, and Unarchive / trash / Delete all call their handlers", () => {
    const onUnarchive = vi.fn();
    const onDeleteArchived = vi.fn();
    const onDeleteAllArchived = vi.fn();
    render(<SettingsDialog open initialSection="Archived tasks" archived={archived} onUnarchive={onUnarchive} onDeleteArchived={onDeleteArchived} onDeleteAllArchived={onDeleteAllArchived} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole("dialog", { name: "Archived tasks" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "No project" })).toBeInTheDocument();
    const rows = screen.getAllByTestId("archived-row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "26-09-15-1224 — Single candle on wooden tableSep 15, 2026, 2:00 PMUnarchive",
      "26-09-15-1211 — Paper boat on rain puddleSep 15, 2026, 12:11 PMUnarchive",
    ]);
    act(() => {
      screen.getByRole("button", { name: "Unarchive Paper boat on rain puddle" }).click();
    });
    expect(onUnarchive).toHaveBeenCalledWith(archived[1]);
    act(() => {
      screen.getByRole("button", { name: "Delete Single candle on wooden table" }).click();
    });
    expect(onDeleteArchived).toHaveBeenCalledWith(archived[0]);
    act(() => {
      screen.getByRole("button", { name: "Delete all" }).click();
    });
    expect(onDeleteAllArchived).toHaveBeenCalledTimes(1);
  });

  it("groups the rows by project with No project first and the All projects filter narrows to one (STORY_031)", () => {
    const projects = [{ id: "p1", name: "My film", createdAt: "2026-09-15T09:00:00Z" }, { id: "p2", name: "Second", createdAt: "2026-09-15T09:30:00Z" }];
    const [late, early] = archived;
    if (!late || !early) throw new Error("fixture");
    const rows = [late, { ...early, projectId: "p1" }, { id: "x", title: "In the second", createdAt: new Date(2026, 8, 15, 13, 0).toISOString(), archived: true, archivedAt: new Date(2026, 8, 15, 13, 5).toISOString(), projectId: "p2" }];
    render(<SettingsDialog open initialSection="Archived tasks" archived={rows} projects={projects} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getAllByRole("region").map((el) => el.getAttribute("aria-label"))).toEqual(["No project", "My film", "Second"]);
    expect(within(screen.getByRole("region", { name: "My film" })).getAllByTestId("archived-row")).toHaveLength(1);
    const filter = screen.getByRole("combobox", { name: "Project filter" });
    expect(within(filter).getAllByRole("option").map((o) => o.textContent)).toEqual(["All projects", "No project", "My film", "Second"]);
    fireEvent.change(filter, { target: { value: "p1" } });
    expect(screen.getAllByRole("region").map((el) => el.getAttribute("aria-label"))).toEqual(["My film"]);
    fireEvent.change(filter, { target: { value: "none" } });
    expect(screen.getAllByRole("region").map((el) => el.getAttribute("aria-label"))).toEqual(["No project"]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search archived tasks" }), { target: { value: "second" } });
    expect(screen.getByText("No archived tasks match.")).toBeInTheDocument(); // the search and the filter combine
  });

  it("the search filters the rows live by title and says when nothing matches; an empty archive says so and has no Delete all", () => {
    const { rerender } = render(<SettingsDialog open initialSection="Archived tasks" archived={archived} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search archived tasks" }), { target: { value: "candle" } });
    expect(screen.getAllByTestId("archived-row")).toHaveLength(1);
    expect(screen.getByText(/Single candle/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search archived tasks" }), { target: { value: "nothing here" } });
    expect(screen.queryAllByTestId("archived-row")).toHaveLength(0);
    expect(screen.getByText("No archived tasks match.")).toBeInTheDocument();
    rerender(<SettingsDialog open initialSection="Archived tasks" archived={[]} choice="system" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getByText("No archived tasks.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete all" })).not.toBeInTheDocument();
  });
});

describe("SearchDialog leaves archived tasks to Settings (STORY_030)", () => {
  it("does not list an archived entry even when the query matches it", () => {
    render(<SearchDialog open recents={[...recents, { id: "gone", title: "Paper boat, archived", finishedAt: "2026-09-13T12:00:00Z", archived: true }]} onClose={() => undefined} now={now} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "paper boat" } });
    expect(screen.getByRole("button", { name: /Paper boat on rain puddle/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archived/ })).not.toBeInTheDocument();
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
