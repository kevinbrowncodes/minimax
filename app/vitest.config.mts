import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit lane (CLAUDE.md §3 item 5): pure helpers and, later, jsdom component tests. The integration lane (STORY_009)
// has its own config so `pnpm test` never needs the stub.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "app/**/*.test.tsx", "components/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "test/integration/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/model-client.ts"],
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      // Floors set from the measured baseline minus 2 (STORY_011 Done note). They only ever go up (CLAUDE.md §4).
      thresholds: { lines: 87, branches: 84, functions: 90, statements: 87 },
    },
  },
});
