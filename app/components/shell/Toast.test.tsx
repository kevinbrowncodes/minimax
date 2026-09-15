import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOAST_MS, Toast } from "./Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast (STORY_029)", () => {
  it("renders nothing without a message", () => {
    render(<Toast message={undefined} onClose={() => undefined} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the message, closes on the × and by itself after two seconds — inside StrictMode with fake timers (CLAUDE.md §6b)", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Toast message="Task pinned" onClose={onClose} />
      </StrictMode>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Task pinned");
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

  it("a new message restarts the clock", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(<Toast message="Task pinned" onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(TOAST_MS - 500);
    });
    rerender(<Toast message="Task unpinned" onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(TOAST_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
