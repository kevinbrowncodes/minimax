/**
 * The adapter (STORY_006): docs/contracts/job-api.md v1 in front of ComfyUI on the Spark. Zero runtime dependencies.
 * create → upload references, build the graph, POST /prompt; status ← websocket events + /history and /queue polling;
 * cancel → /queue delete or /interrupt; result and poster ← files in ComfyUI's output directory, served with ranges.
 */
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { CAPABILITIES, ValidationError, validateRequest, type JobRequest } from "./capabilities.ts";
import { ComfyClient, ComfyEvents, ComfyError, type HistoryEntry } from "./comfy.ts";
import { JobStore, isTerminal, type Job } from "./job-store.ts";
import { FPS, REQUIRED_CLASSES, buildGraph, lengthForSeconds, sizeFor, type Graph, type UploadedImage } from "./mapping.ts";
import { MAX_BODY_BYTES, MultipartError, boundaryOf, parseMultipart, type MultipartFile } from "./multipart.ts";
import { interpret, type ComfyEvent } from "./progress.ts";

export const VERSION = "1.0.0";

export interface AdapterOptions {
  /** ComfyUI's base URL, e.g. http://comfyui:8188. */
  readonly comfyUrl: string;
  /** ComfyUI's output directory as mounted here (read-only is enough). */
  readonly outputDir: string;
  /** The API-format graph template (spark/comfyui/h3_t2v_prompt.json). */
  readonly graphTemplate: Graph;
  /** Where jobs are persisted; omit for in-memory only (tests). */
  readonly storeFile?: string;
  /** When set, every contract call needs `Authorization: Bearer <apiKey>`. */
  readonly apiKey?: string;
  readonly clientId?: string;
  /** How often /history and /queue are polled for open jobs (the websocket is the fast path). */
  readonly pollIntervalMs?: number;
  /** A job older than this is failed. */
  readonly jobTimeoutMs?: number;
  /** Consecutive failed polls before a job is failed as unreachable. */
  readonly silenceLimit?: number;
  /** Open jobs beyond this → 503 busy. */
  readonly maxOpenJobs?: number;
  /** Check /object_info for the node classes the graph needs at start (default true). */
  readonly verifyNodes?: boolean;
  /** How long to wait for ComfyUI at start before serving anyway (default 10 s; 0 = do not wait). The adapter serves
   *  capabilities and health regardless; jobs answer 503 until ComfyUI is reachable and its node classes verified. */
  readonly startupWaitMs?: number;
  readonly log?: (message: string) => void;
}

