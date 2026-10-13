# CHORE_020 — Refresh the AMG scene skill copy

**Status:** Done (approved 2026-10-13 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-13

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-10-1758 to Build 2026-10-13-1140, the owner's current build.

## Why

- The weekend rounds (hat front/back, spanish cowboy back; `test/26-10-12-1600-hat`, `test/26-10-12-1601-hat`, `test/26-10-11-1601-spanish-cowboy`) fed back four general rules, now in the skill with their counts: the frame rule (every beat's end shape, including the end size after a walk, fits the seed's frame — an arm overhead moved the camera 2/2, a walk-in on a tight seed cut the face 3/3, in place 9/9); no far-prop walks after clip 1 (3/6 set changes vs 0/40); the squat allowed and the kneel not; beat sheets for the director beside each prompt.
- The repo copy is the record of what the skill said when those findings landed.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-13-1140, verbatim.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it (`agents/skills/` is untouched). The pre-push hook still runs the full gate.
