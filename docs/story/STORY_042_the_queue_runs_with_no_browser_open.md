# STORY_042 — The queue runs with no browser open

**Epic:** [EPIC_007](../epic/EPIC_007_a_queue_of_generations.md) — the second story
**Status:** Approved (2026-09-15 14:44 EDT — the owner: "Approve as drafted"; the pick was delegated: "Do what you think is best")
**Created:** 2026-09-15

As the owner, I want a queued generation — one held by a run-at time, or one waiting for a slot — to go at its time even when no browser is open, so that lining up an evening's clips and closing the laptop is enough.

## Current state (read from the code, 2026-09-15)

STORY_041's runner (`lib/queue-runner.ts` › `submitDue`) lives in the routes the UI polls: the history list (every sidebar navigation), a job's status (a task page open), the queue list (the Scheduled page, every 2 s). A request with a run-at goes on the first of those polls after its time; a request waiting for a slot goes on the first poll after a slot frees. With every browser closed nothing polls, so the line stands still until someone opens a page. The app already runs a hook once at server start — `app/instrumentation.ts` › `register()` (STORY_007, behind the `NEXT_RUNTIME === "nodejs"` guard) — where the config check lives; the container's process is `node app/server.js` (standalone), up whenever the Spark is up.

## UI Mockup

N/A (no UI change) — the Scheduled page's note under Run at… and the composer's Run at… note change one sentence each: "Goes on the first check after this time while MiniMax Local is open" becomes "Goes within half a minute of this time — the queue runs inside MiniMax Local's server, browser or no browser." Everything else on the page stays.

## Acceptance Criteria

- [ ] **The ticker:** when the app's server starts, `register()` starts a ticker that calls the runner (`submitDue`) every **30 s** (`QUEUE_TICK_MS`, default 30000; 0 disables it — the gate's Playwright server and the integration lane never rely on it). The timer is `unref`'d so it never keeps the process alive, one tick never overlaps another (the runner already runs once at a time), and a tick that throws is logged and the ticker keeps going.
- [ ] **Browser or no browser:** a request whose run-at passes with no page open is submitted within 30 s of its time (the queue file's `submittedAt` says when), and a request waiting for a slot goes within 30 s of the slot freeing.
- [ ] **The words:** the two notes (the Scheduled page's Run at… field, the composer's Run at… popover) say the new truth; the README's STORY_041 row and the epic's rule "STORY_041's runner does not…" are updated to say the ticker exists.
- [ ] The gate stays model-free; every existing e2e stays green (the ticker is off under Playwright — `QUEUE_TICK_MS=0` in `webServer.env` — so the specs' own polling is the only thing advancing the line, as today).

## Departures from the reference

- None new: the reference has no queue at all; this story only removes the "while a page is open" condition STORY_041 wrote down.

## Technical Notes

- `app/lib/queue-ticker.ts` (pure enough to test): `startQueueTicker({ intervalMs, run, log })` → `{ stop }`; `setInterval` + `unref()`; a tick calls `run()` and catches; a second start is a no-op (one ticker per process).
- `app/instrumentation.ts`: after the config check, `startQueueTicker({ intervalMs: Number(process.env.QUEUE_TICK_MS ?? 30000), run: submitDue })` — imported behind the same `NEXT_RUNTIME` guard (the runner touches the filesystem).
- `compose.yaml`: nothing to add (the default is 30 s); `app/playwright.config.ts` › `webServer.env`: `QUEUE_TICK_MS: "0"`.
- The two notes in `components/pages/ScheduledPage.tsx` and `components/composer/Composer.tsx`; their assertions in `ScheduledPage.test.tsx` (the note's words) follow.

## Testing Plan

- **Unit** — `queue-ticker.test.ts`: with fake timers, `run` is called once per interval and not at start; a throwing tick is logged and the next tick still runs; `stop` ends it; a second `start` returns the same ticker; `intervalMs: 0` starts nothing.
- **Integration** — not applicable: the ticker is process-level wiring around `submitDue`, whose route-level behaviour `queue.test.ts` already proves (a create meets busy → freed → submitted); the wiring itself is proven by the manual step below.
- **Component** — `ScheduledPage.test.tsx`: the note's new sentence. **E2E** — none new: the ticker is off under Playwright by design; `scheduled.spec.ts` keeps proving the line with the page's own polls.
- **Manual verification (the Spark, in the Done note with the date):** with the app deployed and ComfyUI up, send one 5 s prompt with a run-at 3 minutes ahead through `POST /api/jobs`, then touch no route for four minutes (no page open, no curl to the app); read `/data/queue.json` inside the container and the adapter's `/health`: `submittedAt` within 30 s of the run-at and `openJobs` 1 without any poll of the app; then cancel the job (`DELETE /api/jobs/:id`, the adapter interrupts ComfyUI) so the Spark is not held for a full generation — the cancel is recorded and the line is empty afterwards.

## Estimated Complexity

Small — a timer around an existing function, one env var, two sentences, one unit test, one short manual check.
