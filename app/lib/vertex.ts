/**
 * The Vertex AI client for agent mode (STORY_048): a service-account key becomes a bearer token, and a request of a
 * system instruction plus ordered text and image parts goes to a Gemini model's `generateContent`. Zero dependencies —
 * `node:crypto` signs the JWT, `fetch` does the rest — and every network call goes through an injected `fetch` so the
 * unit tests never reach Google and the gate never can (CLAUDE.md § 4a).
 *
 * Shapes read on 2026-09-17, not recalled:
 *   - the OAuth flow from https://developers.google.com/identity/protocols/oauth2/service-account › HTTP/REST: an RS256
 *     JWT with `iss` (the key's client_email), `scope`, `aud` = https://oauth2.googleapis.com/token, `iat`, `exp` ≤ 1 h,
 *     posted as `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>`; the answer `{ access_token,
 *     token_type, expires_in }`;
 *   - the API from Vertex's own discovery document (https://aiplatform.googleapis.com/$discovery/rest?version=v1,
 *     revision 20260904): POST v1/projects/{p}/locations/{l}/publishers/google/models/{m}:generateContent with a
 *     GenerateContentRequest { systemInstruction: Content, contents: Content[], generationConfig, safetySettings };
 *     Content { role, parts: Part[] }; Part { text } | { inlineData: { mimeType, data } } (+ mediaResolution.level);
 *     SafetySetting { category, threshold } with thresholds up to OFF; the response { candidates: [{ content, finishReason,
 *     safetyRatings, finishMessage }], promptFeedback: { blockReason, blockReasonMessage }, usageMetadata: {
 *     promptTokenCount, candidatesTokenCount, totalTokenCount, thoughtsTokenCount, promptTokensDetails: [{ modality,
 *     tokenCount }] }, modelVersion }; GET v1/publishers/google/models/{m} for one model's launchStage and versionId.
 * Nothing here logs; no result carries the token or a URL (the route shows results to the owner).
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

export const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const API_VERSION = "v1";

/** A service-account key as `gcloud iam service-accounts keys create` writes it. */
export interface ServiceAccountKey {
  readonly type: "service_account";
  readonly client_email: string;
  readonly private_key: string;
  readonly private_key_id?: string;
  readonly token_uri?: string;
}
/** The fallback STORY_047 named: the owner's application-default credentials (`gcloud auth application-default login`). */
export interface AuthorizedUserKey {
  readonly type: "authorized_user";
  readonly client_id: string;
  readonly client_secret: string;
  readonly refresh_token: string;
}
export type KeyFile = ServiceAccountKey | AuthorizedUserKey;

export class VertexKeyError extends Error {
  override readonly name = "VertexKeyError";
}

function str(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** The two credential shapes the app accepts; anything else is a VertexKeyError that names the missing field, never a value. */
export function parseKeyFile(text: string): KeyFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new VertexKeyError("the credentials file is not JSON");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new VertexKeyError("the credentials file is not an object");
  const o = raw as Record<string, unknown>;
  const type = str(o, "type");
  if (type === "service_account") {
    const client_email = str(o, "client_email");
    const private_key = str(o, "private_key");
    if (client_email === undefined || private_key === undefined) throw new VertexKeyError("the service-account key lacks client_email or private_key");
    return { type, client_email, private_key, ...(str(o, "private_key_id") === undefined ? {} : { private_key_id: str(o, "private_key_id") }), ...(str(o, "token_uri") === undefined ? {} : { token_uri: str(o, "token_uri") }) };
  }
  if (type === "authorized_user") {
    const client_id = str(o, "client_id");
    const client_secret = str(o, "client_secret");
    const refresh_token = str(o, "refresh_token");
    if (client_id === undefined || client_secret === undefined || refresh_token === undefined) throw new VertexKeyError("the authorized-user file lacks client_id, client_secret or refresh_token");
    return { type, client_id, client_secret, refresh_token };
  }
  throw new VertexKeyError(`the credentials file's type is not service_account or authorized_user`);
}

export function readKeyFile(path: string): KeyFile {
  return parseKeyFile(readFileSync(path, "utf8"));
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** An RS256 JWT: base64url(header).base64url(claims).base64url(signature) — the one algorithm Google's token server accepts. */
export function signJwt(claims: Readonly<Record<string, unknown>>, privateKeyPem: string, keyId?: string): string {
  const header = { alg: "RS256", typ: "JWT", ...(keyId === undefined ? {} : { kid: keyId }) };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKeyPem);
  return `${signingInput}.${base64url(signature)}`;
}

