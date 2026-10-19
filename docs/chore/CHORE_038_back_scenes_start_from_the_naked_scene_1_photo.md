# CHORE_038 — Back scenes start from the naked scene 1 photo

**Status:** Done (owner's note, 2026-10-19)
**Created:** 2026-10-19

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: CHORE_037 told me to ask for a turned-away back keyframe. The owner's scene 2 keyframe is almost always scene 1's photo with him naked (front-facing, same crop), so the back scene now works from that the way the night film did: a turn in place with no camera move, and two paces away from the camera before the squat when it needs room. No camera moves still; the join check stays as the safety net. Build 2026-10-19-1730 → 2026-10-19-1800.

## Why

Owner, 2026-10-19: "for scene 2 … it almost always will be just the same image from scene 1 just the subject naked". The night film used exactly that keyframe with a turn in place and no camera move; its 10 s joins all held (0.82–0.94, 12 of 12).

## Changes

- [x] "Every shot ends at the framing it started at": the naked-scene-1 keyframe as the norm, the night-film method.
- [x] The back scene: the turn in place restored, no step back, no camera move; the join check named as the catch.
- [x] Build stamp 2026-10-19-1800.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
