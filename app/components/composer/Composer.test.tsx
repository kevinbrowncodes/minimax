import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtendSource } from "@/lib/composer-state";
import type { Capabilities } from "@/lib/job-api";
import { ProjectsContext } from "@/components/shell/ProjectsContext";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellContext } from "@/components/shell/ShellContext";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 }, agent: { configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } } };
const source: ExtendSource = { id: "src", title: "The first clip", durationSeconds: 2, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "/api/jobs/src/poster" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fetchWith(onJobs: (init: RequestInit | undefined) => Response): typeof fetch {
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url.startsWith("/api/jobs")) return Promise.resolve(onJobs(init));
    if (url.includes("/reference/")) return Promise.resolve(new Response(new Blob(["png-bytes"], { type: "image/png" }), { status: 200, headers: { "content-type": "image/png" } }));
    if (url === "/api/skills") return Promise.resolve(json({ skills: [{ id: "short-to-script", name: "Short-to-script", description: "Expands an idea", template: "integrated_multimodal_description: [Shot 1] {{idea}}", builtIn: true }, { id: "loop", name: "Loop", description: "Seamless loops", template: "Loop: {{idea}}" }] }));
    // STORY_054: the director folders, for + › Skills' radio rows
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills: [{ id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "one clip", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10" } }, { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "a chain", metadata: { "minimax-short-name": "Chain director", "minimax-clip-seconds": "10" } }] }));
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return vi.fn(impl);
}

afterEach(() => {
  cleanup();
  push.mockReset();
});

async function renderReady(onJobs: (init: RequestInit | undefined) => Response = () => json({ id: "j1", status: "queued", progress: 0 }, 202)) {
  const fetchImpl = fetchWith(onJobs);
  render(<Composer fetchImpl={fetchImpl} />);
  fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled();
  });
  return fetchImpl;
}

describe("Composer", () => {
  it("toggles video mode with the chip and the tag's ×, and Send follows the text", async () => {
    await renderReady();
    expect(screen.getByText("video-creator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reference image" })).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "A paper boat" } });
    expect(send).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove video-creator" }));
    expect(screen.queryByText("video-creator")).not.toBeInTheDocument();
  });

  it("the parameters and the model menu list only what the Spark reports (STORY_026: no greyed 2K, H3-Max or H2.3), and the label follows the choice", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /^Video parameters:/ }));
    expect(within(screen.getByRole("radiogroup", { name: "Resolution" })).getAllByRole("radio").map((el) => el.textContent)).toEqual(["768P"]);
    expect(screen.queryByRole("radio", { name: /2K/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "9:16" }));
    fireEvent.click(screen.getByRole("radio", { name: "10s" }));
    expect(screen.getByRole("button", { name: "Video parameters: 9:16 768P 10s" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Video parameters" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Model: MiniMax-H3" }));
    expect(screen.getAllByRole("menuitemradio").map((el) => el.textContent)).toEqual(["● MiniMax-H3"]);
  });

  it("refuses a gif reference inline and accepts a png as a thumbnail with a remove button", async () => {
    await renderReady();
    const input = screen.getByTestId("reference-input");
    fireEvent.change(input, { target: { files: [new File(["gif"], "x.gif", { type: "image/gif" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/PNG, JPEG or WebP/);
    fireEvent.change(input, { target: { files: [new File(["png"], "ref.png", { type: "image/png" })] } });
    expect(screen.getByRole("button", { name: "Remove Reference image 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Reference image 1" }));
    expect(screen.queryByRole("button", { name: "Remove Reference image 1" })).not.toBeInTheDocument();
  });

  it("sends the job and navigates to the task; a 400 shows the server's message", async () => {
    const fetchImpl = await renderReady();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "A paper boat" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/task/j1");
    });
    const calls = vi.mocked(fetchImpl).mock.calls;
    const call = calls.find((c) => typeof c[0] === "string" && c[0].startsWith("/api/jobs"));
    expect(call?.[1]).toMatchObject({ method: "POST" });
    cleanup();
    await renderReady(() => json({ error: { code: "unsupported_option", message: "resolution 2K is not offered", field: "resolution" } }, 400));
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "x" } });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Message" }), { key: "Enter" });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("resolution 2K is not offered");
    });
  });

  it("says how to start the adapter when capabilities cannot be fetched (BUG_001)", async () => {
    const down = vi.fn((): Promise<Response> => Promise.reject(new Error("fetch failed")));
    render(<Composer fetchImpl={down} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("run spark/comfyui/run.sh");
    });
  });

  it("outside video mode, Send says text chat is not connected to the Spark yet (STORY_026)", async () => {
    render(<Composer fetchImpl={fetchWith(() => json({}, 500))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "hello" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Text chat is not connected to the Spark yet — pick Video generation");
  });
});

