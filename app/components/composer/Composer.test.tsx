import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities } from "@/lib/job-api";
import { Composer } from "./Composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const caps: Capabilities = { models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }], ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], resolutions: ["768P"], durationsSeconds: { min: 4, max: 15, step: 1 }, referenceImages: { max: 2 } };
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

  it("shows 2K and the other models as not on the Spark, and the parameters label follows the choice", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /^Video parameters:/ }));
    const twoK = screen.getByRole("radio", { name: /2K/ });
    expect(twoK).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "9:16" }));
    fireEvent.click(screen.getByRole("radio", { name: "10s" }));
    expect(screen.getByRole("button", { name: "Video parameters: 9:16 768P 10s" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Video parameters" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Model:/ }));
    expect(screen.getByRole("menuitemradio", { name: /Hailuo-2.3/ })).toBeDisabled();
    expect(screen.getByRole("menuitemradio", { name: /MiniMax-H3-Max/ })).toBeDisabled();
    expect(screen.getByRole("menuitemradio", { name: /MiniMax-H3.0/ })).toBeEnabled();
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

  it("outside video mode, Send explains that only videos are generated", async () => {
    render(<Composer fetchImpl={fetchWith(() => json({}, 500))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "hello" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/only generates videos/);
  });
});
