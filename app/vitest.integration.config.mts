import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration lane (STORY_009): the app's route handlers called directly as Request → Response functions against the
// stub generation server started in-process. No browser, no production build; runs inside the gate container.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 15_000,
    fileParallelism: false,
  },
});
