/**
 * STORY_048: the Vertex client without Vertex — a key pair generated here signs the JWT (never a key file in the repo),
 * an injected fetch answers the token endpoint and the model, and the parser is fed the response shapes the discovery
 * document describes (a reply with usage, a candidate stopped for safety, a prompt blocked before generation, errors).
 */
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fetchToken, generateContent, generateContentBody, getPublisherModel, parseGenerateResponse, parseKeyFile, regionalBaseUrl, safetySettingsAt, signJwt, type ServiceAccountKey } from "./vertex";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const key: ServiceAccountKey = { type: "service_account", client_email: "sa@example.iam.gserviceaccount.com", private_key: pem, private_key_id: "kid-1", token_uri: "https://oauth2.googleapis.com/token" };
const decode = (segment: string): Record<string, unknown> => JSON.parse(Buffer.from(segment, "base64url").toString()) as Record<string, unknown>;
type Call = { url: string; init: RequestInit };
const formOf = (call: Call | undefined): URLSearchParams => new URLSearchParams(typeof call?.init.body === "string" ? call.init.body : "");
function fakeFetch(answer: (call: Call) => Response): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl = (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const call = { url: input instanceof Request ? input.url : input instanceof URL ? input.href : input, init };
    calls.push(call);
    return Promise.resolve(answer(call));
  };
  return { fetch: impl, calls };
}
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("parseKeyFile", () => {
  it("reads a service-account key and an authorized-user file, and names what a bad file lacks", () => {
    expect(parseKeyFile(JSON.stringify(key))).toMatchObject({ type: "service_account", client_email: key.client_email, private_key_id: "kid-1" });
    expect(parseKeyFile(JSON.stringify({ type: "authorized_user", client_id: "c", client_secret: "s", refresh_token: "r" }))).toEqual({ type: "authorized_user", client_id: "c", client_secret: "s", refresh_token: "r" });
    expect(() => parseKeyFile("not json")).toThrow("not JSON");
    expect(() => parseKeyFile(JSON.stringify({ type: "service_account", client_email: "x" }))).toThrow("lacks client_email or private_key");
    expect(() => parseKeyFile(JSON.stringify({ type: "other" }))).toThrow("not service_account or authorized_user");
  });
});

