# CHORE_026 — Seated work and turn in place in the skill copy

**Status:** Done (approved 2026-10-15 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-15

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-15-0350 to Build 2026-10-15-1710, the owner's current build.

## Why

From the beach round's ratings (`test/26-10-16-0800-beach`, 14–15 Oct 2026):

- **Seated work is allowed.** The skill banned floor work on an untested assumption; seated moves drew cleanly in 7 of 7 takes (2 shipped). Kneeling, lying down and hands on the ground stay banned.
- **A front-facing back keyframe is acceptable with a turn in place.** No cut in 4 of 4 takes; a back-facing keyframe stays preferred.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-15-1710: the owner's two edits and stamp applied to the 0350 copy, checked against his paste; to be diffed against the synced file once 1710 syncs.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
