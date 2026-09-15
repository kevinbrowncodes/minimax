# EPIC_007 — A queue of generations

**Status:** Open (2026-09-15) — the owner, as EPIC_006 closed: "I want schedules at least my implementation to occur so I can submit multiple jobs one after another"; on the drafted first story: "Approve, but add timed runs"
**Started:** 2026-09-15
**Owner's meaning of "Scheduled":** a line of generations that run one after another on the Spark without anyone watching, with the option to hold one back until a chosen time — not the reference's timed agent tasks.

## Goal

The owner should be able to line up an evening's clips — several prompts, some with reference images, some extensions — press Send on each, and find them finished in the morning: queued in the order they were sent (or the order he moved them into), run one at a time as the Spark allows, each reaching Recents, Assets and the Inbox exactly as a job sent by hand does today. A **Scheduled** page shows the line as a whole; Send never answers "the Spark is busy"; a job can carry a "run at" time so it waits for the hour he picks.

## What exists today (read from the code, 2026-09-15 — not from memory)

- **The adapter** (`spark/adapter/src/server.ts`) accepts up to **five open jobs** (`maxOpenJobs`, default 5) and submits each to ComfyUI at once; a sixth `POST /jobs` is refused with 503 `busy` ("the Spark already has 5 jobs open; try again later"). Cancel removes a queued prompt from ComfyUI's queue or interrupts the running one.
- **ComfyUI** runs prompts one at a time in submission order (its own queue); the adapter follows each over the websocket and `/history`.
- **The UI** already lets a second prompt be sent while one runs (the home composer; the task page's docked composer shows Stop generation instead); each new job appears in Recents as Queued then Generating; the sixth prompt shows the adapter's message in the composer. Nothing shows the line as a whole, its order cannot be changed, a queued job can only be cancelled, and nothing waits for a chosen time.
- **The Inbox** (STORY_033) already turns every finished, failed or cancelled job into an event; **projects** (STORY_031) and **skills** (STORY_040) already shape the request before it is sent.

So the epic is not "make jobs run in order" — ComfyUI does that — but: a line longer than the adapter's five, visible and orderable, with a time on a job when wanted, and a Send that always accepts.

## The reference and ours

The reference's **Scheduled** page (`/scheduled`, captured 2026-09-14: `page-scheduled@1440` / `-dark`, `narrow-page-scheduled@390` / `-dark`; `docs/recon/2026-09-14/inventory.md` § Scheduled) is the agent's timed tasks — a prompt it runs at a time or on a repeat, whose results land in a thread under a "Schedules" pill (the in-thread card: Run now · View details). STORY_026 removed it on the owner's decision because that meaning needs the agent chat we do not have. This epic brings the row and the page back with **the reference's chrome** — the "Schedules" heading, the "Search scheduled tasks" field with its status filter, Create top-right, the empty state "No scheduled tasks yet." — and **our rows**: Running · Waiting (in order) · Not before … · Done today · Failed. Every departure is written in the story under Departures from the reference.

## Time

| | |
| --- | --- |
| **Estimate to completion** (the approved stories only — 041) | ≈ 2 h 20 min of wall-clock: ≈ 95 min to build, test and land STORY_041 (it is Large: a queue store and runner, the jobs route's busy path, the task page's waiting state, the Scheduled page and sidebar row, Edit through the composer — added by the owner at 12:58, ≈ 20 min —, the stub's busy hook, tests at every layer and a two-width e2e), then ≈ 40 min for the manual verification on the Spark (two real 5 s generations queued back to back, ≈ 17 min each per the README's measured table, with ComfyUI already up) |
| **Basis** | today's measured pace, from the commit log: EPIC_006's ten stories landed between 08:54 and 12:30 EDT on 2026-09-15 — ≈ 22 min each including both gates, ≈ 35 min for its one Large story (031); STORY_041 is counted at twice that plus the verification wait |
| **Estimated completion** | ~~2026-09-15, ≈ 15:20 EDT~~ (the first session's estimate; it stopped at 13:06). **Second session, set 2026-09-15 13:27 EDT: ≈ 15:40 EDT** (a 15:20–16:10 window) — ≈ 60 min for stage two (the sidebar row, the Scheduled page, the composer's Edit / Run at / queued toast, `?queue=`, each with its tests, and two gate runs of ≈ 6 min), ≈ 30 min for stage three's e2e and its gate, ≈ 40 min for the manual verification (two real 5 s generations queued back to back, ≈ 17 min each per the README's measured table, ComfyUI already up), the Done note written while they run. Rows 042–044 carry no estimate until they are drafted and approved |
| **Actual completion** | **2026-09-15 14:29 EDT** (the second generation of the manual verification finished; the docs landed minutes after) — against the second session's ≈ 15:40 estimate, ≈ 70 min early: stage two took 13:27–13:52 (the estimate said ≈ 60 min), the e2e ≈ 10 min, the two real generations 13:52–14:29 (as estimated). The first session stopped at 13:06 at the owner's request with stage one done. **STORY_042** (picked and drafted 14:40, approved 14:44) landed at **15:28 EDT** against ≈ 15:20 |

## Stories (in implementation order)

