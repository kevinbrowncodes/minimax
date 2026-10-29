# CHORE_064 — Watch for body drift

**Status:** Done (owner's decision, 2026-10-29)

## Summary

`.claude/skills/script-supervisor/SKILL.md` gets a "Body drift" row (named by the owner as the twin of face drift). At the start, each join, every turn that shows a new side, and the end, I crop the chest, abs, back, arms and face at full resolution and compare them with the scene's keyframe. Anything on his body the keyframe doesn't have is a fault: hair that grows in, a new mole, dot or beauty mark, a new tattoo, scar or vein pattern, a change of skin tone. A clear case is retried or cancelled, and I tell the owner where and when.

## Why

The owner (2026-10-29): "be on the lookout for stuff like body hair showing up when it [wasn't] in the starting frame, or new beauty marks that pop out of nowhere." Hunk back Take 4 grew a full hairy chest on the turn back, and the redraw did too. Straw scene 2 got moles on his back in 4 of 4 shot 2s.

## Changes

- [x] The Body continuity row in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; a skill with no runtime code. The pre-push hook still runs the full gate.
