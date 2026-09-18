/**
 * STORY_053: a chain reply in the composer — the strip from the marker rule with rows titled by the action sentence,
 * a finding named per segment, and the straight-through path: every segment clean → submitChain (three POSTs in
 * order, nothing painted first); one finding → nothing posted, "Not sent — Segment 2 …".
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { checkPromptFormat, splitSegments } from "@/lib/prompt-format";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellContext } from "@/components/shell/ShellContext";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 }, agent: { configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } } };
const skills = [
  { id: "minimax-h3-director-thirst-trap", name: "minimax-h3-director-thirst-trap", description: "one clip", metadata: { "minimax-short-name": "Thirst trap", "minimax-clip-seconds": "10" } },
  { id: "minimax-h3-director-thirst-trap-chain", name: "minimax-h3-director-thirst-trap-chain", description: "a chain", metadata: { "minimax-short-name": "Chain director", "minimax-clip-seconds": "10", "minimax-segments-default": "3" } },
];
// the stub's chain fixture: segment 1 with the instruction line, segments 2 and 3 at the marker, each clean
const CHAIN = readFileSync(path.resolve(__dirname, "../../../tools/stub-generation-server/fixtures/agent/chain.txt"), "utf8").trim();
const SEGMENTS = splitSegments(CHAIN);
// segment 2 cut to its first sentence: the check names it
const CHAIN_WARN = [SEGMENTS[0], (SEGMENTS[1] ?? "").replace(/(integrated_multimodal_description:\s*\[Shot 1\][^.]*\.)[\s\S]*?(\n\s*overall_soundscape:)/, "$1 A few words only.$2"), SEGMENTS[2]].join("\n\n");
const WARN_FINDINGS = checkPromptFormat(CHAIN_WARN, { chain: true }).findings;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const update = vi.fn();
const notify = vi.fn();

function mount(settings: Settings, run: unknown, refuseAt?: number) {
  const jobs: { url: string; body: Record<string, unknown>; multipart: boolean }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills }));
    if (url.startsWith("/api/agent/runs")) return Promise.resolve(json(run));
    if (url.startsWith("/api/jobs")) {
      const body = init?.body;
      const fields = body instanceof FormData ? Object.fromEntries([...body.entries()].map(([k, v]) => [k, v instanceof File ? v.name : v])) : (JSON.parse(typeof body === "string" ? body : "{}") as Record<string, unknown>);
      jobs.push({ url, body: fields, multipart: body instanceof FormData });
      const n = jobs.length;
      if (n === refuseAt) return Promise.resolve(json({ error: { code: "validation", message: "prompt is too long", field: "prompt" } }, 400));
      return Promise.resolve(json({ id: `j${String(n)}`, status: "queued", progress: 0, ...(n > 1 ? { position: n - 1 } : {}) }, 202));
    }
    return Promise.resolve(json({}));
  };
  render(
    <ShellContext.Provider value={{ workAreaOpen: true, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined }}>
      <SettingsContext.Provider value={{ settings, update }}>
        <Composer fetchImpl={vi.fn(impl) as unknown as typeof fetch} />
      </SettingsContext.Provider>
    </ShellContext.Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
  return jobs;
}
/** The chip on with the chain director chosen, the photo attached. */
const armed = async (): Promise<void> => {
  await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
  fireEvent.click(screen.getByTestId("agent-chip"));
  await waitFor(() => { expect(screen.getByTestId("agent-chip")).toHaveAttribute("aria-label", "Agent on · Chain director"); });
  fireEvent.change(screen.getByTestId("reference-input"), { target: { files: [new File(["png"], "01.png", { type: "image/png" })] } });
};

afterEach(() => {
  cleanup();
  push.mockReset();
  update.mockReset();
  notify.mockReset();
});

