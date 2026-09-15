/**
 * The stub generation server (STORY_008): implements docs/contracts/job-api.md exactly, with outcomes chosen by name
 * (src/scripts.ts) and test hooks under /__stub/. Zero runtime dependencies. Everything is in memory.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_BODY_BYTES, MultipartError, boundaryOf, parseMultipart, type MultipartFile } from "./multipart.ts";
import { DEFAULT_OVERLAP, MAX_FRAMES, OVERLAP_OPTIONS, extensionLength, lengthForSeconds, maxAddedSeconds, seconds } from "./extension.ts";
import { DEFAULT_SCRIPT, cutsFor, isScriptName, isTerminal, stepFor, type JobError, type JobStatus, type ScriptName } from "./scripts.ts";

export const VERSION = "1.2.0";
export const CAPABILITIES = {
  models: [{ id: "minimax-h3", label: "MiniMax-H3.0" }],
  ratios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["768P"],
  durationsSeconds: { min: 4, max: 15, step: 1 },
  referenceImages: { max: 2 },
  /** Extending a finished video (STORY_017), the same numbers as the adapter's. */
  extension: { durationsSeconds: { min: 4, max: 14, step: 1, default: 10 }, overlapFrames: { options: OVERLAP_OPTIONS, default: DEFAULT_OVERLAP }, maxFrames: MAX_FRAMES, maxSourceSeconds: 30 },
} as const;
const IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_PROMPT = 6000; // STORY_020: room for a MiniMax-length prompt (mirrors the adapter's MAX_PROMPT_CHARS)

export interface JobRequest {
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
  readonly model: string;
  readonly referenceImages: number;
  /** STORY_016: the finished job this one continues; durationSeconds is then the seconds added. */
  readonly continueFrom?: string;
  readonly overlapFrames?: number;
  readonly overlap?: { readonly frames: number; readonly seconds: number };
  readonly seed?: number;
}
export interface ReceivedUpload {
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly sha256: string;
}
interface Job {
  readonly id: string;
  readonly script: ScriptName;
  readonly request: JobRequest;
  /** Frames the clip would have on the adapter (the fixture's for a fresh job; joined for an extension) — for the next extension's arithmetic. */
  readonly frames: number;
  readonly uploads: readonly ReceivedUpload[];
  readonly createdAt: string;
  updatedAt: string;
  pollCount: number;
  cancelledAt?: { readonly progress: number };
}
interface JobState {
  readonly status: JobStatus;
  readonly progress: number;
  readonly error?: JobError;
}
interface Fixture {
  readonly mimeType: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly bytes: Buffer;
}
interface Manifest {
  readonly [file: string]: { readonly mimeType: string; readonly durationSeconds?: number; readonly width?: number; readonly height?: number };
}

