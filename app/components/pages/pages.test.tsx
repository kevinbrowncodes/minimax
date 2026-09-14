import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellStateProvider, useShell } from "@/components/shell/ShellContext";
import { AGENT_SYSTEM_PROMPT, PLUGINS, SKILLS } from "@/lib/reference-pages";
import { ConnectMobilePage } from "./ConnectMobilePage";
import { ManagePage } from "./ManagePage";
import { PluginsPage } from "./PluginsPage";
import { ProductPage } from "./ProductPage";
import { ScheduledPage } from "./ScheduledPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/plugins" }));

afterEach(cleanup);

/** The Shell's top bar, reduced to its slot: what a page puts there is what the bar shows. */
function Bar() {
  const { pageActions } = useShell();
  return <div data-testid="bar">{pageActions}</div>;
}
const inShell = (page: React.ReactElement) => (
  <ShellStateProvider scope="/x">
    <Bar />
    {page}
  </ShellStateProvider>
);

describe("the pages behind the sidebar (STORY_025)", () => {
  it("Plugins: the bar's segments, Refresh, Manage and Create; the categories, the search, 8 plugin and 8 skill cards with inert Install; Personal shows the empty state", () => {
    render(inShell(<PluginsPage />));
    const bar = screen.getByTestId("bar");
    expect(within(bar).getByRole("tab", { name: "Market" })).toHaveAttribute("aria-selected", "true");
    expect(within(bar).getByRole("button", { name: "Refresh" })).toHaveAttribute("aria-disabled", "true");
    expect(within(bar).getByRole("link", { name: /Manage/ })).toHaveAttribute("href", "/plugins/manage");
    expect(within(bar).getByRole("button", { name: "Create" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("group", { name: "Categories" }).textContent).toContain("Design & sites");
    expect(screen.getByRole("searchbox", { name: "Search plugins or skills" })).toHaveAttribute("readonly");
    expect(within(screen.getByRole("list", { name: "Plugins" })).getAllByRole("listitem")).toHaveLength(PLUGINS.length);
    expect(within(screen.getByRole("list", { name: "Skills" })).getAllByRole("listitem")).toHaveLength(SKILLS.length);
    expect(screen.getByRole("button", { name: "Install Excel" })).toHaveAttribute("aria-disabled", "true");
    act(() => {
      screen.getByRole("button", { name: "Install Excel" }).click();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Not part of MiniMax Local");
    expect(screen.getByRole("link", { name: "View all 27" })).toHaveAttribute("aria-disabled", "true");
    act(() => {
      within(bar).getByRole("tab", { name: "Personal" }).click();
    });
    expect(screen.getByTestId("plugins-empty")).toHaveTextContent("No matching plugins or skills");
    expect(screen.getByRole("searchbox", { name: "Search skills" })).toBeInTheDocument();
  });

  it("Manage: ‹ Plugins in the bar, the four counted tabs with Agents selected, the three agents, and the read-only editor", () => {
    render(inShell(<ManagePage />));
    expect(within(screen.getByTestId("bar")).getByRole("link", { name: /Plugins/ })).toHaveAttribute("href", "/plugins");
    expect(screen.getByRole("heading", { name: "Management" })).toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Management" });
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent.trim())).toEqual(["Plugins 1", "Skills 10", "Apps 0", "Agents 3"]);
    expect(within(tabs).getByRole("tab", { name: "Agents 3" })).toHaveAttribute("aria-selected", "true");
    for (const agent of ["General", "Coder", "Verifier", "Create agent"]) expect(screen.getByRole("button", { name: agent })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("General");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "System prompt" })).toHaveValue(AGENT_SYSTEM_PROMPT);
    expect(screen.getByRole("button", { name: "Chat with it" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Scheduled: Schedules in the bar with Create ▾, the read-only search with its status filter, the empty line", () => {
    render(inShell(<ScheduledPage />));
    const bar = screen.getByTestId("bar");
    expect(bar).toHaveTextContent("Schedules");
    expect(within(bar).getByRole("button", { name: "Create" })).toHaveAttribute("aria-disabled", "true");
    expect(within(bar).getByRole("button", { name: "More create actions" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("searchbox", { name: "Search scheduled tasks" })).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Scheduled task status" })).toHaveTextContent("All");
    expect(screen.getByText("No scheduled tasks yet.")).toBeInTheDocument();
  });

  it("Connect mobile: the bot card, Create IM Bot, and the form's inert controls with the captured words", () => {
    render(<ConnectMobilePage />);
    for (const name of ["New Bot", "Create IM Bot", "Connect", "Choose an Agent: Default", "Working directory: No project", "Delete"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: "Enter Bot Token" })).toHaveAttribute("readonly");
    expect(screen.getByText("Get a token from @BotFather on Telegram.")).toBeInTheDocument();
    expect(screen.getByText("Not bound")).toBeInTheDocument();
  });

  it("MaxHermes and MaxClaw: the name in colour, the line, an inert Start now, three features; MaxClaw adds Available on Telegram", () => {
    render(inShell(<ProductPage product="max-hermes" />));
    expect(screen.getByText("MaxHermes")).toHaveStyle({ color: "#f5a623" });
    expect(screen.getByRole("heading", { name: "An Agent That Grows With You." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start now" })).toHaveAttribute("aria-disabled", "true");
    expect(within(screen.getByTestId("bar")).getByRole("button", { name: "Help" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Available on")).not.toBeInTheDocument();
    cleanup();
    render(inShell(<ProductPage product="max-claw" />));
    expect(screen.getByRole("heading", { name: "Your 24/7 personal assistant." })).toBeInTheDocument();
    expect(screen.getByText("What you get")).toBeInTheDocument();
    expect(screen.getByText("Available on")).toBeInTheDocument();
  });
});