export interface AdapterServer {
  readonly server: Server;
  readonly store: JobStore;
  start(port?: number, host?: string): Promise<number>;
  close(): Promise<void>;
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | undefined;
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "too_large", `request body exceeds ${String(MAX_BODY_BYTES)} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createAdapterServer(options: AdapterOptions): AdapterServer {
  const log = options.log ?? ((message: string) => { console.log(`[adapter] ${message}`); });
  const clientId = options.clientId ?? `adapter-${randomUUID()}`;
  const comfy = new ComfyClient(options.comfyUrl, clientId);
  const store = new JobStore(options.storeFile);
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const jobTimeoutMs = options.jobTimeoutMs ?? 3_600_000;
  const silenceLimit = options.silenceLimit ?? 10;
  const maxOpenJobs = options.maxOpenJobs ?? 5;
  const outputDir = path.resolve(options.outputDir);
  const silence = new Map<string, number>();
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let polling = false;

  // --- job lifecycle --------------------------------------------------------------------------------
  const fail = (id: string, message: string, code: "generation_failed" | "moderated" = "generation_failed"): void => {
    const job = store.get(id);
    if (!job || isTerminal(job.status)) return;
    log(`job ${id} failed: ${message}`);
    store.update(id, { status: "failed", error: { code, message } });
  };

  const finalize = (job: Job, entry: HistoryEntry): void => {
    if (isTerminal(job.status)) return;
    if (entry.statusStr === "error") {
      fail(job.id, "ComfyUI reported an execution error (see its log)");
      return;
    }
    const video = entry.outputs.find((o) => o.filename.toLowerCase().endsWith(".mp4"));
    const poster = entry.outputs.find((o) => o.filename.toLowerCase().endsWith(".png"));
    if (!video) {
      fail(job.id, "ComfyUI finished without a video output");
      return;
    }
    const file = safeOutputPath(video.subfolder, video.filename);
    if (!file || !existsSync(file)) {
      fail(job.id, `output file missing: ${video.subfolder}/${video.filename}`);
      return;
    }
    const { width, height } = sizeFor(job.request.ratio);
    store.update(job.id, {
      status: "done",
      progress: 100,
      result: {
        video: { filename: video.filename, subfolder: video.subfolder },
        ...(poster ? { poster: { filename: poster.filename, subfolder: poster.subfolder } } : {}),
        mimeType: "video/mp4",
        durationSeconds: Math.round((lengthForSeconds(job.request.durationSeconds) / FPS) * 1000) / 1000,
        width,
        height,
        sizeBytes: statSync(file).size,
      },
    });
    log(`job ${job.id} done: ${video.subfolder}/${video.filename}`);
  };

  const safeOutputPath = (subfolder: string, filename: string): string | undefined => {
    const resolved = path.resolve(outputDir, subfolder, filename);
    return resolved.startsWith(outputDir + path.sep) ? resolved : undefined;
  };

  const finalizeWithRetries = async (job: Job, promptId: string): Promise<void> => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const entry = await comfy.history(promptId);
        if (entry?.completed) {
          finalize(job, entry);
          return;
        }
      } catch {
        // ComfyUI busy right after success; keep trying
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    log(`job ${job.id}: success reported but no completed history after 10 s; the poll loop keeps watching`);
  };

  const onEvent = (event: ComfyEvent): void => {
    for (const job of store.open()) {
      if (job.promptId === undefined) continue;
      const update = interpret(event, job.promptId);
      switch (update.kind) {
        case "started":
          store.update(job.id, { status: "running", progress: 2 });
          break;
        case "progress":
          store.update(job.id, { status: "running", progress: update.percent });
          break;
        case "success":
          // ComfyUI sends execution_success a moment before it writes the history entry (seen on the Spark,
          // 2026-09-12): read it with retries; the poll loop keeps trying after that, and a job whose history never
          // appears is failed by the poll's silence rule or the job timeout, not here.
          void finalizeWithRetries(job, job.promptId);
          break;
        case "error":
          fail(job.id, update.message);
          break;
        case "interrupted":
          fail(job.id, "ComfyUI interrupted the job");
          break;
        case "ignore":
          break;
      }
    }
  };
  const events = new ComfyEvents(options.comfyUrl, clientId, onEvent, log);

  const poll = async (): Promise<void> => {
    if (polling) return;
    polling = true;
    try {
      const open = store.open();
      if (open.length === 0) {
        await checkComfy();
        return;
      }
      let queue: { running: readonly string[]; pending: readonly string[] } | undefined;
      try {
        queue = await comfy.queue();
      } catch {
        queue = undefined;
      }
      for (const job of open) {
        if (Date.now() - Date.parse(job.createdAt) > jobTimeoutMs) {
          fail(job.id, `job exceeded ${String(Math.round(jobTimeoutMs / 1000))} s`);
          continue;
        }
        if (job.promptId === undefined) continue;
        try {
          const entry = await comfy.history(job.promptId);
          silence.delete(job.id);
          if (entry?.completed) {
            finalize(job, entry);
          } else if (queue && queue.running.includes(job.promptId) && job.status === "queued") {
            store.update(job.id, { status: "running", progress: 2 });
          }
        } catch (error) {
          const count = (silence.get(job.id) ?? 0) + 1;
          silence.set(job.id, count);
          if (count >= silenceLimit) fail(job.id, `ComfyUI stopped answering (${String(count)} polls): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      polling = false;
    }
  };

  const recover = async (): Promise<void> => {
    for (const job of store.open()) {
      if (job.promptId !== undefined) {
        try {
          const entry = await comfy.history(job.promptId);
          if (entry?.completed) {
            finalize(job, entry);
            continue;
          }
        } catch {
          // fall through: no history → failed below
        }
      }
      fail(job.id, "adapter restarted while the job was open");
    }
  };

  const NOT_RUNNING = "ComfyUI is not running on the Spark — start it with spark/comfyui/run.sh";
  let comfyReachable = false;
  let nodesVerified = options.verifyNodes === false;
  let nodeError: string | undefined;

  const verifyNodes = async (): Promise<void> => {
    const info = await comfy.objectInfo();
    const missing = REQUIRED_CLASSES.filter((name) => !(name in info));
    if (missing.length > 0) {
      nodeError = `ComfyUI at ${options.comfyUrl} lacks node classes the graph needs: ${missing.join(", ")}`;
      throw new Error(nodeError);
    }
    nodeError = undefined;
    nodesVerified = true;
  };

  /** Probe ComfyUI; on the first contact verify the node classes. Never throws. */
  const checkComfy = async (): Promise<boolean> => {
    const up = await comfy.health();
    if (up !== comfyReachable) log(up ? `ComfyUI reachable at ${options.comfyUrl}` : `ComfyUI unreachable at ${options.comfyUrl}`);
    comfyReachable = up;
    if (up && !nodesVerified) {
      try {
        await verifyNodes();
        log("ComfyUI has every node class the graph needs");
      } catch (error) {
        log(error instanceof Error ? error.message : String(error));
      }
    }
    return up;
  };

  const waitForComfy = async (): Promise<void> => {
    const deadline = Date.now() + (options.startupWaitMs ?? 10_000);
    let announced = false;
    for (;;) {
      if (await checkComfy()) return;
      if (Date.now() >= deadline) {
        log(`ComfyUI not reachable at ${options.comfyUrl}; serving capabilities and health, jobs answer 503 until it is`);
        return;
      }
      if (!announced) {
        log(`waiting for ComfyUI at ${options.comfyUrl}`);
        announced = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  // --- routes ---------------------------------------------------------------------------------------
  const jobOr404 = (id: string): Job => {
    const job = store.get(id);
    if (!job) throw new HttpError(404, "not_found", `no job ${id}`);
    return job;
  };

  const statusBody = (job: Job): Record<string, unknown> => ({
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    request: job.request,
    ...(job.error ? { error: job.error } : {}),
    ...(job.result
      ? {
          result: {
            url: `/jobs/${job.id}/result`,
            posterUrl: `/jobs/${job.id}/poster`,
            mimeType: job.result.mimeType,
            durationSeconds: job.result.durationSeconds,
            width: job.result.width,
            height: job.result.height,
            sizeBytes: job.result.sizeBytes,
          },
        }
      : {}),
  });

  const createJob = async (req: IncomingMessage): Promise<Job> => {
    const contentType = req.headers["content-type"];
    const body = await readBody(req);
    let fields: Record<string, unknown>;
    let uploads: readonly MultipartFile[] = [];
    if (contentType?.startsWith("application/json") === true) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.toString("utf8"));
      } catch {
        throw new HttpError(400, "validation", "body is not valid JSON");
      }
      if (!isRecord(parsed)) throw new HttpError(400, "validation", "body must be a JSON object");
      fields = parsed;
    } else {
      const boundary = boundaryOf(contentType);
      if (boundary === undefined) throw new HttpError(415, "unsupported_media_type", "send application/json or multipart/form-data");
      try {
        const parsed = parseMultipart(body, boundary);
        fields = parsed.fields;
        uploads = parsed.files;
      } catch (error) {
        if (error instanceof MultipartError) throw new HttpError(error.code === "too_large" ? 413 : 400, error.code === "too_large" ? "too_large" : "validation", error.message);
        throw error;
      }
    }
    let request: JobRequest;
    try {
      request = validateRequest(fields, uploads.map((u) => ({ field: u.field, contentType: u.contentType, size: u.data.length })));
    } catch (error) {
      if (error instanceof ValidationError) throw new HttpError(error.status, error.code, error.message, error.field);
      throw error;
    }
    if (store.open().length >= maxOpenJobs) throw new HttpError(503, "busy", `the Spark already has ${String(maxOpenJobs)} jobs open; try again later`);
    if (!comfyReachable && !(await checkComfy())) throw new HttpError(503, "busy", NOT_RUNNING);
    if (!nodesVerified) throw new HttpError(503, "busy", nodeError ?? NOT_RUNNING);

    const id = randomUUID();
    let images: UploadedImage[];
    let promptId: string;
    try {
      images = [];
      for (const [index, upload] of uploads.entries()) {
        const uploaded = await comfy.uploadImage(upload.data, `job-${id}-${String(index)}${path.extname(upload.filename) || ".png"}`, upload.contentType);
        images.push({ name: uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name });
      }
      const graph = buildGraph(options.graphTemplate, request, images, { filenamePrefix: `video/job-${id}` });
      promptId = await comfy.submit(graph);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof ComfyError && error.status === undefined) {
        comfyReachable = false;
        throw new HttpError(503, "busy", `${NOT_RUNNING} (${message})`);
      }
      throw new HttpError(503, "busy", `the Spark could not accept the job: ${message}`);
    }
    const job = store.create(id, request);
    store.update(id, { promptId });
    log(`job ${id} submitted as ComfyUI prompt ${promptId} (${request.ratio}, ${String(request.durationSeconds)} s, ${String(request.referenceImages)} refs)`);
    return job;
  };

  const cancelJob = (job: Job): Job => {
    if (isTerminal(job.status)) throw new HttpError(409, "already_terminal", `job ${job.id} is already ${job.status}`);
    const cancelled = store.update(job.id, { status: "cancelled" });
    if (job.promptId !== undefined) {
      const promptId = job.promptId;
      void (async () => {
        try {
          const queue = await comfy.queue();
          if (queue.pending.includes(promptId)) await comfy.deleteQueued(promptId);
          else if (queue.running.includes(promptId)) await comfy.interrupt();
          else if (job.status === "running") await comfy.interrupt();
          else await comfy.deleteQueued(promptId);
        } catch (error) {
          log(`cancel of ${job.id}: ComfyUI call failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      })();
    }
    return cancelled;
  };

  const sendFile = (req: IncomingMessage, res: ServerResponse, file: string, mimeType: string, ranges: boolean): void => {
    const size = statSync(file).size;
    const range = ranges ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "") : null;
    if (range) {
      const start = range[1] === "" ? Math.max(size - Number(range[2]), 0) : Number(range[1]);
      const end = range[2] === "" || range[1] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        res.writeHead(416, { "content-range": `bytes */${String(size)}` });
        res.end();
        return;
      }
      res.writeHead(206, { "content-type": mimeType, "content-length": end - start + 1, "accept-ranges": "bytes", "content-range": `bytes ${String(start)}-${String(end)}/${String(size)}` });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { "content-type": mimeType, "content-length": size, ...(ranges ? { "accept-ranges": "bytes" } : {}) });
    createReadStream(file).pipe(res);
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", "http://adapter");
    const method = req.method ?? "GET";
    const p = url.pathname;
    if (options.apiKey !== undefined && (req.headers.authorization ?? "") !== `Bearer ${options.apiKey}`) {
      throw new HttpError(401, "unauthorized", "missing or wrong bearer token");
    }
    let m: RegExpExecArray | null;
    if (method === "GET" && p === "/health") {
      sendJson(res, 200, { ok: true, server: "adapter", version: VERSION, comfyui: { url: options.comfyUrl, reachable: comfyReachable, nodesVerified, websocket: events.connected, ...(nodeError === undefined ? {} : { error: nodeError }) }, openJobs: store.open().length });
      return;
    }
    if (method === "GET" && p === "/capabilities") {
      sendJson(res, 200, CAPABILITIES);
      return;
    }
    if (method === "POST" && p === "/jobs") {
      const job = await createJob(req);
      sendJson(res, 202, { id: job.id, status: "queued", progress: 0 });
      return;
    }
    if ((m = /^\/jobs\/([^/]+)$/.exec(p)) && m[1] !== undefined) {
      const job = jobOr404(m[1]);
      if (method === "GET") {
        sendJson(res, 200, statusBody(job));
        return;
      }
      if (method === "DELETE") {
        const cancelled = cancelJob(job);
        sendJson(res, 202, { id: cancelled.id, status: "cancelled", progress: cancelled.progress });
        return;
      }
    }
    if (method === "GET" && (m = /^\/jobs\/([^/]+)\/(result|poster)$/.exec(p)) && m[1] !== undefined) {
      const job = jobOr404(m[1]);
      if (job.status !== "done" || !job.result) throw new HttpError(409, "not_done", `job ${job.id} is ${job.status}`);
      const ref = m[2] === "result" ? job.result.video : job.result.poster;
      if (!ref) throw new HttpError(404, "not_found", "no poster for this job");
      const file = safeOutputPath(ref.subfolder, ref.filename);
      if (!file || !existsSync(file)) throw new HttpError(404, "not_found", "the output file is gone from ComfyUI's output directory");
      sendFile(req, res, file, m[2] === "result" ? job.result.mimeType : "image/png", m[2] === "result");
      return;
    }
    throw new HttpError(404, "not_found", `no route ${method} ${p}`);
  };

  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: { code: error.code, message: error.message, ...(error.field === undefined ? {} : { field: error.field }) } });
        return;
      }
      const message = error instanceof ComfyError ? error.message : error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: { code: "internal", message } });
    });
  });

  return {
    server,
    store,
    start: async (port = 4020, host = "0.0.0.0") => {
      // Listen first so health and capabilities answer at once (BUG_001); ComfyUI is probed in the background.
      const bound = await new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => { resolve((server.address() as AddressInfo).port); });
      });
      events.start();
      pollTimer = setInterval(() => {
        void poll();
      }, pollIntervalMs);
      if ((options.startupWaitMs ?? 10_000) === 0) {
        await checkComfy();
        await recover();
      } else {
        void waitForComfy().then(recover);
      }
      return bound;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (pollTimer) clearInterval(pollTimer);
        events.stop();
        server.closeAllConnections();
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}
