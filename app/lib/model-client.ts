/**
 * The server side of the app's API routes (STORY_009): every upstream call to the generation server goes through here.
 * Reads the base URL and key from config, adds the bearer header, and turns upstream failures into the contract's
 * error shape. The upstream URL never appears in a response.
 */
import { ConfigError, readConfig } from "./config";

export interface RouteError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export function errorResponse({ status, code, message, field }: RouteError): Response {
  return Response.json({ error: { code, message, ...(field === undefined ? {} : { field }) } }, { status });
}

export function configErrorResponse(error: unknown): Response | undefined {
  if (error instanceof ConfigError) {
    return errorResponse({ status: 500, code: "config", message: error.message });
  }
  return undefined;
}

export interface Upstream {
  readonly baseUrl: string;
  readonly headers: Readonly<Record<string, string>>;
}

export function upstream(): Upstream {
  const { modelBaseUrl, modelApiKey } = readConfig();
  return { baseUrl: modelBaseUrl, headers: modelApiKey === undefined ? {} : { authorization: `Bearer ${modelApiKey}` } };
}

/** Forward a request upstream; a network failure becomes 502 `unreachable`. */
export async function forward(path: string, init: RequestInit = {}): Promise<Response> {
  const target = upstream();
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(target.headers)) headers.set(k, v);
  try {
    return await fetch(`${target.baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse({ status: 502, code: "unreachable", message: `the generation server could not be reached: ${message}` });
  }
}

/** Relay an upstream JSON response as-is (status and body), or a contract error when the body is not JSON. */
export async function relayJson(response: Response): Promise<Response> {
  const text = await response.text();
  try {
    const body: unknown = JSON.parse(text);
    return Response.json(body, { status: response.status });
  } catch {
    return errorResponse({ status: 502, code: "bad_upstream", message: `the generation server answered ${String(response.status)} without JSON` });
  }
}

const PASS_THROUGH = ["content-type", "content-length", "accept-ranges", "content-range", "etag", "last-modified", "cache-control"];

/** Relay a binary upstream response (video, poster) streaming, with the headers a `<video>` element needs. */
export function relayBytes(response: Response): Response {
  if (!response.ok && response.status !== 206) return response;
  const headers = new Headers();
  for (const name of PASS_THROUGH) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

/** Wrap a handler so config errors and unexpected throws become contract errors without a stack trace in the body. */
export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    const config = configErrorResponse(error);
    if (config) return config;
    const message = error instanceof Error ? error.message : "unexpected error";
    return errorResponse({ status: 500, code: "internal", message });
  }
}
