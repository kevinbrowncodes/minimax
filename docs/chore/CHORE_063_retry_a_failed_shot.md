# CHORE_063 — Redraw a failed shot instead of scrapping the take

**Status:** Done (owner's decision, 2026-10-29)

## Summary

When shot 2 or 3 of a take fails, `retry.sh <K|B> <seed> <2|3> "<why>"` redraws just that shot on a new sampling seed and keeps the shots before it. It moves the failed shot (and any later one) into `retries/` for the outtakes, bumps a per-shot attempt count, queues the take, and stops it. `rotate.sh` resumes a queued take before drawing a new one. Two retries per shot; a third failure is an NG. Files keep the take's seed, so the resume skips the kept shots.

## Why

The owner (2026-10-29): "if something is wrong in the second shot … instead of scrapping the whole scene … redraw … that way we don't lose a round on needing to do shot 1 over again." Shot 1 costs about 22 minutes per take, and the back scene's reveal now sits in shot 2 (CHORE_062).

## Changes

- [x] `tools/rounds/template/extend.py`: `--sample-seed` (defaults to `--seed`) drives sampling; file names keep `--seed`.
- [x] `tools/rounds/template/ext-standalone.sh`: reads `retry-<label>-<seed>.n` and samples on `seed + 7919 × attempt`; the attempt is logged.
- [x] `tools/rounds/template/retry.sh`: new.
- [x] `tools/rounds/template/rotate.sh`: resumes `retry.queue` first.
- [x] `.claude/skills/script-supervisor/SKILL.md`: a failed shot 2 or 3 is retried before it is an NG.
- [x] The straw round's copies updated (its runner was paused).

## Testing

- **Unit / integration / e2e:** not applicable; round tooling outside the app. Verified by a dry run of `retry.sh` in a scratch tree: attempts 1 and 2 move the failed shot and the later one aside and queue the take; the third is refused with exit 2. `bash -n` on every script and a parse of `extend.py`. The first live retry is checked in straw's run log. The pre-push hook still runs the full gate.
