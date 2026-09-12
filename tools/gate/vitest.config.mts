import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/**/*.test.ts"], reporter: ["text-summary", "json-summary"], reportsDirectory: "coverage", thresholds: { lines: 60, branches: 61, functions: 98, statements: 66 } },
  },
});
