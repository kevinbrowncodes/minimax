# BUG_015 — A redraw carries the other scene's picture

**Status:** Resolved (2026-10-31)
**Found by:** the assistant director, red round overnight (2026-10-30/31)

## Summary

When `rotate.sh` resumes a take queued by `retry.sh` (CHORE_063), it never rewrites `image.txt`, so the redrawn shot carries whichever keyframe the previous take used as its reference picture (CHORE_066). Alternating scenes means a scene 1 redraw often rides with scene 2's nude keyframe and a scene 2 redraw with scene 1's. Since CHORE_068, a scene 2 redraw after a scene 1 take also loses scene 1's arms-up picture, because every scene 1 take deletes `image2.txt`.

## Steps to Reproduce

1. Run a round with both scenes alternating (`s2-aligned.flag`).
2. A scene 2 take fails shot 2; queue a redraw with `retry.sh B <seed> 2 "<why>"`.
3. Let the next scene 1 take start and finish; `rotate.sh` then resumes the scene 2 redraw.
4. Read `run.log`: `B seed <seed>: reference picture <round>/scene-1.png in shots 2-3`.

## Expected vs Actual Behaviour

| | Expected | Actual (red, 2026-10-31) |
|---|---|---|
| Scene 1 redraw after a scene 2 take | `scene-1.png` | `scene-2.png` (K 837910628 shot 2, 02:12 UTC) |
| Scene 2 redraw after a scene 1 take | `scene-2.png` (+ the arms picture when the round has one) | `scene-1.png` (B 542834327 shots 2 and 3, 07:23 and 10:06 UTC) |

One of those wrong-picture shots 3 drew no penis on the final turn; redrawn with the right picture, it drew correctly.

## Root Cause

`tools/rounds/template/rotate.sh` writes `image.txt` (and, for scene 2, `image2.txt`) only on the path that starts a new take. The retry branch added by CHORE_063 calls `chain.sh` directly and `continue`s, and `chain.sh` reads whatever `image.txt` holds.

## Acceptance Criteria

- [x] The retry branch writes the redrawn scene's own keyframe to `image.txt` before calling `chain.sh`: scene 2 uploads `scene-2.png`, scene 1 uses scene 1's.
- [x] A scene 2 redraw rewrites `image2.txt` from `keyframes/scene-2-arms.png` when the round has one; a scene 1 redraw removes it.
- [x] A dry run of the real `rotate.sh` (stubbed upload and `chain.sh`) shows a scene 2 redraw after a scene 1 take receiving `scene-2.png` and the arms picture, and a scene 1 redraw after a scene 2 take receiving `scene-1.png` and no arms picture.

## Testing

- **Unit / integration / e2e:** not applicable; round tooling outside the app (as CHORE_063). Verified by the dry run above in a scratch tree, plus `bash -n`. The red round's copy carried the same fix from 06:08 ET on 2026-10-31, and its next scene 2 redraw logged `scene-2.png`. The pre-push hook still runs the full gate.

## Resolution

Fixed in `tools/rounds/template/rotate.sh` (2026-10-31): the retry branch sets the pictures for its own scene before resuming. Rounds already set up keep their old copy; re-copy `rotate.sh` (cp to a temp name, then mv) between takes.
