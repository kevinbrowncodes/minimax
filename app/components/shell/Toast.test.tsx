import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOAST_MS, type ToastState } from "./ShellContext";
import { Toast, ToastLink } from "./Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const pinned: ToastState = { id: 1, content: "Task pinned", tone: "success", durationMs: TOAST_MS };

describe("Toast (STORY_029, STORY_030)", () => {
  it("renders nothing without a toast", () => {
    render(<Toast toast={undefined} onClose={() => undefined} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the message, closes on the × and by itself after its duration — inside StrictMode with fake timers (CLAUDE.md §6b)", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Toast toast={pinned} onClose={onClose} />
      </StrictMode>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Task pinned");
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "success"); // behaviour-recents-pin-01-pinned: the green check pill
    act(() => {
      vi.advanceTimersByTime(TOAST_MS - 1);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => {
      screen.getByRole("button", { name: "Close toast" }).click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("a new toast restarts the clock, even with the same words", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(<Toast toast={pinned} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(TOAST_MS - 500);
    });
    rerender(<Toast toast={{ ...pinned, id: 2 }} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(TOAST_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an info toast carries links that act and lives as long as it is told (STORY_030; behaviour-recents-archive-01)", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const undo = vi.fn();
    const content = (
      <>
        <ToastLink onClick={undo}>Undo</ToastLink> or view archived tasks in <ToastLink onClick={() => undefined}>Settings</ToastLink>
      </>
    );
    render(<Toast toast={{ id: 3, content, tone: "info", durationMs: 6000 }} onClose={onClose} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Undo or view archived tasks in Settings");
    expect(status).toHaveAttribute("data-tone", "info");
    act(() => {
      screen.getByRole("button", { name: "Undo" }).click();
    });
    expect(undo).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
