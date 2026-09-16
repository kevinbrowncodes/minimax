# BUG_009 — A queued extension waits for its source only while a browser is watching it

**Status:** Open (2026-09-16)
**Found:** 2026-09-16 03:50 EDT, on the Spark, in the owner's overnight run (two 30 s chains queued up front through STORY_043; `test/26-09-18-2000_br/run-2026-09-15.md`)

## Summary

STORY_043 holds an extension in the line until its source is done, and STORY_042's ticker runs the runner every 30 s with no browser open. But the runner learns that a source is done **only from history**, and the only thing that writes a job's status into history is the task page's poll. With no browser on the source's task page, a waiting extension never goes. Overnight the GPU sat idle for 5 h 21 min (22:02 → 03:23 EDT) with a finished source and its extension "Waiting"; the extension went within 30 s of the owner opening the UI.

## Steps to reproduce

1. On the Spark with the model up, send a 10 s clip; on its task page choose Extend, +10 s, Send — Scheduled reads "Waiting · after <stamp>".
2. Close every browser tab. Watch `docker logs -t minimax-adapter`.
3. The source's `done` line appears (≈ 50 min). No `submitted` line follows for the extension — not after 30 s, not after an hour. GET `/api/queue` (from curl) still lists it as waiting.
4. Open the source's task page. Within 30 s the extension is submitted.

Observed 2026-09-15/16 three times in one run: chain 1's segment 2 went 42 min late (19:34 EDT after an 18:52 finish, when the owner opened the UI), segment 3 went 6 h 42 min late (03:23 after 20:40), chain 2's segment 2 went 5 h 45 min late (03:47 after 22:02). The Run-at path was unaffected: chain 2's first segment, held with `notBefore`, was submitted at 21:12:23 for 21:12:02.

## Expected vs actual behaviour

- **Expected:** the ticker submits a waiting extension within one tick of its source finishing, browser or no browser — that is what STORY_042 ("the queue runs with no browser open") and STORY_043 ("goes the moment its source is done") together promise, and what the README's Scheduled line says.
- **Actual:** it is submitted within one tick of the source's status being *polled*, which only a task page does.

## Root cause (read from the code, 2026-09-16)

- `app/lib/queue-runner.ts` › `submitDue` decides what is due with `sourceState(id)`, which reads `historyStore().get(id).status` and nothing else (lines 42–48, 69).
- The status in history is written by `historyStore().recordStatus`, whose only callers outside the runner are `GET /api/jobs/[id]` (the task page's poll) and `DELETE /api/jobs/[id]` (`app/app/api/jobs/[id]/route.ts` lines 26, 38, 45). Neither the ticker nor `GET /api/queue` nor `GET /api/history` asks the adapter anything.
- STORY_043's verification passed because its e2e and the real-chain check both had a page polling the source; its e2e cannot see this because a Playwright page is always polling.

## Acceptance criteria

- [ ] The runner refreshes the status of every source that a waiting extension depends on from the model server before deciding what is due — one `GET /jobs/:upstreamId` per pending source per tick, recorded into history through the same path the task page uses — so a source that finished is seen within one tick with no browser open.
- [ ] A source the model server no longer knows (404) is treated as gone, and the extension fails with "its source did not finish", as STORY_043 already specifies for a failed or cancelled source.
- [ ] Unit (`queue-runner.test.ts`): with a fake model server whose source job answers `done`, a waiting extension is submitted on the next `submitDue()` with no prior status poll; with the source still `running`, it is not; with 404, it is failed and leaves the line. The refresh is skipped for entries with no `continueFrom` and for sources already terminal in history (no request made).
- [ ] Integration (`api/queue` against the stub): a source submitted with `slow-done-after-10-polls`, an extension queued behind it, **no** `GET /api/jobs/:id` issued by the test; after the stub's job completes, the next `submitDue()` submits the extension; the stub records one create for it.
- [ ] E2E: `queue.spec.ts` gains a case that closes the page after queuing the extension (or never opens the task page), waits on the stub's create request for the extension instead of on a page poll, then reopens Scheduled and asserts the row is Running. The existing STORY_043 cases stay green.
- [ ] Manual verification on the Spark (not a gate): a 5 s clip and a +4 s extension queued together, every tab closed, `docker logs -t minimax-adapter` shows the extension submitted within 30 s of the clip's `done` line.
