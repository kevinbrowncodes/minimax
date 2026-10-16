# CHORE_027 — Floor under his feet in the skill copy

**Status:** Done (approved 2026-10-16 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-16

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-15-1710 to Build 2026-10-16-1545, the owner's current build.

## Why

From the sun round's back scene (`test/26-10-17-0800-sun`, 16 Oct 2026):

- **Check what the keyframe puts under him before any move that lowers him.** The keyframe's lower legs overlapped the pool's tile band; the deep squat sank him into the water and the set redrew at the next join in 3 of 4 takes. The one take that stayed on the deck shipped (5).
- **The floor under his feet** becomes a keyframe requirement for any scene with a squat, a bend or a seat.
- The bullet "No knees on the ground, no floor" is retitled "No kneeling, nothing lying on the ground"; its body is unchanged.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-16-1545, copied from the synced file (synced 15:55 EDT, about ten minutes after the build stamp). The synced file has no `compatibility:` frontmatter line; the repo copy keeps it, so that line is the only difference from the synced file.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
