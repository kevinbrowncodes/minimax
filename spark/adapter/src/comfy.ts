/**
 * ComfyUI's HTTP and websocket API, the only place the adapter knows it exists (STORY_006). Verified against
 * ComfyUI v0.35.1: POST /prompt, GET /history/:id, GET /queue, POST /queue {delete}, POST /interrupt,
 * POST /upload/image, GET /object_info, GET /system_stats, and /ws?clientId= for progress events.
 */
import type { Graph } from "./mapping.ts";
import type { ComfyEvent } from "./progress.ts";

export interface OutputRef {
  readonly filename: string;
  readonly subfolder: string;
  readonly type: string;
}
export interface HistoryEntry {
  readonly completed: boolean;
  readonly statusStr: string | undefined;
  /** Every file under `outputs`, whichever node wrote it. */
  readonly outputs: readonly OutputRef[];
  /** The same files by node id (BUG_003: a LoadVideo preview lists the source before the save node's file). */
  readonly byNode: Readonly<Record<string, readonly OutputRef[]>>;
}
export interface QueueState {
  readonly running: readonly string[];
  readonly pending: readonly string[];
}
export class ComfyError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ComfyError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every object anywhere under `outputs` that has a filename (SaveVideo and SaveImage report differently). */
export function collectOutputs(outputs: unknown): OutputRef[] {
  const found: OutputRef[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!isRecord(value)) return;
    if (typeof value["filename"] === "string") {
      found.push({ filename: value["filename"], subfolder: typeof value["subfolder"] === "string" ? value["subfolder"] : "", type: typeof value["type"] === "string" ? value["type"] : "output" });
      return;
    }
    for (const item of Object.values(value)) walk(item);
  };
  walk(outputs);
  return found;
}

export class ComfyClient {
  readonly baseUrl: string;
  readonly clientId: string;

  constructor(baseUrl: string, clientId: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.clientId = clientId;
  }

  async #json<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      throw new ComfyError(`ComfyUI unreachable at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) throw new ComfyError(`ComfyUI answered ${String(response.status)} for ${path}: ${(await response.text()).slice(0, 300)}`, response.status);
    return (await response.json()) as T;
  }

  async health(): Promise<boolean> {
    try {
      await this.#json<unknown>("/system_stats");
      return true;
    } catch {
      return false;
    }
  }

  async objectInfo(): Promise<Record<string, unknown>> {
    return this.#json<Record<string, unknown>>("/object_info");
  }

  async uploadImage(data: Buffer, filename: string, contentType: string): Promise<{ name: string; subfolder: string }> {
    const form = new FormData();
    form.set("image", new Blob([data], { type: contentType }), filename);
    form.set("overwrite", "true");
    const body = await this.#json<{ name: string; subfolder?: string }>("/upload/image", { method: "POST", body: form });
    return { name: body.name, subfolder: body.subfolder ?? "" };
  }

  async submit(graph: Graph): Promise<string> {
    const body = await this.#json<{ prompt_id: string; node_errors?: Record<string, unknown> }>("/prompt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: graph, client_id: this.clientId }),
    });
    if (body.node_errors && Object.keys(body.node_errors).length > 0) throw new ComfyError(`ComfyUI rejected the graph: ${JSON.stringify(body.node_errors).slice(0, 500)}`, 400);
    return body.prompt_id;
  }

  async history(promptId: string): Promise<HistoryEntry | undefined> {
    const all = await this.#json<Record<string, unknown>>(`/history/${encodeURIComponent(promptId)}`);
    const entry = all[promptId];
    if (!isRecord(entry)) return undefined;
    const status = isRecord(entry["status"]) ? entry["status"] : {};
    const rawOutputs = entry["outputs"];
    const byNode: Record<string, readonly OutputRef[]> = {};
    if (isRecord(rawOutputs)) for (const [node, value] of Object.entries(rawOutputs)) byNode[node] = collectOutputs(value);
    return {
      completed: status["completed"] === true,
      statusStr: typeof status["status_str"] === "string" ? status["status_str"] : undefined,
      outputs: collectOutputs(rawOutputs),
      byNode,
    };
  }

  async queue(): Promise<QueueState> {
    const body = await this.#json<{ queue_running?: unknown[]; queue_pending?: unknown[] }>("/queue");
    const ids = (items: unknown[] | undefined): string[] => (items ?? []).map((item) => (Array.isArray(item) && typeof item[1] === "string" ? item[1] : "")).filter((id) => id !== "");
    return { running: ids(body.queue_running), pending: ids(body.queue_pending) };
  }

  async interrupt(): Promise<void> {
    await fetch(`${this.baseUrl}/interrupt`, { method: "POST" });
  }

  async deleteQueued(promptId: string): Promise<void> {
    await fetch(`${this.baseUrl}/queue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ delete: [promptId] }) });
  }
}

/** The websocket listener with reconnect; delivers parsed JSON events, ignores binary preview frames. */
export class ComfyEvents {
  readonly #url: string;
  readonly #onEvent: (event: ComfyEvent) => void;
  readonly #log: (message: string) => void;
  #socket: WebSocket | undefined;
  #stopped = false;
  #attempt = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  connected = false;

  constructor(baseUrl: string, clientId: string, onEvent: (event: ComfyEvent) => void, log: (message: string) => void = () => undefined) {
    this.#url = `${baseUrl.replace(/^http/, "ws").replace(/\/+$/, "")}/ws?clientId=${encodeURIComponent(clientId)}`;
    this.#onEvent = onEvent;
    this.#log = log;
  }

  start(): void {
    this.#stopped = false;
    this.#connect();
  }

  stop(): void {
    this.#stopped = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#socket?.close();
    this.#socket = undefined;
    this.connected = false;
  }

  #connect(): void {
    if (this.#stopped) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.#url);
    } catch (error) {
      this.#retry(error);
      return;
    }
    this.#socket = socket;
    socket.addEventListener("open", () => {
      this.connected = true;
      this.#attempt = 0;
      this.#log(`websocket connected to ${this.#url}`);
    });
    socket.addEventListener("message", (message: MessageEvent) => {
      if (typeof message.data !== "string") return;
      try {
        const parsed: unknown = JSON.parse(message.data);
        if (isRecord(parsed) && typeof parsed["type"] === "string") {
          this.#onEvent({ type: parsed["type"], data: isRecord(parsed["data"]) ? parsed["data"] : {} });
        }
      } catch {
        // not JSON: ignore
      }
    });
    socket.addEventListener("close", () => {
      this.connected = false;
      this.#retry("closed");
    });
    socket.addEventListener("error", () => {
      // close follows; the retry is scheduled there
    });
  }

  #retry(reason: unknown): void {
    if (this.#stopped) return;
    const delay = [1000, 2000, 5000][Math.min(this.#attempt, 2)] ?? 5000;
    this.#attempt += 1;
    // Say it once, then about once a minute while ComfyUI stays away (BUG_001: the adapter now runs without it).
    if (this.#attempt <= 1 || this.#attempt % 12 === 0) this.#log(`websocket ${reason instanceof Error ? reason.message : String(reason)}; reconnecting (attempt ${String(this.#attempt)}, every ${String(delay)} ms)`);
    this.#timer = setTimeout(() => {
      this.#connect();
    }, delay);
  }
}
