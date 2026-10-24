# CHORE_053 — Four takes per scene

**Status:** Done (owner's decision, 2026-10-24)

## Summary

`.claude/skills/script-supervisor/SKILL.md`: the default target drops from 6 kept takes per scene to 4. Autopilot keeps drawing after the target is met, as before.

## Why

The owner: "we are getting better now so we can reduce from 6 to 4 takes but leave autopilot on". Rock scene 2 rated 5/5/5/5/5, and scene 1 had 4 usable of 5.

## Changes

- [x] The target line in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill document with no runtime code. The pre-push hook still runs the full gate.
