# STORY_043 — A queued extension waits for its source

**Epic:** [EPIC_007](../epic/EPIC_007_a_queue_of_generations.md) — the third story; the redefined candidate 044 (owner, 2026-09-15: "Approve the path")
**Status:** Done (2026-09-15 17:38 EDT) — approved 16:41 EDT (the owner: "Approve as drafted")
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

- [x] **The rule:** a queued request whose `continueFrom` names a history entry that is not `done` is **not due** (skipped by the runner, never blocking the rows behind it); it becomes due the moment the source is done (the next tick or poll), and is submitted with the source's real job id (BUG_007). If the source ends `failed` or `cancelled`, the extension is failed in history with the reason "its source did not finish" and leaves the line; the Inbox gets the event as for any failure.
- [x] **Send queues it:** `POST /api/jobs` with a `continueFrom` whose entry is not `done` goes to the queue (like a run-at), never to the adapter, answered 202 with its position; the composer toasts "Queued — Nth in line" and opens the new task page ("Waiting — Nth in line"). A `continueFrom` that names no history entry is a 400 as today.
- [x] **Extend mode on a pending source:** the task page of a queued or running clip offers **Extend** (the card's More ▾ / the `?extend` URL) with an `ExtendSource` whose `durationSeconds` is the clip's *requested* length (a fresh clip's `params.durationSeconds`; an extension's source length + its added seconds, as `joinedSeconds` computes it) and whose tile says the clip is not finished yet; the +N s limits and the overlap use that length; the adapter's own check at submit time stays the final word.
- [x] **The row action:** a Running or Waiting row on Scheduled has **Queue an extension** → `/task/<id>?extend`; a waiting extension row reads "Waiting · after <the source's stamp>" (`GET /api/queue` entries carry `continueFrom: { id, title, createdAt }`); moving it above its source is allowed and harmless (the rule holds it).
- [x] Both widths, both themes; the STORY_041 e2e stays green.

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

## Done (2026-09-15)

**Landed** (`c83d187`, deployed 17:05 EDT): `lib/queue-store.ts` › `due(now, isSourceDone)` holds an entry whose `continueFrom` names a source that is not done and never lets it block the rows behind it; `lib/queue-runner.ts` › `sourceState(id)` ("done" / "pending" / "gone") — before the due loop every waiting extension whose source failed, was cancelled or is forgotten is failed in history with `source_failed` "its source did not finish" and leaves the line; the due ones go with the source's real job id (`upstreamJobId`, BUG_007). `POST /api/jobs` › `pendingSource(fields)` sends an extension of a queued or running entry to the queue (202 with its position; the queued entry records `continuesFrom { id, title, durationSeconds? }`); an unknown source stays a 400. `GET /api/queue` entries carry `continueFrom { id, title, createdAt }` and the row reads "Waiting · after <stamp>" (`waitingLabel`). `lib/extend.ts` › `pendingSourceSeconds(entry, lookup)` — a fresh clip's requested seconds, an extension's joined length resolved down the chain, a measured result winning; `TaskPage` offers Extend (More ▾ and `?extend`) while queued or running with an `ExtendSource.pending` whose tile reads "Continues · X s (not finished yet — the extension waits for it)", and a **⤴ Queue an extension** button beside the progress indicator; the Scheduled page's Running and Waiting rows link **Queue an extension** → `/task/<id>?extend`. Both widths, both themes.

**Tests:** `queue-store.test` (`due` with the source pending / done / absent), `queue-runner.test` (skipped while the source runs, submitted once done with the mapped id; failed with the reason when the source is gone), `extend.test` (`pendingSourceSeconds`: fresh, extension, a chain, the result winning), `queue-view.test` (the "after" word), `TaskPage.test` (Extend on a queued entry, the pending tile's sentence, Send posts `continueFrom`, Queue an extension), `ScheduledPage.test` (the links, the word), `test/integration/queue.test` (an extension of a running stub job queued with a position and nothing sent to the stub; submitted with the stub's id once the source is done; failed with the reason after the source is cancelled; an unknown source 400), `e2e/scheduled.spec` "an extension queued against a clip still running waits for it, then goes and finishes" at desktop and narrow (`slow-done-after-10-polls`; the row "Waiting · after …" while the source runs; both terminal statuses waited on; the extension's task page shows the continuation). Gate: the pre-push hook ran all six steps green in 411 s (integration 30; e2e 103 passed / 9 skipped), after a hand run of the same.

**Manual verification (the Spark, 2026-09-15 16:59 → 17:38 EDT, MiniMax-H3 FL2VA `int8_convrot` through the adapter 1.4.0, ComfyUI v0.35.1 up, the peer session `minimax-db` told before and after; the app container on `c83d187`).** At 16:59:06 a 5 s text-to-video prompt ("A red kite rises over a windy beach at golden hour…") went through `POST /api/jobs` → 202 and straight to the adapter (`openJobs 1`; its id is therefore the adapter's own, `a942e628…`). At 16:59:11 a +4 s extension of it at overlap 39 went through the same route → **202 queued, position 1, nothing sent to the adapter**; the Scheduled page (screenshot `app/test-results/verify043-scheduled@1440.png`, gitignored) showed the source under Running at 5 % and the extension under Waiting as "Waiting · after 26-09-15-1659" with its Queue an extension and Edit / Remove. The source finished at **17:16:25** (17 min 19 s; 124 frames = 5.167 s; `cuts: []`); `/data/queue.json` shows the extension's `submittedAt 21:16:25.272Z` — **the same second**, submitted by the runner on the poll that recorded the source done, and given the adapter's job id `a77f22dc…` (`HistoryEntry.jobId`; our id unchanged). The extension finished at **17:37:58** (21 min 33 s; **226 frames = 9.417 s**, the arithmetic's 124 + 141 − 39; `cuts: []`, the in-graph seam measure over the joined frames found no shot change); the adapter's `openJobs` went back to 0. First Send to the whole video: 38 min 52 s, no hand on the keyboard between. **The seam** (frame 124 of the joined file): `spark/comfyui/seam-check.sh` measured 3.10 at the seam against 3.00 for the footage's largest change anywhere else (an RGB shift of about −1), ratio **1.03** — a hair over the script's 1.0 limit, on a shot so still (a kite drifting, a sun on the sea) that its own largest motion is a fifth of the studio chains' 4.2–6.1; the border rule in the graph reported no shot change (`cuts: []`), and the four frames around the seam, viewed side by side (`app/test-results/verify043-seam@124.png`, gitignored), show the kite, the post, the head and the sun continuous with no jump. Recorded as it measured. What this run did **not** exercise: the source went to the adapter at once, so the `upstreamJobId` mapping (a source that itself waited in the line) is proven by the integration test with the busy stub, not by this chain.
