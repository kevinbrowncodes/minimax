# CHORE_058 — Full anatomy check

**Status:** Done (owner's decision, 2026-10-26)

## Summary

`.claude/skills/script-supervisor/SKILL.md`: the "Back glimpse" row becomes an anatomy row covering every nude beat (the swing, the squat, the grab, the front pinup). Each is checked as a full-size crop at 4 fps. Anything clearly unrealistic (the head of the penis, the scrotum, the taint, or the glimpse reading as a vertical slit) sends the take to Outtakes. It's judged on anatomy alone, never erect vs flaccid.

## Why

The owner stopped hunk scene 2 Takes 1, 2 and 6 for anatomy ("ball and penis head look unrealistic", "the taint looks off"). I'd scored all three 4–5, because my check only looked for a vertical slit.

## Changes

- [x] The anatomy row in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The pre-push hook still runs the full gate.
