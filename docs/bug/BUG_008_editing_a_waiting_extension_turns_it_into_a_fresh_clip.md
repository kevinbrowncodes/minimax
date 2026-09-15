# BUG_008 — Editing a waiting extension turns it into a fresh clip

**Status:** Open (2026-09-15)
**Found:** 2026-09-15 17:50 EDT, reading the Edit path while drafting STORY_044 (CLAUDE.md § 3.8 — before writing an AC that relies on Edit of a chain's segment)

## Summary

STORY_041's Edit reopens a waiting request in the composer from `GET /api/queue/:id` and replaces the entry on Send (`replaces`). STORY_043 then let a waiting entry be an **extension** (`continueFrom` + `overlapFrames` in `entry.request`). The Edit path predates that: `app/page.tsx` builds the composer's `InitialRequest` from the entry's prompt, parameters, project, run-at and images — **not** its `continueFrom` or `overlapFrames` — so the composer reopens the extension as a plain video request; Send posts `replaces` without a source; `replaced()` in `app/api/jobs/route.ts` rewrites the entry from those fields (`queuedRequest(fields)`), and the history patch leaves `continuesFrom` as it was. The entry is now a fresh clip that history still describes as a continuation.

## Steps to reproduce

1. Send a 5 s prompt (the stub: `slow-done-after-10-polls`); on its task page choose Extend, +4 s, Send — "Queued — 1st in line" (STORY_043); Scheduled reads "Waiting · after <stamp>".
2. On that Waiting row click **Edit**; the composer opens with the prompt and "+4s" is not shown — it is in plain video mode, no continuation tile.
3. Change a word, Send.
4. Scheduled: the row no longer reads "after <stamp>"; when the source finishes, the runner submits the entry as a fresh 4 s text-to-video clip (`upstreamFields` has no `continueFrom`), and the task page's card still says it continues the source (`continuesFrom` untouched).

## Expected vs actual

- **Expected:** Edit of a waiting extension opens the composer in extend mode against the same source (the pending tile, the same +N s and overlap), Send keeps it an extension of that source, and the row keeps "Waiting · after <stamp>".
- **Actual:** the extension silently becomes a fresh clip; history and the queue disagree about it.

## Root cause

`InitialRequest` (`lib/composer-state.ts`) has no `continueFrom` / `overlapFrames`, and `app/page.tsx` does not pass them; the composer's Edit initialiser therefore never dispatches `extend-from`. Nothing on the server side refuses the change: `replaced()` accepts a body with or without a source. Two stories that each were right on their own; the seam between them was never read.

## Acceptance Criteria

- [ ] `InitialRequest` carries `continueFrom` and `overlapFrames` when the entry has them; `app/page.tsx` passes them; the composer opens in extend mode against that source — a pending `ExtendSource` built as STORY_043 builds it for a task page (`pendingSourceSeconds`, the tile's "not finished yet" sentence) or the finished source's real length when it is done.
- [ ] Send's `replaces` body carries `continueFrom` and `overlapFrames`; `replaced()` keeps the entry an extension and keeps history's `continuesFrom` in step (the title, the source id); the Scheduled row still reads "Waiting · after <stamp>" after the Edit.
- [ ] A waiting extension whose Edit deliberately removes the source (the tile's ×, which today's extend mode already offers) becomes a fresh clip **and** history's `continuesFrom` is cleared with it — no half state either way.
- [ ] Tests: `Composer.test` (the Edit initialiser enters extend mode from an `initialRequest` with a source; the posted `replaces` body carries `continueFrom` / `overlapFrames`); `test/integration/queue.test` (Edit of a queued extension keeps its source in the entry and in history; Edit that drops it clears both); `scheduled.spec`'s existing Edit case gains the extension variant at desktop only (the narrow Edit path is the same component).

## Fix

A small fix (≈ 20 min + the gate), to land **before** STORY_044 so that Edit on a chain's segment is safe; no story needed — the code is a field carried through three places that already exist.
