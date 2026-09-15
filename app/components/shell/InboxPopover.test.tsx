import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InboxEvent } from "@/lib/inbox";
import { InboxPopover } from "./InboxPopover";

afterEach(cleanup);

const at = (h: number, m: number) => new Date(2026, 8, 15, h, m).toISOString();
const now = () => new Date(2026, 8, 15, 18, 0);
const events: InboxEvent[] = [
  { id: "d:ready", taskId: "d", kind: "ready", text: "Your video is ready", stamp: "26-09-15-1224", title: "Paper boat on rain puddle", at: at(12, 41), tab: "Updates" },
  { id: "d:cut", taskId: "d", kind: "cut", text: "The shot changed at 00:11", stamp: "26-09-15-1224", title: "Paper boat on rain puddle", at: at(12, 41), tab: "Updates" },
  { id: "f:failed", taskId: "f", kind: "failed", text: "Generation failed", stamp: "26-09-14-2250", title: "Failed one", at: new Date(2026, 8, 14, 22, 58).toISOString(), tab: "Updates" },
];

describe("InboxPopover (STORY_033)", () => {
  it("lists the events as rows with the dot, the task and the time; Read all and a row call their handlers; the tabs filter", () => {
    const onReadAll = vi.fn();
    const onOpen = vi.fn();
    render(<InboxPopover open onClose={() => undefined} events={events} readAt={at(12, 41)} onReadAll={onReadAll} onOpen={onOpen} now={now} />);
    const rows = screen.getAllByTestId("inbox-row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Your video is ready26-09-15-1224 Paper boat on rain puddle12:41",
      "The shot changed at 00:1126-09-15-1224 Paper boat on rain puddle12:41",
      "Generation failed26-09-14-2250 Failed oneSep 14, 22:58",
    ]);
    expect(rows.map((row) => row.getAttribute("data-read"))).toEqual(["true", "true", "true"]); // Read all at 12:41 covers all three
    expect(screen.getByRole("button", { name: "Read all" })).toBeDisabled();
    fireEvent.click(rows[2] as HTMLElement);
    expect(onOpen).toHaveBeenCalledWith(events[2]);
    fireEvent.click(screen.getByRole("tab", { name: "Messages" }));
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Updates" }));
    expect(screen.getAllByTestId("inbox-row")).toHaveLength(3);
  });

  it("marks unread rows with the dot and enables Read all; opening a task reads its own events", () => {
    const onReadAll = vi.fn();
    const opened = events.map((e) => (e.taskId === "d" ? { ...e, openedAt: at(12, 50) } : e));
    render(<InboxPopover open onClose={() => undefined} events={opened} onReadAll={onReadAll} now={now} />);
    expect(screen.getAllByTestId("inbox-row").map((row) => row.getAttribute("data-read"))).toEqual(["true", "true", "false"]);
    expect(screen.getAllByLabelText("Unread")).toHaveLength(1);
    act(() => {
      screen.getByRole("button", { name: "Read all" }).click();
    });
    expect(onReadAll).toHaveBeenCalledTimes(1);
  });

  it("stays the empty popover without events (STORY_021)", () => {
    render(<InboxPopover open onClose={() => undefined} />);
    expect(within(screen.getByRole("dialog", { name: "Inbox" })).getByText("No messages yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read all" })).toBeDisabled();
  });
});
