/** STORY_047: the agent's configuration — present, each thing missing with its reason, the env store winning over process.env, values never in a reason. */
import { describe, expect, it } from "vitest";
import { DEFAULT_KEY_FILE, DEFAULT_LOCATION, DEFAULT_MODEL, agentFlag, agentSettings, readAgentConfig } from "./agent-config";

const none = (): undefined => undefined;
const all = { VERTEX_PROJECT: "proj-1", VERTEX_LOCATION: "europe-west4", VERTEX_MODEL: "gemini-x-flash", GOOGLE_APPLICATION_CREDENTIALS: "/tmp/k.json" };
/** `all` without the named keys. */
const without = (...keys: (keyof typeof all)[]): Record<string, string | undefined> => Object.fromEntries(Object.entries(all).filter(([k]) => !keys.includes(k as keyof typeof all)));

describe("readAgentConfig", () => {
  it("is configured with the four present, the key file existing", () => {
    expect(readAgentConfig({ env: all, readValue: none, exists: (p) => p === "/tmp/k.json" })).toMatchObject({ configured: true, project: "proj-1", location: "europe-west4", model: "gemini-x-flash", keyFile: "/tmp/k.json", thinking: "low", timeoutMs: 240_000 });
  });
  it("defaults the region and the key path", () => {
    const config = readAgentConfig({ env: without("GOOGLE_APPLICATION_CREDENTIALS", "VERTEX_LOCATION"), readValue: none, exists: (p) => p === DEFAULT_KEY_FILE });
    expect(config).toMatchObject({ configured: true, location: DEFAULT_LOCATION, keyFile: DEFAULT_KEY_FILE });
  });
  it("names the missing project first", () => {
    const config = readAgentConfig({ env: without("VERTEX_PROJECT"), readValue: none, exists: () => true });
    expect(config).toMatchObject({ configured: false, reason: expect.stringContaining("VERTEX_PROJECT is not set") as string });
  });
  it("names the missing key file, with the in-container path", () => {
    const config = readAgentConfig({ env: all, readValue: none, exists: () => false });
    expect(config).toMatchObject({ configured: false, reason: expect.stringContaining("not mounted at /tmp/k.json") as string });
  });
  it("an unset VERTEX_MODEL falls back to the model STORY_048 pinned, and the env overrides it", () => {
    expect(DEFAULT_MODEL).toBe("gemini-3.8-flash");
    expect(readAgentConfig({ env: without("VERTEX_MODEL"), readValue: none, exists: () => true })).toMatchObject({ configured: true, model: "gemini-3.8-flash" });
    expect(readAgentConfig({ env: all, readValue: none, exists: () => true })).toMatchObject({ configured: true, model: "gemini-x-flash" });
  });
  it("the env store's value wins over process.env, and whitespace is trimmed", () => {
    const store: Record<string, string> = { VERTEX_MODEL: "  gemini-from-settings  " };
    const config = readAgentConfig({ env: all, readValue: (k) => store[k], exists: () => true });
    expect(config).toMatchObject({ configured: true, model: "gemini-from-settings", project: "proj-1" });
  });
  it("an empty env-store value falls through to process.env", () => {
    const config = readAgentConfig({ env: all, readValue: (k) => (k === "VERTEX_PROJECT" ? "   " : undefined), exists: () => true });
    expect(config).toMatchObject({ configured: true, project: "proj-1" });
  });
  it("a reason never carries a value that was set", () => {
    const config = readAgentConfig({ env: { ...all, VERTEX_PROJECT: "secret-project-name" }, readValue: none, exists: () => false });
    expect(config.configured).toBe(false);
    if (!config.configured) expect(config.reason).not.toContain("secret-project-name");
  });
});

describe("agentFlag", () => {
  it("publishes the flag alone when configured, and the reason when not", () => {
    expect(agentFlag({ configured: true, project: "p", location: "l", model: "gemini-3.8-flash", keyFile: "/k", skillsDir: "/s", timeoutMs: 1, thinking: "low" })).toEqual({ configured: true, model: { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" } });
    expect(agentFlag({ configured: false, reason: "why" })).toEqual({ configured: false, reason: "why" });
  });
});

describe("agentSettings", () => {
  it("reads the thinking level (env store first), the timeout, the gate overrides and the skills dir", () => {
    const store: Record<string, string> = { VERTEX_THINKING: "HIGH" };
    expect(agentSettings({ env: { VERTEX_THINKING: "medium", AGENT_TIMEOUT_MS: "5000", VERTEX_BASE_URL: "http://stub", VERTEX_TOKEN_URL: "http://stub/token", SKILLS_DIR: "/skills" }, readValue: (k) => store[k] })).toEqual({ skillsDir: "/skills", vertexBaseUrl: "http://stub", tokenUrl: "http://stub/token", timeoutMs: 5000, thinking: "high" });
    expect(agentSettings({ env: { VERTEX_THINKING: "turbo", AGENT_TIMEOUT_MS: "-3" }, readValue: () => undefined })).toMatchObject({ thinking: "low", timeoutMs: 240_000 });
    expect(agentSettings({ env: {}, readValue: () => undefined }).skillsDir.endsWith("agents/skills")).toBe(true);
  });
});
