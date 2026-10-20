# CHORE_041 — Framing changes finish early, and the hand-over is tunable

**Status:** Done (owner's decision, 2026-10-19)
**Created:** 2026-10-19

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: any framing change (a pull-back, a stand-and-step, any move that changes his size) is complete by the middle of the clip, and every shot ends on a still hold of 2 s or more, because the next shot is drawn from this one's last 1.6 s. Build 2026-10-19-2130 → 2026-10-19-2200. `tools/rounds/template/ext-standalone.sh` gains `OVERLAP` (frames handed to the next shot; default 39, unchanged). The script-supervisor skill records the open A/B: 3 takes at `OVERLAP=72` on the next round that needs a framing change.

## Why

The owner noted that pull-backs held their joins in vines (4 of 7 shipped) but broke every join in rome, and asked for something more reliable (2026-10-19). The extension continues from the previous shot's last 39 frames; vines' pull-back finished by about 7 s and held, rome's camera was often still moving at 7.5–9.5 s, inside that window, and every join broke.

## Changes

- [x] The finish-early / still-hold rule in the scene skill.
- [x] `OVERLAP` in `tools/rounds/template/ext-standalone.sh` (also copied into the running sheet round; default unchanged, so running takes are unaffected).
- [x] The open A/B written into the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable — operator tooling and skills; nothing in the app or its tests reads them. `bash -n` on the edited script; the default path is byte-for-byte the old request (overlap 39). The A/B itself is the measurement. The pre-push hook still runs the full gate.
