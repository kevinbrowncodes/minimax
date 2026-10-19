# CHORE_037 — Every shot ends at the framing it started at

**Status:** Done (owner's decision, 2026-10-19)
**Created:** 2026-10-19

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: a new rule — no shot may change the framing (no written camera move, no beat that makes H3 reframe, such as a turn away from a front-facing keyframe); size changes only by the man walking toward or away from a locked camera, in a scene's first shot. Front-facing back keyframes are no longer used. The skill also records the round runner's join check (cancel below 0.45 picture similarity). Build 2026-10-19-1400 → 2026-10-19-1730.

## Why

The owner asked why nearly every rome back take had a jump cut. Measured across the 10 s join (SSIM of the joined videos): night back scenes with no framing change in shot 1 scored 0.82–0.94 (12 takes, smooth); vines with a written pull-back 0.69–0.85 (mild); rome with a pull-back or the model's own push-in on the turn 0.46–0.61 (8 of 8 jumped, whatever the script — a vines-structure A/B also jumped). The 20 s join, after a shot with no framing change, stayed smooth. On the per-segment measure the runner uses, every jump the owner called a cut scored 0.18–0.41 and every take he shipped 0.48 or more (47 takes).

## Changes

- [x] "Every shot ends at the framing it started at" paragraph, with the evidence and the join-check threshold.
- [x] The back scene no longer turns away from a front-facing keyframe; the owner is asked for a turned-away, full-body keyframe instead.
- [x] Build stamp 2026-10-19-1730.
- [x] Round runner (`test/<round>/chain.sh`, untracked): after each extension, measure the join and cancel the take below JOIN_MIN 0.45.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code and an untracked round script; nothing in the app or the tests reads them. The join measure was validated against 47 past takes and the owner's ratings (see Why). The pre-push hook still runs the full gate.
