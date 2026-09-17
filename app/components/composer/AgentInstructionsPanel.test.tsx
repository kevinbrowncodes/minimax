/** STORY_052: the ≡ with its badge, the Agent instructions panel — rows, Add, the switch, Delete, Done, the picker and an upload, a missing reference — and the status line's count. */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { SettingsContext } from "@/components/shell/SettingsContext";
import { ShellContext } from "@/components/shell/ShellContext";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { AgentInstructionsPanel } from "./AgentInstructionsPanel";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const notify = vi.fn();
const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["16:9"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, agent: { configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } } };
const studio = { id: "i1", title: "Studio", text: "the sequin curtain", active: true, createdAt: "2026-09-17T10:00:00.000Z", reference: { kind: "upload", file: { name: "01.png", type: "image/png", size: 3 } } };
const rule = { id: "i2", title: "House rule", text: "camera fixed", active: false, createdAt: "2026-09-17T10:00:00.000Z" };

function fetchFor(state: { list: unknown[] }) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    if (url === "/api/agent/instructions" && (init?.method ?? "GET") === "GET") return Promise.resolve(json({ instructions: state.list }));
    if (url === "/api/agent/instructions" && init?.method === "PUT") {
      const sent = (JSON.parse(typeof init.body === "string" ? init.body : "{}") as { instructions: { id?: string; title: string; text: string; active: boolean }[] }).instructions;
      state.list = sent.map((r, i) => ({ id: r.id ?? `new${String(i)}`, title: r.title, text: r.text, active: r.active, createdAt: "2026-09-17T11:00:00.000Z", ...(state.list.find((x) => (x as { id: string }).id === r.id) ? { reference: (state.list.find((x) => (x as { id: string }).id === r.id) as { reference?: unknown }).reference } : {}) }));
      return Promise.resolve(json({ instructions: state.list }));
    }
    if (/\/api\/agent\/instructions\/[^/]+\/reference$/.test(url) && init?.method === "POST") {
      const id = url.split("/")[4] ?? "";
      const row = state.list.find((x) => (x as { id: string }).id === id) as Record<string, unknown> | undefined;
      const updated = { ...row, reference: init.body instanceof FormData ? { kind: "upload", file: { name: "up.png", type: "image/png", size: 3 } } : { kind: "history", historyId: "job1", n: 1 } };
      state.list = state.list.map((x) => ((x as { id: string }).id === id ? updated : x));
      return Promise.resolve(json(updated));
    }
    if (/\/reference$/.test(url) && init?.method === "DELETE") return Promise.resolve(json({ id: url.split("/")[4], title: "t", text: "t", active: true, createdAt: "x" }));
    if (url === "/api/history") return Promise.resolve(json({ entries: [{ id: "job1", title: "A job", createdAt: "2026-09-16T12:00:00.000Z", referenceFiles: [{ n: 1, name: "ref.png" }] }] }));
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url === "/api/agent/skills") return Promise.resolve(json({ skills: [{ id: "s", name: "s", description: "d", metadata: { "minimax-short-name": "Thirst trap" } }] }));
    if (url.startsWith("/api/agent/runs")) return new Promise<Response>(() => undefined); // never answers: the status line stays
    return Promise.resolve(json({ skills: [] }));
  };
  return { fetch: vi.fn(impl) as unknown as typeof fetch, calls };
}
const shell = { workAreaOpen: true, toggleWorkArea: () => undefined, previewOpen: false, openPreview: () => undefined, closePreview: () => undefined, pageActions: undefined, setPageActions: () => undefined, toast: undefined, notify, clearToast: () => undefined };

afterEach(() => {
  cleanup();
  notify.mockReset();
});

