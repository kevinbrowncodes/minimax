/**
 * STORY_050: the Agent chip in the composer — its states, the Skills menu, a run (the reply into the box, the chip off,
 * the duration the skill's, the "≈ … min" line), findings as a warning, a refusal as the alert, Stop, the disabled
 * reasons, the model pill's second form — and the run effect rendered inside <StrictMode> with fake timers (§ 6b).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const base: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
const configured: Capabilities = { ...base, agent: { configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } } };
const skills = [
  { id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "Directs one thirst-trap short from one attached photo", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10" } },
  { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "Directs a whole video", metadata: { "minimax-short-name": "Chain director" } },
];
const PROMPT = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\nintegrated_multimodal_description: [Shot 1] Live-action. The camera holds a perfectly static shot throughout the entire ten-second duration. The man in the navy trunks steps forward and holds there, eyes level into the lens, as the clip ends.\n\noverall_soundscape: room tone.\n\nnon_diegetic_music: None.";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Answer = (init: RequestInit | undefined) => Response | Promise<Response>;
function fetchWith({ caps = configured, onRun = () => json({ kind: "prompt", prompt: PROMPT, findings: [], segments: 1, passes: 2 }), onJobs = () => json({ id: "j1", status: "queued", progress: 0 }, 202) }: { caps?: Capabilities; onRun?: Answer; onJobs?: Answer } = {}) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills }));
    if (url.startsWith("/api/agent/runs")) return Promise.resolve(onRun(init));
    if (url.startsWith("/api/jobs")) return Promise.resolve(onJobs(init));
    if (url === "/api/skills") return Promise.resolve(json({ skills: [] }));
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  };
  return { fetch: vi.fn(impl) as unknown as typeof fetch, calls };
}
const update = vi.fn();
function renderAgent(options: Parameters<typeof fetchWith>[0] = {}, { strict = false, settings = DEFAULT_SETTINGS }: { strict?: boolean; settings?: typeof DEFAULT_SETTINGS } = {}) {
  const f = fetchWith(options);
  const tree = (
    <SettingsContext.Provider value={{ settings, update }}>
      <Composer fetchImpl={f.fetch} />
    </SettingsContext.Provider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
  return f;
}
const chip = () => screen.getByTestId("agent-chip");
const attach = () => fireEvent.change(screen.getByTestId("reference-input"), { target: { files: [new File(["png"], "01.png", { type: "image/png" })] } });

afterEach(() => {
  cleanup();
  push.mockReset();
  update.mockReset();
  vi.useRealTimers();
});

describe("the Agent chip", () => {
  it("is off and muted in video mode, absent in text mode; on, it names the skill, opens the Skills menu, and the pill names the agent's model", async () => {
    renderAgent();
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    expect(chip()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "MiniMax-M3" })).toBeInTheDocument();
    fireEvent.click(chip());
    await waitFor(() => { expect(chip()).toHaveAttribute("aria-label", "Agent on · Thirst trap"); });
    expect(screen.getByRole("button", { name: "Agent model: Gemini 3.8 Flash" })).toBeInTheDocument();
    expect(screen.getByTestId("agent-hint")).toHaveTextContent("Attach the photo the director starts from.");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Choose the agent's skill" }));
    const menu = screen.getByRole("menu", { name: "Skills" });
    expect(menu).toBeInTheDocument();
    const rows = screen.getAllByRole("menuitemradio");
    expect(rows.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    fireEvent.click(rows[1] as HTMLElement);
    expect(update).toHaveBeenCalledWith({ agentSkill: "minimax-h3-director-thirst-trap-chain" });
    expect(chip()).toHaveAttribute("aria-label", "Agent on · Chain director");
    fireEvent.click(screen.getByRole("button", { name: "Agent model: Gemini 3.8 Flash" }));
    expect(screen.getAllByRole("menuitemradio").map((r) => r.textContent)).toEqual(["✓Gemini 3.8 Flash"]);
    expect(screen.queryByRole("switch", { name: "Thinking" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove video-creator" }));
    expect(screen.queryByTestId("agent-chip")).not.toBeInTheDocument();
  });

  it("BUG_011: the saved skill is applied when the settings arrive after the mount, and a pick still wins", async () => {
    const f = fetchWith();
    const tree = (settings: typeof DEFAULT_SETTINGS) => (
      <SettingsContext.Provider value={{ settings, update }}>
        <Composer fetchImpl={f.fetch} />
      </SettingsContext.Provider>
    );
    const view = render(tree(DEFAULT_SETTINGS)); // the Shell's defaults: /api/settings has not answered yet
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    fireEvent.click(chip());
    await waitFor(() => { expect(chip()).toHaveAttribute("aria-label", "Agent on · Thirst trap"); });
    view.rerender(tree({ ...DEFAULT_SETTINGS, agentSkill: "minimax-h3-director-thirst-trap-chain" })); // the settings land
    await waitFor(() => { expect(chip()).toHaveAttribute("aria-label", "Agent on · Chain director"); });
    expect(update).not.toHaveBeenCalled(); // applied, not written back
    view.rerender(tree({ ...DEFAULT_SETTINGS, agentSkill: "no-such-skill" })); // a folder that is gone keeps the current pick
    expect(chip()).toHaveAttribute("aria-label", "Agent on · Chain director");
  });

  it("a run inside StrictMode with fake timers: Thinking… and Stop, then the prompt in the box, the chip off, the duration 10 s, the ≈ line — one request", async () => {
    vi.useFakeTimers();
    let resolveRun: ((r: Response) => void) | undefined;
    const f = renderAgent({ onRun: () => new Promise<Response>((resolve) => { resolveRun = resolve; }) }, { strict: true });
    await act(async () => { await vi.runAllTimersAsync(); });
    fireEvent.click(chip());
    attach();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "keep the camera still" } });
    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByTestId("agent-status")).toHaveTextContent("Thinking…");
    expect(screen.getByRole("button", { name: "Stop the agent" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveAttribute("readonly");
    expect(f.calls.filter((c) => c.url.startsWith("/api/agent/runs"))).toHaveLength(1);
    const body = f.calls.find((c) => c.url.startsWith("/api/agent/runs"))?.init?.body as FormData;
    expect(body.get("skill")).toBe("minimax-h3-director-thirst-trap");
    expect(body.get("notes")).toBe("keep the camera still");
    expect((body.get("referenceImage") as File).name).toBe("01.png");
    await act(async () => { resolveRun?.(json({ kind: "prompt", prompt: PROMPT, findings: [], segments: 1, passes: 2 })); await vi.runAllTimersAsync(); });
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(PROMPT);
    expect(chip()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Video parameters: 16:9 768P 10s" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Reference image 1" })).toBeInTheDocument();
    expect(screen.getByTestId("spark-time")).toHaveTextContent("≈ 50 min on the Spark");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(f.calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
  });

  it("findings come back as the amber strip and Send stays enabled", async () => {
    renderAgent({ onRun: () => json({ kind: "prompt", prompt: PROMPT, findings: [{ code: "no-soundscape", message: "no overall_soundscape: field" }], segments: 1, passes: 2 }) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(chip());
    attach();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-findings")).toHaveTextContent("The reply misses the skill's format: no overall_soundscape: field. Edit it, or send it as it is."); });
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("a refusal is the alert with the model's words; the chip stays on, the notes and the photo stay, no job is posted, the Shell is told", async () => {
    const told = vi.fn();
    window.addEventListener("minimax:agent-runs", told);
    const f = renderAgent({ onRun: () => json({ kind: "refusal", message: "I can't help with that." }) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(chip());
    attach();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-alert")).toHaveTextContent('The director declined: "I can\'t help with that."'); });
    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("notes");
    expect(screen.getByRole("button", { name: "Remove Reference image 1" })).toBeInTheDocument();
    expect(f.calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
    expect(told).toHaveBeenCalled();
    window.removeEventListener("minimax:agent-runs", told);
  });

  it("an error names the cause; Stop aborts the request and says so", async () => {
    const f = renderAgent({ onRun: () => json({ error: { code: "quota", message: "Quota exceeded" } }, 429) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(chip());
    attach();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-alert")).toHaveTextContent("Google's quota: Quota exceeded"); });
    cleanup();
    // Stop
    let signal: AbortSignal | undefined;
    const g = renderAgent({ onRun: (init) => new Promise<Response>((_, reject) => { signal = init?.signal ?? undefined; signal?.addEventListener("abort", () => { reject(new Error("aborted")); }); }) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(chip());
    attach();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByRole("button", { name: "Stop the agent" })).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: "Stop the agent" }));
    await waitFor(() => { expect(screen.getByTestId("agent-info")).toHaveTextContent("Stopped — nothing was sent."); });
    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("notes");
    expect(g.calls.filter((c) => c.url.startsWith("/api/agent/runs"))).toHaveLength(1);
    expect(f.calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
  });

  it("is greyed with the reason when the agent is not configured, and in extend mode", async () => {
    renderAgent({ caps: { ...base, agent: { configured: false, reason: "VERTEX_PROJECT is not set" } } });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    expect(chip()).toHaveAttribute("aria-disabled", "true");
    expect(chip()).toHaveAttribute("title", "VERTEX_PROJECT is not set");
    fireEvent.click(chip());
    expect(chip()).toHaveAttribute("aria-pressed", "false");
    cleanup();
    const f = fetchWith();
    render(<SettingsContext.Provider value={{ settings: DEFAULT_SETTINGS, update }}><Composer fetchImpl={f.fetch} extend={{ id: "src", title: "The first clip", durationSeconds: 2, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "/p" }} /></SettingsContext.Provider>);
    await waitFor(() => { expect(screen.getByTestId("continuation")).toBeInTheDocument(); });
    expect(chip()).toHaveAttribute("title", "Agent needs a photo — it directs from the first frame");
  });

  it("a reopened run: the notes back, the chip on, the words shown; the ≈ line only for a prompt in the model's format", async () => {
    const f = fetchWith();
    render(<SettingsContext.Provider value={{ settings: DEFAULT_SETTINGS, update }}><Composer fetchImpl={f.fetch} initialAgentRun={{ notes: "blue trunks", message: 'The director declined: "no"', skill: "minimax-h3-director-thirst-trap-chain" }} /></SettingsContext.Provider>);
    await waitFor(() => { expect(chip()).toHaveAttribute("aria-label", "Agent on · Chain director"); });
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("blue trunks");
    expect(screen.getByTestId("agent-alert")).toHaveTextContent('The director declined: "no"');
    expect(screen.queryByTestId("spark-time")).not.toBeInTheDocument();
    fireEvent.click(chip());
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "a hand-typed prompt" } });
    expect(screen.queryByTestId("spark-time")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: PROMPT } });
    expect(screen.getByTestId("spark-time")).toHaveTextContent("≈ 17 min on the Spark");
  });
});
