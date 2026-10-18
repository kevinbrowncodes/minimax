# CHORE_035 — The variety review keeps every required beat

**Status:** Done (owner's question, 2026-10-18)
**Created:** 2026-10-18

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: the variety review (CHORE_034) now names what it keeps — every beat the skill requires (the front double biceps close, the back glimpse and over-the-shoulder look, the finish's pinup held longest, the director's shot on the signature element) plus the safeguards. A required beat is never flagged as a repeat; its approach and release are varied instead. Build 2026-10-18-1845 → 2026-10-18-1900.

## Why

The owner asked whether the review conflicts with his front double biceps close. CHORE_034's wording listed only the safeguards as kept, so a literal run could have swapped the required close out.

## Changes

- [x] "What the review never changes" lists the required beats and says how to vary them.
- [x] Final check item 21 follows.
- [x] Build stamp 2026-10-18-1900.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
