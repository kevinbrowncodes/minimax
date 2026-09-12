/**
 * Entry point: `pnpm --filter adapter start` (or the adapter container). Env:
 *   COMFY_URL (http://comfyui:8188)  OUTPUT_DIR (/comfy/output)  STORE_FILE (/comfy/adapter/jobs.json)
 *   GRAPH_TEMPLATE (../comfyui/h3_t2v_prompt.json)  ADAPTER_PORT (4020)  ADAPTER_HOST (0.0.0.0)  ADAPTER_API_KEY
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Graph } from "./mapping.ts";
import { createAdapterServer } from "./server.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const graphPath = env["GRAPH_TEMPLATE"] ?? path.resolve(here, "../../comfyui/h3_t2v_prompt.json");
const graphTemplate = JSON.parse(readFileSync(graphPath, "utf8")) as Graph;

const adapter = createAdapterServer({
  comfyUrl: env["COMFY_URL"] ?? "http://comfyui:8188",
  outputDir: env["OUTPUT_DIR"] ?? "/comfy/output",
  storeFile: env["STORE_FILE"] ?? "/comfy/adapter/jobs.json",
  graphTemplate,
  apiKey: env["ADAPTER_API_KEY"] || undefined,
});
const port = Number(env["ADAPTER_PORT"] ?? "4020");
const host = env["ADAPTER_HOST"] ?? "0.0.0.0";
try {
  const bound = await adapter.start(port, host);
  console.log(`[adapter] listening on http://${host}:${String(bound)} (ComfyUI ${env["COMFY_URL"] ?? "http://comfyui:8188"}, graph ${graphPath})`);
} catch (error) {
  console.error(`[adapter] refusing to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void adapter.close().then(() => process.exit(0));
  });
}
