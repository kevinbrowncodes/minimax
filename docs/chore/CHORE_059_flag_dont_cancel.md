# CHORE_059 — Cancel clear faults, flag doubts

**Status:** Done (owner's decision, 2026-10-27)

## Summary

`.claude/skills/script-supervisor/SKILL.md`, section 3: a clear fault is cancelled at once and posted with its second. Clear means it passes a naming test (which part is wrong, and why no normal explanation fits) on full-resolution frames showing at least his waist to his knees, and it shows for a second or more. The owner can overturn a cancel, and the take resumes from shot 1. A doubt finishes and goes on the grid with a flag in my sealed note. Tile sheets are only the fast pass, and the cut detector's "framing" flag is a hint, never a reason on its own.

## Why

Five over-calls in two days on the bed round: scene 1 NG 1 and NG 2 (the cut detector's flag fired on the stretch; the owner liked NG 2 and it was resumed into Take 2), and scene 2 NG 1–3 (the "cleft" was the glute crease seen from overhead, the "see-through head" was the scrotum in shadow, and the flip up was state, not anatomy). A wrong cancel costs a whole take; a wrong keep costs nothing, because the owner rates every take.

## Changes

- [x] A "Flag, don't cancel" rule at the top of section 3, with the naming test.
- [x] The anatomy, beats and accessories rows: a clear fault cancels, a doubt is a flag.
- [x] Revised the same morning (owner): an earlier draft let clear faults finish too; the owner wanted those cancelled to save time, so this is the middle ground.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The pre-push hook still runs the full gate.
