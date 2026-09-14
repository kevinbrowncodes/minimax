import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CutNotice } from "./CutNotice";

afterEach(cleanup);

describe("CutNotice (STORY_020)", () => {
  it("names the time of one change and lists several, as a status strip with a Retry", () => {
    const onRetry = vi.fn();
    render(<CutNotice cuts={[{ frame: 270, seconds: 11.25 }]} onRetry={onRetry} />);
    const notice = screen.getByTestId("cut-notice");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveTextContent("The shot changed at 00:11 — the set or the framing is no longer what it was. Retry generates this again with a new seed.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    cleanup();
    render(<CutNotice cuts={[{ frame: 142, seconds: 5.92 }, { frame: 270, seconds: 11.25 }, { frame: 521, seconds: 21.71 }]} onRetry={onRetry} />);
    expect(screen.getByTestId("cut-notice")).toHaveTextContent("The shot changed at 00:05, 00:11 and 00:21");
  });

  it("renders nothing for [] or for an older server without the field, and disables Retry while busy", () => {
    render(<CutNotice cuts={[]} onRetry={() => undefined} />);
    expect(screen.queryByTestId("cut-notice")).not.toBeInTheDocument();
    cleanup();
    render(<CutNotice cuts={undefined} onRetry={() => undefined} />);
    expect(screen.queryByTestId("cut-notice")).not.toBeInTheDocument();
    cleanup();
    render(<CutNotice cuts={[{ frame: 1, seconds: 0.04 }]} onRetry={() => undefined} busy />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
  });
});
