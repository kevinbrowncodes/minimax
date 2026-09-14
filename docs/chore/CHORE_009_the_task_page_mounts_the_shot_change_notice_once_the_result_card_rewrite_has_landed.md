# CHORE_009 — The task page mounts the shot-change notice once the result-card rewrite has landed

**Status:** Open (2026-09-14)
**Created:** 2026-09-14, from STORY_020

## Summary

STORY_020 ships the shot-change notice as its own component, [CutNotice.tsx](../../app/components/task/CutNotice.tsx) (`data-testid="cut-notice"`, `role="status"`, the sentence from `app/lib/shot-change.ts`, a Retry button), unit-tested, but **not mounted**: the task page (`app/components/task/TaskPage.tsx`) is being rewritten for STORY_023 (the reference's result card) in another session, in the same working tree, and touching it here would sweep that work into this story's commit or break it. This chore mounts the notice in the result bubble after STORY_023 lands and adds the e2e scenario the story's Testing Plan already spells out.

## Why

One component, one owner at a time. The owner sees the shot changes tonight in the adapter's log and the job's `result.cuts`; the notice is the UI's half, and it is one mount plus one e2e once the page is stable.

## Changes

- [ ] `TaskPage.tsx`: `<CutNotice cuts={job.result.cuts} onRetry={retry} busy={busy === "retry"} />` above the player in the done result; the existing `retry()` already re-posts the request without a seed (an extension keeps `continueFrom` and the overlap).
- [ ] `TaskPage.test.tsx`: the notice appears for a done entry with `cuts`, not for `[]` or an entry without the field; its Retry posts without `seed` and navigates to the new task.
- [ ] `e2e/task.spec.ts`: stub script `done-with-cut` → the notice reads "The shot changed at 00:11" → Retry → the POST has no `seed` → the new task page → its terminal status awaited.
- [ ] Flip STORY_020's two UI acceptance boxes.

## Testing

- **Unit** (`TaskPage.test.tsx`), **e2e** (`task.spec.ts`) as above; **integration: not applicable** (no route changes — `result.cuts` is relayed as part of the result already).
