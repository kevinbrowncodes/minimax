# STORY_043 — A queued extension waits for its source

**Epic:** [EPIC_007](../epic/EPIC_007_a_queue_of_generations.md) — the third story; the redefined candidate 044 (owner, 2026-09-15: "Approve the path")
**Status:** Approved (2026-09-15 16:41 EDT — the owner: "Approve as drafted")
**Created:** 2026-09-15

As the owner, I want to queue an extension of a clip that has not finished yet — from its Running or Waiting row, or from its task page — so that a chain of clips (a 10 s start, then +10 s, then +10 s) is three Sends in a row and an empty evening, each extension going the moment the one before it is done.

## Current state (read from the code, 2026-09-15)

Extend exists only on a **finished** task page: `TaskPage` builds `extendSource` when `job.status === "done" && job.result` (the source's measured `durationSeconds` feeds the +N s limits and the overlap arithmetic), and the docked composer's Send posts `continueFrom` = the source's history id. The adapter refuses a `continueFrom` that names an unfinished job ("continueFrom names no finished job on this server"), so today a chain is sent one step at a time, by hand, after each finish (the owner's three-clip chain took 3 h 5 min of watching, STORY_020). Since STORY_041 the queue can hold a request and the runner submits it when due; since BUG_007 a source that went through the queue is named by the adapter's own id at submit time. What is missing: a rule that an extension is not due until its source is done, a way to open extend mode on an unfinished source, and the row action.

## UI Mockup

**Reference:** none — the reference has no queue. Ours, drawn like STORY_041's rows.

```
Scheduled › Running
●  26-09-15-1901  Paper boat on rain puddle        Generating 41 %     [Queue an extension] [Stop]
Scheduled › Waiting
1  26-09-15-1902  Paper boat on rain puddle +10 s  Waiting · after 26-09-15-1901   [↑] [↓] [Run at…] [Edit] [Remove]
                  (an extension row names its source; it is skipped while the source runs and never blocks the rows behind it)

The task page of a running or waiting clip: the More ▾ / Extend entry is offered (today only when done) → the docked composer in extend mode
against the pending clip — the continuation tile shows the clip's stamp and title and "not finished yet — the extension waits for it";
+N s and Overlap as today, the source's length taken from its request (5 s) rather than a measured result → Send:
"Queued — 2nd in line, after 26-09-15-1901" → the new task page reads "Waiting — 2nd in line"
```

## Acceptance Criteria

- [ ] **The rule:** a queued request whose `continueFrom` names a history entry that is not `done` is **not due** (skipped by the runner, never blocking the rows behind it); it becomes due the moment the source is done (the next tick or poll), and is submitted with the source's real job id (BUG_007). If the source ends `failed` or `cancelled`, the extension is failed in history with the reason "its source did not finish" and leaves the line; the Inbox gets the event as for any failure.
- [ ] **Send queues it:** `POST /api/jobs` with a `continueFrom` whose entry is not `done` goes to the queue (like a run-at), never to the adapter, answered 202 with its position; the composer toasts "Queued — Nth in line" and opens the new task page ("Waiting — Nth in line"). A `continueFrom` that names no history entry is a 400 as today.
- [ ] **Extend mode on a pending source:** the task page of a queued or running clip offers **Extend** (the card's More ▾ / the `?extend` URL) with an `ExtendSource` whose `durationSeconds` is the clip's *requested* length (a fresh clip's `params.durationSeconds`; an extension's source length + its added seconds, as `joinedSeconds` computes it) and whose tile says the clip is not finished yet; the +N s limits and the overlap use that length; the adapter's own check at submit time stays the final word.
- [ ] **The row action:** a Running or Waiting row on Scheduled has **Queue an extension** → `/task/<id>?extend`; a waiting extension row reads "Waiting · after <the source's stamp>" (`GET /api/queue` entries carry `continueFrom: { id, title, createdAt }`); moving it above its source is allowed and harmless (the rule holds it).
- [ ] Both widths, both themes; the STORY_041 e2e stays green.

## Departures from the reference

- None new: the reference has no queue; the chain is ours (EPIC_007's goal).

## Technical Notes

- `lib/queue-store.ts` › `due(now, isSourceDone)`: an entry with `continueFrom` is due only when its source is done (the runner passes a lookup over the history store); `lib/queue-runner.ts` › `submitDue`: before the due loop, every waiting entry whose source is `failed` / `cancelled` is failed with "its source did not finish" and removed (a `sourceState(id)` helper: `"done" | "pending" | "gone"`).
- `app/api/jobs/route.ts`: `continueFrom` on an entry that exists but is not done → `queued()` (the 400 for an unknown source stays, checked before).
- `app/api/queue/route.ts`: `continueFrom` on the entries (the source's id, title, createdAt) — `lib/queue-view.ts` › the row's status word "Waiting · after <stamp>".
- `components/task/TaskPage.tsx`: `extendSource` for a not-done entry from its request (`pendingExtendSource(entry)` in `lib/extend.ts`, the joined length for a source that is itself an extension); `extendOnOpen` no longer requires done; the More ▾ menu offers Extend while queued / running; the composer's continuation tile takes a `pending` flag and the sentence.
- `components/pages/ScheduledPage.tsx`: the **Queue an extension** link on Running and Waiting rows.
- The stub: nothing new — a queued extension behind a busy stub, freed, is submitted after its source finishes (the stub's `continueFrom` check requires done, as the adapter's).

## Testing Plan

- **Unit** — `queue-store.test` (`due` with a source pending / done / absent), `queue-runner.test` (an extension skipped while its source runs and submitted once done with the mapped id; failed with the reason when the source fails), `extend.test` (`pendingExtendSource`: a fresh clip's length, an extension's joined length), `queue-view.test` (the "after <stamp>" word).
- **Integration** — `queue.test.ts`: a job running on the stub (`slow-done-after-10-polls`), an extension of it posted → 202 queued with a position (the stub received nothing); the source polled to done → the next list poll submits the extension with the stub's id as `continueFrom`; a second extension of a source that is then cancelled → failed with the reason and out of the line; an unknown source → 400.
- **Component** — `TaskPage.test` (Extend offered on a queued entry; the tile's "not finished yet" sentence; Send posts `continueFrom`), `ScheduledPage.test` (the Queue an extension links; the "after" word).
- **E2E** — `scheduled.spec.ts` gains a case: a `slow-done-after-10-polls` clip → its task page's Extend → +4 s → Send → "Queued — 1st in line" → on Scheduled the row reads "Waiting · after …" while the source runs → the source finishes (terminal waited on) → the extension goes and finishes (terminal waited on) → its task page shows the continuation; at 390 too.
- **Manual verification (the Spark, in the Done note with the date):** a 5 s text-to-video clip and a +4 s extension of it queued together within a minute; the extension waits ("after …"), goes once the clip is done, finishes; the times, the joined length and whether the seam held (the STORY_020 measure) recorded; the README's measured table gains the row.

## Estimated Complexity

Medium — a due rule, a pending extend source, one row action, tests at every layer, one e2e case and a real chain on the Spark (≈ 90 min + ≈ 45 min of GPU).
