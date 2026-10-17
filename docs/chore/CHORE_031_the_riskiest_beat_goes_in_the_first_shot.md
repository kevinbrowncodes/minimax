# CHORE_031 — The riskiest beat goes in the first shot

**Status:** Done (owner's request, 2026-10-17)
**Created:** 2026-10-17

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` gains a general fail-fast rule: each scene's riskiest beat (the back glimpse, travel, anything untested) goes in the scene's first shot, so a take can be judged and cancelled after ten seconds instead of thirty. A final-check item 20 enforces it. Build 2026-10-17-1300 → 2026-10-17-1330.

## Why

CHORE_030 did this for the back scene's glimpse; the owner asked for it as a general rule (2026-10-17). A take cancelled after shot 1 costs about a third of a full take on the Spark; the findings ledger now tracks GPU minutes per shippable to measure it.

## Changes

- [x] "Fail fast" paragraph before *The front scene*.
- [x] Final check item 20.
- [x] Build stamp 2026-10-17-1330.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
