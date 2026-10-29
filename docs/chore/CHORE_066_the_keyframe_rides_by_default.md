# CHORE_066 — The keyframe rides by default

**Status:** Done (2026-10-29 13:00 EDT — the owner, by the tool, on STORY_081's result: "Yes, default on")
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md)

## Summary

`tools/rounds/template/chain.sh` sends the scene's keyframe (`image.txt`) as a reference picture with every extension shot by default: `REF` defaults to `1`; `REF=0` turns it off for an A/B. The hunk round's copy is flipped the same way. STORY_081 shipped the switch off by default and left the flip to the owner.

## Why

STORY_081 row 1 (2026-10-29 12:50 EDT): with the keyframe as `<Picture 1>`, shot 3 of hunk Take 4 drew the keyframe's chest at the turn where the same seed drew it hairy twice without the picture; cost +2.6 min per extension, join and anatomy unaffected. Every round from tonight should have that safety net.

## Changes

- [x] `chain.sh` (template and the hunk round's copy): `${REF:-0}` → `${REF:-1}`, the comment says why and how to turn it off.
- [x] **Until CHORE_065 lands, the prompts of shots 2–3 do not name `<Picture 1>`** — the picture is attached but unnamed, a form STORY_081 did not test (its row 1 named it). A round started before CHORE_065 edits the camera sentence of its shots 2–3 by hand as `prompts/S3-ref.txt` did (*the man in `<Picture 1>` — his face, hair, beard, skin and the whole of his body exactly as pictured — the set and the lighting stay as they are*), or runs with `REF=0`. Said here so the next round does not run an untested form by accident.
- [x] Rounds whose folders were copied before this chore (the straw round) carry the old `chain.sh`; copy the template's `chain.sh`, `ext-standalone.sh` and `extend.py` in before restarting them (the AD session told).

## Testing

- **Unit / integration / e2e:** not applicable — round tooling outside the app and the gate (the CHORE_063 precedent). `bash -n` on both copies; the first round drawn with the default on is checked as STORY_081 was (the chest and the body at the end of every shot, the minutes). The pre-push hook still runs the full gate.
