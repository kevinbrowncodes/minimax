# CHORE_021 — Refresh the AMG scene skill copy to the film structure

**Status:** Done (approved 2026-10-13 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-13

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-13-1140 to Build 2026-10-13-1250, the owner's current build.

## Why

- The owner aligned the skill with film structure (beat > shot > scene > film): a 10-second clip is a **shot**, three shots generated as one video are a **scene**, one generation of a scene is a **take**, the timed beats are the shot's **blocking**, and the summary is the **shot list**. The skill now writes `prompts/scene-N/prompt-M.txt`, `scenes/scene-N/shot-M.txt` and `shot-list.md`, with the owner supplying `keyframes/scene-N.png`.
- One behaviour change rode along with the rename: **each scene is its own generation from its own keyframe** (the first shot of every scene sees its picture; only shots 2 and 3 are extensions). The back scene's keyframe should already show him turned away, because a turn-away from a front-facing keyframe moved the camera in 5 of 6 takes (`test/26-10-11-1601-spanish-cowboy`, 12 Oct 2026).
- The first round written in this layout is `test/26-10-16-1600-waterfall`; the repo copy is the record of what the skill said when it ran.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-13-1250, verbatim (diffed against the synced skill file).

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it (`agents/skills/` is untouched). The pre-push hook still runs the full gate.
