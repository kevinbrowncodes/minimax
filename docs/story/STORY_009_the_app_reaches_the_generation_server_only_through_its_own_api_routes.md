# STORY_009 — The app reaches the generation server only through its own API routes, proven against the stub

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Done (2026-09-12, on the Spark)
**Created:** 2026-09-12

As the owner, I want the browser to talk only to the app, and the app to talk to the generation server through a handful of server-side routes that read the base URL and key from configuration, so that the model endpoint is never exposed to the page and every route is verified against the stub before a screen uses it.

## Current state

STORY_007 gives the app a config reader; STORY_008 gives the contract and the stub. No route, reducer or polling logic exists.

## UI Mockup

N/A (no UI change; routes and pure logic only).

## Acceptance Criteria

- [x] Route handlers under `app/app/api/`: `POST /api/jobs` (forwards JSON or multipart to the server's `POST /jobs`), `GET /api/jobs/[id]` (status), `DELETE /api/jobs/[id]` (cancel), `GET /api/jobs/[id]/result` (streams the video: status, `Content-Type`, `Content-Length`, `Accept-Ranges` and `Range` passed through so the `<video>` element can seek), `GET /api/jobs/[id]/poster`, `GET /api/capabilities`. Each builds its upstream URL from `config.modelBaseUrl`, sends `Authorization: Bearer` when `modelApiKey` is set, and returns upstream errors in the contract's `{ error: { code, message } }` shape with the same status. The upstream URL never appears in a response.
- [x] `app/lib/upload-validation.ts`: reference images must be `image/png`, `image/jpeg` or `image/webp`, ≤ 10 MB each, at most 2 per job (FL2VA first/last frame); the create route enforces it before forwarding and answers `400` with `field: "referenceImage"`.
- [x] `app/lib/job-status.ts`: a pure reducer over status responses — transitions `queued → running → done | failed | cancelled`, terminal states absorb further updates, `progress` is clamped 0–100 and monotonic, a `cancelRequested` flag is kept until the server confirms — plus a `isTerminal(status)` helper.
- [x] `app/lib/polling.ts`: `pollUntilTerminal(fetchStatus, { signal, schedule })` with the schedule 1 s, 2 s, 5 s, 5 s … (backoff capped at 5 s), stops on a terminal status, aborts cleanly on `AbortSignal`, and treats a transient network error as "try again on the next tick" up to 5 consecutive failures before yielding `failed` with `error.code: "unreachable"`. Timers are injectable so tests use fake timers.
- [x] `pnpm test:integration` is a Vitest lane (Node environment, `app/test/integration/**`) that starts the stub **in-process** on a random port, points `MODEL_BASE_URL` at it, and calls the route handlers directly as `Request → Response` functions. It runs inside the gate container without a production build.
- [x] `tools/gate/run.sh test:integration` runs the lane (the "no lane yet" placeholder from STORY_007 is removed).

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

## Done note (2026-09-12)

- **Routes** under `app/app/api/`: `jobs` (POST), `jobs/[id]` (GET, DELETE), `jobs/[id]/result` (GET, streamed, `Range` and the content headers passed through), `jobs/[id]/poster`, `capabilities`. All go through `lib/model-client.ts`: base URL and bearer from `lib/config.ts` on every call, upstream JSON relayed with its status, network failure → `502 unreachable`, config error → `500 config` naming the variable, unexpected throw → `500 internal` — no stack trace in any body, no upstream URL in any response. Plain `Request → Response` functions, so the integration lane calls them directly.
- **Pure logic** in `lib/`: `job-api.ts` (contract types), `job-status.ts` (reducer: terminal absorbs, progress clamped and monotonic, `done` pins 100, cancel request kept until a terminal state), `polling.ts` (1 s, 2 s, 5 s… schedule on global timers; abort → `PollAbortedError` and nothing scheduled after; five consecutive failures → `failed/unreachable`), `upload-validation.ts` (png/jpeg/webp, ≤ 10 MB, ≤ 2).
- **Tests in the gate container:** unit — `job-status.test.ts` 5, `polling.test.ts` 3 (fake timers), `upload-validation.test.ts` 3, plus STORY_007's `config.test.ts` 4 and the stub's 18 → 33; integration — `test/integration/jobs.test.ts` 10 cases against the in-process stub (default walk, failure and moderated codes, cancel + 409, result bytes = fixture with `Range` → 206 and poster, upload forwarded with matching sha256, gif refused before the stub sees it, 415, relayed `2K` → `unsupported_option`, bearer token when `MODEL_API_KEY` is set, 404 / 500-naming-`MODEL_BASE_URL` / 502-unreachable). Full gate 13 s; integration lane 1 s.
- **Decisions:** the app imports the stub as a workspace dev dependency (`stub-generation-server`, exported from `src/server.ts`) instead of copying it, which required `allowImportingTsExtensions` in the app's tsconfig (legal: the app never emits). Route handlers avoid `next/server` so the lane needs no Next runtime. `?script=` on `POST /api/jobs` is passed through to the stub so specs (STORY_010) can choose outcomes through the app; the adapter ignores it.
- **Correction, same day:** the first push of this story (`2f526ff`) broke the production image build — `next build` type-checks the whole app project including `test/integration/`, whose import of `stub-generation-server` had no sources inside the image, and the check that was meant to catch it piped its exit code into `grep`. Fixed in the follow-up commit by copying the stub package into the image's build stage; the image then builds and serves, and `GET /api/capabilities` on the production container answers `502 unreachable` because no generation server is configured there yet (STORY_006 supplies it). Lesson kept for the gate: STORY_011 adds the production image build to the gate steps so this cannot slip again.
