import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellStateProvider, useShell } from "@/components/shell/ShellContext";
import { AGENT_SYSTEM_PROMPT } from "@/lib/reference-pages";
import { ConnectMobilePage } from "./ConnectMobilePage";
import { ManagePage } from "./ManagePage";

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

describe("the pages behind the sidebar (STORY_025; STORY_026 removed the marketplace and Scheduled)", () => {
  it("Plugins is the Management page (STORY_026): nothing in the bar, the four counted tabs with Agents selected, the three agents, and the read-only editor", () => {
    render(inShell(<ManagePage />));
    expect(screen.getByTestId("bar")).toBeEmptyDOMElement();
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

  it("Connect mobile: the bot card, Create IM Bot, and the form's inert controls with the captured words", () => {
    render(<ConnectMobilePage />);
    for (const name of ["New Bot", "Create IM Bot", "Connect", "Choose an Agent: Default", "Working directory: No project", "Delete"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: "Enter Bot Token" })).toHaveAttribute("readonly");
    expect(screen.getByText("Get a token from @BotFather on Telegram.")).toBeInTheDocument();
    expect(screen.getByText("Not bound")).toBeInTheDocument();
  });
});
