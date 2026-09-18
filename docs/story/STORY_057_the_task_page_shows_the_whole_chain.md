# STORY_057 — The task page shows the whole chain

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — an eleventh story, after [STORY_056](STORY_056_retry_rechains_the_rest.md); the last remedy of [BACKLOG_011](../backlog/BACKLOG_011_retrying_one_segment_of_a_chain_rechains_the_rest.md) (the owner: "please complete backlog 11", 2026-09-18 12:40 EDT)
**Status:** Done (2026-09-18 13:30 EDT — built and gated while STORY_056's verification drew on the Spark; deployed once that chain had finished — never mid-job; approved 12:50 on the owner's "please complete backlog 11")
**Created:** 2026-09-18

As the owner, I want a chain segment's task page to list every segment of its chain with what became of each — waiting, running, done, cut at the join, cancelled — so that I see the state of the whole video in one place instead of opening each segment's page, and I know which segment to Retry chain from.

## Current state (read from the code, 2026-09-18 12:45 EDT)

- **A segment's page knows one link each way:** *Continues <the segment before>* (`TaskPage.tsx`, `entry.continuesFrom`) and, since STORY_056, `chainAfter` (the segments behind it, from the server page). Nothing lists the chain from its first segment.
- **What history holds per segment:** `status`, `result.frames`, `result.cuts` (each with a `frame` and a `kind`), `continuesFrom.id`, `title`, `jobId`. A **cut at the join** is a cut whose frame is the source's last frame + 1 — the first new frame (243 for a 243-frame source; last night's `7b2636b9`: `{ frame: 243, kind: "cut" }`). Other cuts are inside the segment.
- **STORY_056's Retry chain** re-queues behind a redraw and leaves the old segments in history cancelled or done; `chainAfter` leaves cancelled links out, so a chain can fork (the bad branch, the redraw's branch) and both are in history.
- **The Scheduled page** lists waiting rows with *Waiting · after <title>* and Running / Done today regions — per job, not per chain.

## UI Mockup

**Reference capture:** none — the reference has no chains. The strip is STORY_044's composer strip chrome (`chain` / `chainRows` in `composer.module.css`: the index, the length, the words) moved under the task page's user bubble, in the `continues` line's type (13 px secondary).

**Segment 2's page, the chain of three, one cut at its join, the third waiting:**

```
│ @video-creator  integrated_multimodal_description: [Shot 1] …                                 │
│ Continues In the first two seconds, the young man… · 10.1 s · carried its last 1.6 s          │
│ ┌ Chain · 3 segments ─────────────────────────────────────────────────────────────────────┐   │
│ │ 1  done                 In the first two seconds, the young man in the white…            │   │
│ │ 2  cut at the join      For the first moment the young man in the white dress…  ‹ this › │   │
│ │ 3  waiting · after 2    For the first moment the young man in the white dress…           │   │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘   │
```

Each row links to its segment's page (the current one is marked *this* and is not a link). The words are the segment's title. The outcome column reads: *waiting · after k* (queued, its source not done), *queued* (in the line for other reasons), *running · N %*, *done*, *cut at the join* (done with a cut at the first new frame), *cut inside* (done with another cut), *failed*, *cancelled*. **After a Retry chain** the redraw and its re-chained segments are the chain the page shows (the walk goes back to the first segment, then forward along the non-cancelled links — the redraw's branch); a cancelled old segment is not a row. A single clip (no links either way) shows no strip. **Narrow:** the rows stack the words under the outcome (STORY_044's narrow rule). **Both themes.**

## Acceptance Criteria

