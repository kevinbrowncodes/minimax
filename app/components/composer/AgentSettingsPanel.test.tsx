/** STORY_051: the ⚙ and the Agent settings panel, and the straight-through path — a clean reply posted at once with no review render. */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellContext } from "@/components/shell/ShellContext";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, agent: { configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } } };
const skills = [{ id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "d", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10" } }];
const PROMPT = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\nintegrated_multimodal_description: [Shot 1] Live-action. The camera holds. The man steps forward.\n\noverall_soundscape: room tone.\n\nnon_diegetic_music: None.";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const update = vi.fn();
const notify = vi.fn();

function mount(settings: Settings, run: unknown, runStatus = 200) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills }));
    if (url.startsWith("/api/agent/runs")) return Promise.resolve(json(run, runStatus));
    if (url.startsWith("/api/jobs")) return Promise.resolve(json({ id: "j1", status: "queued", progress: 0, position: 2 }, 202));
    return Promise.resolve(json({ skills: [] }));
  };
  render(
    <ShellContext.Provider value={{ workAreaOpen: true, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
      <SettingsContext.Provider value={{ settings, update }}>
        <Composer fetchImpl={vi.fn(impl) as unknown as typeof fetch} />
      </SettingsContext.Provider>
    </ShellContext.Provider>,
  );
  return calls;
}
const armed = async (): Promise<void> => {
  await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
  fireEvent.click(screen.getByTestId("agent-chip"));
  await waitFor(() => { expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Thirst trap"); });
  fireEvent.change(screen.getByTestId("reference-input"), { target: { files: [new File(["png"], "01.png", { type: "image/png" })] } });
};

afterEach(() => {
  cleanup();
  push.mockReset();
  update.mockReset();
  notify.mockReset();
});

describe("Agent settings (STORY_051)", () => {
  it("the ⚙ shows with the chip on and opens the panel; the radios reflect the setting; Save writes and closes; Cancel and Escape discard", async () => {
    mount(DEFAULT_SETTINGS, { kind: "prompt", prompt: PROMPT, findings: [], segments: 1 });
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    expect(screen.queryByRole("button", { name: "Agent settings" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("agent-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Agent settings" }));
    const dialog = screen.getByRole("dialog", { name: "Agent settings" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Always/ })).toBeChecked();
    expect(screen.getByText("Agent will generate media and use the Spark automatically.")).toBeInTheDocument();
    expect(screen.getByTestId("agent-settings-model")).toHaveTextContent("Gemini 3.8 Flash · Vertex AI");
    fireEvent.click(screen.getByRole("radio", { name: /Never/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Agent settings" })).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Agent settings" }));
    fireEvent.click(screen.getByRole("radio", { name: /Never/ }));
    // STORY_055: the Draws track — x1 checked from the setting; x3 picked; both written by Save
    const draws = screen.getByRole("radiogroup", { name: "Draws" });
    expect(within(draws).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual(["x1", "x2", "x3", "x4"]);
    expect(within(draws).getByRole("radio", { name: "x1" })).toBeChecked();
    fireEvent.click(within(draws).getByRole("radio", { name: "x3" }));
    expect(screen.getByText("Each draw is a job with its own seed, queued one after another.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith({ agentConfirm: "never", agentDraws: 3 });
    expect(notify).toHaveBeenCalledWith("Saved");
    expect(screen.queryByRole("dialog", { name: "Agent settings" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agent settings" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Agent settings" })).not.toBeInTheDocument();
  });

  it("Never + a clean reply: the job is posted at once with the prompt, the photo and the skill's 10 s, the box never shows the prompt, the toast and the task page follow", async () => {
    const calls = mount({ ...DEFAULT_SETTINGS, agentConfirm: "never" }, { kind: "prompt", prompt: PROMPT, findings: [], segments: 1 });
    await armed();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j1"); });
    const job = calls.find((c) => c.url.startsWith("/api/jobs"));
    expect(job).toBeDefined();
    const form = job?.init?.body as FormData;
    expect(form.get("prompt")).toBe(PROMPT);
    expect(form.get("durationSeconds")).toBe("10");
    expect((form.get("referenceImage") as File).name).toBe("01.png");
    expect(notify).toHaveBeenCalledWith("Queued — the director's prompt, 2nd in line");
    expect(screen.getByRole("textbox", { name: "Message" })).not.toHaveValue(PROMPT);
  });

  it("Never + a clean reply with Draws x2: two jobs posted one after another, the same prompt and photo, no seed, the toast counts them, the first draw's page (STORY_055)", async () => {
    const calls = mount({ ...DEFAULT_SETTINGS, agentConfirm: "never", agentDraws: 2 }, { kind: "prompt", prompt: PROMPT, findings: [], segments: 1 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message, 2 draws" }));
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j1"); });
    const jobs = calls.filter((c) => c.url.startsWith("/api/jobs"));
    expect(jobs).toHaveLength(2);
    for (const job of jobs) {
      const form = job.init?.body as FormData;
      expect(form.get("prompt")).toBe(PROMPT);
      expect(form.get("durationSeconds")).toBe("10");
      expect(form.get("seed")).toBeNull();
      expect((form.get("referenceImage") as File).name).toBe("01.png");
    }
    expect(notify).toHaveBeenCalledWith("Queued — 2 draws, 2nd in line");
  });

  it("Never + findings: the review path with 'Not sent —', nothing posted; Never + a refusal: the alert, nothing posted", async () => {
    let calls = mount({ ...DEFAULT_SETTINGS, agentConfirm: "never" }, { kind: "prompt", prompt: PROMPT, findings: [{ code: "no-soundscape", message: "no overall_soundscape: field" }], segments: 1 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-findings")).toHaveTextContent("Not sent — the reply misses the skill's format: no overall_soundscape: field. Edit it and Send."); });
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(PROMPT);
    expect(calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
    cleanup();
    calls = mount({ ...DEFAULT_SETTINGS, agentConfirm: "never" }, { kind: "refusal", message: "no" });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-alert")).toHaveTextContent('The director declined: "no"'); });
    expect(calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("Never + a chain reply that does not split as the server counted it is reviewed, not sent (STORY_053 queues a chain that does — ChainDirector.test)", async () => {
    // one prompt the server called three segments: the composer cannot post what it cannot split, so the reply is reviewed
    const calls = mount({ ...DEFAULT_SETTINGS, agentConfirm: "never" }, { kind: "prompt", prompt: PROMPT, findings: [], segments: 3 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(PROMPT); });
    expect(calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("Always is unchanged: the reply comes back for review", async () => {
    const calls = mount(DEFAULT_SETTINGS, { kind: "prompt", prompt: PROMPT, findings: [], segments: 1 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(PROMPT); });
    expect(calls.filter((c) => c.url.startsWith("/api/jobs"))).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });
});
