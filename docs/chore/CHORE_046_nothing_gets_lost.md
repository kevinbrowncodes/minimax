# CHORE_046 — Nothing gets lost

**Status:** Done (owner's decision, 2026-10-20)
**Created:** 2026-10-20

## Summary

The scene skill names every accessory in the anchor with its place and side, and in the persistence sentence (Build 2026-10-20-1500). The script supervisor treats a lost or moved item as a serious fault: cancel to NG in shot 1, otherwise its score −3 and the owner told which item and when; a face leaving the frame is scored as likely face drift. The hand-over A/B moves from 72 frames to 56, the longest the adapter accepts.

## Why

The owner found the wristbands missing in the shipped rome film (2026-10-20): the left-wrist bangle vanished on screen at a hand move (~22 s) and reappeared on the right wrist in scene 2. The headband, named in every anchor, held; the bangles were never named. Owner: "it's not acceptable that anything gets lost." The sheet round's scene 2 takes 1–2 lost points to face drift after the face left the frame. The 72-frame A/B take was refused by the adapter ("overlap 72 is not one of 22/39/56").

## Changes

- [x] Accessory naming in the anchor rule, `.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`.
- [x] Accessory row, face-drift scoring and the 56-frame A/B in `.claude/skills/script-supervisor/SKILL.md`.
- [x] The accepted overlap values noted in `tools/rounds/template/ext-standalone.sh`.

## Testing

- **Unit / integration / e2e:** not applicable — skills and an operator script comment; nothing in the app or its tests reads them. The pre-push hook still runs the full gate.
