# BUG_007 — An extension of a job that went through the queue is refused by the adapter

**Status:** Resolved (2026-09-15)
**Found:** 2026-09-15, reading the extension path while drafting STORY_043 (CLAUDE.md § 3.8 — before writing an AC on it)

## Summary

Since STORY_041 a request that waited in the app's queue keeps its history id and records the adapter's job id in `jobId`. The task page's Extend (and Retry) sends `continueFrom` = the history id; `POST /api/jobs` forwards the body verbatim (only the app's own fields are stripped) and the queue runner's `upstreamFields` forwards `continueFrom` verbatim too. For a queued job the adapter has no job under that id, so the extension is refused.

## Steps to reproduce

1. With the stub busy (`POST /__stub/busy { busy: true }`) send a prompt; free the stub; let the job finish — its history entry has `jobId` ≠ `id`.
2. Open its task page, Extend, Send.

## Expected vs actual

- Expected: the extension is created against the finished video.
- Actual: 400 `validation` — "continueFrom names no finished job on this server" (the adapter and the stub say the same).

## Root cause

The id mapping (`upstreamJobId`) was applied to the status, cancel, result and poster routes but not to `continueFrom` on the create path — in the route's forwarded body nor in the runner. `HistoryEntry.continuesFrom.id` must stay our id (the UI links to it); only what goes to the model server must be the server's id.

## Acceptance Criteria

- [x] `POST /api/jobs` forwards `continueFrom` as `upstreamJobId(continueFrom)` in JSON and multipart; history's `continuesFrom.id` stays the history id.
- [x] The queue runner's `upstreamFields` maps `continueFrom` the same way at submit time (the source may itself have been queued).
- [x] Integration: a job that went through the queue is extended; the stub receives its own id as `continueFrom`; history's `continuesFrom` names ours. Unit: `upstreamFields` maps through `jobId`.

## Resolution

Mapped in both places (`app/app/api/jobs/route.ts`, `app/lib/queue-runner.ts`); tests in `test/integration/queue.test.ts` and `lib/queue-runner.test.ts`. Found and fixed the same day as the regression; no user hit it (no extension of a queued job had been attempted).
