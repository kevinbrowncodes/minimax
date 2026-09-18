import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellStateProvider, useShell } from "@/components/shell/ShellContext";
import { AGENT_SYSTEM_PROMPT } from "@/lib/reference-pages";
import { BUILT_IN_SKILLS, type Skill } from "@/lib/skills";
import { ManagePage } from "./ManagePage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/plugins" }));

afterEach(() => {
  cleanup();
  push.mockClear();
});

const caps = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
/** The routes the page talks to: capabilities (or not), the skills with a live list. */
/** STORY_054: the director folders the Skills tab lists above the templates. */
const DIRECTORS = [
  { id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "Directs one thirst-trap short from one attached photo — a candid, believable 10-second clip.", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10", "minimax-model": "MiniMax-H3", "minimax-checkpoint": "minimax_h3_fl2va_int8_convrot", "minimax-comfyui": "0.35.1", "minimax-adapter": "1.4.0", "minimax-verified-on": "2026-09-16" } },
  { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "Directs a whole thirst-trap video from one photo as several ten-second segments.", metadata: { "minimax-short-name": "Chain director", "minimax-clip-seconds": "10", "minimax-model": "MiniMax-H3", "minimax-verified-on": "draft" } },
];
function fetchWith(options: { readonly reachable?: boolean; readonly skills?: Skill[]; readonly directors?: typeof DIRECTORS } = {}) {
  const skills: Skill[] = options.skills ?? [...BUILT_IN_SKILLS];
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, string>) : undefined;
    calls.push({ method, url, body });
    if (url === "/api/capabilities") return Promise.resolve(options.reachable === false ? json({ error: { code: "unreachable", message: "no" } }, 503) : json(caps));
    if (url === "/api/skills" && method === "GET") return Promise.resolve(json({ skills }));
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills: options.directors ?? DIRECTORS }));
    if (url === "/api/skills" && method === "POST") {
      const skill: Skill = { id: `s${String(skills.length)}`, name: body?.["name"] ?? "", description: body?.["description"] ?? "", template: body?.["template"] ?? "" };
      skills.push(skill);
      return Promise.resolve(json({ skill }, 201));
    }
    const one = /^\/api\/skills\/(.+)$/.exec(url);
    if (one && method === "PATCH") {
      const index = skills.findIndex((s) => s.id === decodeURIComponent(one[1] ?? ""));
      const current = skills[index];
      if (current) skills[index] = { ...current, ...body };
      return Promise.resolve(json({ skill: skills[index] }));
    }
    if (one && method === "DELETE") {
      const index = skills.findIndex((s) => s.id === decodeURIComponent(one[1] ?? ""));
      if (index >= 0) skills.splice(index, 1);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return { fetchImpl: vi.fn(impl), calls, skills };
}

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
  it("Plugins is the Management page (STORY_026): nothing in the bar, the four counted tabs (Plugins first since STORY_040), the three agents, and the read-only editor", async () => {
    render(inShell(<ManagePage fetchImpl={fetchWith().fetchImpl} />));
    expect(screen.getByTestId("bar")).toBeEmptyDOMElement();
    expect(screen.getByRole("heading", { name: "Management" })).toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Management" });
    await waitFor(() => {
      expect(within(tabs).getAllByRole("tab").map((t) => t.textContent.trim())).toEqual(["Plugins 1", "Skills 3", "Apps 0", "Agents 3"]); // Skills counts the two director folders and what is stored (the built-in) — STORY_054
    });
    expect(within(tabs).getByRole("tab", { name: "Plugins 1" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(tabs).getByRole("tab", { name: "Agents 3" }));
    expect(within(tabs).getByRole("tab", { name: "Agents 3" })).toHaveAttribute("aria-selected", "true");
    for (const agent of ["General", "Coder", "Verifier", "Create agent"]) expect(screen.getByRole("button", { name: agent })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("General");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "System prompt" })).toHaveValue(AGENT_SYSTEM_PROMPT);
    expect(screen.getByRole("button", { name: "Chat with it" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Plugins: the video-creator row is described from the adapter's capabilities with its reachability and details; the switch flips the video setting (STORY_040)", async () => {
    const update = vi.fn();
    const { fetchImpl } = fetchWith();
    const { rerender } = render(
      <SettingsContext.Provider value={{ settings: { removeWatermark: true, videoEnabled: true, agentConfirm: "always" }, update }}>
        <ManagePage fetchImpl={fetchImpl} />
      </SettingsContext.Provider>,
    );
    const row = screen.getByTestId("plugin-row");
    await waitFor(() => {
      expect(row).toHaveTextContent("MiniMax-H3.0 on the Spark through the adapter · 768P · 4–15 s · ● reachable");
    });
    expect(within(row).getByText("video-creator")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Details" }));
    const details = screen.getByTestId("plugin-details");
    expect(details).toHaveTextContent("Ratios16:9 · 9:16");
    expect(details).toHaveTextContent("Extension+4–14 s, sources up to 30 s");
    const toggle = within(row).getByRole("switch", { name: "video-creator enabled" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(update).toHaveBeenCalledWith({ videoEnabled: false });
    rerender(
      <SettingsContext.Provider value={{ settings: { removeWatermark: true, videoEnabled: false, agentConfirm: "always" }, update }}>
        <ManagePage fetchImpl={fetchImpl} />
      </SettingsContext.Provider>,
    );
    expect(screen.getByRole("switch", { name: "video-creator enabled" })).toHaveAttribute("aria-checked", "false");
    cleanup();
    render(<ManagePage fetchImpl={fetchWith({ reachable: false }).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("plugin-row")).toHaveTextContent("○ not reachable");
    });
  });

  it("Skills: the director folders above the templates — the short name, the Folder badge, the meta line, Use → /?agent=; no Edit or Delete; the search runs over both sections and hides an empty one (STORY_054)", async () => {
    render(<ManagePage initialTab="Skills" fetchImpl={fetchWith().fetchImpl} />);
    await waitFor(() => {
      expect(screen.getAllByTestId("director-row")).toHaveLength(2);
    });
    const [thirst, chain] = screen.getAllByTestId("director-row");
    if (!thirst || !chain) throw new Error("rows expected");
    expect(thirst).toHaveTextContent("Thirst trap Folder");
    expect(within(thirst).getByTestId("director-meta")).toHaveTextContent("MiniMax-H3 · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.4.0 · verified 2026-09-16");
    expect(within(chain).getByTestId("director-meta")).toHaveTextContent("MiniMax-H3 · verified draft");
    expect(within(thirst).queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(within(thirst).queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    expect(within(thirst).getByRole("button", { name: "Use Thirst trap" })).toBeEnabled();
    // the sections in order: Director skills, then Templates with the built-in
    const director = screen.getByTestId("director-skills");
    const templates = screen.getByTestId("templates");
    expect(director.compareDocumentPosition(templates) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(templates).getByRole("heading", { name: "Templates" })).toBeInTheDocument();
    expect(director).toHaveTextContent("A skill is a folder under agents/skills/");
    fireEvent.click(within(chain).getByRole("button", { name: "Use Chain director" }));
    expect(push).toHaveBeenCalledWith("/?agent=minimax-h3-director-thirst-trap-chain");
    // the search: a director-only match hides Templates; a template-only match hides Director skills; no match → the one line
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "chain" } });
    expect(screen.getAllByTestId("director-row")).toHaveLength(1);
    expect(screen.queryByTestId("templates")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "short-to" } });
    expect(screen.queryByTestId("director-skills")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("skill-row")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "zzz" } });
    expect(screen.getByText("No matching results")).toBeInTheDocument();
    expect(screen.queryByTestId("director-skills")).not.toBeInTheDocument();
    expect(screen.queryByTestId("templates")).not.toBeInTheDocument();
    // no folders at all: the section says so, the templates stay
    cleanup();
    render(<ManagePage initialTab="Skills" fetchImpl={fetchWith({ directors: [] }).fetchImpl} />);
    await waitFor(() => {
      expect(screen.getByTestId("director-skills")).toHaveTextContent("No director skills");
    });
    expect(screen.getAllByTestId("skill-row")).toHaveLength(1);
  });

  it("Templates: the built-in listed and protected; search; Create posts; Edit patches; Delete confirms; Use opens the composer with the template; Apps says there are none (STORY_040; STORY_054's wording)", async () => {
    const { fetchImpl, calls } = fetchWith({ skills: [...BUILT_IN_SKILLS, { id: "loop", name: "Loop", description: "Seamless loops", template: "Loop: {{idea}}" }] });
    const confirmImpl = vi.fn(() => true);
    render(<ManagePage initialTab="Skills" fetchImpl={fetchImpl} confirmImpl={confirmImpl} />);
    await waitFor(() => {
      expect(screen.getAllByTestId("skill-row")).toHaveLength(2);
    });
    const [builtIn] = screen.getAllByTestId("skill-row");
    if (!builtIn) throw new Error("rows expected");
    expect(builtIn).toHaveTextContent("Short-to-script Built-in");
    expect(within(builtIn).getByRole("button", { name: "Edit Short-to-script" })).toBeDisabled();
    expect(within(builtIn).getByRole("button", { name: "Delete Short-to-script" })).toBeDisabled();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "seamless" } });
    expect(screen.getAllByTestId("skill-row")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "zzz" } });
    expect(screen.getByText("No matching results")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search skills" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Use Loop" })); // re-queried: the list re-mounted after the empty search
    expect(push).toHaveBeenCalledWith("/?skill=loop");
    // Create: a name and a template are required; the POST is what was typed; the list refetches
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    const form = screen.getByRole("form", { name: "Create template" });
    fireEvent.submit(form);
    expect(within(form).getByRole("alert")).toHaveTextContent("needs a name and its text");
    fireEvent.change(within(form).getByRole("textbox", { name: "Template name" }), { target: { value: "Slow push-in" } });
    fireEvent.change(within(form).getByRole("textbox", { name: "Template description" }), { target: { value: "A slow dolly" } });
    fireEvent.change(within(form).getByRole("textbox", { name: "Template text" }), { target: { value: "Slow dolly toward {{idea}}" } });
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Slow push-in", description: "A slow dolly", template: "Slow dolly toward {{idea}}" });
    await waitFor(() => {
      expect(screen.getAllByTestId("skill-row")).toHaveLength(3);
    });
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    // Edit: prefilled, PATCH
    fireEvent.click(screen.getByRole("button", { name: "Edit Loop" }));
    const edit = screen.getByRole("form", { name: "Edit template" });
    expect(within(edit).getByRole("textbox", { name: "Template text" })).toHaveValue("Loop: {{idea}}");
    fireEvent.change(within(edit).getByRole("textbox", { name: "Template name" }), { target: { value: "Loops" } });
    await act(async () => {
      fireEvent.submit(edit);
      await Promise.resolve();
    });
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({ url: "/api/skills/loop", body: { name: "Loops" } });
    // Delete: a confirm, then DELETE
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Loops" }));
      await Promise.resolve();
    });
    expect(confirmImpl).toHaveBeenCalledWith(expect.stringContaining("Loops"));
    expect(calls.find((c) => c.method === "DELETE")?.url).toBe("/api/skills/loop");
    await waitFor(() => {
      expect(screen.getAllByTestId("skill-row")).toHaveLength(2);
    });
    fireEvent.click(screen.getByRole("tab", { name: /^Apps/ }));
    expect(screen.getByText("No apps — MiniMax Local has no app store.")).toBeInTheDocument();
  });

  it("opens the Create template form when told to (+ › Skills › Add template)", async () => {
    render(<ManagePage initialTab="Skills" createSkill fetchImpl={fetchWith().fetchImpl} />);
    expect(screen.getByRole("form", { name: "Create template" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByTestId("skill-row")).toHaveLength(1);
    });
  });

});
