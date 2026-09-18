# BUG_012 — A forked chain's row is judged against the wrong source

**Status:** Resolved (2026-09-18 15:15 EDT; see Resolution)
**Found by:** reading the live `GET /api/history/7b2636b9…/chain` after STORY_057's deploy — the Retry-chain redraw `f4abcfc7` (a cut at frame 243, continuing `eb90ccb2` of 243 frames) read *cut inside* instead of *cut at the join*

## Summary

`lib/chain-outcome.ts › chainView` judges each segment's outcome against `chain[i - 1]` — the row before it in the flattened list — and `outcomeOf` reads the join frame from that entry's `result.frames`. In a linear chain the row before is the source. After a Retry chain (STORY_056) the chain forks — the old branch and the redraw's branch both continue from segment 1 — and the redraw's row sits after the old branch's last segment in the list, so its cut at 243 is compared with a 753-frame clip and called *cut inside*; its own segment 3, whose source is the redraw (498 frames), happens to be right.

## Steps to Reproduce

1. A chain 1 → 2 → 3; Retry chain on 2 → the redraw 2′ and 3′; 2′ cuts at its join.
2. `GET /api/history/2′/chain`: 2′ reads `cut-inside`; expected `cut-at-join`.

## Expected vs Actual Behaviour

- **Expected:** every segment is judged against the entry it continues from (`continuesFrom.id`), whatever its place in the list.
- **Actual:** against the previous row; wrong for the first segment of every branch after a fork.

## Root Cause

`chainView` passes `chain[i - 1]` to `outcomeOf`; the source was assumed to be the previous row.

## Acceptance Criteria

- [x] `chainView` looks the source up by `continuesFrom.id` in the chain (falling back to none); the unit test's fork case asserts the redraw's *cut-at-join*.
- [x] `outcomeLabel`'s *waiting · after k* names the source's index the same way.

## Resolution

Fixed 2026-09-18 in `lib/chain-outcome.ts` (a map of the chain's entries by id; `outcomeOf(entry, byId.get(entry.continuesFrom.id))`; the waiting label from the source's index); `chain-outcome.test.ts`'s fork case gained the redraw's cut and its label. Gate green; deployed with the next restart (never mid-job — the Spark is on STORY_060).