- [x] **`GET /api/history/:id/chain`** answers the whole chain the entry belongs to: back along `continuesFrom` to the first segment, then forward along `chainAfter` (cancelled links left out), as `{ segments: [{ id, title, status, progress, outcome, index }] }` in chain order, `outcome` one of `waiting`, `queued`, `running`, `done`, `cut-at-join`, `cut-inside`, `failed`, `cancelled` — `cut-at-join` when a done segment's `result.cuts` has a cut whose frame is its source's `result.frames` (± 1); `waiting` when it is queued in the app's line behind a source that is not done. A clip with no links answers one segment.
- [x] **The task page** renders the chain strip under the user bubble when the chain has two or more segments: the count, one row per segment with its index, outcome (the words above; running with its percentage) and title, the current segment marked *this*, the others links to their pages. The strip refreshes on every poll of the page's own job while any segment is not terminal, and once more when the page's job reaches its terminal state.
- [x] **A fork reads as one chain**: on the redraw's page after a Retry chain, the rows are the first segment, the redraw and the re-chained segments; the cancelled old ones are not rows (they stay in Recents).
- [x] **Both widths, both themes**; STORY_014/016/043/044/056's specs stay green.

## Departures from the reference

- Ours entirely; the reference has one job per page and no chains.

## Technical Notes

- `lib/history-store.ts`: `chainOf(id)` — walk `continuesFrom` back to the root (guarding against a loop), then `chainAfter(root)`; `outcomeOf(entry, source)` pure: the outcome from the entry's status, its cuts and the source's frames. Both in `lib/chain-outcome.ts` (pure) with the store supplying the entries.
- `app/api/history/[id]/chain/route.ts`: the walk plus the line's view (`getQueued(id)` for *waiting*).
- `components/task/ChainOutcomes.tsx`: the strip; `TaskPage.tsx` fetches `/api/history/:id/chain` on mount and after each poll response while the chain has a non-terminal segment (the page already polls; one extra GET per poll, none once everything is terminal).
- The stub needs nothing new: `done-with-cut`'s cut is at frame 270 of a 5 s clip (124 frames) — not the join; the integration case makes a join cut by extending a 124-frame source with a script whose cut lands at frame 124 — `done-with-cut-at-join` is added to the stub's scripts (`cuts: [{ frame: 124, seconds: 5.17, kind: "cut" }]`).

## Testing Plan

