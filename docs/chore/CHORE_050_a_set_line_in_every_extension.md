# CHORE_050 — A set line in every extension

**Status:** Done (owner's decision, 2026-10-22)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-22-0800): shots 2 and 3 of a scene carry one sentence that fixes the camera and the set it looks at ("The camera stays where it was, at chest height on the deck, looking across the lit pool to the buildings and palm trees behind him"). A narrow exception to CHORE_048's man-only anchors; garments and accessories stay unnamed.

## Why

The pool round (2026-10-21/22): with man-only anchors, an extension's only place-word was "the lit pool", and H3 redrew the frame as a camera looking down over the water at the 10 s join in 4 of 6 scene 1 takes (2 more in scene 2); rewording the eyes away from the water did not stop it. The owner reviewed the outtakes ("those camera changes are not acceptable") and chose the set line.

## Changes

- [x] The exception and its evidence in the skill's anchor rule and the final check.

## Testing

- **Unit / integration / e2e:** not applicable — a skill. The pool round's next takes are the measurement. The pre-push hook still runs the full gate.