export interface Token {
  readonly accessToken: string;
  /** Epoch milliseconds. */
  readonly expiresAt: number;
}
export interface TokenOptions {
  readonly fetch?: typeof fetch;
  /** Epoch milliseconds; injected for tests. */
  readonly now?: () => number;
  /** Overrides the key's token_uri (the stub's fake in the gate, STORY_049). */
  readonly tokenUrl?: string;
  readonly scope?: string;
}

/** A bearer token for the key: the JWT-bearer grant for a service account, the refresh-token grant for an authorized user. */
export async function fetchToken(key: KeyFile, { fetch: fetchImpl = fetch, now = Date.now, tokenUrl, scope = CLOUD_PLATFORM_SCOPE }: TokenOptions = {}): Promise<Token> {
  const issued = Math.floor(now() / 1000);
  const url = tokenUrl ?? (key.type === "service_account" ? (key.token_uri ?? GOOGLE_TOKEN_URL) : GOOGLE_TOKEN_URL);
  const body = new URLSearchParams();
  if (key.type === "service_account") {
    const assertion = signJwt({ iss: key.client_email, scope, aud: url, iat: issued, exp: issued + 3600 }, key.private_key, key.private_key_id);
    body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    body.set("assertion", assertion);
  } else {
    body.set("grant_type", "refresh_token");
    body.set("client_id", key.client_id);
    body.set("client_secret", key.client_secret);
    body.set("refresh_token", key.refresh_token);
  }
  const response = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString() });
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new VertexKeyError(`the token endpoint answered ${String(response.status)} without JSON`);
  }
  const o = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  if (!response.ok || typeof o["access_token"] !== "string") {
    const description = typeof o["error_description"] === "string" ? o["error_description"] : typeof o["error"] === "string" ? o["error"] : `status ${String(response.status)}`;
    throw new VertexKeyError(`the token endpoint refused the credentials: ${description}`);
  }
  const expiresIn = typeof o["expires_in"] === "number" ? o["expires_in"] : 3600;
  return { accessToken: o["access_token"], expiresAt: now() + expiresIn * 1000 };
}

export interface VertexTarget {
  readonly project: string;
  readonly location: string;
  readonly model: string;
  /** Overrides the regional host (the stub's fake in the gate, STORY_049). */
  readonly baseUrl?: string;
}
/** The host for a location: a regional one is prefixed; `global` (where the newest Gemini models are served) is the bare host. */
export function regionalBaseUrl(location: string): string {
  return location === "global" ? "https://aiplatform.googleapis.com" : `https://${location}-aiplatform.googleapis.com`;
}
function modelUrl(target: VertexTarget, method: string): string {
  const base = (target.baseUrl ?? regionalBaseUrl(target.location)).replace(/\/+$/, "");
  return `${base}/${API_VERSION}/projects/${encodeURIComponent(target.project)}/locations/${encodeURIComponent(target.location)}/publishers/google/models/${encodeURIComponent(target.model)}:${method}`;
}

export type MediaResolution = "MEDIA_RESOLUTION_LOW" | "MEDIA_RESOLUTION_MEDIUM" | "MEDIA_RESOLUTION_HIGH" | "MEDIA_RESOLUTION_ULTRA_HIGH";
export type Part =
  | { readonly text: string }
  | { readonly inlineData: { readonly mimeType: string; readonly data: string }; readonly mediaResolution?: { readonly level: MediaResolution } };
