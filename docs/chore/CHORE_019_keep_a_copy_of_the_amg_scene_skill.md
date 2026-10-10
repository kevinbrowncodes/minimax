# CHORE_019 — Keep a copy of the AMG scene skill

**Status:** Done (approved 2026-10-10 15:40 EDT by the multiple-choice tool; committed the same session)
**Created:** 2026-10-10

## Summary

Keep a verbatim reference copy of the owner's `minimax-h3-i2v-amg-scene` skill (Build 2026-10-10-1758) in the repo at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md`. The skill is maintained outside this repo (the owner's skill agent); this copy is the record of what it said on the day its rules were reconciled against the viking rounds.

## Why

- On 2026-10-10 the owner reconciled the skill against the weekend's fourteen draws on the Equinox stack (the unpin twins, `test/26-10-10-1600-viking/` and `test/26-10-10-2001-viking/`): the phases-not-timecodes rule, the carry-over opener on extensions, two moves per phase, the walk-in as its own phase, the squat allowed and the kneel not, order-not-counts, the garment named as the photo shows it. Those findings now live in the skill's text with their counts; the repo should hold the version they landed in.
- It is a reference only. It is **not** under `agents/skills/`, because every folder there is listed on the app's Skills page and counted by the e2e suite; promoting it into the product is its own chore with the `metadata` keys the page reads.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — the skill, verbatim, Build 2026-10-10-1758.
- [x] `README.md` › Project Structure — `docs/references/` now mentions the skills subfolder.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only addition; no runtime code, no file the app or the tests read (`agents/skills/` is untouched). The pre-push hook still runs the full gate on the push.
