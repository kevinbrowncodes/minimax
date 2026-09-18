# STORY_056 — Retry re-chains the rest

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — a tenth story, after [STORY_055](STORY_055_draws_per_prompt.md); promoted from [BACKLOG_011](../backlog/BACKLOG_011_retrying_one_segment_of_a_chain_rechains_the_rest.md) (the owner chose its first remedy on 2026-09-18 morning); extends [STORY_020](STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md)'s Retry and [STORY_044](STORY_044_one_starting_frame_and_any_number_of_scripts_go_out_in_one_send.md)'s chain
**Status:** Done (2026-09-18 12:00 EDT — built, gated and deployed with no job on the box; approved 08:30 "ok then please proceed"; drafted 06:15 from the night's second chain, whose segment 2 cut at its join and cost three hand steps to recover)
**Created:** 2026-09-18

As the owner, I want Retry on a chain segment that cut at its join to redraw that segment **and** re-queue every segment behind it as extensions of the redraw, so that one click puts the chain back together and I never re-send a segment by hand.

## Current state (read from the code, 2026-09-18 06:00 EDT)

- **Retry** (`components/task/TaskPage.tsx` › `retry`, mounted by `CutNotice` under a flagged result and by the failed state): re-posts the entry's prompt and params with `continueFrom: entry.continuesFrom.id` when the entry is an extension — the same request, no seed — and opens the new job's page. Nothing looks at what continued from the entry.
- **A chain's later segments** are history entries with `continuesFrom: { id }` pointing at the segment before them (STORY_044 › `submitChain`; STORY_053's straight-through does the same). While their source runs they wait in the app's line (`lib/queue-store.ts` › `waiting`, `due(now, isSourceDone)`; STORY_043); once it is done the runner submits them. **Last night** (STORY_053 › Addendum 2): `7b2636b9` finished with `cuts: [{ frame: 243, kind: "cut" }]`; `c09bc6fa` was already an extension of it and ran on the cut draw; the Retry (`801f78a1`) hung loose until segment 3 was re-posted by hand as `continueFrom: 801f78a1` (Addendum 3). Two chains in history where one was meant.
- **What history knows:** every entry keeps its `prompt`, `params` (incl. `overlapFrames`) and `continuesFrom`, so the segments behind a job can be found by walking `continuesFrom` backwards from every entry (`historyStore().list()`), and re-posted exactly.
- **Cancel** (`DELETE /api/jobs/:id`): a waiting request leaves the line; a submitted job is cancelled at the adapter and marked cancelled in history.
- **The stub** scripts `done-with-cut` (a cut at frame 270) and `done-with-cut-in-a-move`; the shot-change notice's e2e (`task.spec`, `extend.spec`) already drive Retry.

## UI Mockup

**Reference capture:** none — the reference has no chains and no Retry of this kind; the notice is STORY_020's strip (`cut-notice.module.css`), the wording STORY_046's.

**A chain segment's page after a cut at its join** — the strip names what Retry will do when segments follow:

```
│ ▲ The shot changed at 10.13 s — a cut, at the join with segment 1. Retry redraws this segment    │
│   and the 1 segment queued after it (segment 3) with new seeds.                     [Retry chain] │
```

A segment with nothing behind it (the last, or a single clip) keeps today's strip and **Retry**. After the click: the toast *Redrawing segment 2 and 1 after it*, the page of the redrawn segment; Scheduled lists the redraw running (or in line) and the later segments *Waiting · after* it, in order. The old draws stay in history as they are (the owner may delete them).

## Acceptance Criteria

