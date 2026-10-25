# CHORE_056 — Beats follow the script

**Status:** Done (owner's decision, 2026-10-25)

## Summary

`.claude/skills/script-supervisor/SKILL.md`: a "Beats follow the script" row in the shot checks. Every scripted beat is checked at 4 fps against the blocking. A beat that doesn't draw sends the take to Outtakes, and the same miss 3 takes in a row triggers a beat rewrite.

## Why

The pec bounce never drew in 0 of 8 shot 1s across red and hunk. The owner caught it; my checks looked at faces, framing and set, but not whether the beat itself happened. He chose 3 in a row as the correction threshold for every kind of fault.

## Changes

- [x] The check row in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The pre-push hook still runs the full gate.