export interface StubOptions {
  /** Directory with fixture.mp4, fixture.webm, fixture-poster.png and manifest.json. */
  readonly fixturesDir?: string;
  /** Which video the stub serves; STORY_010's probe settles the default. */
  readonly fixture?: "mp4" | "webm";
  /** When set, every contract call must carry `Authorization: Bearer <apiKey>`. */
  readonly apiKey?: string;
}
export interface StubServer {
  readonly server: Server;
  listen(port?: number, host?: string): Promise<number>;
  close(): Promise<void>;
  reset(): void;
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

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FIXTURES_DIR = path.resolve(here, "..", "fixtures");

function loadFixture(dir: string, which: "mp4" | "webm"): { video: Fixture; poster: { mimeType: string; bytes: Buffer } } {
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as Manifest;
  const file = `fixture.${which}`;
  const entry = manifest[file];
  const poster = manifest["fixture-poster.png"];
  if (entry?.durationSeconds === undefined || entry.width === undefined || entry.height === undefined || poster === undefined) {
    throw new Error(`fixtures/manifest.json has no complete entry for ${file} or fixture-poster.png`);
  }
  const videoPath = path.join(dir, file);
  return {
    video: {
      mimeType: entry.mimeType,
      durationSeconds: entry.durationSeconds,
      width: entry.width,
      height: entry.height,
      sizeBytes: statSync(videoPath).size,
      bytes: readFileSync(videoPath),
    },
    poster: { mimeType: poster.mimeType, bytes: readFileSync(path.join(dir, "fixture-poster.png")) },
  };
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

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequest(fields: Record<string, unknown>, uploads: readonly MultipartFile[]): JobRequest {
  const prompt = fields["prompt"];
  if (typeof prompt !== "string" || prompt.trim().length === 0) throw new HttpError(400, "validation", "prompt is required", "prompt");
  if (prompt.trim().length > MAX_PROMPT) throw new HttpError(400, "validation", `prompt is longer than ${String(MAX_PROMPT)} characters`, "prompt");

  const ratio = fields["ratio"];
  if (typeof ratio !== "string") throw new HttpError(400, "validation", "ratio is required", "ratio");
  if (!(CAPABILITIES.ratios as readonly string[]).includes(ratio)) throw new HttpError(400, "unsupported_option", `ratio ${ratio} is not offered by this server`, "ratio");

  const resolution = fields["resolution"];
  if (typeof resolution !== "string") throw new HttpError(400, "validation", "resolution is required", "resolution");
  if (!(CAPABILITIES.resolutions as readonly string[]).includes(resolution)) throw new HttpError(400, "unsupported_option", `resolution ${resolution} is not offered by this server`, "resolution");

  const rawContinue = fields["continueFrom"];
  if (rawContinue !== undefined && rawContinue !== null && rawContinue !== "" && (typeof rawContinue !== "string" || rawContinue.trim() === "")) {
    throw new HttpError(400, "validation", "continueFrom must be a job id", "continueFrom");
  }
  const continueFrom = typeof rawContinue === "string" && rawContinue.trim() !== "" ? rawContinue.trim() : undefined;

  const rawDuration = fields["durationSeconds"];
  const durationSeconds = typeof rawDuration === "string" ? Number(rawDuration) : rawDuration;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds)) throw new HttpError(400, "validation", "durationSeconds must be an integer", "durationSeconds");
  const { min, max, step } = continueFrom === undefined ? CAPABILITIES.durationsSeconds : CAPABILITIES.extension.durationsSeconds;
  if (durationSeconds < min || durationSeconds > max || (durationSeconds - min) % step !== 0) {
    const what = continueFrom === undefined ? "durationSeconds" : "an extension's durationSeconds (the seconds added)";
    throw new HttpError(400, "unsupported_option", `${what} must be between ${String(min)} and ${String(max)} in steps of ${String(step)}`, "durationSeconds");
  }

  const rawModel = fields["model"];
  const model = rawModel === undefined || rawModel === "" ? CAPABILITIES.models[0].id : rawModel;
  if (typeof model !== "string") throw new HttpError(400, "validation", "model must be a string", "model");
  if (!CAPABILITIES.models.some((m) => m.id === model)) throw new HttpError(400, "unsupported_option", `model ${model} is not offered by this server`, "model");

  const rawContext = fields["contextSeconds"];
  if (rawContext !== undefined && rawContext !== null && rawContext !== "") throw new HttpError(400, "validation", "contextSeconds is gone (contract v1.2): send overlapFrames (22, 39 or 56)", "contextSeconds");
  let overlapFrames: number | undefined;
  if (continueFrom !== undefined) {
    const { options, default: fallback } = CAPABILITIES.extension.overlapFrames;
    const raw = fields["overlapFrames"];
    if (raw === undefined || raw === null || raw === "") overlapFrames = fallback;
    else {
      const n = integerOf(raw);
      if (n === undefined || !options.includes(n)) throw new HttpError(400, "unsupported_option", `overlapFrames must be one of ${options.join(", ")}`, "overlapFrames");
      overlapFrames = n;
    }
    if (extensionLength(durationSeconds, overlapFrames) > MAX_FRAMES) {
      throw new HttpError(400, "unsupported_option", `with an overlap of ${String(seconds(overlapFrames))} s the most that can be added is ${String(maxAddedSeconds(overlapFrames))} s`, "durationSeconds");
    }
    if (uploads.length > 0) throw new HttpError(400, "validation", "an extension takes no reference images: the video being extended is the reference", "referenceImage");
  }
  let seed: number | undefined;
  const rawSeed = fields["seed"];
  if (rawSeed !== undefined && rawSeed !== null && rawSeed !== "") {
    const n = integerOf(rawSeed);
    if (n === undefined || n < 0 || n > 0xffffffff) throw new HttpError(400, "validation", "seed must be a whole number between 0 and 4294967295", "seed");
    seed = n;
  }

  if (uploads.length > CAPABILITIES.referenceImages.max) throw new HttpError(400, "validation", `at most ${String(CAPABILITIES.referenceImages.max)} reference images`, "referenceImage");
  for (const upload of uploads) {
    if (upload.field !== "referenceImage") throw new HttpError(400, "validation", `unexpected file field ${upload.field}`, upload.field);
    if (!IMAGE_TYPES.has(upload.contentType)) throw new HttpError(400, "validation", `reference images must be png, jpeg or webp (got ${upload.contentType})`, "referenceImage");
  }
  return {
    prompt: prompt.trim(),
    ratio,
    resolution,
    durationSeconds,
    model,
    referenceImages: uploads.length,
    ...(continueFrom === undefined ? {} : { continueFrom }),
    ...(overlapFrames === undefined ? {} : { overlapFrames }),
    ...(seed === undefined ? {} : { seed }),
  };
}
function integerOf(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}