export type HarmCategory = "HARM_CATEGORY_HATE_SPEECH" | "HARM_CATEGORY_DANGEROUS_CONTENT" | "HARM_CATEGORY_HARASSMENT" | "HARM_CATEGORY_SEXUALLY_EXPLICIT" | "HARM_CATEGORY_CIVIC_INTEGRITY";
export type HarmBlockThreshold = "BLOCK_LOW_AND_ABOVE" | "BLOCK_MEDIUM_AND_ABOVE" | "BLOCK_ONLY_HIGH" | "BLOCK_NONE" | "OFF";
export interface SafetySetting {
  readonly category: HarmCategory;
  readonly threshold: HarmBlockThreshold;
}
export const HARM_CATEGORIES: readonly HarmCategory[] = ["HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_CIVIC_INTEGRITY"];
/** Every text category at one threshold — the spike sends OFF as "least restrictive" and BLOCK_NONE where OFF is refused. */
export function safetySettingsAt(threshold: HarmBlockThreshold): readonly SafetySetting[] {
  return HARM_CATEGORIES.map((category) => ({ category, threshold }));
}
export interface GenerationConfig {
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly mediaResolution?: MediaResolution;
  readonly thinkingConfig?: { readonly thinkingLevel?: "LOW" | "MEDIUM" | "HIGH" | "MINIMAL"; readonly thinkingBudget?: number; readonly includeThoughts?: boolean };
}
export interface GenerateRequest {
  readonly systemInstruction?: string;
  /** The user turn's parts, in order. */
  readonly parts: readonly Part[];
  /** A second pass (STORY_048): the model's own first answer, then one more user turn asking for a revision. */
  readonly followUp?: { readonly modelText: string; readonly userText: string };
  readonly safetySettings?: readonly SafetySetting[];
  readonly generationConfig?: GenerationConfig;
}
/** The request body as Vertex takes it — exported so the route, the spike and the stub's fake agree on one shape. */
export function generateContentBody(request: GenerateRequest): Record<string, unknown> {
  return {
    ...(request.systemInstruction === undefined ? {} : { systemInstruction: { parts: [{ text: request.systemInstruction }] } }),
    contents: request.followUp === undefined ? [{ role: "user", parts: request.parts }] : [{ role: "user", parts: request.parts }, { role: "model", parts: [{ text: request.followUp.modelText }] }, { role: "user", parts: [{ text: request.followUp.userText }] }],
    ...(request.safetySettings === undefined ? {} : { safetySettings: request.safetySettings }),
    ...(request.generationConfig === undefined ? {} : { generationConfig: request.generationConfig }),
  };
}

export interface Usage {
  readonly promptTokens: number;
  readonly candidateTokens: number;
  readonly totalTokens: number;
  readonly thoughtTokens: number;
  /** The prompt's tokens by modality (the image's share). */
  readonly promptByModality: Readonly<Record<string, number>>;
}
export interface SafetyRating {
  readonly category: string;
  readonly probability: string;
  readonly blocked: boolean;
}
export type GenerateResult =
  | { readonly kind: "reply"; readonly text: string; readonly finishReason: string; readonly usage: Usage; readonly modelVersion?: string; readonly safetyRatings: readonly SafetyRating[] }
  | { readonly kind: "refusal"; readonly finishReason?: string; readonly blockReason?: string; readonly message: string; readonly usage?: Usage; readonly safetyRatings: readonly SafetyRating[] }
  | { readonly kind: "error"; readonly status: number; readonly message: string };

/** Finish reasons that mean the model declined rather than finished (the discovery document's enum, read 2026-09-17). */
const DECLINED = new Set(["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "MODEL_ARMOR", "IMAGE_SAFETY", "IMAGE_PROHIBITED_CONTENT", "IMAGE_RECITATION"]);

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function usageOf(raw: unknown): Usage {
  const u = asRecord(raw);
  const byModality: Record<string, number> = {};
  for (const item of Array.isArray(u["promptTokensDetails"]) ? u["promptTokensDetails"] : []) {
    const r = asRecord(item);
    if (typeof r["modality"] === "string") byModality[r["modality"]] = num(r["tokenCount"]);
  }
  return { promptTokens: num(u["promptTokenCount"]), candidateTokens: num(u["candidatesTokenCount"]), totalTokens: num(u["totalTokenCount"]), thoughtTokens: num(u["thoughtsTokenCount"]), promptByModality: byModality };
}
function ratingsOf(raw: unknown): readonly SafetyRating[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => asRecord(r)).filter((r) => typeof r["category"] === "string").map((r) => ({ category: r["category"] as string, probability: typeof r["probability"] === "string" ? r["probability"] : "?", blocked: r["blocked"] === true }));
}
function textOf(content: unknown): string {
  const parts = asRecord(content)["parts"];
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => asRecord(p))
    .filter((p) => p["thought"] !== true && typeof p["text"] === "string")
    .map((p) => p["text"] as string)
    .join("");
}

