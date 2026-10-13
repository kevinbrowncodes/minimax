# CHORE_022 — Shot list first and intentions in the skill copy

**Status:** Done (approved 2026-10-13 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-13

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-13-1250 to Build 2026-10-13-1325, the owner's current build.

## Why

- The owner asked whether the skill writes the prompts first or plans the scene first. It wrote the prompt first and derived the blocking from it, the reverse of a film set, where the shot list and blocking come before the shooting script. Build 1325 writes the **shot list first** as the plan every prompt is written to; the blocking stays a rewrite of its prompt so it can never promise a beat the model was not sent.
- Asked whether our beats match film-world blocking: the marks, crosses, business, eyelines and end mark did; the **intention** (an actable objective per beat) and the **shot size** did not. Each blocking window now opens with "To <what he does it for>:" and the header carries the size on the standard ladder. The six sheets in `test/26-10-16-1600-waterfall/scenes/` were rewritten the same way as the worked example.
- One word generalised from the last review: the back scene's keyframe rule now covers every back scene, not only scene 2.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-13-1325, applied as the five requested edits to the 1250 copy and checked against the owner's paste; diffed against the synced skill file once it syncs.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it (`agents/skills/` is untouched). The pre-push hook still runs the full gate.
