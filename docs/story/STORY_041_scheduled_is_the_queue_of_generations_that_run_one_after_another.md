# STORY_041 — Scheduled is the queue of generations that run one after another

**Epic:** [EPIC_007](../epic/EPIC_007_a_queue_of_generations.md)
**Status:** Approved (2026-09-15 — the owner: "Approve, but add timed runs"; the timed-run AC and notes were added on that answer before any code); from [BACKLOG_008](../backlog/BACKLOG_008_scheduled_generations_run_one_after_another.md)
**Created:** 2026-09-15

As the owner, I want to send several generations in a row and see them run one after another — a Scheduled page that shows the queue in order, lets me reorder or remove what has not started, a Send that queues instead of failing when the Spark is busy, and a "run at" time I can put on a queued job so it waits for the hour I choose — so that I can line up an evening's clips and collect them in the morning.

## Current state (read from the code, 2026-09-15)

The adapter accepts up to five open jobs (`maxOpenJobs`, default 5) and submits each to ComfyUI at once; ComfyUI runs prompts one at a time in submission order. The UI can already send while another job runs (the home composer; the task page's docked composer shows Stop generation instead), each new job appears in Recents as Queued then Generating, and the sixth prompt is refused with "The Spark is busy" (503 `busy`). There is no page that shows the queue as a whole, no position, no reordering, no way to remove a queued job but cancelling it. `/scheduled` answers 404 (STORY_026); the reference's page was the agent's timed tasks, which we do not have.

## UI Mockup

**Reference captures (the chrome only):** `page-scheduled@1440` / `-dark`, `narrow-page-scheduled@390` / `-dark` (2026-09-14): the "Schedules" heading, the "Search scheduled tasks" field with the "Scheduled task status" filter (All), **Create** top-right, the empty state "No scheduled tasks yet." with a Create button. The rows are ours.

```
sidebar: New task · Search · Plugins · Scheduled · Assets · Connect mobile          (the row is back, between Plugins and Assets)

Schedules                                                                  [+ Create]
[🔍 Search scheduled tasks                     ] [Status: All ▾ (All · Waiting · Running · Done · Failed)]
#  ─ Running ─────────────────────────────────────────────────────────────────────
1  ● 26-09-15-1901  Paper boat on rain puddle                 Generating 41 %      [Stop]
   ─ Waiting (3) ─────────────────────────────────────────────────────────────────
2  ○ 26-09-15-1902  Same boat, wider                          Waiting · next       [↑] [↓] [Run at…] [Remove]
3  ○ 26-09-15-1904  Candle on a wooden table                  Waiting              [↑] [↓] [Run at…] [Remove]
4  ○ 26-09-15-1905  Neon street at night                      Not before 02:00     [↑] [↓] [Run at…] [Remove]
   (Run at… = a date-time field on the row; clear it to run at the next free slot; a timed row is skipped until its time and never blocks the ones behind it)
   ─ Done today ──────────────────────────────────────────────────────────────────
   ● 26-09-15-1730  Forest dawn fly-through                   Done 17:52           → the task page
empty: "No scheduled tasks yet."  + Create → the home composer
Create = the composer as it is: Send queues (a toast "Queued — 3rd in line" when the Spark is busy) and opens the task page, whose indicator reads "Waiting — 3rd in line" until the job is submitted
```

## Acceptance Criteria

- [ ] **Send never fails as busy:** when the adapter answers 503 `busy` (or its open jobs are at the limit), the request is kept in the app's own queue (`/data/queue.json`, with the images it carries) as a history entry with status `waiting` and a position; the task page opens and its indicator reads "Waiting — Nth in line"; the queue runner submits the next waiting request to `POST /jobs` as soon as a slot frees (polled with the recents, and on every job's terminal status), in order; a submitted one becomes an ordinary job (its id changes from the queue's to the adapter's — the history entry keeps its original id and records the job's).
- [ ] **The Scheduled page** at `/scheduled` (the sidebar row back, between Plugins and Assets, as the reference has it): Running (the adapter's open jobs, with progress and Stop), Waiting (ours, in order, with position, move up / down and Remove — no confirm; the entry is deleted), Done today / Failed (the last 24 hours, each a link to its task page); the search filters by title; the status filter as sketched; the empty state as captured; **Create** opens the home composer.
- [ ] Cancel of a running job (the task page's Stop, the queue's Stop) frees the slot and the next waiting request goes; Remove of a waiting one never touches the adapter.
- [ ] The Inbox (STORY_033) gets the same events as today when a queued job finishes; the queue survives an app restart (the file) and a job that the adapter no longer knows is marked failed with the reason.
- [ ] Both widths (the page at 390 with the bar's Search as Assets has it), both themes; the STORY_026 e2e sweep is updated: `/scheduled` is back, Scheduled is no longer in the removed list; every other e2e stays green.

## Departures from the reference

- The reference's Scheduled is the agent's timed tasks (run at a time / on a repeat); ours is a generation queue — the owner's meaning. The chrome is the reference's; the rows, the Waiting section and reorder are ours.
- Timed runs are ours in shape (a "run at" on a queued generation, once); the reference's repeats ("every day at…") are not offered.

## Technical Notes

- `lib/queue-store.ts` (`/data/queue.json`: `{ id, request, referenceFiles, position, createdAt, notBefore? }`), `lib/queue-runner.ts` (server-side: `submitDue(now)` — for each waiting entry in order whose `notBefore` is absent or past, `POST /jobs` to the adapter while it answers 202; stop at the first `busy`); called from `GET /api/history` (the sidebar's poll, every navigation) and from the jobs status route when a job turns terminal — no separate process, nothing to keep alive; a timed job therefore goes on the first poll after its time while the app is open (the page says so). `PATCH /api/queue/:id { notBefore | null }`.
- `POST /api/jobs`: on 503 `busy` from the adapter, write the queue entry (moving the uploaded images under `uploads/<queue id>/`, STORY_032's directory) and answer 202 with `{ id, status: "waiting", position }`; `HistoryEntry.status` gains `waiting`; `job-status.ts` and the task page's indicator learn it; the polling of a waiting entry asks `GET /api/history/:id` until it has a job id, then the job.
- Routes: `GET /api/queue` (waiting, in order), `PATCH /api/queue/:id { position }`, `DELETE /api/queue/:id`; `components/pages/ScheduledPage.tsx` at `app/app/scheduled/page.tsx`; the sidebar row and `route-title` / `activeRow` entries return.
- The stub: a `busy` script (answers 503 busy to creates until `/__stub/free`) so the e2e can fill the queue and release it.

## Testing Plan

- **Unit** — `queue-store.test.ts` (order, reposition, remove, `notBefore`, the file), `queue-runner.test.ts` (submits in order, skips a timed entry until its time without blocking the rest, stops at busy, marks an unknown job failed), `job-status.test.ts` (the waiting state), `route-title.test.ts` (`/scheduled` back), the "Not before" formatting.
- **Integration** — `queue.test.ts`: a create that meets 503 busy becomes a waiting entry with its images kept; `GET /api/history` submits it when the stub frees; the routes' reorder / remove; a remove of a submitted job is a 409.
- **Component** — `ScheduledPage.test.tsx` (the sections, search, the status filter, move / remove, Stop, empty); `TaskPage.test.tsx` (the waiting indicator); `Sidebar.test.tsx` (the row).
- **E2E** — `scheduled.spec.ts` (new): the stub `busy`; send two prompts → both Waiting on the page in order → move the second up → put a "run at" an hour ahead on one → free the stub → the untimed one runs and finishes (terminal waited on), the timed one stays "Not before …" → clear its time → it goes and finishes; Remove a waiting one; at 390 through the drawer. The STORY_026 sweep adjusted.

## Estimated Complexity

Large — a second kind of pending work, a runner, a page and the stub's new script.
