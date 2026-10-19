# CHORE_036 — Back keyframes are full body and the camera never moves

**Status:** Done (owner's decision, 2026-10-19)
**Created:** 2026-10-19

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: the back scene's keyframe must show his whole body with the floor, and no camera move (pull-back, tilt, zoom) is ever written to make room for the squat; a cropped back keyframe is sent back to the owner for a zoomed-out version first. Build 2026-10-18-1900 → 2026-10-19-1400.

## Why

Rome round, scene 2: a pull-back written into shot 1 on a mid-thigh keyframe made shot 2 snap back toward the keyframe's framing at the 10 s join in 6 of 6 takes; the owner rated 5 of 6 as jump cuts and none shipped. Wide-view anchor wording did not hold it (0 of 3). The owner chose full-body keyframes with a locked camera over pinning (2026-10-19).

## Changes

- [x] The back scene paragraph: full-body keyframe, no written camera move, the Qwen zoom-out ask.
- [x] Build stamp 2026-10-19-1400.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
