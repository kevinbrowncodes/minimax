/**
 * Agent mode's configuration (STORY_047): the Vertex AI project, region and model, and the service-account key the
 * app container mounts read-only at /secrets/vertex-sa.json. The three variables are read from the env store first
 * (Settings › Environment variables — the model id is the one likely to change) and process.env second. A reason
 * names the missing thing and never a value or a path outside the container; `/api/capabilities` › `agent` carries
 * it so the Agent chip (STORY_050) can grey out saying why. Pure apart from the injected reads.
 */
import { existsSync } from "node:fs";
import { envValue } from "./env-store";

export const DEFAULT_KEY_FILE = "/secrets/vertex-sa.json";
export const DEFAULT_LOCATION = "us-central1";
/** The Gemini model the director runs on; unset until STORY_048's spike pins it from Vertex's model list. */
export const DEFAULT_MODEL: string | undefined = undefined;

export type AgentConfig =
  | { readonly configured: true; readonly project: string; readonly location: string; readonly model: string; readonly keyFile: string }
  | { readonly configured: false; readonly reason: string };

/** What the route publishes: the flag and, when off, why. */
export interface AgentFlag {
  readonly configured: boolean;
  readonly reason?: string;
}

type Env = Readonly<Record<string, string | undefined>>;
export interface AgentConfigReads {
  readonly env?: Env;
  /** The env store's read (`envValue`); injected for tests. */
  readonly readValue?: (key: string) => string | undefined;
  readonly exists?: (path: string) => boolean;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

export function readAgentConfig({ env = process.env, readValue = envValue, exists = existsSync }: AgentConfigReads = {}): AgentConfig {
  const read = (key: string): string | undefined => clean(readValue(key)) ?? clean(env[key]);
  const project = read("VERTEX_PROJECT");
  if (project === undefined) return { configured: false, reason: "VERTEX_PROJECT is not set — set it in Settings › Environment variables or in .env (spark/gcloud/setup-vertex.sh writes it)" };
  const keyFile = clean(env["GOOGLE_APPLICATION_CREDENTIALS"]) ?? DEFAULT_KEY_FILE;
  if (!exists(keyFile)) return { configured: false, reason: `the key file is not mounted at ${keyFile} — run spark/gcloud/setup-vertex.sh on the Spark and restart the app` };
  const model = read("VERTEX_MODEL") ?? DEFAULT_MODEL;
  if (model === undefined) return { configured: false, reason: "VERTEX_MODEL is not set — STORY_048's spike pins it from Vertex's model list" };
  return { configured: true, project, location: read("VERTEX_LOCATION") ?? DEFAULT_LOCATION, model, keyFile };
}

export function agentFlag(config: AgentConfig = readAgentConfig()): AgentFlag {
  return config.configured ? { configured: true } : { configured: false, reason: config.reason };
}
