# CHORE_034 — A variety review against the last three films

**Status:** Done (owner's request, 2026-10-18)
**Created:** 2026-10-18

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` gains a process step: before the shot list is final, compare the new film's beats with the last three films' beat sheets, flag repeated poses, hand moves, move order and closing poses, rework them, and output the comparison as `variety-review.md`. The safeguards (squat glimpse, pull-back, frame and garment rules) are kept on purpose. Final check item 21. Build 2026-10-18-1830 → 2026-10-18-1845.

## Why

The night, vines and rome back scenes all ran the same arc (turn, squat, brace and grab, hip flick, turn back) with only the prop changed. The owner does not want members to feel they are watching the same video with a different man; he chose a review step over a fixed no-repeat rule (2026-10-18).

## Changes

- [x] New section "The variety review: compare with the last three films" before *Output*.
- [x] Final check item 21.
- [x] Build stamp 2026-10-18-1845.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
