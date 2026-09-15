import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectPage } from "./ProjectPage";

afterEach(cleanup);

const project = { id: "p1", name: "My film", createdAt: "2026-09-15T09:00:00Z" };

describe("ProjectPage (STORY_031)", () => {
  it("names the project, lists its tasks as stamp + title links, and New task opens the composer in it", () => {
    render(<ProjectPage project={project} tasks={[{ id: "j1", title: "Paper boat on rain puddle", createdAt: new Date(2026, 8, 15, 12, 24).toISOString(), projectId: "p1" }]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My film");
    expect(screen.getByRole("link", { name: "+ New task" })).toHaveAttribute("href", "/?project=p1");
    const task = screen.getByRole("link", { name: /Paper boat on rain puddle/ });
    expect(task).toHaveAttribute("href", "/task/j1");
    expect(task).toHaveTextContent("26-09-15-1224");
  });

  it("says No tasks when empty", () => {
    render(<ProjectPage project={project} tasks={[]} />);
    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