describe("the chain director's reply (STORY_053)", () => {
  const settings: Settings = { ...DEFAULT_SETTINGS, agentSkill: "minimax-h3-director-thirst-trap-chain" };

  it("in review: the strip from the marker rule — three rows titled by their action sentence, 10 s each, Send all, the Spark line", async () => {
    const jobs = mount(settings, { kind: "prompt", prompt: CHAIN, findings: [], segments: 3 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(CHAIN); });
    expect(screen.getByTestId("chain-summary")).toHaveTextContent("3 segments · 10 s each · ≈ 31.4 s in all · overlap 1.6 s");
    const rows = screen.getAllByTestId("chain-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("from the image");
    expect(rows[1]).toHaveTextContent("continues 1");
    for (const row of rows) {
      expect(row.textContent).not.toContain("For the target video");
      expect(row.textContent).not.toContain("integrated_multimodal_description");
      expect(row.textContent).not.toMatch(/Live-action|The camera holds/);
    }
    // CHORE_015: the rows read their segment's beat, so they differ
    expect(rows[0]).toHaveTextContent("In the first two seconds");
    expect(rows[1]).toHaveTextContent("For the first moment");
    expect(new Set(rows.map((r) => r.textContent)).size).toBe(3);
    expect(screen.getByRole("button", { name: "Send all" })).toBeEnabled();
    expect(screen.getByTestId("spark-time")).toHaveTextContent(/on the Spark$/);
    expect(screen.queryByTestId("agent-findings")).not.toBeInTheDocument();
    expect(jobs).toHaveLength(0);
  });

  it("in review with a finding on segment 2: the amber strip names it and Send all stays enabled", async () => {
    const jobs = mount(settings, { kind: "prompt", prompt: CHAIN_WARN, findings: WARN_FINDINGS, segments: 3 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-findings")).toHaveTextContent(/^▲ Segment 2 misses the skill's format: the description is \d+ words; the skill asks for 350–600\. Edit it, or send it as it is\.$/); });
    expect(screen.getByRole("button", { name: "Send all" })).toBeEnabled();
    expect(jobs).toHaveLength(0);
  });

  it("Never + every segment clean: the three segments are posted in order through submitChain, the toast, the last segment's page, no review render", async () => {
    const jobs = mount({ ...settings, agentConfirm: "never" }, { kind: "prompt", prompt: CHAIN, findings: [], segments: 3 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(push).toHaveBeenCalledWith("/task/j3"); });
    expect(jobs).toHaveLength(3);
    expect(jobs[0]).toMatchObject({ multipart: true, body: { prompt: SEGMENTS[0], durationSeconds: "10", referenceImage: "01.png" } });
    expect(jobs[0]?.body).not.toHaveProperty("continueFrom");
    expect(jobs[1]).toMatchObject({ multipart: false, body: { prompt: SEGMENTS[1], continueFrom: "j1", overlapFrames: 39, durationSeconds: 10 } });
    expect(jobs[2]).toMatchObject({ multipart: false, body: { prompt: SEGMENTS[2], continueFrom: "j2" } });
    expect(notify).toHaveBeenCalledWith("Queued — 3 segments, ≈ 31.4 s");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
    expect(screen.queryByTestId("chain-strip")).not.toBeInTheDocument();
  });

  it("Never + one finding: nothing is posted and the strip reads Not sent — Segment 2 …", async () => {
    const jobs = mount({ ...settings, agentConfirm: "never" }, { kind: "prompt", prompt: CHAIN_WARN, findings: WARN_FINDINGS, segments: 3 });
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-findings")).toHaveTextContent(/^▲ Not sent — Segment 2 misses the skill's format: .* Edit it and Send all\.$/); });
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(CHAIN_WARN);
    expect(screen.getAllByTestId("chain-row")).toHaveLength(3);
    expect(jobs).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("Never + a clean chain the server refuses at the third post: the two accepted stay, the third is named, the composer extends the second with it (STORY_044's rule)", async () => {
    const jobs = mount({ ...settings, agentConfirm: "never" }, { kind: "prompt", prompt: CHAIN, findings: [], segments: 3 }, 3);
    await armed();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByRole("alert")).toHaveTextContent("Segment 3 was not sent: prompt is too long"); });
    expect(jobs).toHaveLength(3);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("continuation")).toHaveAttribute("data-pending", "true");
    expect(screen.getByTestId("continuation")).toHaveTextContent("Continues · 20.8 s (not finished yet");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(SEGMENTS[2] ?? "");
    expect(screen.queryByTestId("chain-strip")).not.toBeInTheDocument();
  });
});
