# CHORE_054 — Scene order

**Status:** Done (owner's decision, 2026-10-24)

## Summary

`.claude/skills/script-supervisor/SKILL.md`: a round runs scene 1 only until it has 4 kept takes, then scene 2 only until it has 4. Only then does autopilot start alternating the scenes.

## Why

The owner: "scene 2 only occurs after 4 takes of scene 1 are done.. alternating only occurs during autopilot mode".

## Changes

- [x] The run-order line in the script-supervisor skill.

## Testing

- **Unit / integration / e2e:** not applicable; this is a skill document with no runtime code. The pre-push hook still runs the full gate.