export function createStubServer(options: StubOptions = {}): StubServer {
  const fixturesDir = options.fixturesDir ?? DEFAULT_FIXTURES_DIR;
  const { video, poster } = loadFixture(fixturesDir, options.fixture ?? "mp4");
  const jobs = new Map<string, Job>();

  const stateOf = (job: Job): JobState => (job.cancelledAt ? { status: "cancelled", progress: job.cancelledAt.progress } : stepFor(job.script, job.pollCount));
  const jobOr404 = (id: string): Job => {
    const job = jobs.get(id);
    if (!job) throw new HttpError(404, "not_found", `no job ${id}`);
    return job;
  };
  const statusBody = (job: Job, state: JobState): Record<string, unknown> => ({
    id: job.id,
    status: state.status,
    progress: state.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    request: job.request,
    ...(state.error ? { error: state.error } : {}),
    ...(state.status === "done"
      ? {
          result: {
            url: `/jobs/${job.id}/result`,
            posterUrl: `/jobs/${job.id}/poster`,
            mimeType: video.mimeType,
            frames: lengthForSeconds(video.durationSeconds),
            durationSeconds: video.durationSeconds,
            width: video.width,
            height: video.height,
            sizeBytes: video.sizeBytes,
            cuts: cutsFor(job.script),
          },
        }
      : {}),
  });

  const sendBytes = (req: IncomingMessage, res: ServerResponse, mimeType: string, bytes: Buffer, ranges: boolean, extra: Record<string, string> = {}): void => {
    const range = ranges ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "") : null;
    if (range) {
      const start = range[1] === "" ? Math.max(bytes.length - Number(range[2]), 0) : Number(range[1]);
      const end = range[2] === "" || range[1] === "" ? bytes.length - 1 : Math.min(Number(range[2]), bytes.length - 1);
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= bytes.length) {
        res.writeHead(416, { "content-range": `bytes */${String(bytes.length)}` });
        res.end();
        return;
      }
      const slice = bytes.subarray(start, end + 1);
      res.writeHead(206, { "content-type": mimeType, "content-length": slice.length, "accept-ranges": "bytes", "content-range": `bytes ${String(start)}-${String(end)}/${String(bytes.length)}`, ...extra });
      res.end(slice);
      return;
    }
    res.writeHead(200, { "content-type": mimeType, "content-length": bytes.length, ...(ranges ? { "accept-ranges": "bytes" } : {}), ...extra });
    res.end(bytes);
  };

  const createJob = async (req: IncomingMessage, url: URL): Promise<Job> => {
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
    const scriptName = req.headers["x-stub-script"]?.toString() ?? url.searchParams.get("script") ?? (typeof fields["script"] === "string" ? fields["script"] : DEFAULT_SCRIPT);
    if (!isScriptName(scriptName)) throw new HttpError(400, "validation", `unknown stub script ${scriptName}`, "script");
    let request = validateRequest(fields, uploads);
    if (uploads.length > 0 && scriptName === "rejects-upload") {
      throw new HttpError(400, "validation", "reference images are refused (scripted rejects-upload)", "referenceImage");
    }
    // STORY_016: an extension mirrors the adapter's rules; the result stays the fixture (rule 10), the arithmetic is echoed.
    let frames = lengthForSeconds(video.durationSeconds);
    if (request.continueFrom !== undefined) {
      const source = jobs.get(request.continueFrom);
      if (!source || stateOf(source).status !== "done") throw new HttpError(400, "validation", `continueFrom names no finished job on this server (${request.continueFrom})`, "continueFrom");
      const { maxSourceSeconds } = CAPABILITIES.extension;
      if (source.frames / 24 > maxSourceSeconds) throw new HttpError(400, "unsupported_option", `the video is ${String(Math.round(source.frames / 24))} s long; this server extends videos up to ${String(maxSourceSeconds)} s`, "continueFrom");
      for (const field of ["ratio", "resolution", "model"] as const) {
        if (request[field] !== source.request[field]) throw new HttpError(400, "validation", `an extension keeps the source's ${field} (${source.request[field]})`, field);
      }
      const overlap = request.overlapFrames ?? CAPABILITIES.extension.overlapFrames.default;
      if (overlap > source.frames) throw new HttpError(400, "validation", `the video has ${String(source.frames)} frames; an overlap of ${String(overlap)} does not fit`, "overlapFrames");
      request = { ...request, overlap: { frames: overlap, seconds: seconds(overlap) } };
      frames = source.frames + extensionLength(request.durationSeconds, overlap) - overlap;
    }
    request = { ...request, seed: request.seed ?? Math.floor(Math.random() * 2 ** 32) };
    const now = new Date().toISOString();
    const job: Job = {
      id: randomUUID(),
      script: scriptName,
      request,
      frames,
      uploads: uploads.map((u) => ({ filename: u.filename, contentType: u.contentType, size: u.data.length, sha256: createHash("sha256").update(u.data).digest("hex") })),
      createdAt: now,
      updatedAt: now,
      pollCount: 0,
    };
    jobs.set(job.id, job);
    return job;
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", "http://stub");
    const method = req.method ?? "GET";
    const p = url.pathname;
    const hook = p.startsWith("/__stub/");

    if (!hook && options.apiKey !== undefined) {
      const header = req.headers.authorization ?? "";
      if (header !== `Bearer ${options.apiKey}`) throw new HttpError(401, "unauthorized", "missing or wrong bearer token");
    }

    let m: RegExpExecArray | null;
    if (method === "GET" && p === "/health") { sendJson(res, 200, { ok: true, server: "stub", version: VERSION }); return; }
    if (method === "GET" && p === "/capabilities") { sendJson(res, 200, CAPABILITIES); return; }
    if (method === "POST" && p === "/jobs") {
      const job = await createJob(req, url);
      sendJson(res, 202, { id: job.id, status: "queued", progress: 0 }); return;
    }
    if ((m = /^\/jobs\/([^/]+)$/.exec(p)) && m[1] !== undefined) {
      const job = jobOr404(m[1]);
      if (method === "GET") {
        if (!job.cancelledAt && !isTerminal(stateOf(job).status)) job.pollCount += 1;
        const state = stateOf(job);
        job.updatedAt = new Date().toISOString();
        sendJson(res, 200, statusBody(job, state)); return;
      }
      if (method === "DELETE") {
        const state = stateOf(job);
        if (isTerminal(state.status)) throw new HttpError(409, "already_terminal", `job ${job.id} is already ${state.status}`);
        job.cancelledAt = { progress: state.progress };
        job.updatedAt = new Date().toISOString();
        sendJson(res, 202, { id: job.id, status: "cancelled", progress: state.progress }); return;
      }
    }
    if (method === "GET" && (m = /^\/jobs\/([^/]+)\/(result|poster)$/.exec(p)) && m[1] !== undefined) {
      const job = jobOr404(m[1]);
      const state = stateOf(job);
      if (state.status !== "done") throw new HttpError(409, "not_done", `job ${job.id} is ${state.status}`);
      if (m[2] === "result") {
        // STORY_034: `?watermark=1` asks for the marked copy; the stub serves the same fixture and says so in a header
        sendBytes(req, res, video.mimeType, video.bytes, true, url.searchParams.get("watermark") === "1" ? { "x-watermark": "1" } : {});
      } else {
        sendBytes(req, res, poster.mimeType, poster.bytes, false);
      }
      return;
    }
    if (method === "POST" && p === "/__stub/reset") {
      jobs.clear();
      sendJson(res, 200, { ok: true }); return;
    }
    if (method === "GET" && p === "/__stub/jobs") {
      sendJson(res, 200, { jobs: [...jobs.values()].map((job) => ({ id: job.id, script: job.script, ...stateOf(job) })) }); return;
    }
    if (method === "GET" && (m = /^\/__stub\/fixtures\/(fixture\.mp4|fixture\.webm|fixture-poster\.png|fixture-reference\.png)$/.exec(p)) && m[1] !== undefined) {
      // Any fixture file directly, so a spec can probe what a browser plays regardless of which one the stub serves.
      const file = m[1];
      const mimeType = file.endsWith(".mp4") ? "video/mp4" : file.endsWith(".webm") ? "video/webm" : "image/png";
      sendBytes(req, res, mimeType, readFileSync(path.join(fixturesDir, file)), true);
      return;
    }
    if (method === "GET" && (m = /^\/__stub\/jobs\/([^/]+)\/received$/.exec(p)) && m[1] !== undefined) {
      const job = jobOr404(m[1]);
      sendJson(res, 200, { id: job.id, script: job.script, request: job.request, uploads: job.uploads }); return;
    }
    throw new HttpError(404, "not_found", `no route ${method} ${p}`);
  };

  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: { code: error.code, message: error.message, ...(error.field === undefined ? {} : { field: error.field }) } });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: { code: "internal", message } });
    });
  });

  return {
    server,
    listen: (port = 0, host = "127.0.0.1") =>
      new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => { resolve((server.address() as AddressInfo).port); });
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
    reset: () => { jobs.clear(); },
  };
}
