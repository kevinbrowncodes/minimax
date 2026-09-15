import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtendSource } from "@/lib/composer-state";
import type { Capabilities } from "@/lib/job-api";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 }, extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: [22, 39, 56], default: 39 }, maxFrames: 362, maxSourceSeconds: 30 } };
const source: ExtendSource = { id: "src", title: "The first clip", durationSeconds: 2, ratio: "16:9", resolution: "768P", model: "minimax-h3", posterUrl: "/api/jobs/src/poster" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fetchWith(onJobs: (init: RequestInit | undefined) => Response): typeof fetch {
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/capabilities")) return Promise.resolve(json(caps));
    if (url.startsWith("/api/jobs")) return Promise.resolve(onJobs(init));
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
    expect(skills).toHaveTextContent("No skills installed");
    expect(screen.getByRole("menuitem", { name: "Manage skills" })).toHaveAttribute("aria-disabled", "true");
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