- **Unit (`pnpm test`)** — `chain-outcome.test.ts` (new): `outcomeOf` for every status; a cut at the source's frame count → `cut-at-join`, one frame off either way too; a cut elsewhere → `cut-inside`; queued with a pending source → `waiting`; `chainOf` on a three-link chain from each segment gives the same three; a fork after a Retry chain gives the redraw's branch; a loop does not hang. The stub's `scripts.test` gains the new script.
- **Component (`ChainOutcomes.test.tsx`, `TaskPage.test.tsx`)** — the rows' words and links, *this* on the current one, no strip for one segment; the page fetches the chain on mount and after a poll, and stops once all are terminal.
- **Integration (`test/integration/queue.test.ts`, extended)** — a three-segment chain: `GET /api/history/:id/chain` from segment 3 lists all three in order with `waiting` for the third while its source runs; after a Retry chain on segment 2 the chain from the redraw's page is 1 → redraw → the new 3, the old ones absent.
- **E2E (`e2e/scheduled.spec.ts`, STORY_056's case extended, both widths)** — on segment 2's page before the click the strip reads *3 segments*, row 2 *cut at the join*, row 3 *waiting · after 2*; after Retry chain, the redraw's page lists 1 → the redraw (*running* or *done*) → the new 3, and the old segment 3 is not a row.
- **Manual verification (the Spark):** the page of the redraw STORY_056's verification is drawing (`f4abcfc7`) once this is deployed — the three rows with their outcomes read against the adapter's statuses.

## Estimated Complexity

Medium — a pure walk and an outcome table, one route, one component, one stub script, the page's refresh: ≈ 1 h 30 min of build and gate; no GPU of its own.

## Corrections found while building (2026-09-18)

1. **The pure walk moved to `lib/chain-outcome.ts`** (`chainAfter` with it, re-exported from `history-store.ts` for STORY_056's callers): the task page's strip is a client component, and a client module that imports `history-store` drags `node:fs` into the browser bundle — Turbopack refused the build. `chain-outcome.ts` imports only the entry's type.
2. **The bad branch stays a row until it is cancelled.** After a Retry chain the old segment 2 (done, cut at its join) is still a non-cancelled link of segment 1, so the redraw's page lists 1 → the old 2 → the redraw → the new 3 (four rows; the old segment 3 is no row). The AC's "the first segment, the redraw and the re-chained segments" holds once the bad segment is cancelled or deleted; the e2e asserts the four rows and that the cancelled one is absent. A done draw is never hidden by the app (STORY_055's Departure).
3. **The stub's `done-with-cut-at-join` cuts at frame 56** — the 2.0 s fixture's length on the grid (`lengthForSeconds(2.0)`), so an extension of the fixture reads *cut at the join*; segment 1 of the same chain reads *cut inside* (no source, no join). The story guessed 124 from the 5 s duration; the fixture is what the stub measures.
4. **The refresh is a promise chain, not an async effect**: React's set-state-in-effect rule refused `await` + `setChain` inside the mount effect; `readChain` returns the rows and the two callers set state in `.then`. The read stops (a ref) once every segment is terminal; the terminal poll reads once more.
5. **A queued first segment in the app's line reads *waiting*** (no *after*): the route asks the line, and `outcomeLabel` drops the *after k* when there is no segment before.

## Done note (2026-09-18)

**Built** (12:50 → 13:30 EDT): `lib/chain-outcome.ts` (`chainAfter`, `chainRoot`, `chainOf`, `outcomeOf`, `chainView`, `outcomeLabel`), `GET /api/history/:id/chain` (the walk plus the line's view), `components/task/ChainOutcomes.tsx` + its CSS (the composer strip's chrome in the Continues line's type; the amber of `chainWarn` on a cut or a failure; the rows stack at 390), `TaskPage.tsx` (the read on mount and after each poll until every segment is terminal), the stub's `done-with-cut-at-join` (+ its server test and the e2e union). Unit: `chain-outcome.test` 5 (every outcome; the join ± 1; a framing event is not a cut; the chain from any segment; a fork; a loop; the labels). Component: `ChainOutcomes.test` 2, `TaskPage.test` +2 (the reads: mount, each poll, the terminal one, then none; no rows for a clip). Integration: `queue.test` (the chain from segment 3 with *waiting*; from the redraw after a Retry chain; 404). E2E: STORY_056's case extended at both widths (segment 2's page: three rows — *cut inside*, *cut at the join · this*, the third on its way — and the links; the redraw's page: four rows without the cancelled one). **Gate** 6/6 by hand; **deployed** after STORY_056's verification finished on the Spark. **Manual verification:** the redraw's page (`f4abcfc7`) read against the adapter — the addendum below.

**Addendum — verified on the Spark (2026-09-18 15:04 EDT, the deploy after STORY_056's verification finished):** `GET /api/history/7b2636b9…/chain` on the live app answers the whole family of last night's chain 2, in chain order across its branches: 1 `eb90ccb2` *done* · 2 `7b2636b9` **cut at the join** · 3 `c09bc6fa` *cut inside* (its own join held; the cut it carries is segment 2's) · 4 `801f78a1` *done* (the hand retry of the night) · 5 `50c1f40d` *done* · 6 `f4abcfc7` *cut inside* (the Retry-chain redraw — its cut at 243 is judged against `eb90ccb2`'s 243 frames… see the correction below) · 7 `ffb3ffcd` **cut at the join** (its cut at 498 = its source's frames). **One correction the live data shows:** row 6 should read *cut at the join* — the redraw `f4abcfc7` continues `eb90ccb2` (243 frames) and cut at frame 243, but `chainView` judges each row against the row *before it in the list* (`chain[i - 1]`, here the unrelated `50c1f40d`), not against its own source. The rows are right for a linear chain and wrong for a fork; the fix is to judge each segment against `continuesFrom` — filed as BUG_012 and fixed with it. The page renders the seven rows with the current one marked *this*, and refreshes them as the page polls.
