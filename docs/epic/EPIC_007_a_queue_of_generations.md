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

## Stories (in implementation order)

| # | Story | Status |
| --- | --- | --- |
| 041 | [Scheduled is the queue of generations that run one after another](../story/STORY_041_scheduled_is_the_queue_of_generations_that_run_one_after_another.md) — from [BACKLOG_008](../backlog/BACKLOG_008_scheduled_generations_run_one_after_another.md): the app's own queue behind the adapter's five (`/data/queue.json`), a Send that queues instead of failing, the page (Running / Waiting with move up · down · Remove / Done today), a "run at" time per waiting job (the owner's addition), the runner that submits the next due request whenever the app is polled | Approved (2026-09-15, with timed runs) |
| 042 | The queue runs with no browser open — *not drafted; the owner decides.* STORY_041's runner is driven by the app's own polls (the sidebar's, the task page's), so a timed job set for 02:00 goes on the first poll after 02:00 while a page is open. This story would give the app container a ticker of its own (a `setInterval` in the server, or a `spark/` script like ComfyUI's `run.sh`), so the line advances with every browser closed | Not drafted |
| 043 | A queued job may start ComfyUI when its turn comes — *not drafted; a new rule for the Spark, the owner's call.* Today ComfyUI is started by hand per session (`spark/comfyui/run.sh`) because a generation needs most of the box's memory and the owner's other containers are stopped by name first. A queue that runs overnight only helps if the model is up; this story would let the runner start ComfyUI (and stop it after the line empties) under the same memory rules, written down in the README's memory split | Not drafted |
| 044 | A line of prompts from a script file — *not drafted.* The owner's own three-script chain (`docs/scripts/`, STORY_020) is the shape: one file, several prompts, each an extension of the last, queued in one go with the overlap and the reference image carried between them | Not drafted |

Rows 042–044 are candidates written down so they are not lost; each becomes a story only when the owner says so, in this order unless he reorders them (CLAUDE.md § 6 rule 3).

## Rules that apply on the Spark

- **One generation at a time.** The queue never asks the adapter for more than its limit; extensions keep `maxSourceSeconds` and the memory split the README records (64–97 GiB per job); the runner submits, it never reconfigures.
- **STORY_041's runner does not start or stop ComfyUI**, nor any other container (the README's rule: never stop, restart or remove what is not ours; ComfyUI is started by the owner per session). A timed job whose time comes while ComfyUI is down is submitted and answered 503 by the adapter — it stays Waiting with the reason shown, and goes when the model is up (043 is where that changes, if it does).
- **The queue is data in the app's volume** (`/data/queue.json`, the images under `uploads/`, STORY_032's directory), never on the Spark's output disk; it survives a container restart and is gitignored like the rest of app data.
- **A job that ran from the queue is an ordinary job** afterwards: the same history entry (its id unchanged), the same task page, Recents, Assets, Inbox and download rules (STORY_034's watermark included).

## Not in this epic

- **Repeats** ("every day at 02:00") and anything cron-like — the reference's meaning, tied to its agent; a later epic if ever.
- **The agent's timed tasks in a thread** (the "Schedules" pill, the in-thread card) — no agent thread here (STORY_036–038 deferred).
- **Notifications off the box** (a phone, an e-mail) — STORY_039 was withdrawn; the Inbox is where a finished queued job appears.
- **Priorities or parallel runs** — ComfyUI runs one prompt at a time and the Spark's memory allows no more; the line is an order, not a scheduler.

## Testing stance

The gate stays model-free (CLAUDE.md § 4a): the stub generation server gains a `busy` hook (`POST /__stub/busy { busy }`) so a spec can make it refuse creates as the adapter would, fill the line, and release it; every queue path — the waiting entry, the runner, reorder, remove, the timed hold and its release — is proven against the stub at both widths. The real thing is a **manual verification** recorded in STORY_041's Done note: two prompts queued on the Spark with ComfyUI up, the second waiting for the first, both finished, with the date, the model and the times (the README's measured table gains a row).

## Working rules carried over

One story at a time, landed and deployed before the next; the story is the spec and its chrome cites the 2026-09-14 capture; explicit paths staged, never a blanket add; the pre-push hook is the gate; every claim about the Spark is verified that session (`/health`, the compose file, the code), never recalled.
