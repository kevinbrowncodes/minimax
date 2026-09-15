# BACKLOG_008 — Scheduled generations run one after another

**Status:** Promoted to [STORY_041](../story/STORY_041_scheduled_is_the_queue_of_generations_that_run_one_after_another.md) (2026-09-15, drafted for the owner's approval) · **Priority:** High — the owner: "I want schedules at least my implementation to occur so I can submit multiple jobs one after another"

## Summary

The reference's **Scheduled** page (`/scheduled`, captured 2026-09-14: heading "Schedules", "Search scheduled tasks" with a "Scheduled task status" filter, **Create** + "More create actions ▾", "No scheduled tasks yet."; in a thread, a scheduled-task card with **Run now** / **View details**) is the agent's *timed tasks* — a prompt the agent runs at a set time or on a repeat, tied to the chat — not a job queue. STORY_026 removed it (`/scheduled` answers 404). The owner's meaning is different and local: **a queue of generations that run one after another**.

## What exists today (read from the adapter's code, 2026-09-15)

The adapter accepts up to **5 open jobs** (`maxOpenJobs`, default 5; a 503 "busy" beyond) and submits each to ComfyUI at once; ComfyUI runs prompts one at a time in submission order. So five prompts can already be sent back to back from the home page and run sequentially (Queued → Generating in Recents); nothing shows the queue as a whole, its order cannot be changed, and the sixth prompt fails.

## Rough scope → STORY_041

The page back at `/scheduled` with the reference's chrome and our meaning: the queue in order (position, stamp, title, status), remove and move up / down, Run next; Send never fails as busy — beyond the adapter's limit the request waits in the app's own queue and is submitted when a slot frees; a job that ran from the queue reaches the Inbox as today.

## Dependencies

STORY_026 (what was removed), STORY_033 (the Inbox), the adapter's `maxOpenJobs`.