/** The three outcomes from a response body: a reply, a refusal (the model's words when it gave any), or an HTTP error. */
export function parseGenerateResponse(status: number, body: unknown): GenerateResult {
  const o = asRecord(body);
  if (status < 200 || status >= 300) {
    const err = asRecord(o["error"]);
    const message = typeof err["message"] === "string" ? err["message"] : `Vertex answered ${String(status)}`;
    return { kind: "error", status, message };
  }
  const feedback = asRecord(o["promptFeedback"]);
  const blockReason = typeof feedback["blockReason"] === "string" ? feedback["blockReason"] : undefined;
  const usage = o["usageMetadata"] === undefined ? undefined : usageOf(o["usageMetadata"]);
  if (blockReason !== undefined) {
    const message = typeof feedback["blockReasonMessage"] === "string" && feedback["blockReasonMessage"] !== "" ? feedback["blockReasonMessage"] : `The model blocked the request before generating: ${blockReason}`;
    return { kind: "refusal", blockReason, message, ...(usage === undefined ? {} : { usage }), safetyRatings: ratingsOf(feedback["safetyRatings"]) };
  }
  const candidates = Array.isArray(o["candidates"]) ? o["candidates"] : [];
  const first = asRecord(candidates[0]);
  const finishReason = typeof first["finishReason"] === "string" ? first["finishReason"] : "FINISH_REASON_UNSPECIFIED";
  const text = textOf(first["content"]).trim();
  if (candidates.length === 0 || DECLINED.has(finishReason)) {
    const finishMessage = typeof first["finishMessage"] === "string" && first["finishMessage"] !== "" ? first["finishMessage"] : undefined;
    const message = text !== "" ? text : (finishMessage ?? (candidates.length === 0 ? "The model returned no candidate" : `The model stopped for ${finishReason.toLowerCase().replaceAll("_", " ")}`));
    return { kind: "refusal", finishReason, message, ...(usage === undefined ? {} : { usage }), safetyRatings: ratingsOf(first["safetyRatings"]) };
  }
  const modelVersion = typeof o["modelVersion"] === "string" ? o["modelVersion"] : undefined;
  return { kind: "reply", text, finishReason, usage: usage ?? usageOf({}), ...(modelVersion === undefined ? {} : { modelVersion }), safetyRatings: ratingsOf(first["safetyRatings"]) };
}

export interface CallOptions {
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/** One generateContent call. A network failure is an error result with the message, never a throw with a URL in it. */
export async function generateContent(target: VertexTarget, token: Token, request: GenerateRequest, { fetch: fetchImpl = fetch, signal }: CallOptions = {}): Promise<GenerateResult> {
  let response: Response;
  try {
    response = await fetchImpl(modelUrl(target, "generateContent"), {
      method: "POST",
      headers: { authorization: `Bearer ${token.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(generateContentBody(request)),
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    if (signal?.aborted) return { kind: "error", status: 0, message: "the run was stopped" };
    return { kind: "error", status: 0, message: `Vertex could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { kind: "error", status: response.status, message: `Vertex answered ${String(response.status)} without JSON` };
  }
  return parseGenerateResponse(response.status, body);
}

export type PublisherModel = { readonly ok: true; readonly name: string; readonly launchStage: string; readonly versionId: string } | { readonly ok: false; readonly status: number; readonly message: string };

/** publishers.models.get — the one read method the reference lists under publishers.models (there is no list). */
export async function getPublisherModel(target: Pick<VertexTarget, "location" | "baseUrl">, token: Token, modelId: string, { fetch: fetchImpl = fetch }: CallOptions = {}): Promise<PublisherModel> {
  const base = (target.baseUrl ?? regionalBaseUrl(target.location)).replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetchImpl(`${base}/${API_VERSION}/publishers/google/models/${encodeURIComponent(modelId)}`, { headers: { authorization: `Bearer ${token.accessToken}` } });
  } catch (error) {
    return { ok: false, status: 0, message: `Vertex could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
  const body = asRecord(await response.json().catch(() => ({})));
  if (!response.ok) {
    const err = asRecord(body["error"]);
    return { ok: false, status: response.status, message: typeof err["message"] === "string" ? err["message"] : `Vertex answered ${String(response.status)}` };
  }
  return { ok: true, name: typeof body["name"] === "string" ? body["name"] : modelId, launchStage: typeof body["launchStage"] === "string" ? body["launchStage"] : "?", versionId: typeof body["versionId"] === "string" ? body["versionId"] : "?" };
}
