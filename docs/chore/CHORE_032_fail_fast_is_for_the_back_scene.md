# CHORE_032 — Fail fast is for the back scene

**Status:** Done (owner's clarification, 2026-10-18)
**Created:** 2026-10-18

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: the fail-fast rule from CHORE_031 now applies to the back scene only — its riskiest beat (the glimpse, anything untested) goes in its first shot. The front scene is free of it. Build 2026-10-17-1330 → 2026-10-18-0135.

## Why

The owner (2026-10-18): the riskiest beat belongs in the first shot of the scenes where the model struggles; front scenes have no such issue, so the rule is only needed for the back sequences for now. It is about shot order inside a scene, not which scene runs first.

## Changes

- [x] The "Fail fast" paragraph scoped to the back scene.
- [x] Final check item 20 scoped to the back scene.
- [x] Build stamp 2026-10-18-0135.

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
