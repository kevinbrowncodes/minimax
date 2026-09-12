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
  },
});
