# CHORE_060 — Back scenes never show the hole

**Status:** Done (owner's decision, 2026-10-27)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-27-1945): the back scene's required glimpse is replaced by glute play that never shows the hole. Allowed: the squeeze, a slow grab, a flat-palm slap that jiggles, the hip flick, a hand pulling one cheek slightly open (never far enough to show it), a palm brushing something off them. Banned: a held spread, a wide pull, a squat or bend square to the lens, a released squeeze written to part them. The shot list's "Glimpse" column becomes "Hole shown" (always no). `.claude/skills/script-supervisor/SKILL.md`: the anatomy check treats any visible hole as a fault.

## Why

The owner (2026-10-27): MiniMax struggles to render it; no glimpse in any film until a better anatomy adapter comes out. Bed scene 2 had no glimpse and rated 5/5/3/5.

## Changes

- [x] The back-scene paragraph, the pose vocabulary, the fail-fast line, the shot-list column and final-check items 8 and 20 in the AMG skill; build bumped.
- [x] The anatomy row and the description in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; skills with no runtime code. The pre-push hook still runs the full gate.
