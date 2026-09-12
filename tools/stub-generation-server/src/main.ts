/** Entry point: `pnpm --filter stub-generation-server start`. Env: STUB_PORT (4010), STUB_HOST (0.0.0.0), STUB_FIXTURE (mp4|webm), STUB_API_KEY. */
import { createStubServer } from "./server.ts";

const port = Number(process.env["STUB_PORT"] ?? "4010");
const host = process.env["STUB_HOST"] ?? "0.0.0.0";
const fixture = process.env["STUB_FIXTURE"] === "webm" ? "webm" : "mp4";
const apiKey = process.env["STUB_API_KEY"] || undefined;

const stub = createStubServer({ fixture, apiKey });
const bound = await stub.listen(port, host);
console.log(`[stub] listening on http://${host}:${String(bound)} (fixture ${fixture}${apiKey ? ", bearer auth on" : ""})`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stub.close().then(() => process.exit(0));
  });
}
