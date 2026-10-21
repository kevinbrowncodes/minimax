# CHORE_048 — Scripts name the man, not the things

**Status:** Done (owner's decision, 2026-10-21)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-21-0100): the anchor shrinks to the man by appearance and the framing (40–80 words); no set, light, garment or accessory is described, and the "stays on" persistence sentence is gone. A thing is named only in a beat that acts on it. The subject is named by his own features, never his clothing. This reverses CHORE_046's accessory-naming rule.

## Why

Owner (2026-10-21): "I would prefer as much as possible to not state objects in our scripts; that will be the job of video context." Scope chosen: everything possible. Video context became 3.75 s with STORY_080. Known risk, told to the owner: a scene's first shot has no video context, only the keyframe — rome scene 2 lost its left-wrist bangle in shot 1's turn in at least 5 of 8 takes. Tracked in `test/FINDINGS.md`.

## Changes

- [x] The anchor, clothing, wardrobe, subject-naming and checklist rules rewritten; the older evidence kept and marked as pre-video-context.

## Testing

- **Unit / integration / e2e:** not applicable — a skill; nothing in the app or its tests reads it. The next rounds are the measurement (garment and accessory losses at joins and in shot 1). The pre-push hook still runs the full gate.
