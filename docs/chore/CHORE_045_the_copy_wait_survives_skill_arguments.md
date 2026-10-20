# CHORE_045 — The copy wait survives skill arguments

**Status:** Done (approved 2026-10-20 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-20

## Summary

`.claude/skills/promo-frames/SKILL.md`, Step 1: the wait-for-copy loop passes the film's path as an environment variable (`FILM`) instead of the positional `$1`.

## Why

Claude Code substitutes `$1` in a skill's text with the words typed after the skill's name. On the rome film (2026-10-20, "Pillar Talk") the skill was invoked with arguments and the loop arrived as `F="the"`; the right line was run by hand. Nothing else in the skill uses a positional variable (checked with `grep`).

## Changes

- [x] Step 1's loop: `FILM="<path>" bash -c '… "$FILM" …'`, no `$1`, no `_` placeholder.
- [x] A ground rule: never write a positional shell variable (`$1`, `$2`, `$@`) in the skill's text.
- [x] Build stamp.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** the new loop run verbatim against the rome cut prints `complete: 160965978 bytes`; the skill's text holds no `$` followed by a digit.

## Done note

Verified 2026-10-20: the new loop, copied verbatim from the skill with the rome cut as the path, printed `complete: 160965978 bytes`; `grep` finds no positional variable left in the skill. Build 2026-10-20-1130.
