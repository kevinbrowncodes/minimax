# CHORE_055 — Calm face

**Status:** Done (owner's decision, 2026-10-24)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-24-1540): the two existing face rules gain their evidence and a positive wording.
- **"Name the eyes in every phase"** now carries the hunk evidence for keeping the lens until the final second.
- **"Never write the face as a state"** now prescribes "his face calm, mouth closed" while he works. At the lens, the most allowed is "the corner of his mouth lifts slightly, lips closed".

## Why

My hunk scene 1 scripts broke both rules: eyes on the lens through every phase, plus "faint smirk" and "slow smile". All 4 takes drew a toothy grin into the lens, and the owner called it "creepy and not OnlyFans heat quality". He rewrote shot 1 calm, I carried it into shots 2–3, and Take 5 was "a lot better than Take 4".

## Changes

- [x] Evidence added to the eyes rule.
- [x] Positive wording added to the face rule; build bumped.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The hunk round's calm-face takes are the measurement (`test/FINDINGS.md`). The pre-push hook still runs the full gate.
