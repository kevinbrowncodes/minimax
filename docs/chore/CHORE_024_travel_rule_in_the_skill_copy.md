# CHORE_024 — Travel rule in the skill copy

**Status:** Done (approved 2026-10-14 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-14

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-13-1325 to Build 2026-10-14-1315, the owner's current build.

## Why

- Every rated round was rescanned on 2026-10-14 for takes the owner marked with a cut, jump or set change. Since unpinning, scripts that moved the subject somewhere new cut 7 of 15 takes; in-place scripts 1 of about 27. The narrow far-prop rule becomes a general one: travel only in a scene's first shot, only to a place the keyframe already shows, and write a move the keyframe makes likely on purpose.
- The step-in toward the lens and a single step into the final pinup are named as exceptions, so the subscriber close and the finish do not contradict the rule.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-14-1315, applied as the owner's edits to the 1325 copy and checked against his paste; to be diffed against the synced skill file once it syncs.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
