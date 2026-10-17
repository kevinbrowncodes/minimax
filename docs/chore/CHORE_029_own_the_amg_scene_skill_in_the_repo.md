# CHORE_029 — Own the AMG scene skill in the repo

**Status:** Done (owner's request, 2026-10-17; location and the claude.ai copy settled by the multiple-choice tool)
**Created:** 2026-10-17

## Summary

The `minimax-h3-i2v-amg-scene` skill stops being maintained in claude.ai and synced down. It now lives at `.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`, tracked in git, where Claude Code loads it for this project; every change to it is a commit. The reference copy at `docs/references/skills/` (CHORE_019 to CHORE_028) is moved there, so there is one source.

## Why

The owner wants to control the skill directly (2026-10-17). Edits through the claude.ai skill agent took a round trip and a sync of 10–15 minutes, and Build 0455 came back built from a superseded draft. Keeping it in the repo gives history, review and no sync lag.

## Changes

- [x] `git mv docs/references/skills/minimax-h3-i2v-amg-scene .claude/skills/minimax-h3-i2v-amg-scene` (history kept).
- [x] `SKILL.md` at Build 2026-10-17-0530: Build 0455 plus the owner's glimpse direction — every back scene carries at least one glimpse beat, never a full reveal; the brief upright spread let go at once allowed as an untested glimpse; a Glimpse column in the shot list; no wording of the hole as absent. The `compatibility:` frontmatter line is kept.
- [x] `README.md` — Project Structure: `.claude/skills/` added; the `references/skills/` note removed.
- [x] Owner: remove the skill from claude.ai, so the synced copy stops arriving (cannot be done from here). Done by the owner 2026-10-17 (the synced folder disappeared).

## Testing

- **Unit / integration / e2e:** not applicable — a prompt-writing skill read by Claude Code; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
