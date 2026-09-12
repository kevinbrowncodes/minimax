# STORY_014 — A submitted job becomes a task page that shows progress, plays the result, can be cancelled, and is kept in history

**Epic:** [EPIC_003](../epic/EPIC_003_the_video_generation_screen_is_rebuilt_to_match_the_reference.md)
**Status:** Done (2026-09-12, on the Spark)
**Created:** 2026-09-12

As the owner, I want Send to open a task page shaped like the reference's — my prompt as a bubble, a working indicator, the Progress panel, the docked composer whose Send turns into Stop — that follows the job from queued to a playable, downloadable video, and I want every job kept so Recents and Assets can reopen it, so that the whole MVP flow works end to end against the Spark.

## Current state

STORY_013's Send creates a job and navigates to `/task/<id>`, which does not exist. The status reducer and polling are in `lib/` (STORY_009). There is no history store.

## UI Mockup

**Reference captures:** `task-submitted@1440.png`, `task-generating-000s/030s/090s@1440.png` (user bubble, "Merging…/Thinking…/Improving…" indicator, "Processed 42s" row, the assistant's "Submitted… queued" note with Copy/Like/Dislike and a time), `task-rejected-insufficient-credits@1440.png` (Progress panel populated: numbered to-do list, ticks and strike-through), `task-request-failed@1440.png` ("ⓘ Request failed" + Retry pill), `task-timeout@1440.png` (Progress panel empty: "Track progress on longer tasks."), `task-revisited-pending@1440.png`, `home-with-recents@1440.png` (Recents with the unread dot). Measured ([tokens.md](../recon/2026-09-12/tokens.md)): thread column ~740 px centred; user bubble `rgb(245,245,245)`, radius 12 px, 16 px text; assistant text 16 px/26 px; Progress card right column 250 px, radius 12 px, 1 px border, header "Progress" 14 px/500 with a chevron; docked composer = the home composer minus the chips, 736 px, bottom of the thread; footer line "MiniMax Agent is AI and can make mistakes" 11 px `rgb(173,173,173)`.

**The reference never showed a finished job in the thread** (its agent did not post the result within 20 minutes; the file surfaced in Assets — [interactions.md §4](../recon/2026-09-12/interactions.md)). Ours must, so these states are designed here:

```
queued / running (desktop)                                      Progress panel (ours, fixed steps)
┌ Paper boat on rain puddle ─────────────────────────┐ ┌ Progress ⌄ ────────────────┐
│ ┌──────────────────────────────────────────┐        │ │ ✓ ~~Validate request~~     │
│ │ @video-creator A small paper boat …      │        │ │ ✓ ~~Submit to the Spark~~  │
│ └──────────────────────────────────────────┘        │ │ 3 Generate — 63 %  ▮▮▮▮▮░░░ │
│ ◉ Generating… 63 %                                  │ │ 4 Deliver the video        │
│                                                     │ └────────────────────────────┘
│ ┌ composer (docked) ───────────────────────┐        │
│ │ Enter message…                    (■ Stop)│  ← Send becomes "Stop generation" while queued/running
│ └──────────────────────────────────────────┘        │
│      MiniMax Local generates on your Spark          │
done                                                  failed / moderated / cancelled
│ ◉ Your video is ready · 5.2 s · 1344×768 · 1.5 MB   │ │ ⓘ Request failed — <server message>  [Retry] │
│ ┌──────────────────────────────────────────┐        │ │ ⓘ The prompt was refused on content grounds │
│ │ ▶  <video controls poster=…>            │        │ │ ⓘ Cancelled at 41 %                          │
│ └──────────────────────────────────────────┘        │
│ ⤓ Download   ⧉ Copy prompt   18:32                  │
```

At 390 the Progress panel moves below the thread and the docked composer is 358 px.

## Acceptance Criteria

- [x] **History store** (`lib/history-store.ts`, JSON file at `HISTORY_FILE`, default `/data/history.json` in the `app` container's `app-data` volume; `app-dev` and the gate use a temp path): entries `{ id, title, prompt, params, referenceImages, createdAt, status, progress, finishedAt?, openedAt?, result? }`; routes `GET /api/history` (newest first), `GET /api/history/:id`, `PATCH /api/history/:id` (status/progress/result/openedAt), `DELETE /api/history/:id`. Writes are atomic (temp file + rename). The title is the prompt's first 48 characters at a word boundary.
- [x] `POST /api/jobs` (STORY_009's route) records the entry **before** answering the browser, so a job can never exist without a history row; the task page and Recents read from the store, the job's live status from `GET /api/jobs/:id`.
- [x] `/task/[id]` renders the thread: the user bubble (`@video-creator` + prompt, reference thumbnails when any), the working indicator with the state text ("Queued…", "Generating… N %"), the Progress panel with the four fixed steps ticked as the job advances, the docked composer, the footer line. `pollUntilTerminal` drives it (1/2/5 s), and every status response is `PATCH`ed into history so a reopened page shows the last known state instantly.
- [x] **Stop generation**: while the job is queued or running, the docked composer's Send is the black square Stop; clicking it `DELETE`s `/api/jobs/:id` and the page shows "Cancelled at N %"; the cancelled job stays in history as cancelled ([CLAUDE.md → §6 rule 4](../../CLAUDE.md#6-key-rules)).
- [x] **done**: the result card renders a `<video controls playsinline>` with `src=/api/jobs/:id/result`, `poster=/api/jobs/:id/poster`, the summary line (duration, size, resolution), a **Download** link (`download="<title>.mp4"`) and **Copy prompt**; playback starts on the user's click, never automatically.
- [x] **failed** shows "ⓘ Request failed — <message>" with a **Retry** pill that resubmits the same request as a new job; `error.code: moderated` shows "The prompt was refused on content grounds" without Retry; `unreachable` (STORY_009's polling) shows "The Spark stopped answering" with Retry.
- [x] Reopening `/task/:id` for a finished job shows the result without polling; for an open job polling resumes; the entry's `openedAt` is set so the Recents dot clears.
- [x] The docked composer can start a new job (same Send path as STORY_013, navigates to the new task) once the current one is terminal; while a job runs it only offers Stop.
- [x] Narrow (390): Progress panel below the thread, video fills the width, controls ≥ 44 px.

## Departures from the reference

- The reference's thread is an agent conversation ("Merging…", "Thinking…", "Processed 42s", Copy/Like/Dislike); ours shows the job's own states and no agent prose. Like/Dislike are omitted; Copy copies the prompt.
- The Progress panel's steps are fixed (Validate, Submit, Generate, Deliver) rather than the agent's plan.
- The result plays in the thread; the reference only surfaced it in Assets.
- Stop cancels the generation on the Spark; the reference's Stop only ended the agent's turn.
- The session id is in the path (`/task/:id`) so history can reopen it; the reference kept it in state.
- The footer reads "MiniMax Local generates on your Spark".

## Technical Notes

- The task page is a client component fed by a server component that reads the history entry (404 → not-found page). Polling lives in a hook guarded for StrictMode (decide-once refs; timers rescheduled on every effect run — [CLAUDE.md → §6b](../../CLAUDE.md#6b-e2e-test-conventions)).
- The history store is the "real local store" of the integration lane; the `app` compose service gains a named volume `app-data` at `/data`.
- Retry re-posts the stored request (JSON only; a job with reference images retries without them and says so — the files are not kept).

## Testing Plan

- **Unit** — `lib/history-store.test.ts` (temp dir): create/list/get/patch/delete, newest-first order, atomic write leaves no temp file, title rule; `lib/todo-steps.test.ts`: job state → the four steps' ticks and the active one; `components/task/TaskPage.test.tsx` (jsdom + RTL inside `<StrictMode>` with fake timers): a queued job polls and re-renders on each response; a terminal response stops the timers; Stop calls the cancel route and renders "Cancelled at N %"; a done entry renders the video with the result src and poster and does not poll.
- **Integration** — `test/integration/history.test.ts`: the history routes against a temp `HISTORY_FILE`; `POST /api/jobs` writes the entry before responding (assert the file after the 202); `PATCH` updates and `openedAt`.
- **E2E** — `e2e/task.spec.ts` (desktop + narrow), each with `waitForTerminalStatus` registered **before** Send: (1) text prompt with `done-after-3-polls` → the indicator shows "Generating…", the Progress panel ticks Generate, then `expectPlayable(video, "/api/jobs/<id>/result")` and the Download link points at the result; (2) `cancel-midway` → click Stop, the cancelled status response arrives, "Cancelled at" is shown and the stub's `openJobs()` is empty; (3) `fails-after-2-polls` → "Request failed" with Retry; `moderated` → the refusal text; (4) reopen: after (1), navigate to `/`, click the Recents entry, the video is playable again without a new job; (5) download: `page.waitForEvent("download")` on the link yields a file whose size equals the fixture's; (6) image-to-video: upload `fixture-reference.png`, Send, `received(id).uploads[0].sha256` equals the fixture's. Regression: `composer.spec.ts`, `shell.spec.ts`, `smoke.spec.ts`.

## Estimated Complexity

L

## Done note (2026-09-12)

- **History store** `lib/history-store.ts`: JSON file at `HISTORY_FILE` (`/data/history.json` in the `app` container on the new `app-data` volume; a temp file for `app-dev`, the gate and each e2e run), atomic writes, read on every call, `titleFor` (48 characters at a word boundary), `recordStatus` (progress never backwards, `finishedAt` on the first terminal status). Routes `GET /api/history`, `GET/PATCH/DELETE /api/history/:id` (PATCH accepts only `openedAt` and `title`). **The jobs routes write history themselves:** `POST /api/jobs` creates the entry after the server's 202 and before answering the browser; `GET /api/jobs/:id` records every status; `DELETE` records `cancelled` — so no client-side PATCH of job state exists and a reopened page reads the last known state from the server component.
- **Task page** `app/task/[id]` (server: entry or 404) + `components/task/TaskPage.tsx`: the user bubble (`@video-creator` + prompt + the reference count), the indicator per state (`lib/todo-steps.ts` `indicatorFor`), the Progress panel with the four fixed steps and a progress bar (`stepsFor`), the result card (`<video controls playsinline>` with the result and poster routes, duration · size · resolution, **Download** with a filename from the title, **Copy prompt**, the time), the failure rows (Request failed + Retry, moderated without Retry, unreachable, Cancelled at N %), and the docked composer (`Composer variant="docked"`: no chips, video mode from the start, no tag; Send becomes **Stop generation** while the job is queued or running). Polling uses STORY_009's `pollUntilTerminal` inside an effect whose AbortController and timers are torn down on cleanup, so a StrictMode remount starts a clean poll; `openedAt` is marked once through a ref. Stop → `DELETE` → the page shows cancelled from the 202 on and stops polling. Retry re-posts the stored JSON request. The Shell now fetches `/api/history` on every navigation for Recents. Narrow: the Progress panel moves below the thread (CSS grid order), controls ≥ 44 px.
- **Tests:** unit — `history-store.test.ts` 3, `todo-steps.test.ts` 3, `TaskPage.test.tsx` 3 under `<StrictMode>` with fake timers (poll at 1 / 2 / 5 s with the indicator updating, no polls after done, one `openedAt` PATCH; Stop → DELETE → "Cancelled at 41 %" and no polls; a done entry renders the video with poster, download name and summary and never polls; failed offers Retry, moderated does not); integration — `test/integration/history.test.ts` 4 (entry written before the 202 with the title rule; a rejected create writes nothing; status/result/finishedAt and cancelled recorded through the jobs routes, newest-first order; PATCH/DELETE/404s); e2e — `task.spec.ts` 6 in both projects (text prompt to a playable, downloadable result with all four steps ticked; Stop with the DELETE response and no open job; failed with Retry and moderated without; reopen from Recents with no new job; Download yields the fixture's bytes; image-to-video with the upload received). **Gate green: 34 e2e in 60 s.**
- **Spec lessons:** a cancel's terminal state arrives in the DELETE response, not a status poll, so its wait targets the DELETE; locators for the result card are scoped because a Recents title can contain the same word.
- **Deviation from the AC wording:** the AC said the page PATCHes every status into history; the jobs routes record it server-side instead (fewer moving parts, and history is correct even when no page is open). The observable behaviour the AC wanted (a reopened page shows the last known state instantly) is what the e2e reopen case proves.
