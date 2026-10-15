# CHORE_025 — Beach round rules in the skill copy

**Status:** Done (approved 2026-10-15 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-15

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-14-1315 to Build 2026-10-15-0350, the owner's current build. It covers builds 0335, 0345 and 0350.

## Why

The beach round (`test/26-10-16-0800-beach`, 14–15 Oct 2026) and the owner's ratings produced four rules members notice:

- **No breathing in the picture or the sound.** Breath beats and breath sounds drew heavy open-mouth breathing in 2 of 4 takes.
- **A pose lasts one beat.** A front double biceps held across two phases into the end-hold read as frozen; every scene's last shot now releases the flex into a relaxed stance, and the step-in takes the final phase alone.
- **The waistband is never pulled sideways; its direction follows the garment.** Shorts and boxer briefs down, briefs up taut, both hands at the front, none while seated (a seated one-thumb pull drew sideways 2 of 3).
- Two one-line consistency fixes so "The job" and "Work the garment" match the waistband rule.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-15-0350: the synced Build 0345 file verbatim plus the owner's two one-line 0350 edits and stamp, checked against his paste; to be diffed against the synced file once 0350 syncs.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
