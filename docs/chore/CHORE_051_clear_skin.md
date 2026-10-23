# CHORE_051 — Clear skin

**Status:** Done (owner's request, 2026-10-23)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-23-1900):
- The anchor always writes the skin as "flawless, clear, smooth <tone> skin".
- The keyframe section adds a clear-skin check: zoom the chest, abs, back and arms, and report any mark before the first take.

`.claude/skills/script-supervisor/SKILL.md`: a "Skin blemishes" row in the shot checks. Any new dark dot, mole or spot sends the take to Outtakes (NG), and the owner is told where and when.

## Why

The owner saw small dark dots on the chest (pool scene 1, 0:27) and the back (pool scene 2, 0:48). Neither pool keyframe has a dark mark, so H3 added them. He asked for the skill and the running scripts to prevent blemishes, for each one to be reported, and for those takes to go to Outtakes.

## Changes

- [x] Anchor skin wording and the keyframe check in the scene skill; build bumped.
- [x] The blemish check and its NG rule in the script-supervisor skill.
- [x] The rock round's six prompts carry the new wording (round files, untracked).

## Testing

- **Unit / integration / e2e:** not applicable; these are skills, with no runtime code. The rock round's takes are the measurement, tallied in `test/FINDINGS.md`. The pre-push hook still runs the full gate.