- [x] **`GET /api/history/:id` answers `chainAfter`**: the ids and titles of the entries that continue from this one, transitively, in chain order (`[]` for none). Computed from history's `continuesFrom` links; no new store.
- [x] **`POST /api/jobs/:id/retry-chain`**: re-posts this entry's request (as Retry does: the same prompt and params, `continueFrom` its source, no seed) → the new id; then, for each entry in `chainAfter` in order, re-posts its prompt and params as an extension of the id just answered (the first of them of the redraw), so they wait in the line as STORY_043 makes them; answers `{ id, rechained: [ids] }` with 202. A later segment that is **still waiting or running** is cancelled first (`DELETE` as today) — its old entry stays in history as cancelled; a later segment that is **done** is left as it is (a second chain in history — the Departure). A refusal mid-way stops the sequence and answers the ids so far with the refusal's message (STORY_044's rule).
- [x] **The task page**: when the flagged entry has a non-empty `chainAfter`, the strip's Retry reads **Retry chain** with the sentence *Retry redraws this segment and the N segment(s) queued after it with new seeds*; the click calls the route, toasts *Redrawing segment k and N after it*, and opens the redraw's page. With an empty `chainAfter`, nothing changes.
- [x] **Scheduled** shows the re-chained segments waiting after the redraw, in order, and they go one by one as the redraw and each next one finish (STORY_043's line, unchanged).
- [x] **Both widths, both themes**; STORY_020/043/044/046/053's specs stay green.

## Departures from the reference

- The reference has no chains; this is ours. A done later segment is left in history rather than deleted: deleting the owner's clips is never automatic (STORY_055's Departure on draws says the same).

## Technical Notes

- `lib/history-store.ts`: `chainAfter(id)` — walk `list()` for entries whose `continuesFrom.id` is `id`, then theirs, in creation order; pure over the list.
- `app/api/history/[id]/route.ts`: add `chainAfter` to the GET body (titles for the strip's sentence).
- `app/api/jobs/[id]/retry-chain/route.ts`: the sequence above, reusing the jobs route's `POST` internals (`queuedRequest`, the source-pending check) — post through the same function the composer's requests go through, never a second path.
- `TaskPage.tsx` / `CutNotice.tsx`: the `chainAfter` count changes the button's label and the strip's sentence; `retryChain()` beside `retry()`.
- The stub needs nothing new: `done-with-cut` on segment 2 of a three-segment chain (`?script=done-with-cut` on the page URL applies to every job it posts).

## Testing Plan

- **Unit (`pnpm test`)** — `history-store.test.ts`: `chainAfter` on a three-link chain (the second's after is the third; the third's is empty; a fork — two entries continuing the same source — lists both in creation order).
- **Component (`TaskPage.test.tsx`, `CutNotice.test.tsx`)** — a flagged result with `chainAfter: [one]` shows *Retry chain* and the sentence with *1 segment*; the click POSTs to `/api/jobs/:id/retry-chain` and pushes the redraw's page; with `chainAfter: []` the button reads *Retry* and POSTs `/api/jobs` as today.
- **Integration (`test/integration/jobs.test.ts`, extended)** — a three-segment chain posted against the stub; `retry-chain` on segment 2: the 202 with `rechained` of length 1, the new segment 3 waiting in the line with `continuesFrom` the redraw, the old segment 3 cancelled when it was waiting, left when done; a refusal on the re-post answers the ids so far.
- **E2E (`e2e/scheduled.spec.ts`, extended, both widths)** — (12) *Retry chain*: a three-script chain sent with `?script=done-with-cut` → segment 2's page shows the cut notice with *Retry chain … 1 segment* → click → the toast → the redraw's page → Scheduled: the redraw running, the new segment 3 *Waiting · after* it, the old segment 3 cancelled → both terminals waited on → the stub's received requests: the redraw `continueFrom` segment 1, the new segment 3 `continueFrom` the redraw. Regression cover: `task.spec`'s Retry cases, `scheduled.spec`'s STORY_044 case.
- **Manual verification (the Spark, in the Done note):** the next chain that cuts — Retry chain on the cut segment, the line re-attached, the seams measured as STORY_053 did. Not staged: one cut in six joins last night.

## Estimated Complexity

Medium — a pure walk over history, one route reusing the jobs route's internals, a label and a sentence, one integration and one e2e case: ≈ 1 h 30 min of build and gate; the GPU only when a chain next cuts.

## Corrections found while building (2026-09-18)

1. **A fresh clip's redraw keeps its reference images.** Today's Retry re-posts JSON and drops a fresh clip's images (the button says so: *Retry (without the reference images)*); the AC said "as Retry does". The route does better: a segment with no source is re-posted as multipart with its reference files read back from `uploads/<id>/` (a file that is gone is skipped, as its tile would be). The plain Retry button is unchanged.
2. **`chainAfter` leaves cancelled links out.** After a Retry chain the old later segments are cancelled; had the walk kept them, a second Retry chain on the same segment would re-queue them twice. A fork (two entries continuing the same source — the bad branch and the redraw) lists both branches, oldest first; the integration case cancels the bad branch before retrying segment 1, which is what the owner would do.
3. **The failed state's Retry re-chains too.** The AC named the cut notice; a failed segment with segments behind it has the same problem, so its button reads *Retry chain (N after it)* and calls the same route. The moderated case keeps no button, as before.
4. **The DELETE route's body moved to `lib/cancel-job.ts`** so the retry-chain route cancels through the same code (a route module may export only its handlers, so the route could not be imported for that).
5. **The e2e's `?script=` is forwarded by the task page** for the redraw and the re-chain, as the composer forwards it — the page URL `/task/<id>?script=done-after-1-poll` makes the new jobs finish in one poll while the original chain used `done-with-cut`.
6. **The response on a refusal mid-way is a 202 with `refused: { segment, message }`** beside the ids so far (the redraw is real and running); the page's toast names it. Not reachable through the stub (nothing it refuses depends on the order), so it is covered by the route's shape, not a test — said so.
7. **The e2e case lives in `scheduled.spec`** as planned; it runs in 6.5 s because the stub's scripts poll fast — no `test.slow()` arithmetic needed beyond the one call.

## Done note (2026-09-18)

**Built** (08:35 → 11:55 EDT): `lib/history-store.ts › chainAfter` (pure over the list; the store's method), `lib/cancel-job.ts` (shared by DELETE and the new route), `GET /api/history/:id` › `chainAfter` with ids, titles and statuses, `POST /api/jobs/:id/retry-chain` (the cancels, the redraw through the jobs route's own POST, the re-chain in order, the refusal shape), `TaskPage.tsx` (`chainAfter` from the server page; `retryChain`; the failed state's label), `CutNotice.tsx` (`rechains`: the sentence and *Retry chain*), `app/task/[id]/page.tsx`. Unit: `history-store.test` +1 (the walk: order, the last link, a fork, cancelled left out; the store's method). Component: `CutNotice.test` +1, `TaskPage.test` +1 (the strip's sentence, *Retry chain* → the route → the redraw's page; the failed state's button). Integration: `queue.test` +1 (segment 3 waiting on a slow segment 2; `chainAfter` on segments 1 and 2; Retry chain on 2 → the old 3 cancelled, the redraw an extension of 1 at the stub with the overlap, the new 3 waiting on the redraw and going once it is done; a done later segment left when segment 1 is retried). E2E `scheduled.spec` +1 at both widths (a three-script chain with `done-with-cut`; segment 2's notice with the sentence; *Retry chain* → the toast *Redrawing this segment and 1 after it* → the redraw's page; the old 3 cancelled, the new 3 continuing from the redraw, both done, the stub's received requests continuing from the right ids; nothing waiting). README: a row and the status; the epic's tenth row. **Gate** 6/6 by hand (e2e 141); **deployed** with no job on the box. **Manual verification:** the next chain that cuts — none staged; the night's cut (`7b2636b9`) was recovered by hand before this story existed (STORY_053 › Addendum 3), which is the sequence this route now runs.
