import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { INERT_NOTICE } from "./Inert";
import { SettingsDialog } from "./SettingsDialog";
import { Shell } from "./Shell";
import { UserMenu } from "./UserMenu";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.clear();
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ entries: [] }), { headers: { "content-type": "application/json" } }))));
});

describe("UserMenu (STORY_019; user-menu-open@1440)", () => {
  it("opens from the chip with the reference's entries, Settings live and the rest inert", () => {
    const onOpenSettings = vi.fn();
    render(<UserMenu onOpenSettings={onOpenSettings} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    const menu = screen.getByRole("menu", { name: "User menu" });
    expect(menu).toHaveTextContent("UID : local");
    expect(menu).toHaveTextContent("Default");
    const items = screen.getAllByRole("menuitem").map((el) => el.getAttribute("aria-label") ?? el.textContent.trim());
    expect(items).toEqual(["Switch to classic", "Settings", "Daily check-in", "Usage", "Contact us", "Learn more", "Logout"]);
    act(() => {
      screen.getByRole("menuitem", { name: "Logout" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    act(() => {
      screen.getByRole("menuitem", { name: "Settings" }).click();
    });
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and on a click outside", () => {
    render(<UserMenu onOpenSettings={() => undefined} />);
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("SettingsDialog (STORY_019; settings-general@1440)", () => {
  it("shows the General section with the three Appearance cards, the current one checked, and inert Preferences", () => {
    const onChoose = vi.fn();
    render(<SettingsDialog open choice="system" onChoose={onChoose} onClose={() => undefined} />);
    expect(screen.getByRole("dialog", { name: "General" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio").map((el) => `${el.textContent.trim()}:${el.getAttribute("aria-checked") ?? "none"}`);
    expect(radios).toEqual(["Light mode:false", "Dark mode:false", "System:true"]);
    act(() => {
      screen.getByRole("radio", { name: "Dark mode" }).click();
    });
    expect(onChoose).toHaveBeenCalledWith("dark");
    for (const name of ["Account", "Usage", "Archived tasks"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    act(() => {
      screen.getByRole("switch", { name: "Remove watermark setting" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
  });

  it("closes on Escape, on the close button and on the backdrop, not on the panel", () => {
    const onClose = vi.fn();
    render(<SettingsDialog open choice="light" onChoose={() => undefined} onClose={onClose} />);
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    act(() => {
      screen.getByRole("button", { name: "Close settings" }).click();
    });
    act(() => {
      fireEvent.mouseDown(screen.getByRole("dialog"));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => {
      fireEvent.mouseDown(screen.getByTestId("settings-backdrop"));
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe("Shell theme choice end to end in jsdom (STORY_019)", () => {
  it("chip → Settings → Dark mode sets data-theme and stores it; System clears both — under StrictMode", () => {
    render(
      <StrictMode>
        <Shell>
          <p>content</p>
        </Shell>
      </StrictMode>,
    );
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    act(() => {
      screen.getByRole("menuitem", { name: "Settings" }).click();
    });
    act(() => {
      screen.getByRole("radio", { name: "Dark mode" }).click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark mode" })).toHaveAttribute("aria-checked", "true");
    act(() => {
      screen.getByRole("radio", { name: "System" }).click();
    });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("reads a stored choice on mount", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(
      <Shell>
        <p>content</p>
      </Shell>,
    );
    act(() => {
      screen.getByRole("button", { name: "Owner" }).click();
    });
    act(() => {
      screen.getByRole("menuitem", { name: "Settings" }).click();
    });
    expect(screen.getByRole("radio", { name: "Light mode" })).toHaveAttribute("aria-checked", "true");
  });

  it("an inert top-bar control shows the notice and clears it after two seconds", () => {
    render(
      <StrictMode>
        <Shell>
          <p>content</p>
        </Shell>
      </StrictMode>,
    );
    act(() => {
      screen.getByRole("button", { name: "Changelog" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent(INERT_NOTICE);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