describe("signJwt", () => {
  it("makes an RS256 JWT whose signature verifies with the public key and whose claims round-trip", () => {
    const jwt = signJwt({ iss: "a", scope: "b", aud: "c", iat: 1, exp: 3601 }, pem, "kid-1");
    const [h, c, s] = jwt.split(".");
    expect(h && c && s).toBeTruthy();
    expect(decode(h ?? "")).toEqual({ alg: "RS256", typ: "JWT", kid: "kid-1" });
    expect(decode(c ?? "")).toEqual({ iss: "a", scope: "b", aud: "c", iat: 1, exp: 3601 });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${h ?? ""}.${c ?? ""}`);
    expect(verifier.verify(publicKey, Buffer.from(s ?? "", "base64url"))).toBe(true);
  });
});

describe("fetchToken", () => {
  it("posts the jwt-bearer grant as a form to the key's token_uri and returns the token with its expiry", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { access_token: "tok", token_type: "Bearer", expires_in: 3600 }));
    const token = await fetchToken(key, { fetch, now: () => 1_000_000 });
    expect(token).toEqual({ accessToken: "tok", expiresAt: 1_000_000 + 3_600_000 });
    expect(calls[0]?.url).toBe("https://oauth2.googleapis.com/token");
    const body = formOf(calls[0]);
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const claims = decode(body.get("assertion")?.split(".")[1] ?? "");
    expect(claims).toMatchObject({ iss: key.client_email, aud: "https://oauth2.googleapis.com/token", iat: 1000, exp: 4600, scope: "https://www.googleapis.com/auth/cloud-platform" });
    expect(calls[0]?.init.headers).toMatchObject({ "content-type": "application/x-www-form-urlencoded" });
  });
  it("uses the refresh-token grant for an authorized user, and a tokenUrl override", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { access_token: "t2", expires_in: 100 }));
    await fetchToken({ type: "authorized_user", client_id: "c", client_secret: "s", refresh_token: "r" }, { fetch, tokenUrl: "http://stub/token", now: () => 0 });
    expect(calls[0]?.url).toBe("http://stub/token");
    expect(formOf(calls[0]).get("grant_type")).toBe("refresh_token");
  });
  it("refuses with the endpoint's description and never the assertion", async () => {
    const { fetch } = fakeFetch(() => json(400, { error: "invalid_grant", error_description: "Invalid JWT Signature." }));
    await expect(fetchToken(key, { fetch })).rejects.toThrow("Invalid JWT Signature.");
    const bad = fakeFetch(() => new Response("<html>", { status: 502 }));
    await expect(fetchToken(key, { fetch: bad.fetch })).rejects.toThrow("502 without JSON");
  });
});

describe("generateContentBody", () => {
  it("wraps the system instruction, keeps the parts in order and passes safety and generation settings through", () => {
    const body = generateContentBody({ systemInstruction: "SYS", parts: [{ text: "a" }, { inlineData: { mimeType: "image/jpeg", data: "AAAA" } }, { text: "b" }], safetySettings: safetySettingsAt("OFF"), generationConfig: { maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } } });
    expect(body).toEqual({
      systemInstruction: { parts: [{ text: "SYS" }] },
      contents: [{ role: "user", parts: [{ text: "a" }, { inlineData: { mimeType: "image/jpeg", data: "AAAA" } }, { text: "b" }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" }, { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" }, { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" },
      ],
      generationConfig: { maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "LOW" } },
    });
  });
  it("a follow-up adds the model's draft and the revision turn after the user turn", () => {
    const body = generateContentBody({ parts: [{ text: "a" }], followUp: { modelText: "DRAFT", userText: "expand" } });
    expect(body["contents"]).toEqual([{ role: "user", parts: [{ text: "a" }] }, { role: "model", parts: [{ text: "DRAFT" }] }, { role: "user", parts: [{ text: "expand" }] }]);
    expect(body).not.toHaveProperty("systemInstruction");
  });
});

describe("parseGenerateResponse", () => {
  const usage = { promptTokenCount: 9270, candidatesTokenCount: 382, totalTokenCount: 10990, thoughtsTokenCount: 1338, promptTokensDetails: [{ modality: "IMAGE", tokenCount: 1100 }, { modality: "TEXT", tokenCount: 8170 }] };
  it("a reply: the text parts joined, thoughts skipped, the finish reason, the usage by modality, the model version", () => {
    const r = parseGenerateResponse(200, { candidates: [{ content: { role: "model", parts: [{ text: "think", thought: true }, { text: "For the target video" }, { text: ", …" }] }, finishReason: "STOP", safetyRatings: [{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "NEGLIGIBLE", blocked: false }] }], usageMetadata: usage, modelVersion: "gemini-3.8-flash" });
    expect(r).toEqual({ kind: "reply", text: "For the target video, …", finishReason: "STOP", modelVersion: "gemini-3.8-flash", usage: { promptTokens: 9270, candidateTokens: 382, totalTokens: 10990, thoughtTokens: 1338, promptByModality: { IMAGE: 1100, TEXT: 8170 } }, safetyRatings: [{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "NEGLIGIBLE", blocked: false }] });
  });
  it("a candidate stopped for safety is a refusal — the model's words when it gave any, else the reason", () => {
    expect(parseGenerateResponse(200, { candidates: [{ content: { parts: [{ text: "I can't help with that." }] }, finishReason: "SAFETY" }] })).toMatchObject({ kind: "refusal", finishReason: "SAFETY", message: "I can't help with that." });
    expect(parseGenerateResponse(200, { candidates: [{ finishReason: "PROHIBITED_CONTENT" }] })).toMatchObject({ kind: "refusal", message: "The model stopped for prohibited content" });
    expect(parseGenerateResponse(200, { candidates: [{ finishReason: "SAFETY", finishMessage: "blocked by the filter" }] })).toMatchObject({ kind: "refusal", message: "blocked by the filter" });
  });
  it("a prompt blocked before generation is a refusal with the block reason", () => {
    expect(parseGenerateResponse(200, { promptFeedback: { blockReason: "SAFETY", blockReasonMessage: "The prompt was blocked." }, usageMetadata: usage })).toMatchObject({ kind: "refusal", blockReason: "SAFETY", message: "The prompt was blocked.", usage: { promptTokens: 9270 } });
    expect(parseGenerateResponse(200, { promptFeedback: { blockReason: "OTHER" } })).toMatchObject({ kind: "refusal", message: "The model blocked the request before generating: OTHER" });
    expect(parseGenerateResponse(200, { candidates: [] })).toMatchObject({ kind: "refusal", message: "The model returned no candidate" });
  });
  it("an HTTP error keeps Google's message and status; MAX_TOKENS is a reply, not a refusal", () => {
    expect(parseGenerateResponse(429, { error: { code: 429, message: "Quota exceeded for aiplatform.googleapis.com", status: "RESOURCE_EXHAUSTED" } })).toEqual({ kind: "error", status: 429, message: "Quota exceeded for aiplatform.googleapis.com" });
    expect(parseGenerateResponse(500, "oops")).toEqual({ kind: "error", status: 500, message: "Vertex answered 500" });
    expect(parseGenerateResponse(200, { candidates: [{ content: { parts: [{ text: "partial" }] }, finishReason: "MAX_TOKENS" }] })).toMatchObject({ kind: "reply", text: "partial", finishReason: "MAX_TOKENS" });
  });
});

describe("generateContent and getPublisherModel", () => {
  const target = { project: "p", location: "us-central1", model: "gemini-3.8-flash" };
  const token = { accessToken: "tok", expiresAt: 0 };
  it("posts to the regional host's model path with the bearer header and returns the parsed result", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] }));
    const r = await generateContent(target, token, { parts: [{ text: "hi" }] }, { fetch });
    expect(r).toMatchObject({ kind: "reply", text: "ok" });
    expect(calls[0]?.url).toBe("https://us-central1-aiplatform.googleapis.com/v1/projects/p/locations/us-central1/publishers/google/models/gemini-3.8-flash:generateContent");
    expect(calls[0]?.init.headers).toMatchObject({ authorization: "Bearer tok", "content-type": "application/json" });
  });
  it("the global location uses the bare host, and a baseUrl override wins", async () => {
    expect(regionalBaseUrl("global")).toBe("https://aiplatform.googleapis.com");
    const { fetch, calls } = fakeFetch(() => json(200, { candidates: [] }));
    await generateContent({ ...target, location: "global" }, token, { parts: [] }, { fetch });
    expect(calls[0]?.url.startsWith("https://aiplatform.googleapis.com/v1/projects/p/locations/global/")).toBe(true);
    await generateContent({ ...target, baseUrl: "http://127.0.0.1:4010/" }, token, { parts: [] }, { fetch });
    expect(calls[1]?.url.startsWith("http://127.0.0.1:4010/v1/projects/p/")).toBe(true);
  });
  it("a network failure and an abort are error results without a URL in them", async () => {
    const down = fakeFetch(() => { throw new Error("ECONNREFUSED 127.0.0.1:1"); });
    const r = await generateContent(target, token, { parts: [] }, { fetch: down.fetch });
    expect(r).toEqual({ kind: "error", status: 0, message: "Vertex could not be reached: ECONNREFUSED 127.0.0.1:1" });
    const controller = new AbortController();
    controller.abort();
    const aborted = fakeFetch(() => { throw new Error("The operation was aborted"); });
    expect(await generateContent(target, token, { parts: [] }, { fetch: aborted.fetch, signal: controller.signal })).toEqual({ kind: "error", status: 0, message: "the run was stopped" });
    const notJson = fakeFetch(() => new Response("<html>", { status: 502 }));
    expect(await generateContent(target, token, { parts: [] }, { fetch: notJson.fetch })).toEqual({ kind: "error", status: 502, message: "Vertex answered 502 without JSON" });
  });
  it("getPublisherModel reads the stage and version, and a 404 as not ok", async () => {
    const ok = fakeFetch(() => json(200, { name: "publishers/google/models/gemini-3.8-flash", launchStage: "GA", versionId: "default" }));
    expect(await getPublisherModel(target, token, "gemini-3.8-flash", { fetch: ok.fetch })).toEqual({ ok: true, name: "publishers/google/models/gemini-3.8-flash", launchStage: "GA", versionId: "default" });
    expect(ok.calls[0]?.url).toBe("https://us-central1-aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.8-flash");
    const missing = fakeFetch(() => json(404, { error: { message: "Publisher Model `publishers/google/models/gemini-3-flash` is not found." } }));
    expect(await getPublisherModel(target, token, "gemini-3-flash", { fetch: missing.fetch })).toMatchObject({ ok: false, status: 404 });
  });
});
