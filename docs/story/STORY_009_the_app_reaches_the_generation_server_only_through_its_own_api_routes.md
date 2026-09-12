# STORY_009 — The app reaches the generation server only through its own API routes, proven against the stub

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Ready (drafted 2026-09-12)
**Created:** 2026-09-12

As the owner, I want the browser to talk only to the app, and the app to talk to the generation server through a handful of server-side routes that read the base URL and key from configuration, so that the model endpoint is never exposed to the page and every route is verified against the stub before a screen uses it.

## Current state

STORY_007 gives the app a config reader; STORY_008 gives the contract and the stub. No route, reducer or polling logic exists.

## UI Mockup

N/A (no UI change; routes and pure logic only).

## Acceptance Criteria

- [ ] Route handlers under `app/app/api/`: `POST /api/jobs` (forwards JSON or multipart to the server's `POST /jobs`), `GET /api/jobs/[id]` (status), `DELETE /api/jobs/[id]` (cancel), `GET /api/jobs/[id]/result` (streams the video: status, `Content-Type`, `Content-Length`, `Accept-Ranges` and `Range` passed through so the `<video>` element can seek), `GET /api/jobs/[id]/poster`, `GET /api/capabilities`. Each builds its upstream URL from `config.modelBaseUrl`, sends `Authorization: Bearer` when `modelApiKey` is set, and returns upstream errors in the contract's `{ error: { code, message } }` shape with the same status. The upstream URL never appears in a response.
- [ ] `app/lib/upload-validation.ts`: reference images must be `image/png`, `image/jpeg` or `image/webp`, ≤ 10 MB each, at most 2 per job (FL2VA first/last frame); the create route enforces it before forwarding and answers `400` with `field: "referenceImage"`.
- [ ] `app/lib/job-status.ts`: a pure reducer over status responses — transitions `queued → running → done | failed | cancelled`, terminal states absorb further updates, `progress` is clamped 0–100 and monotonic, a `cancelRequested` flag is kept until the server confirms — plus a `isTerminal(status)` helper.
- [ ] `app/lib/polling.ts`: `pollUntilTerminal(fetchStatus, { signal, schedule })` with the schedule 1 s, 2 s, 5 s, 5 s … (backoff capped at 5 s), stops on a terminal status, aborts cleanly on `AbortSignal`, and treats a transient network error as "try again on the next tick" up to 5 consecutive failures before yielding `failed` with `error.code: "unreachable"`. Timers are injectable so tests use fake timers.
- [ ] `pnpm test:integration` is a Vitest lane (Node environment, `app/test/integration/**`) that starts the stub **in-process** on a random port, points `MODEL_BASE_URL` at it, and calls the route handlers directly as `Request → Response` functions. It runs inside the gate container without a production build.
- [ ] `tools/gate/run.sh test:integration` runs the lane (the "no lane yet" placeholder from STORY_007 is removed).

## Technical Notes

- Route handlers are plain functions in Next.js App Router; importing them in Vitest avoids booting the dev server and keeps the lane fast. If a handler needs `next/server` internals that do not load under Vitest, the fallback is starting `next start` on a random port in a `globalSetup` — decided at implementation and recorded here.
- The result route must not buffer the whole file in memory: pipe the upstream body (`Response.body`) through.
- History/gallery persistence is EPIC_003's concern (the story that adds history decides the store); this story keeps no state.

## Testing Plan

- **Unit** — `app/lib/job-status.test.ts`: every legal transition; an update after `done` is ignored; progress cannot go backwards; `cancelRequested` set on cancel and cleared when `cancelled` arrives. `app/lib/polling.test.ts` (fake timers): tick schedule is 1, 2, 5, 5 s; stops after the first terminal response and resolves with it; `AbortSignal` rejects with an abort error and schedules nothing more; five consecutive network errors yield `failed/unreachable`, four then a success continue. `app/lib/upload-validation.test.ts`: each accepted type passes; `image/gif` fails with `field: "referenceImage"`; a 10 MB + 1 byte file fails; a third file fails.
- **Integration** — `app/test/integration/jobs.test.ts` against the in-process stub: create with the default script then poll the status route until `done` and see the contract's `result`; `fails-after-2-polls` surfaces `failed` with the code; `moderated` surfaces `code: "moderated"`; cancel returns `cancelled` and a second cancel `409`; `GET /api/jobs/:id/result` bytes equal the fixture and a `Range: bytes=0-99` request returns 206 with 100 bytes; a multipart create with `fixture-reference.png` is forwarded and the stub's `received` endpoint shows the same sha256; a `.gif` upload is refused with 400 before reaching the stub (the stub records no job); with `MODEL_API_KEY` set the stub sees the bearer header; unknown id → 404; with `MODEL_BASE_URL` unset the create route answers 500 with a message naming the variable and no stack trace.
- **E2E** — N/A: no UI. STORY_010's smoke spec calls `/api/capabilities` through the real built app and proves the chain browser → app → stub.

## Estimated Complexity

M
