/**
 * STORY_055: draws per prompt in the composer — Send reads ×N and the Spark line multiplies; Send posts the same
 * request N times and opens the first draw's page; a chain is sent once and the strip says so; a refusal on the second
 * draw names it and keeps the prompt.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellContext } from "@/components/shell/ShellContext";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 } };
const PROMPT = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\nintegrated_multimodal_description: [Shot 1] Live-action. The camera holds. The man steps forward.\n\noverall_soundscape: room tone.\n\nnon_diegetic_music: None.";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const notify = vi.fn();

function mount(settings: Settings, refuseAt?: number) {
  const jobs: { body: Record<string, unknown>; multipart: boolean }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url.startsWith("/api/jobs")) {
      const body = init?.body;
      const fields = body instanceof FormData ? Object.fromEntries([...body.entries()].map(([k, v]) => [k, v instanceof File ? v.name : v])) : (JSON.parse(typeof body === "string" ? body : "{}") as Record<string, unknown>);
      jobs.push({ body: fields, multipart: body instanceof FormData });
      const n = jobs.length;
      if (n === refuseAt) return Promise.resolve(json({ error: { code: "validation", message: "prompt is too long", field: "prompt" } }, 400));
      return Promise.resolve(json({ id: `j${String(n)}`, status: "queued", progress: 0, ...(n > 1 ? { position: n - 1 } : {}) }, 202));
    }
    return Promise.resolve(json({ skills: [] }));
  };
  render(
    <ShellContext.Provider value={{ workAreaOpen: true, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
      <SettingsContext.Provider value={{ settings, update: vi.fn() }}>
        <Composer fetchImpl={vi.fn(impl) as unknown as typeof fetch} />
      </SettingsContext.Provider>
    </ShellContext.Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
  return jobs;
}
const ready = async (): Promise<void> => { await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); }); };
const type = (text: string) => { fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: text } }); };
const attach = () => { fireEvent.change(screen.getByTestId("reference-input"), { target: { files: [new File(["png"], "01.png", { type: "image/png" })] } }); };

afterEach(() => {
  cleanup();
  push.mockReset();
  notify.mockReset();
});

describe("draws per prompt (STORY_055)", () => {
  it("x2: Send reads ×2 and the line multiplies; Send posts twice — the same prompt, image and parameters, no seed — toasts the count and opens the first draw's page", async () => {
    const jobs = mount({ ...DEFAULT_SETTINGS, agentDraws: 2 });
    await ready();
    attach();
    type(PROMPT);
    const send = screen.getByRole("button", { name: "Send message, 2 draws" });
    expect(send).toHaveTextContent("×2");
    expect(screen.getByTestId("spark-time")).toHaveTextContent("≈ 2 × 25 min on the Spark"); // 5 s from an image: half the measured 10 s row, twice
    fireEvent.click(send);
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j1"); });
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({ multipart: true, body: { prompt: PROMPT, durationSeconds: "5", referenceImage: "01.png" } });
    expect(jobs[1]).toMatchObject({ multipart: true, body: { prompt: PROMPT, durationSeconds: "5", referenceImage: "01.png" } });
    for (const job of jobs) expect(job.body).not.toHaveProperty("seed");
    expect(notify).toHaveBeenCalledWith("Queued — 2 draws");
  });

  it("x1 is today's one post with no count on Send and the plain line", async () => {
    const jobs = mount(DEFAULT_SETTINGS);
    await ready();
    attach();
    type(PROMPT);
    expect(screen.getByRole("button", { name: "Send message" })).not.toHaveTextContent("×");
    expect(screen.getByTestId("spark-time")).toHaveTextContent(/^≈ \d+ min on the Spark$/);
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j1"); });
    expect(jobs).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it("x3 with a chain: the chain is sent once and the strip's summary says so", async () => {
    const jobs = mount({ ...DEFAULT_SETTINGS, agentDraws: 3 });
    await ready();
    attach();
    type("Scene.\n\n[0:00-0:03] one\n\n[0:00-0:03] two");
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("· draws apply to single clips; the chain is sent once");
    expect(screen.getByRole("button", { name: "Send all" })).not.toHaveTextContent("×");
    expect(screen.queryByTestId("spark-time")).not.toBeInTheDocument(); // the line is for base-format prompts only; a scripts chain has none
    fireEvent.click(screen.getByRole("button", { name: "Send all" }));
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j2"); });
    expect(jobs).toHaveLength(2);
    expect(jobs[1]?.body).toMatchObject({ continueFrom: "j1" });
    expect(notify).toHaveBeenCalledWith("Queued — 2 segments, ≈ 10.8 s"); // 124 + 175 − 39 frames at 5 s
  });

  it("a refusal on the second draw: the first stays, the alert names the draw, the prompt, the image and the parameters stay put", async () => {
    const jobs = mount({ ...DEFAULT_SETTINGS, agentDraws: 2 }, 2);
    await ready();
    attach();
    type(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "Send message, 2 draws" }));
    await waitFor(() => { expect(screen.getByRole("alert")).toHaveTextContent("Draw 2 was not sent: prompt is too long"); });
    expect(jobs).toHaveLength(2);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(PROMPT);
    expect(screen.getByRole("img", { name: "Reference image 1" })).toBeInTheDocument();
    expect(screen.queryByTestId("continuation")).not.toBeInTheDocument(); // no extend-mode switch: the draws are independent
    expect(screen.getByRole("button", { name: "Send message, 2 draws" })).toBeEnabled();
  });
});
