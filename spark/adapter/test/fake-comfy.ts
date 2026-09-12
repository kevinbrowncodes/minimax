/**
 * A fake ComfyUI for the adapter's integration lane (STORY_006): the HTTP endpoints the adapter uses and a websocket
 * that pushes scripted progress events. "Runs" a prompt by emitting events on a timer and writing the stub's fixture
 * video and a poster PNG into an output directory, exactly where the real ComfyUI would.
 */
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { WebSocketServer, type WebSocket } from "ws";

export type Behaviour = "success" | "error" | "hang" | "hold";

export interface FakeComfyOptions {
  readonly outputDir: string;
  readonly fixturesDir: string;
  /** Milliseconds between scripted events. */
  readonly tickMs?: number;
  /** Milliseconds after execution_success before the history entry exists (ComfyUI does this for real). */
  readonly historyDelayMs?: number;
}
export interface SubmittedPrompt {
  readonly id: string;
  readonly graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>;
  readonly clientId: string;
}
export interface FakeComfy {
  readonly url: string;
  readonly prompts: SubmittedPrompt[];
  readonly uploads: { name: string; size: number; type: string }[];
  readonly calls: string[];
  behaviour: Behaviour;
  historyStatus: number;
  /** Complete a held prompt (behaviour "hold") as if ComfyUI had run it while nobody watched. */
  completeHeld(promptId: string): void;
  close(): Promise<void>;
}

const REQUIRED = ["UNETLoader", "CLIPLoader", "VAELoader", "MiniMaxH3ImageToVideo", "RandomNoise", "BasicGuider", "KSamplerSelect", "BasicScheduler", "SamplerCustomAdvanced", "VAEDecode", "VAEDecodeAudio", "CreateVideo", "SaveVideo", "LoadImage", "ImageFromBatch", "SaveImage"];

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => { resolve(Buffer.concat(chunks)); });
  });
}

