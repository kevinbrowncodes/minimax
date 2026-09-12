import { ConfigError, readConfig } from "./lib/config";

// Runs once when the Next.js server starts. A missing or malformed MODEL_BASE_URL must stop the server with a clear
// message rather than serve 500s (STORY_007 acceptance criterion): Next only logs a failed instrumentation hook and
// keeps the process alive, so exit explicitly.
export function register(): void {
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
