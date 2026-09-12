import { defineConfig, devices } from "@playwright/test";

/**
 * E2E lane (STORY_010): the production build (`pnpm build` first — gate step 5) driven against the stub generation
 * server, both started here. Runs inside the gate container (browsers at PLAYWRIGHT_BROWSERS_PATH). CLAUDE.md §6b:
 * desktop at the capture width, narrow through a device descriptor, build-time env passed explicitly to webServer.
 */
const STUB_PORT = 4010;
const APP_PORT = 3000;
const stubUrl = `http://127.0.0.1:${String(STUB_PORT)}`;
const appUrl = `http://127.0.0.1:${String(APP_PORT)}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "narrow", use: { ...devices["iPhone 13"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter stub-generation-server start",
      url: `${stubUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { STUB_PORT: String(STUB_PORT), STUB_HOST: "127.0.0.1", STUB_FIXTURE: process.env["STUB_FIXTURE"] ?? "mp4" },
    },
    {
      // The standalone server, exactly what app/Dockerfile ships (CHORE_001); `pnpm build` (gate step 5) must have run.
      command: "cp -r .next/static .next/standalone/app/.next/ && node .next/standalone/app/server.js",
      url: appUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { PORT: String(APP_PORT), HOSTNAME: "127.0.0.1", MODEL_BASE_URL: stubUrl, NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