describe("Agent instructions (STORY_052)", () => {
  it("lists the rows with their switches and references; Add focuses a new title; the switch toggles; Delete removes; Done PUTs and toasts; × discards", async () => {
    const state = { list: [studio, rule] as unknown[] };
    const f = fetchFor(state);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<AgentInstructionsPanel open fetchImpl={f.fetch} onClose={onClose} onSaved={onSaved} notify={notify} />);
    await waitFor(() => { expect(screen.getAllByTestId("instruction-row")).toHaveLength(2); });
    const switches = screen.getAllByRole("switch", { name: "Toggle instruction active" });
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(screen.getByRole("img", { name: "Reference for Studio" })).toHaveAttribute("src", "/api/agent/instructions/i1/reference");
    expect(screen.getAllByRole("button", { name: "+ Reference" })).toHaveLength(1);
    fireEvent.click(switches[1] as HTMLElement);
    expect(screen.getAllByRole("switch")[1]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "+ Add instruction" }));
    await waitFor(() => { expect(screen.getAllByTestId("instruction-row")).toHaveLength(3); });
    expect(document.activeElement).toBe(screen.getAllByRole("textbox", { name: "Instruction title" })[2]);
    fireEvent.change(screen.getAllByRole("textbox", { name: "Instruction title" })[2] as HTMLElement, { target: { value: "Character" } });
    fireEvent.change(screen.getAllByRole("textbox", { name: "Instruction text" })[2] as HTMLElement, { target: { value: "a fit young man" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Delete instruction" })[0] as HTMLElement);
    expect(screen.getAllByTestId("instruction-row")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => { expect(onSaved).toHaveBeenCalledWith(2); });
    const putCall = f.calls.find((c) => c.url === "/api/agent/instructions" && c.init?.method === "PUT");
    expect((JSON.parse(typeof putCall?.init?.body === "string" ? putCall.init.body : "{}") as { instructions: { title: string; active: boolean }[] }).instructions.map((r) => [r.title, r.active])).toEqual([["House rule", true], ["Character", true]]);
    expect(notify).toHaveBeenCalledWith("Saved");
    expect(onClose).toHaveBeenCalled();
    cleanup();
    const g = fetchFor({ list: [rule] });
    const close2 = vi.fn();
    render(<AgentInstructionsPanel open fetchImpl={g.fetch} onClose={close2} onSaved={vi.fn()} notify={notify} />);
    await waitFor(() => { expect(screen.getAllByTestId("instruction-row")).toHaveLength(1); });
    fireEvent.click(screen.getByRole("button", { name: "Close agent instructions" }));
    expect(close2).toHaveBeenCalled();
    expect(g.calls.some((c) => c.init?.method === "PUT")).toBe(false);
  });

  it("+ Reference opens the picker over the From-you images; a pick and an upload POST the reference at once; a missing image is greyed", async () => {
    const state = { list: [rule] as unknown[] };
    const f = fetchFor(state);
    render(<AgentInstructionsPanel open fetchImpl={f.fetch} onClose={vi.fn()} onSaved={vi.fn()} notify={notify} />);
    await waitFor(() => { expect(screen.getAllByTestId("instruction-row")).toHaveLength(1); });
    fireEvent.click(screen.getByRole("button", { name: "+ Reference" }));
    await waitFor(() => { expect(screen.getByRole("dialog", { name: "Select reference image" })).toBeInTheDocument(); });
    expect(f.calls.some((c) => c.url === "/api/agent/instructions" && c.init?.method === "PUT")).toBe(true); // the draft-safe save first
    const tile = screen.getByRole("img", { name: /ref\.png/ });
    fireEvent.click(tile.closest("button") as HTMLElement);
    await waitFor(() => { expect(screen.queryByRole("dialog", { name: "Select reference image" })).not.toBeInTheDocument(); });
    const post = f.calls.find((c) => /\/reference$/.test(c.url) && c.init?.method === "POST");
    expect(JSON.parse(typeof post?.init?.body === "string" ? post.init.body : "{}")).toEqual({ historyId: "job1", n: 1 });
    expect(screen.getByRole("img", { name: "Reference for House rule" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove reference" }));
    await waitFor(() => { expect(screen.getByRole("button", { name: "+ Reference" })).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: "+ Reference" }));
    await waitFor(() => { expect(screen.getByRole("button", { name: "Upload media" })).toBeInTheDocument(); });
    fireEvent.change(screen.getByTestId("instruction-upload"), { target: { files: [new File(["png"], "up.png", { type: "image/png" })] } });
    await waitFor(() => { expect(screen.getByRole("img", { name: "Reference for House rule" })).toBeInTheDocument(); });
    const upload = f.calls.filter((c) => /\/reference$/.test(c.url) && c.init?.method === "POST").at(-1);
    expect(upload?.init?.body).toBeInstanceOf(FormData);
    fireEvent.error(screen.getByRole("img", { name: "Reference for House rule" }));
    expect(screen.getByText("missing")).toBeInTheDocument();
  });

  it("the ≡ shows the active count as a badge and the status line says how many instructions go with the run", async () => {
    const f = fetchFor({ list: [studio, rule] });
    render(
      <ShellContext.Provider value={shell}>
        <SettingsContext.Provider value={{ settings: DEFAULT_SETTINGS, update: vi.fn() }}>
          <Composer fetchImpl={f.fetch} />
        </SettingsContext.Provider>
      </ShellContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Video generation/ }));
    await waitFor(() => { expect(screen.getByRole("button", { name: /^Model:/ })).toBeEnabled(); });
    fireEvent.click(screen.getByTestId("agent-chip"));
    await waitFor(() => { expect(screen.getByRole("button", { name: "Agent instructions, 1 active" })).toBeInTheDocument(); });
    expect(screen.getByTestId("instructions-badge")).toHaveTextContent("1");
    fireEvent.change(screen.getByTestId("reference-input"), { target: { files: [new File(["png"], "01.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => { expect(screen.getByTestId("agent-status")).toHaveTextContent("Thinking… (1 instruction)"); });
  });
});
