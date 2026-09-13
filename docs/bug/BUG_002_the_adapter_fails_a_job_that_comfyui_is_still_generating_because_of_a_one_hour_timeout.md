# BUG_002 — The adapter fails a job that ComfyUI is still generating, because of a one-hour timeout

**Status:** Resolved
**Found:** 2026-09-13, during STORY_016's manual verification (the owner's three-script chain)

## Summary

The adapter (STORY_006) fails any job older than `jobTimeoutMs` (default 3 600 000 ms) — "job exceeded 3600 s" — whatever ComfyUI is doing. The first real extension (Ref2VA, 277-frame segment with a 124-frame reference) was at **45 % after 60 minutes** and still generating; the adapter marked it `failed`, the UI showed "Request failed", the trial aborted, and ComfyUI carried on for another hour and wrote the clip nobody could reach.

## Steps to Reproduce

1. On the Spark, extend a finished 10 s clip by +10 s (STORY_016) — or any job whose generation takes more than an hour.
2. Watch `GET /jobs/:id` after 60 minutes.

## Expected vs Actual Behaviour

- **Expected:** a job that ComfyUI lists as running or pending is never failed for wall time; only a job ComfyUI no longer has (not running, not pending, no history) is given up on.
- **Actual:** the job turns `failed` with `generation_failed: job exceeded 3600 s` at 60 minutes while ComfyUI's queue still lists it running; the finished file later lands in the output directory with a terminal `failed` record in front of it.

## Root Cause

`spark/adapter/src/server.ts` `poll()` compares `createdAt` with `jobTimeoutMs` before looking at what ComfyUI reports. The one-hour default was sized for STORY_005's 17-minute clips; a 10 s FL2VA clip already takes 50 minutes, and Ref2VA extensions take longer than an hour (measured 2026-09-13: ≈ 6.4 min per sampling step, ≈ 2.2 h per +10 s with a 5 s context). The timeout ignored the one source of truth it had — ComfyUI's `/queue`.

## Acceptance Criteria

- [x] A job whose `promptId` ComfyUI lists in `queue_running` or `queue_pending` is never failed for wall time, however long it runs; ComfyUI's own errors, interrupts and the poll-silence rule (BUG_001/STORY_006) remain the ways it fails.
- [x] A job ComfyUI no longer lists and has no history for is failed after `orphanTimeoutMs` (default 10 min) with a message that says ComfyUI no longer has it; `jobTimeoutMs` becomes a last-resort cap (default 12 h) for a job ComfyUI lists forever.
- [x] Tests in `server.test.ts`: a held (queued in ComfyUI) job older than the old one-hour default is still `queued`; a running job that keeps reporting progress past the cap is not failed; a job that vanished from ComfyUI's queue without history is failed after the orphan timeout; the last-resort cap still fails a job ComfyUI lists forever.
- [x] The record of the 2026-09-13 run says what was salvaged and how (see Resolution).

## Resolution (2026-09-13)

- `poll()` now reads ComfyUI's queue first: a job listed there is left alone whatever its age (only the 12 h `jobTimeoutMs` cap remains); a job not listed and without history is failed after `orphanTimeoutMs` (10 min) as "ComfyUI no longer has this job". `AdapterOptions` gains `orphanTimeoutMs`; the defaults changed as above; `main.ts` passes them through unchanged.
- The run it bit: extension `19d2394f` (segment 2 of the chain) was failed by the adapter at 45 % while ComfyUI kept generating it. The contract makes `failed` terminal, so the adapter cannot revive it. Once ComfyUI finished, the finished clip was checked on disk and **the two records were repaired by hand** — the adapter's `jobs.json` entry (status `done`, the result fields the adapter would have written) and the UI's history entry — with the adapter stopped, and the chain resumed from that job. This is recorded here and in STORY_016's Done note as a one-off repair of our own data, not a procedure.
