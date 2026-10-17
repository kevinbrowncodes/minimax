# CHORE_030 — The glimpse goes in the back scene's first shot

**Status:** Done (owner's request, 2026-10-17)
**Created:** 2026-10-17

## Summary

In `.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (owned here since CHORE_029), the back scene's glimpse beat moves to the scene's first shot and only there; shots 2 and 3 carry the other glute work and nothing whose point is a glimpse or a reveal. Build 2026-10-17-0530 → 2026-10-17-1300.

## Why

The owner wants to judge a back take after its first ten-second shot and cancel early when the glimpse does not draw, instead of waiting for all three shots (about 80 minutes a take on the Spark). The night round's back scene had the glimpse in shot 3 and drew it 0 of 8.

## Changes

- [x] The back scene paragraph: the glimpse goes in shot N.1 only; shots 2 and 3 have no spread, deep squat, bend or step that opens the glutes.
- [x] Final check item 8 and the shot list's Glimpse column follow it (yes on the first back shot, no elsewhere).
- [x] Build stamp 2026-10-17-1300.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
