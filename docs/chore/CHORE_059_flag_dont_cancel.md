# CHORE_059 — Flag doubtful takes instead of cancelling

**Status:** Done (owner's decision, 2026-10-27)

## Summary

`.claude/skills/script-supervisor/SKILL.md`, section 3: mid-take cancels are limited to a jump confirmed with both frames side by side, black bars, and a clear grin held into the lens. Every other doubt (anatomy, a missed beat, a blemish, a lost item, framing) lets the take finish; a fault that passes a naming test goes to Outtakes afterwards, and anything less goes on the grid with a flag in my sealed note. Every check uses full-resolution frames of the whole body, never tiles of a cropped region, and the cut detector's "framing" flag is a hint, never a reason on its own.

## Why

Five over-calls in two days on the bed round: scene 1 NG 1 and NG 2 (the cut detector's flag fired on the stretch; the owner liked NG 2 and it was resumed into Take 2), and scene 2 NG 1–3 (the "cleft" was the glute crease seen from overhead, the "see-through head" was the scrotum in shadow, and the flip up was state, not anatomy). A wrong cancel costs a whole take; a wrong keep costs nothing, because the owner rates every take.

## Changes

- [x] A "Flag, don't cancel" rule at the top of section 3, with the naming test.
- [x] The anatomy, beats and accessories rows: NG only after the take finishes, a doubt is a flag.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The pre-push hook still runs the full gate.
