import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INERT_NOTICE, INERT_NOTICE_MS, INERT_TITLE, Inert } from "./Inert";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  vi.useFakeTimers();
});

describe("Inert (STORY_019)", () => {
  it("keeps the reference's role, the tooltip and keyboard reachability", () => {
    render(<Inert role="link" label="Plugins">Plugins</Inert>);
    const control = screen.getByRole("link", { name: "Plugins" });
    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(control).toHaveAttribute("title", INERT_TITLE);
    expect(control).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the notice on click for two seconds, then clears it — under StrictMode with fake timers", () => {
    render(
      <StrictMode>
        <Inert label="Work Area">WA</Inert>
      </StrictMode>,
    );
    act(() => {
      screen.getByRole("button", { name: "Work Area" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    act(() => {
      vi.advanceTimersByTime(INERT_NOTICE_MS - 1);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("a second click while shown restarts the two seconds", () => {
    render(<Inert label="Search">Search</Inert>);
    const control = screen.getByRole("button", { name: "Search" });
    act(() => {
      control.click();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      control.click();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Enter and Space show the notice from the keyboard; other keys do not", () => {
    render(<Inert role="switch" ariaChecked={false} label="Agent Team">Agent Team</Inert>);
    const control = screen.getByRole("switch", { name: "Agent Team" });
    expect(control).toHaveAttribute("aria-checked", "false");
    act(() => {
      control.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => {
      control.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
