# STORY_006 — The Spark answers create, status and result for a video job, so the UI never talks to ComfyUI directly

**Epic:** [EPIC_004](../epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md)
**Status:** Ready (drafted 2026-09-12 on the Mac; redrafted 2026-09-12 on the Spark after STORY_008 fixed the contract and the owner's containers-first rule)
**Created:** 2026-09-12

As the assistant building the UI, I want one small job API in front of ComfyUI on the Spark — create a job, read its status, cancel it, fetch its result — so that the UI and the stub generation server speak one contract and ComfyUI's workflow graphs stay an implementation detail of the Spark.

## Current state

ComfyUI runs on the Spark as the `comfyui` service of `spark/comfyui/compose.yaml` (STORY_005) and renders a clip from the graph in `spark/comfyui/h3_t2v_prompt.json` in about 17 minutes at 1344×768 · 5 s. The contract is written ([docs/contracts/job-api.md](../contracts/job-api.md) v1, STORY_008) and the stub implements it; the app's routes (STORY_009) proxy to whatever `MODEL_BASE_URL` names. Nothing implements the contract on the Spark.

## UI Mockup

N/A (no UI; the deliverables are `spark/adapter/`, its compose service and image, and the env the app reads).

## Acceptance Criteria

- [ ] `spark/adapter/` is a workspace package (TypeScript, Node 26 type stripping, zero runtime dependencies, the same lint/typecheck/test setup as the stub) that implements [job-api.md v1](../contracts/job-api.md) exactly: `POST /jobs` (JSON or multipart with 0–2 `referenceImage`), `GET /jobs/:id`, `DELETE /jobs/:id`, `GET /jobs/:id/result` (ranges), `GET /jobs/:id/poster`, `GET /capabilities`, `GET /health` (`server: "adapter"`), optional bearer auth from `ADAPTER_API_KEY`. It never exposes the `/__stub/` hooks.
- [ ] **Capabilities are what the Spark can do, from one place** (`src/capabilities.ts`): model `minimax-h3` only, ratios `21:9 16:9 4:3 1:1 3:4 9:16`, resolution `768P` only, durations 4–15 s step 1, 2 reference images. Anything else is `400 unsupported_option` with the field, so the UI greys it out from the same source.
- [ ] **Mapping is pure and tested** (`src/mapping.ts`): ratio → width×height on the 768-short-side, multiple-of-32 grid (21:9 → 1792×768, 16:9 → 1344×768, 4:3 → 1024×768, 1:1 → 768×768, 3:4 → 768×1024, 9:16 → 768×1344); duration → frame count on the model's 17k+5 grid (the rule in `spark/comfyui/h3.sh`: 5 s → 124); a request → the ComfyUI API graph derived from `spark/comfyui/h3_t2v_prompt.json` with the prompt, size, length, seed and, for reference images, `LoadImage` nodes wired to `first_frame` / `last_frame`, plus a first-frame `SaveImage` for the poster.
- [ ] **ComfyUI is driven through its HTTP and websocket API** (`src/comfy.ts`): reference images uploaded with `POST /upload/image`; the graph submitted with `POST /prompt` (`client_id` = the adapter's); progress from the websocket `progress` events (sampling step / total → 5–95 %), `executing` node events (decode → 95–99 %), `execution_error` → `failed`; completion and the output file names from `GET /history/:id`; cancel by `POST /interrupt` when the job is running and `POST /queue { delete: [id] }` when it is still queued. The job then reports `cancelled`. A ComfyUI that stops answering makes the job `failed` with `generation_failed` and a message, never a hang.
- [ ] **Results are served from ComfyUI's output directory**, bind-mounted read-only into the adapter container, with `Content-Type`, `Content-Length`, `Accept-Ranges` and `Range` → `206`; the poster is the first-frame PNG the graph saved. The job's `result` carries the real `durationSeconds`, `width`, `height`, `sizeBytes` (size from the file; duration and dimensions from the request and the frame rule, not parsed from the file).
- [ ] **Jobs survive an adapter restart:** the job table is written to `spark/data/adapter/jobs.json` on every change and read at start; a job that was running when the adapter died is reported `failed` (`generation_failed`, "adapter restarted") unless its history entry in ComfyUI shows it finished, in which case it is `done`.
- [ ] `spark/adapter/Dockerfile` (node:26-bookworm-slim, digest-pinned; copies the package only — no install step) and an `adapter` service in `spark/comfyui/compose.yaml` on port 4020, on a shared docker network `minimax` (created by `spark/comfyui/install.sh`, declared `external` in both compose files) that the app's `app` service also joins, so `MODEL_BASE_URL=http://adapter:4020` works from the UI container. The adapter is never published on the LAN by default (`ADAPTER_PORT` publishes it on `127.0.0.1` only, for curl).
- [ ] `spark/comfyui/run.sh` starts `comfyui` and `adapter` together and waits for both health endpoints; `stop.sh` stops both. README → Running the Model documents the env vars: `MODEL_BASE_URL`, `MODEL_API_KEY` (= `ADAPTER_API_KEY`), `ADAPTER_PORT`.
- [ ] **Manual verification on the Spark** (owner's containers stopped by name for the duration, as in STORY_005): `curl` the four calls for one real job (text-to-video, 16:9, 5 s) and record submit → done wall time, the progress values seen, the result's size and `ffprobe` duration in the Done note; then the UI container pointed at `http://adapter:4020` answers `GET /api/capabilities` with the adapter's capabilities.

## Technical Notes

- The adapter is the only thing that knows ComfyUI exists. Its graph template is the committed `spark/comfyui/h3_t2v_prompt.json`; the mapping module fills it. Node input names are verified against ComfyUI v0.35.1's `/object_info` at adapter start (a missing node or input is a startup error naming it).
- ComfyUI's websocket (`/ws?clientId=…`) delivers `progress` `{ value, max, prompt_id, node }` per sampling step and `executing` `{ node, prompt_id }`; `execution_success` / `execution_error` mark the end. Node 26 has a global `WebSocket` client; reconnect with backoff, and fall back to polling `/history` and `/queue` every 5 s when the socket is down so progress is never the only signal of completion.
- ComfyUI runs one job at a time; the adapter accepts several and lets ComfyUI's queue order them (`queued` until `executing` names the job). `503 busy` is reserved for a queue longer than 5.
- Cancel semantics ([CLAUDE.md → §6 rule 4](../../CLAUDE.md#6-key-rules)): the job is `cancelled` from the `DELETE` response on; ComfyUI's interrupt is asynchronous, and a partial output that lands afterwards is ignored.
- The reference's protocol is an agent session ([interactions.md §1](../recon/2026-09-12/interactions.md)); ours is deliberately the simpler create → status → result, and EPIC_003 decides how much thread scaffolding to render on top of it.
- Memory on the Spark: the adapter is a few tens of MB; ComfyUI's budget is unchanged from STORY_005 (peak 66.8 GiB), so the owner's two vLLM containers still have to be stopped for a real run until the box is rearranged — that stays his call, by name, each time.

## Testing Plan

- **Unit** — `src/mapping.test.ts`: every ratio → the exact size, every duration 4–15 → the 17k+5 frame count, a request → a graph with the right node values, one and two reference images wired to `first_frame`/`last_frame`, poster node present; `src/capabilities.test.ts`: validation of each field (`2K` → `unsupported_option/resolution`, duration 3 → `durationSeconds`, model `hailuo-2.3` → `model`); `src/job-store.test.ts`: the status machine (`queued → running → done | failed | cancelled`, cancel from queued and from running, progress monotonic, restart recovery rules) and the JSON persistence round trip in a temp dir; `src/progress.test.ts`: websocket event → percentage mapping.
- **Integration** — `src/server.test.ts` against a **fake ComfyUI** (`test/fake-comfy.ts`: an HTTP + websocket server that answers `/object_info`, `/upload/image`, `/prompt`, `/queue`, `/history/:id`, `/interrupt` and pushes scripted `progress`/`executing`/`execution_success`/`execution_error` events, and writes a copy of the stub's `fixture.mp4` and a PNG into a temp output dir as "ComfyUI's output"): create → `queued` → `running` with rising progress → `done` with the result and poster served with ranges; a scripted `execution_error` → `failed/generation_failed`; cancel while queued (`/queue` delete seen) and while running (`/interrupt` seen) → `cancelled`; a second cancel → 409; bearer auth on/off; validation table; restart recovery (kill the adapter mid-job, start a new one on the same store: running job → `failed` unless the fake's history says done); a fake that goes silent → `failed` after the timeout. The lane runs in the gate container (`pnpm --filter adapter test`), no ComfyUI needed.
- **E2E** — N/A: no UI in this story. The UI's e2e stays on the stub by design; the adapter's contract conformance is the integration lane above.
- **Manual verification** — the real run on the Spark, recorded in the Done note with model, checkpoint and date; and `GET /api/capabilities` through the UI container pointed at the adapter.

## Estimated Complexity

L
