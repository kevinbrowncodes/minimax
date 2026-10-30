# CHORE_067 — Check the final turn

**Status:** Done (owner's decision, 2026-10-30)

## Summary

`.claude/skills/script-supervisor/SKILL.md` gets a "Penis on the final turn" row. On every scene 2 take that ends facing the lens, I crop the groin at full resolution at 2 fps from the turn back to the end and say on the card whether the anatomy drew correctly. Missing or malformed is flagged before the owner rates, and caps my score at 2.

## Why

With the keyframe riding in shots 2–3 (CHORE_066), the turn back now draws the penis. Before, the ending had none and the owner cropped it out in the edit. Hunk seed 926611381, same scripts: none in 5 of 5 frames without the picture, correct in 5 of 5 with it (`test/FINDINGS.md`, 2026-10-30). The owner: "going forward make sure to check penis anatomy since now we support it."

## Changes

- [x] The "Penis on the final turn" row in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; a skill with no runtime code. The pre-push hook still runs the full gate.
