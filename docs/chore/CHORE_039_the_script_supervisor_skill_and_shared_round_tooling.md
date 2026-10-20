# CHORE_039 — The script supervisor skill and shared round tooling

**Status:** Done (owner's request, 2026-10-19)
**Created:** 2026-10-19

## Summary

A new project skill, `.claude/skills/script-supervisor/SKILL.md`, writes down how a round is run and watched on the Spark: set up the round, start scene 1 first, check every shot and join (black bars, the join check, the back glimpse, accessories, the set moving), scrap jump cuts and clear misses to Outtakes, post and seal-score each take, course-correct a fault that repeats three times, and answer a rating with the agreed table, favourite and analysis. The round scripts move into `tools/rounds/template/` with `tools/rounds/new-round.sh` to set a round up, instead of being copied from the previous round.

## Why

The routine lived in a dozen memory notes and in scripts copied round to round; steps slipped (a take posted late when a watch lapsed, anatomy checks skipped), and a fix such as the join check had to be carried forward by hand. The owner chose a skill plus shared scripts, and the name script supervisor — the crew member who watches every take and logs it good or NG (2026-10-19).

## Changes

- [x] `.claude/skills/script-supervisor/SKILL.md` — including the owner's rule that an issue repeating three takes in a row is diagnosed (cause, options, a small A/B) before it is fixed.
- [x] `tools/rounds/template/` — the current runner, helpers and rating pages with placeholders; `tools/rounds/new-round.sh`; `tools/rounds/README.md`.
- [x] README Project Structure: `tools/rounds/` and the skill.

## Testing

- **Unit / integration / e2e:** not applicable — operator tooling run by hand on the Spark and a skill read by Claude Code; nothing in the app, its tests or the gate reads them. `new-round.sh` was run into a scratch folder: every placeholder filled, per-round page collections set, shell syntax checked (`bash -n`). The pre-push hook still runs the full gate.
