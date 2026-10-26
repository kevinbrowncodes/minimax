# CHORE_057 — Autopilot stops at two fives

**Status:** Withdrawn (owner, 2026-10-26: "disregard that rule… one day I will ask that from you but right now we are still fine tuning things"). The skill line was removed the same day.

## Summary

`.claude/skills/script-supervisor/SKILL.md`: autopilot stops drawing a scene once it has two takes that I sealed at 5. It keeps drawing the scene that's short. When both scenes have two, it stops and the Spark goes idle.

## Why

The owner: "make another rule to the autopilot: stop once you hit two 5-rated videos". He chose my sealed scores (not his) and per scene.

## Changes

- [x] The stop rule in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill with no runtime code. The pre-push hook still runs the full gate.
