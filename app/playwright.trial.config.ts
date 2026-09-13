import { defineConfig, devices } from "@playwright/test";

/**
 * The real end-to-end trial (EPIC_003 → owner, 2026-09-12): drives the PRODUCTION app container over the compose
 * network from the gate container, against the real adapter and ComfyUI on the Spark. Not part of the gate.
 *   docker compose run --rm -T gate pnpm --filter app exec playwright test --config playwright.trial.config.ts
 * Env: TRIAL_BASE_URL (http://minimax-app:3000), TRIAL_IMAGE (/work/spark/data/input/01.jpg), TRIAL_PROMPT_FILE,
 *      TRIAL_DURATION (10), TRIAL_RATIO (16:9), TRIAL_TIMEOUT_MS (3600000)
 */
export default defineConfig({
  testDir: "./e2e-trial",
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-trial" }]],
  outputDir: "test-results-trial",
  timeout: Number(process.env["TRIAL_TIMEOUT_MS"] ?? "3600000"),
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env["TRIAL_BASE_URL"] ?? "http://minimax-app:3000", // not "app": Chromium force-upgrades the HSTS-preloaded .app TLD
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
