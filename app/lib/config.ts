/**
 * The only place the app reads its environment (STORY_007). The model endpoint is configuration, never a literal
 * (CLAUDE.md §4a): the UI reaches the generation server through MODEL_BASE_URL and, optionally, MODEL_API_KEY.
 */
export interface AppConfig {
  /** Absolute http(s) base URL of the generation server, without a trailing slash. */
  readonly modelBaseUrl: string;
  /** Bearer token sent to the generation server, when one is configured. */
  readonly modelApiKey: string | undefined;
}

export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

type Env = Readonly<Record<string, string | undefined>>;

export function readConfig(env: Env = process.env): AppConfig {
  const raw = env["MODEL_BASE_URL"]?.trim();
  if (raw === undefined || raw === "") {
    throw new ConfigError(
      "MODEL_BASE_URL is not set: the app needs the generation server's base URL (for example http://stub:4010). See .env.example.",
    );
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`MODEL_BASE_URL is not an absolute URL: "${raw}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigError(`MODEL_BASE_URL must use http or https: "${raw}"`);
  }
  const key = env["MODEL_API_KEY"]?.trim();
  return {
    modelBaseUrl: raw.replace(/\/+$/, ""),
    modelApiKey: key === undefined || key === "" ? undefined : key,
  };
}