describe("Composer — extend mode (STORY_016, STORY_017)", () => {
  it("shows the continuation tile and the overlap, locks ratio/resolution/model, offers +Ns and Overlap, and Send posts continueFrom and overlapFrames", async () => {
    let captured: RequestInit | undefined;
    const fetchImpl = fetchWith((init) => {
      captured = init;
      return json({ id: "j2", status: "queued", progress: 0 }, 202);
    });
    render(<Composer fetchImpl={fetchImpl} variant="docked" extend={source} onStopExtending={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Video parameters:/ })).toBeEnabled();
    });
    expect(screen.getByTestId("continuation")).toHaveTextContent("Continues · 2.0 s");
    expect(screen.getByTestId("overlap-line")).toHaveTextContent("carries its last 1.6 s into the new clip");
    expect(screen.queryByRole("button", { name: "Add reference image" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Model:/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Video parameters: 16:9 768P +10s" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe what happens next…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Video parameters:/ }));
    expect(screen.getByRole("radio", { name: "9:16" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "16:9" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "768P" })).toBeDisabled();
    expect(screen.getByText("fixed by the video being extended")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "+10s" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("radio", { name: "+14s" })).not.toBeInTheDocument(); // 39 frames of overlap leave room for 13 s
    expect(screen.getByRole("radio", { name: "1.6 s" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "0.9 s" }));
    expect(screen.getByRole("radio", { name: "0.9 s" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("overlap-line")).toHaveTextContent("carries its last 0.9 s into the new clip");
    expect(screen.getByRole("radio", { name: "+14s" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "+4s" }));
    expect(screen.getByRole("button", { name: "Video parameters: 16:9 768P +4s" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "and then he bows" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/task/j2");
    });
    expect(captured?.body).toBe(JSON.stringify({ prompt: "and then he bows", ratio: "16:9", resolution: "768P", durationSeconds: 4, model: "minimax-h3", continueFrom: "src", overlapFrames: 22 }));
  });

  it("Stop extending restores the normal composer and tells the page", async () => {
    const onStop = vi.fn();
    render(<Composer fetchImpl={fetchWith(() => json({}, 500))} variant="docked" extend={source} onStopExtending={onStop} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Video parameters:/ })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Stop extending" }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("continuation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reference image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Video parameters: 16:9 768P 5s" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled();
  });
});

describe("Composer — the reference's menus, the mode chip and the Showcase (STORY_022, STORY_026)", () => {
  it("+ › Add to project picks a project (a removable chip; the id is posted), No project clears it, Add new project asks the shell and takes what it makes (STORY_031)", async () => {
    const projects = [{ id: "p1", name: "My film", createdAt: "2026-09-15T09:00:00Z" }, { id: "p2", name: "Second", createdAt: "2026-09-15T09:30:00Z" }];
    const openCreate = vi.fn();
    const bodies: unknown[] = [];
    const fetchImpl = fetchWith((init) => {
      bodies.push(JSON.parse(typeof init?.body === "string" ? init.body : "{}"));
      return json({ id: "j1", status: "queued", progress: 0 }, 202);
    });
    render(
      <ProjectsContext.Provider value={{ projects, openCreate }}>
        <Composer fetchImpl={fetchImpl} initialProjectId="p2" />
      </ProjectsContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled();
    });
    expect(screen.getByTestId("project-chip")).toHaveTextContent("Second"); // the row's New task lands here
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Add to project" }));
    const sub = screen.getByRole("menu", { name: "Add to project" });
    expect(within(sub).getAllByRole("menuitemradio").map((el) => `${el.textContent.trim()}:${el.getAttribute("aria-checked") ?? ""}`)).toEqual(["No project:false", "My film:false", "Second✓:true"]);
    fireEvent.click(within(sub).getByRole("menuitemradio", { name: /My film/ }));
    expect(screen.getByTestId("project-chip")).toHaveTextContent("My film");
    expect(screen.queryByRole("menu", { name: "Add attachment" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "A boat in the film" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/task/j1");
    });
    expect(bodies[0]).toMatchObject({ projectId: "p1" });
    fireEvent.click(screen.getByRole("button", { name: "Remove project My film" }));
    expect(screen.queryByTestId("project-chip")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Add to project" }));
    expect(screen.getByRole("menuitemradio", { name: /No project/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Add new project" }));
    expect(openCreate).toHaveBeenCalledTimes(1);
    const onCreated = openCreate.mock.calls[0]?.[0] as (project: { id: string }) => void;
    act(() => {
      onCreated({ id: "p2" });
    });
    expect(screen.getByTestId("project-chip")).toHaveTextContent("Second");
  });

  it("+ › Environment variables opens the dialog: stored keys masked, Add Variables, a bad name refused inline, Save PUTs and closes, a trash removes (STORY_035)", async () => {
    const puts: unknown[] = [];
    const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
      if (url === "/api/env" && init?.method === "PUT") {
        puts.push(JSON.parse(typeof init.body === "string" ? init.body : "{}"));
        return Promise.resolve(json({ vars: [] }));
      }
      if (url === "/api/env") return Promise.resolve(json({ vars: [{ key: "TELEGRAM_BOT_TOKEN", masked: "••••••••" }] }));
      return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
    });
    render(<Composer fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Environment variables" }));
    const dialog = await screen.findByRole("dialog", { name: "Environment variables" });
    expect(screen.queryByRole("menu", { name: "Add attachment" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getAllByTestId("env-row")).toHaveLength(1);
    });
    expect(within(dialog).getByText(/not encrypted/)).toBeInTheDocument();
    const stored = within(dialog).getAllByTestId("env-row")[0] as HTMLElement;
    expect(within(stored).getByRole("textbox", { name: "key name" })).toHaveValue("TELEGRAM_BOT_TOKEN");
    expect(within(stored).getByLabelText("Key value")).toHaveAttribute("placeholder", "••••••••"); // masked; the value never came
    expect(within(stored).getByLabelText("Key value")).toHaveAttribute("type", "password");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Variables" }));
    const added = within(dialog).getAllByTestId("env-row")[1] as HTMLElement;
    fireEvent.change(within(added).getByRole("textbox", { name: "key name" }), { target: { value: "bad-name" } });
    fireEvent.change(within(added).getByLabelText("Key value"), { target: { value: "secret" } });
    fireEvent.click(within(added).getByRole("button", { name: "Show value" }));
    expect(within(added).getByLabelText("Key value")).toHaveAttribute("type", "text");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(added).getByRole("alert")).toHaveTextContent(/A name is A-Z/);
    expect(puts).toEqual([]);
    fireEvent.change(within(added).getByRole("textbox", { name: "key name" }), { target: { value: "api_key" } }); // upper-cased as typed
    expect(within(added).getByRole("textbox", { name: "key name" })).toHaveValue("API_KEY");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await Promise.resolve();
    });
    expect(puts).toEqual([{ vars: { TELEGRAM_BOT_TOKEN: null, API_KEY: "secret" } }]); // null keeps the stored value
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Environment variables" })).not.toBeInTheDocument();
    });
    // a trash removes a row; Save then sends the set without it
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Environment variables" }));
    const again = await screen.findByRole("dialog", { name: "Environment variables" });
    await waitFor(() => {
      expect(within(again).getAllByTestId("env-row")).toHaveLength(1);
    });
    fireEvent.click(within(again).getByRole("button", { name: "Remove TELEGRAM_BOT_TOKEN" }));
    expect(within(again).queryAllByTestId("env-row")).toHaveLength(0);
    await act(async () => {
      fireEvent.click(within(again).getByRole("button", { name: "Save" }));
      await Promise.resolve();
    });
    expect(puts[1]).toEqual({ vars: {} });
  });

  it("+ › Skills › Templates › a template drops its text into the composer with the typed idea in the slot; Manage skills and Add template open Management › Skills (STORY_040; STORY_054's levels)", async () => {
    await renderReady();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "a paper boat" } });
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Templates" }));
    const loop = await within(screen.getByRole("menu", { name: "Templates" })).findByRole("menuitem", { name: "Loop" });
    fireEvent.click(loop);
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("Loop: a paper boat");
    expect(screen.queryByRole("menu", { name: "Add attachment" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Manage skills" }));
    expect(push).toHaveBeenLastCalledWith("/plugins?tab=Skills");
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Add template" }));
    expect(push).toHaveBeenLastCalledWith("/plugins?tab=Skills&create=1");
  });

  it("+ › Skills lists the directors as radio rows: disabled in text mode with the reason; in video mode picking one writes the setting and turns the chip on (STORY_054)", async () => {
    const update = vi.fn();
    render(
      <SettingsContext.Provider value={{ settings: { ...DEFAULT_SETTINGS, agentSkill: "minimax-h3-director-thirst-trap-chain" }, update }}>
        <Composer fetchImpl={fetchWith(() => json({}))} />
      </SettingsContext.Provider>,
    );
    // text mode: the rows are there, checked by the setting, disabled with the reason
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    const skillsMenu = screen.getByRole("menu", { name: "Skills" });
    await waitFor(() => { expect(within(skillsMenu).getAllByRole("menuitemradio")).toHaveLength(2); });
    const rows = within(skillsMenu).getAllByRole("menuitemradio");
    expect(rows.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    expect(rows[0]).toHaveAttribute("aria-disabled", "true");
    expect(rows[0]).toHaveAttribute("title", "Agent directs a video — pick Video generation");
    fireEvent.click(rows[0] as HTMLElement);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole("menu", { name: "Add attachment" })).toBeInTheDocument(); // nothing happened, the menu stays
    fireEvent.keyDown(window, { key: "Escape" });
    // video mode: a pick writes the setting, turns the chip on and closes the menu
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    const thirst = within(screen.getByRole("menu", { name: "Skills" })).getAllByRole("menuitemradio")[0] as HTMLElement;
    expect(thirst).not.toHaveAttribute("aria-disabled");
    fireEvent.click(thirst);
    expect(update).toHaveBeenCalledWith({ agentSkill: "minimax-h3-director-thirst-trap" });
    expect(screen.queryByRole("menu", { name: "Add attachment" })).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Thirst trap");
  });

  it("starts in video mode with the chip on and the director chosen when told to (STORY_054: /?agent=), and writes the setting; a missing id falls back to the setting's", async () => {
    const update = vi.fn();
    render(
      <SettingsContext.Provider value={{ settings: { ...DEFAULT_SETTINGS, agentSkill: "minimax-h3-director-thirst-trap" }, update }}>
        <Composer fetchImpl={fetchWith(() => json({}))} initialAgentSkill="minimax-h3-director-thirst-trap-chain" />
      </SettingsContext.Provider>,
    );
    expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => { expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director"); });
    expect(update).toHaveBeenCalledWith({ agentSkill: "minimax-h3-director-thirst-trap-chain" });
    cleanup();
    render(
      <SettingsContext.Provider value={{ settings: { ...DEFAULT_SETTINGS, agentSkill: "minimax-h3-director-thirst-trap" }, update }}>
        <Composer fetchImpl={fetchWith(() => json({}))} initialAgentSkill="no-such-folder" />
      </SettingsContext.Provider>,
    );
    await waitFor(() => { expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Thirst trap"); });
  });

  it("starts with the skill's template when told to, and hides Video generation when the plugin is off (STORY_040)", () => {
    render(<Composer fetchImpl={fetchWith(() => json({}))} initialText="Loop: {{idea}}" />);
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("Loop: {{idea}}");
    expect(screen.getByRole("group", { name: "Modes" })).toBeInTheDocument();
    cleanup();
    render(
      <SettingsContext.Provider value={{ settings: { removeWatermark: true, videoEnabled: false, agentConfirm: "always" }, update: () => undefined }}>
        <Composer fetchImpl={fetchWith(() => json({}))} />
      </SettingsContext.Provider>,
    );
    expect(screen.queryByRole("group", { name: "Modes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Video generation/ })).not.toBeInTheDocument();
    expect(screen.queryByText("video-creator")).not.toBeInTheDocument();
    cleanup();
    // the docked composer starts in video mode; with the plugin off it is text-only too (no video parameters)
    render(
      <SettingsContext.Provider value={{ settings: { removeWatermark: true, videoEnabled: false, agentConfirm: "always" }, update: () => undefined }}>
        <Composer fetchImpl={fetchWith(() => json({}))} variant="docked" />
      </SettingsContext.Provider>,
    );
    expect(screen.queryByRole("button", { name: /^Video parameters:/ })).not.toBeInTheDocument();
  });

  it("Edit of a queued request (STORY_041): starts in video mode with the request's words, project, time and images once capabilities arrive; Send posts replaces and returns to Scheduled; Cancel editing leads there too", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = fetchWith((init) => {
      bodies.push(JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>);
      return json({ id: "q1", status: "queued", progress: 0, position: 2 }, 202);
    });
    const notify = vi.fn();
    const request = { queueId: "q1", prompt: "Same boat, wider", ratio: "9:16", resolution: "768P", durationSeconds: 8, model: "minimax-h3", notBefore: "2026-09-16T06:00:00.000Z", images: [{ n: 1, name: "ref.png", type: "image/png", url: "/api/history/q1/reference/1" }] };
    render(
      <ShellContext.Provider value={{ workAreaOpen: false, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
        <Composer fetchImpl={fetchImpl} initialRequest={request} />
      </ShellContext.Provider>,
    );
    expect(screen.getByTestId("editing-banner")).toHaveTextContent("Editing a queued job — Send replaces it, Cancel editing keeps it.");
    expect(screen.getByRole("link", { name: "Cancel editing" })).toHaveAttribute("href", "/scheduled");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("Same boat, wider");
    expect(screen.getByText("video-creator")).toBeInTheDocument(); // video mode from the start
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Video parameters: 9:16 768P 8s" })).toBeInTheDocument(); // the request's parameters once capabilities arrived
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove Reference image 1" })).toBeInTheDocument(); // the image came back from its URL
    });
    expect(screen.getByRole("button", { name: /^Run at: Not before/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "Same boat, much wider" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/scheduled");
    });
    expect(notify).toHaveBeenCalledWith("Queued — 2nd in line");
    // multipart (an image is attached): the fields are in the FormData, not JSON
    const call = vi.mocked(fetchImpl).mock.calls.find((c) => typeof c[0] === "string" && c[0].startsWith("/api/jobs"));
    const body = call?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("replaces")).toBe("q1");
    expect((body as FormData).get("notBefore")).toBe("2026-09-16T06:00:00.000Z");
    expect((body as FormData).get("prompt")).toBe("Same boat, much wider");
  });

  it("Run at… beside Send holds the request until a time; the × clears it; a queued Send toasts its place in line (STORY_041)", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = fetchWith((init) => {
      bodies.push(JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>);
      return json({ id: "q2", status: "queued", progress: 0, position: 1 }, 202);
    });
    const notify = vi.fn();
    render(
      <ShellContext.Provider value={{ workAreaOpen: false, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
        <Composer fetchImpl={fetchImpl} />
      </ShellContext.Provider>,
    );
    expect(screen.queryByRole("button", { name: "Run at" })).not.toBeInTheDocument(); // text mode: no queue controls
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run at" }));
    fireEvent.change(screen.getByLabelText("Run at time"), { target: { value: "2026-09-16T02:00" } });
    expect(screen.getByRole("button", { name: /^Run at: Not before/ })).toHaveTextContent("Not before");
    fireEvent.click(screen.getByRole("button", { name: "Clear the run-at time" }));
    expect(screen.getByRole("button", { name: "Run at" })).toHaveTextContent("Run at…");
    fireEvent.click(screen.getByRole("button", { name: "Run at" }));
    fireEvent.change(screen.getByLabelText("Run at time"), { target: { value: "2026-09-16T02:00" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "Overnight boat" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/task/q2");
    });
    expect(notify).toHaveBeenCalledWith("Queued — 1st in line");
    expect(bodies[0]).toMatchObject({ prompt: "Overnight boat", notBefore: new Date("2026-09-16T02:00").toISOString() });
    expect(bodies[0]).not.toHaveProperty("replaces");
  });

  it("the + menu lists the reference's entries with submenus; Add files or photos opens the reference chooser in video mode", async () => {
    await renderReady();
    const input = screen.getByTestId("reference-input");
    const clickInput = vi.spyOn(input as HTMLInputElement, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    const menu = screen.getByRole("menu", { name: "Add attachment" });
    const labels = Array.from(menu.querySelectorAll('[role="menuitem"]')).map((el) => el.getAttribute("aria-label") ?? el.textContent.trim());
    expect(labels).toEqual(["Add files or photos", "Add to project", "Skills", "Environment variables"]); // STORY_026: no Plugins ›
    fireEvent.click(screen.getByRole("menuitem", { name: "Skills" }));
    const skills = screen.getByRole("menu", { name: "Skills" });
    await waitFor(() => {
      expect(within(skills).getAllByRole("menuitem").map((el) => el.textContent.trim())).toEqual(["Templates", "Manage skills", "Add template"]); // STORY_054: the templates one level down, then the two links; the directors are radio rows
    });
    expect(screen.getByRole("menuitem", { name: "Manage skills" })).not.toHaveAttribute("aria-disabled");
    fireEvent.click(screen.getByRole("menuitem", { name: "Add files or photos" }));
    expect(clickInput).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "Add attachment" })).not.toBeInTheDocument();
  });

  it("MiniMax-M3 opens its menu, every entry inert (kept for BACKLOG_006); Escape closes", () => {
    const fetchImpl = fetchWith(() => json({}, 500));
    render(<Composer fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole("button", { name: "MiniMax-M3" }));
    const agent = screen.getByRole("menu", { name: "Agent model" });
    expect(agent).toHaveTextContent("MiniMax-M2.7 HighSpeed");
    expect(screen.getByRole("switch", { name: "Thinking" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Agent model" })).not.toBeInTheDocument();
  });

  it("one mode chip: Video generation; the reference's Document / Website / Image Generation / More are gone (STORY_026)", () => {
    const fetchImpl = fetchWith(() => json({}, 500));
    render(<Composer fetchImpl={fetchImpl} />);
    const chips = within(screen.getByRole("group", { name: "Modes" })).getAllByRole("button");
    expect(chips.map((el) => el.textContent.replace(/\s+/g, " ").trim())).toEqual(["Video generation H3"]);
    for (const name of ["Document", "Website", "Image Generation", "More"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("a video Showcase card types its prompt and sets its parameters; Clear selected scene empties and hides the row", async () => {
    await renderReady();
    expect(screen.queryByRole("group", { name: "Modes" })).not.toBeInTheDocument(); // chips hide once a mode is on
    fireEvent.click(screen.getByRole("button", { name: "Forest Dawn Fly-through" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveDisplayValue(/drone glides/);
    expect(screen.getByRole("button", { name: /^Video parameters: 21:9 768P 8s$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Clear selected scene" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
    expect(screen.queryByTestId("showcase")).not.toBeInTheDocument();
  });
});

describe("Composer — a chain from one text (STORY_044)", () => {
  const scene = "A fit young man stands centre frame on a black studio floor.";
  const s1 = "[0:00-0:03] From his standing stance, he draws his elbows back.\n[0:03-0:10] He holds.";
  const s2 = "[0:00-0:03] He steps his left foot back slightly.\n[0:03-0:10] He holds the angle.";
  const s3 = "[0:00-0:03] From the three-quarter angle, he squats.\n[0:03-0:10] He stands tall.";
  const three = `${scene}\n\n${s1}\n\n${s2}\n\n${s3}`;
  const type = (text: string) => { fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: text } }); };
  const pick10s = () => { fireEvent.click(screen.getByRole("button", { name: /^Video parameters:/ })); fireEvent.click(screen.getByRole("radio", { name: "10s" })); fireEvent.keyDown(window, { key: "Escape" }); };

  it("two or more [0:00- scripts show the strip with the segments and the length in all; one script or none shows nothing and Send stays Send", async () => {
    await renderReady();
    type(`${scene}\n\n${s1}`);
    expect(screen.queryByTestId("chain-strip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    type(three);
    pick10s();
    const strip = screen.getByTestId("chain-strip");
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("3 segments · 10 s each · ≈ 31.4 s in all · overlap 1.6 s");
    const rows = within(strip).getAllByTestId("chain-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("1 10 s from the text From his standing stance, he draws his elbows back.");
    expect(rows[1]).toHaveTextContent("2 +10 s continues 1 He steps his left foot back slightly.");
    expect(rows[2]).toHaveTextContent("3 +10 s continues 2 From the three-quarter angle, he squats.");
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send all" })).toBeEnabled();
    // the strip's Overlap changes the arithmetic and what every extension will carry
    fireEvent.click(within(strip).getByRole("radio", { name: "2.3 s" }));
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("overlap 2.3 s");
    type("just one prompt");
    expect(screen.queryByTestId("chain-strip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("over the cap the summary names the segments that would not run, their rows are greyed and Send all is disabled; a script longer than the chosen length says so", async () => {
    await renderReady();
    type(`${scene}\n\n${s1}\n\n${s2}\n\n${s3}\n\n${s1}`);
    pick10s();
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("4 segments · 10 s each · ≈ 42.0 s in all · overlap 1.6 s — the Spark extends videos up to 30 s: segment 4 would not run");
    const rows = screen.getAllByTestId("chain-row");
    expect(rows[3]).toHaveAttribute("data-fits", "false");
    expect(rows[3]).toHaveTextContent("would extend a 31.4 s video");
    expect(rows[2]).toHaveAttribute("data-fits", "true");
    expect(screen.getByRole("button", { name: "Send all" })).toBeDisabled();
    // at the default 5 s a script whose last timestamp is 0:10 is flagged
    type(`${scene}\n\n${s1}\n\n${s2}`);
    fireEvent.click(screen.getByRole("button", { name: /^Video parameters:/ }));
    fireEvent.click(screen.getByRole("radio", { name: "5s" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getAllByTestId("chain-row")[1]).toHaveTextContent("ends at 0:10 — longer than 5 s");
    expect(screen.getByRole("button", { name: "Send all" })).toBeEnabled();
  });

  it("Send all posts the segments in order — the first with the image, each next continuing the id just answered — toasts the count and opens the last segment's page", async () => {
    const bodies: unknown[] = [];
    let n = 0;
    const fetchImpl = fetchWith((init) => {
      const body = init?.body;
      bodies.push(body instanceof FormData ? Object.fromEntries([...body.entries()].filter(([k]) => k !== "referenceImage")) : JSON.parse(typeof body === "string" ? body : "{}"));
      n += 1;
      return json({ id: `j${String(n)}`, status: "queued", progress: 0, ...(n > 1 ? { position: n - 1 } : {}) }, 202);
    });
    const notify = vi.fn();
    render(
      <ShellContext.Provider value={{ workAreaOpen: false, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
        <Composer fetchImpl={fetchImpl} />
      </ShellContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled();
    });
    const input = screen.getByTestId("reference-input");
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["png"], "a.png", { type: "image/png" })] } });
      await Promise.resolve();
    });
    type(three);
    pick10s();
    expect(screen.getAllByTestId("chain-row")[0]).toHaveTextContent("from the image");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send all" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/task/j3");
    });
    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toMatchObject({ prompt: `${scene}\n\n${s1}`, durationSeconds: "10" });
    expect(bodies[0]).not.toHaveProperty("continueFrom");
    expect(bodies[1]).toMatchObject({ prompt: `${scene}\n\n${s2}`, continueFrom: "j1", overlapFrames: 39, durationSeconds: 10 });
    expect(bodies[2]).toMatchObject({ prompt: `${scene}\n\n${s3}`, continueFrom: "j2" });
    expect(vi.mocked(fetchImpl).mock.calls.filter((c) => typeof c[0] === "string" && c[0].startsWith("/api/jobs"))).toHaveLength(3);
    expect(notify).toHaveBeenCalledWith("Queued — 3 segments, ≈ 31.4 s");
  });

  it("a refusal at the third post keeps the two accepted segments, names the third in the error, and leaves the composer extending the second with the scene and the unsent script", async () => {
    let n = 0;
    await renderReady(() => {
      n += 1;
      if (n === 3) return json({ error: { code: "validation", message: "prompt is too long", field: "prompt" } }, 400);
      return json({ id: `j${String(n)}`, status: "queued", progress: 0, position: n }, 202);
    });
    type(three);
    pick10s();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send all" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Segment 3 was not sent: prompt is too long");
    });
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("continuation")).toHaveAttribute("data-pending", "true");
    expect(screen.getByTestId("continuation")).toHaveTextContent("Continues · 20.8 s (not finished yet");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(`${scene}\n\n${s3}`);
    expect(screen.queryByTestId("chain-strip")).not.toBeInTheDocument(); // one script left: a plain extension, Send as today
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("in extend mode every segment is an extension and the first row continues the source by its stamp", async () => {
    render(<Composer fetchImpl={fetchWith(() => json({ id: "j2", status: "queued", progress: 0 }, 202))} variant="docked" extend={{ ...source, title: "26-09-16-1100", durationSeconds: 5 }} onStopExtending={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Video parameters:/ })).toBeEnabled();
    });
    type(`${s1}\n\n${s2}`);
    const rows = screen.getAllByTestId("chain-row");
    expect(rows[0]).toHaveTextContent("1 +10 s continues 26-09-16-1100 From his standing stance");
    expect(rows[1]).toHaveTextContent("2 +10 s continues 1 He steps his left foot back");
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("2 segments · +10 s each · ≈ 26.4 s in all · overlap 1.6 s");
    expect(screen.getByRole("button", { name: "Send all" })).toBeEnabled();
  });
});