export async function startFakeComfy(options: FakeComfyOptions): Promise<FakeComfy> {
  const tick = options.tickMs ?? 15;
  const prompts: SubmittedPrompt[] = [];
  const uploads: { name: string; size: number; type: string }[] = [];
  const calls: string[] = [];
  const history = new Map<string, { completed: boolean; status_str: string; outputs: Record<string, unknown> }>();
  const running = new Set<string>();
  const pending = new Set<string>();
  const sockets = new Set<WebSocket>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const state = { behaviour: "success" as Behaviour, historyStatus: 200 };

  const send = (event: unknown): void => {
    for (const ws of sockets) ws.send(JSON.stringify(event));
  };
  const later = (ms: number, fn: () => void): void => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const outputsFor = (prompt: SubmittedPrompt): Record<string, unknown> => {
    const rawPrefix = prompt.graph["save"]?.inputs["filename_prefix"];
    const prefix = typeof rawPrefix === "string" ? rawPrefix : "video/MiniMax_H3";
    const videoName = `${path.basename(prefix)}_00001_.mp4`;
    const posterName = `${path.basename(prefix)}_poster_00001_.png`;
    const sub = path.dirname(prefix) === "." ? "" : path.dirname(prefix);
    mkdirSync(path.join(options.outputDir, sub), { recursive: true });
    copyFileSync(path.join(options.fixturesDir, "fixture.mp4"), path.join(options.outputDir, sub, videoName));
    copyFileSync(path.join(options.fixturesDir, "fixture-poster.png"), path.join(options.outputDir, sub, posterName));
    return { save: { images: [{ filename: videoName, subfolder: sub, type: "output" }] }, poster: { images: [{ filename: posterName, subfolder: sub, type: "output" }] } };
  };
  const complete = (prompt: SubmittedPrompt): void => {
    running.delete(prompt.id);
    pending.delete(prompt.id);
    const outputs = outputsFor(prompt);
    send({ type: "executing", data: { node: null, prompt_id: prompt.id } });
    send({ type: "execution_success", data: { prompt_id: prompt.id } });
    const record = (): void => {
      history.set(prompt.id, { completed: true, status_str: "success", outputs });
    };
    if (options.historyDelayMs === undefined) record();
    else later(options.historyDelayMs, record);
  };
  const run = (prompt: SubmittedPrompt): void => {
    pending.delete(prompt.id);
    running.add(prompt.id);
    send({ type: "execution_start", data: { prompt_id: prompt.id } });
    let step = 0;
    const steps = 4;
    const next = (): void => {
      if (!running.has(prompt.id)) return; // interrupted or deleted
      if (state.behaviour === "hang") return;
      if (state.behaviour === "error" && step === 2) {
        running.delete(prompt.id);
        history.set(prompt.id, { completed: true, status_str: "error", outputs: {} });
        send({ type: "execution_error", data: { prompt_id: prompt.id, node_id: "sample", node_type: "SamplerCustomAdvanced", exception_message: "CUDA out of memory (scripted)" } });
        return;
      }
      if (step === 0) send({ type: "executing", data: { node: "unet", prompt_id: prompt.id } });
      if (step === 1) send({ type: "executing", data: { node: "sample", prompt_id: prompt.id } });
      if (step >= 1 && step <= steps) send({ type: "progress", data: { value: step, max: steps, prompt_id: prompt.id, node: "sample" } });
      if (step === steps) {
        send({ type: "executing", data: { node: "decode_video", prompt_id: prompt.id } });
        later(tick, () => {
          if (running.has(prompt.id)) complete(prompt);
        });
        return;
      }
      step += 1;
      later(tick, next);
    };
    later(tick, next);
  };

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://fake");
      const method = req.method ?? "GET";
      calls.push(`${method} ${url.pathname}`);
      const json = (status: number, body: unknown): void => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (method === "GET" && url.pathname === "/system_stats") { json(200, { system: { comfyui_version: "fake" } }); return; }
      if (method === "GET" && url.pathname === "/object_info") { json(200, Object.fromEntries(REQUIRED.map((n) => [n, { input: {} }]))); return; }
      if (method === "POST" && url.pathname === "/upload/image") {
        const body = await readBody(req);
        const name = /filename="([^"]+)"/.exec(body.toString("latin1"))?.[1] ?? `upload-${String(uploads.length)}.png`;
        const type = /Content-Type:\s*([^\r\n]+)/i.exec(body.toString("latin1"))?.[1] ?? "";
        uploads.push({ name, size: body.length, type });
        json(200, { name, subfolder: "", type: "input" }); return;
      }
      if (method === "POST" && url.pathname === "/prompt") {
        const body = JSON.parse((await readBody(req)).toString("utf8")) as { prompt: SubmittedPrompt["graph"]; client_id: string };
        const prompt: SubmittedPrompt = { id: randomUUID(), graph: body.prompt, clientId: body.client_id };
        prompts.push(prompt);
        pending.add(prompt.id);
        if (state.behaviour !== "hold") later(tick, () => { run(prompt); });
        json(200, { prompt_id: prompt.id, number: prompts.length, node_errors: {} }); return;
      }
      if (method === "GET" && url.pathname === "/queue") {
        const row = (id: string): unknown[] => [0, id, {}, {}, []];
        json(200, { queue_running: [...running].map(row), queue_pending: [...pending].map(row) }); return;
      }
      if (method === "POST" && url.pathname === "/queue") {
        const body = JSON.parse((await readBody(req)).toString("utf8")) as { delete?: string[] };
        for (const id of body.delete ?? []) pending.delete(id);
        json(200, {}); return;
      }
      if (method === "POST" && url.pathname === "/interrupt") {
        for (const id of running) {
          running.delete(id);
          send({ type: "execution_interrupted", data: { prompt_id: id } });
        }
        json(200, {}); return;
      }
      const h = /^\/history\/(.+)$/.exec(url.pathname);
      if (method === "GET" && h && h[1] !== undefined) {
        if (state.historyStatus !== 200) { json(state.historyStatus, { error: "scripted" }); return; }
        const entry = history.get(h[1]);
        json(200, entry ? { [h[1]]: { outputs: entry.outputs, status: { completed: entry.completed, status_str: entry.status_str } } } : {}); return;
      }
      json(404, { error: `no route ${method} ${url.pathname}` });
    })();
  });
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    sockets.add(ws);
    ws.on("close", () => sockets.delete(ws));
    ws.send(JSON.stringify({ type: "status", data: { status: { exec_info: { queue_remaining: pending.size } } } }));
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => { resolve((server.address() as AddressInfo).port); });
  });

  return {
    url: `http://127.0.0.1:${String(port)}`,
    prompts,
    uploads,
    calls,
    get behaviour() {
      return state.behaviour;
    },
    set behaviour(value: Behaviour) {
      state.behaviour = value;
    },
    get historyStatus() {
      return state.historyStatus;
    },
    set historyStatus(value: number) {
      state.historyStatus = value;
    },
    completeHeld: (promptId) => {
      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) complete(prompt);
    },
    close: async () => {
      for (const t of timers) clearTimeout(t);
      for (const ws of sockets) ws.terminate();
      wss.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => { resolve(); });
      });
    },
  };
}
