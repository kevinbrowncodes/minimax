# CHORE_065 — The skill names the picture

**Status:** Proposed (2026-10-29 12:10 EDT) — written after STORY_081's result, from its data
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` writes shots 2 and 3 of a scene with no picture reference ("shots 2 and 3 drop `in <Picture 1>`", line 203; final check 2, line 229) and an anchor that describes the man "by appearance only (build, hair, face, skin)" (line 204). Once every shot carries the keyframe as a reference (EPIC_014), shots 2 and 3 name the picture the way STORY_081's winning row did, and the anchor stops describing what the picture now carries.

## Why

The hunk Take 4 drift came from an anchor word about his chest that the keyframe contradicted, and the corrected word did not fix it — the picture is what holds him. Words that describe the body's surface (hair, marks, skin) are then a second, weaker source that can only disagree with the picture. The skill should stop writing them and point at the picture instead.

## Changes

- [ ] **The format section** (lines ~192–203): shots 2 and 3 carry the picture reference the winning row used — row 1's clause (*the man in `<Picture 1>` — his face, hair, beard, skin and the whole of his body exactly as pictured — the set and the lighting stay as they are*) or row 2's header block — copied from STORY_081's Done note, not reworded.
- [ ] **The ANCHOR rule** (line ~204): the man is described by build and face shape only; **hair on the body, skin marks and skin texture are not written** — the picture carries them. The "flawless, clear, smooth <tone> skin" sentence (owner, 23 Oct) stays only if STORY_081's rows show the picture does not prevent the dark dots on its own; the Done note says.
- [ ] **Final check 2** (line ~229) and the scene rule (line ~58) say the new form.
- [ ] **No new body words.** The chore removes words; it adds none (the owner's rule: no anatomy wording of the assistant's).
- [ ] **Build stamp** bumped from `2026-10-29-1100`; the shot list carries it.
- [ ] One round's prompts regenerated with the new skill and diffed against the old by eye before the round runs.

## Testing

- **Unit / integration / e2e:** not applicable — a skill document the assistant reads; no runtime code. Verified by the prompt diff above and by the first round drawn with it (the body check at the end of every shot, as STORY_081 did). The pre-push hook still runs the full gate.
