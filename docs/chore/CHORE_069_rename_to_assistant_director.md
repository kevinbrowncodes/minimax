# CHORE_069 — Rename to assistant director

**Status:** Done (owner's decision, 2026-10-30)

## Summary

The `script-supervisor` skill becomes `assistant-director`: the folder moves to `.claude/skills/assistant-director/`, and the name, description, heading and opening line change. The checks, steps and rules inside are unchanged. `tools/rounds/README.md`, `tools/rounds/new-round.sh` and the README's structure line point at the new path. Older tickets keep the old name, since their prose is frozen.

## Why

The owner promoted the role (2026-10-30): the job now runs the set as well as the continuity log — scheduling takes, calling cancels and retries, course-correcting, and reporting. On a film set that is the assistant director; the script supervisor only keeps continuity.

## Changes

- [x] `git mv` the skill folder; name, description, heading and intro updated; build stamped.
- [x] `tools/rounds/README.md`, `tools/rounds/new-round.sh` and `README.md` reference the new name.

## Testing

- **Unit / integration / e2e:** not applicable; a rename of a skill and of comments, with no runtime code. The pre-push hook still runs the full gate.
