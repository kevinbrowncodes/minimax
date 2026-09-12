import { ConfigError, readConfig } from "./config";

// Node-only (imported by instrumentation.ts behind the NEXT_RUNTIME check): a missing or malformed MODEL_BASE_URL must
// stop the server with a clear message rather than serve 500s. Next only logs a failed instrumentation hook and keeps
// the process alive, so exit explicitly.
export function assertConfigOrExit(): void {
  try {
    readConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[minimax] refusing to start: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}