| # | Story | Status | Estimate | Started | Estimated done | Actual done |
| --- | --- | --- | --- | --- | --- | --- |
| 041 | [Scheduled is the queue of generations that run one after another](../story/STORY_041_scheduled_is_the_queue_of_generations_that_run_one_after_another.md) — from [BACKLOG_008](../backlog/BACKLOG_008_scheduled_generations_run_one_after_another.md): the app's own queue behind the adapter's five (`/data/queue.json`), a Send that queues instead of failing, the page (Running / Waiting with move up · down · Remove / Done today), a "run at" time per waiting job and Edit of a waiting job through the composer (the owner's additions), the runner that submits the next due request whenever the app is polled | **Done (2026-09-15)** | ≈ 95 min + ≈ 40 min verification (stage one took 12:57–13:21; stages two and three re-estimated at 13:27: ≈ 90 min + ≈ 40 min) | 2026-09-15 12:57 EDT (stage one); 13:27 EDT (stages two–three) | 2026-09-15 ≈ 15:40 EDT | **2026-09-15 14:29 EDT** |
| 042 | [The queue runs with no browser open](../story/STORY_042_the_queue_runs_with_no_browser_open.md) — STORY_041's runner is driven by the app's own polls, so a timed job set for 02:00 goes on the first poll after 02:00 while a page is open. This story gives the app's server a ticker of its own (`register()` in `instrumentation.ts`, every 30 s, `QUEUE_TICK_MS`), so the line advances with every browser closed. Picked by the assistant on the owner's "Do what you think is best" (2026-09-15 14:40 EDT): the smallest row, and the one that completes the owner's own scenario | **Done (2026-09-15)** | ≈ 30 min + ≈ 5 min verification | 2026-09-15 14:44 EDT | 2026-09-15 ≈ 15:20 EDT | **2026-09-15 15:28 EDT** (the gate's two runs of ≈ 6 min each made the difference) |
| 043 | A queued job may start ComfyUI when its turn comes — **Withdrawn (owner, 2026-09-15 15:45 EDT, on the assistant's recommended closing path):** starting the model means first freeing ≈ 70 GiB by stopping the owner's other containers by name, which the Spark's rules reserve to the owner each time; the app container would need the Docker socket; and the line already waits for a down model and goes when it is up (verified in STORY_041/042). What remains of the idea is [CHORE_011](../chore/CHORE_011_the_scheduled_page_says_when_the_sparks_model_is_not_running.md): the page says the model is not running and what to run | Withdrawn | — | — | — | — |
| 044 | **Redefined (owner, 2026-09-15 15:45 EDT) as "A queued extension waits for its source"** — the chain from the page rather than a script file: a Running or Waiting row on Scheduled gets *Queue an extension* → the composer in extend mode against that entry → Send queues it with `continueFrom` = the entry's id; the runner treats it as not due until its source is done, then submits it with the source's real job id. The owner's three-clip chain becomes three Sends and an empty evening. A script-file import stays a later candidate if still wanted. Drafted as STORY_043 | Draft pending the owner's approval | ≈ 90 min + ≈ 45 min verification | — | — | — |

Rows 042–044 are candidates written down so they are not lost; each becomes a story only when the owner says so, in this order unless he reorders them (CLAUDE.md § 6 rule 3).

## Rules that apply on the Spark

- **One generation at a time.** The queue never asks the adapter for more than its limit; extensions keep `maxSourceSeconds` and the memory split the README records (64–97 GiB per job); the runner submits, it never reconfigures.
- **The runner does not start or stop ComfyUI**, nor any other container (the README's rule: never stop, restart or remove what is not ours; ComfyUI is started by the owner per session). Since STORY_042 it runs from the app server's own 30 s ticker as well as from the polled routes. A timed job whose time comes while ComfyUI is down is submitted and answered 503 by the adapter — it stays Waiting, and goes when the model is up (043 is where that changes, if it does).
- **The queue is data in the app's volume** (`/data/queue.json`, the images under `uploads/`, STORY_032's directory), never on the Spark's output disk; it survives a container restart and is gitignored like the rest of app data.
- **A job that ran from the queue is an ordinary job** afterwards: the same history entry (its id unchanged), the same task page, Recents, Assets, Inbox and download rules (STORY_034's watermark included).

## Not in this epic

- **Repeats** ("every day at 02:00") and anything cron-like — the reference's meaning, tied to its agent; a later epic if ever.
- **The agent's timed tasks in a thread** (the "Schedules" pill, the in-thread card) — no agent thread here (STORY_036–038 deferred).
- **Notifications off the box** (a phone, an e-mail) — STORY_039 was withdrawn; the Inbox is where a finished queued job appears.
- **Priorities or parallel runs** — ComfyUI runs one prompt at a time and the Spark's memory allows no more; the line is an order, not a scheduler.

## Testing stance

The gate stays model-free (CLAUDE.md § 4a): the stub generation server gains a `busy` hook (`POST /__stub/busy { busy }`) so a spec can make it refuse creates as the adapter would, fill the line, and release it; every queue path — the waiting entry, the runner, reorder, remove, the timed hold and its release — is proven against the stub at both widths. The real thing is a **manual verification** recorded in STORY_041's Done note: two prompts queued on the Spark with ComfyUI up, the second waiting for the first, both finished, with the date, the model and the times (the README's measured table gains a row).

## Remaining work (2026-09-15 15:45 EDT — the owner approved the closing path: "Approve the path")

1. ~~Withdraw 043~~ — done above. 2. **CHORE_011** (the model-not-running notice) — in progress. 3. **STORY_043** (a queued extension waits for its source; the redefined 044) — to draft, approve, build, verify with a real 5 s clip and a +4 s extension queued together. 4. Close the epic: Done, the final actual, BACKLOG_008 archived. Estimated close ≈ 18:30 EDT. One item at a time.

## Working rules carried over

One story at a time, landed and deployed before the next; the story is the spec and its chrome cites the 2026-09-14 capture; explicit paths staged, never a blanket add; the pre-push hook is the gate; every claim about the Spark is verified that session (`/health`, the compose file, the code), never recalled.
