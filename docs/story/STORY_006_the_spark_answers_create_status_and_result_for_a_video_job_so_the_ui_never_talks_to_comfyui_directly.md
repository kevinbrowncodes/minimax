# STORY_006 — The Spark answers create, status and result for a video job, so the UI never talks to ComfyUI directly

**Epic:** [EPIC_004](../epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md)
**Status:** Draft (after STORY_005; the contract is shared with EPIC_002's stub)
**Created:** 2026-09-12

As the assistant building the UI, I want one small job API in front of ComfyUI on the Spark — create a job, read its status, cancel it, fetch its result — so that the UI and the stub generation server speak one contract and ComfyUI's workflow graphs stay an implementation detail of the Spark.

## UI Mockup

N/A (no UI; the deliverables are `docs/contracts/job-api.md` and `spark/adapter/`).

## Acceptance Criteria (draft)

- [ ] `docs/contracts/job-api.md` defines the contract before code: `POST /jobs` (prompt, ratio, resolution, duration seconds, optional reference image) → `{ id }`; `GET /jobs/:id` → `{ status: queued | running | done | failed | cancelled, progress?, error? }`; `DELETE /jobs/:id` cancels; `GET /jobs/:id/result` streams the MP4 and `GET /jobs/:id/poster` a still. EPIC_002's stub implements exactly this file.
- [ ] `spark/adapter/` is a TypeScript package in the pnpm workspace (Node ≥ 23, type stripping, like `recon/`) that maps a job onto the FL2VA workflow graph, submits it to ComfyUI's `/prompt`, tracks it through the websocket and `/history`, cancels through `/interrupt` and the queue endpoint, and serves results from ComfyUI's output directory.
- [ ] The adapter's mapping and status logic are unit-tested on the Mac, and an integration lane runs it against a fake ComfyUI (a local HTTP server replaying recorded `/history` responses), so the Mac gate covers it without the Spark.
- [ ] A systemd unit under `spark/adapter/` starts ComfyUI and the adapter on boot; README → Running the Model documents the env vars the UI reads (`MODEL_BASE_URL` and friends).
- [ ] A manual verification on the Spark: `curl` the four endpoints for one real job and record the timings.

## Technical Notes

- The reference's own protocol is an agent session with the file surfacing in a drive listing ([interactions.md](../recon/2026-09-12/interactions.md) §1); our contract is deliberately the simpler create → status → result, and EPIC_003 decides how much thread scaffolding to render on top of it.
- Options the reference exposes that the Spark cannot honour (2K, H3-Max, Hailuo-2.3) are rejected by the contract with a clear error, so the UI can grey them out from one source of truth (`GET /capabilities` — to be added to the contract).

## Testing Plan

Drafted with the contract. Unit (mapping, status machine), integration (fake ComfyUI), e2e N/A, manual on the Spark.

## Estimated Complexity

L
