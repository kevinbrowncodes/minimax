# CHORE_028 — Waistband down only and no laughing in the skill copy

**Status:** Done (owner's skill edits of 2026-10-17; committed the same session)
**Created:** 2026-10-17

## Summary

Refresh the reference copy kept by CHORE_019 at `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` from Build 2026-10-16-1545 to Build 2026-10-17-0440, the owner's current build.

## Why

From the night round's scene 1 ratings (`test/26-10-17-1600-night`, 17 Oct 2026):

- **The waistband always goes down, whatever the garment.** A briefs band drawn up taut "pulled the briefs up too high" in 2 of 5 takes; the owner wants down only.
- **No laughing.** A written "laughing once, short" drew a laugh he called weird or off in 3 of 5 takes; breaks are now a shake-out of the arms or a roll of the shoulders, and laughter joins the banned mouth sounds.

## Changes

- [x] `docs/references/skills/minimax-h3-i2v-amg-scene/SKILL.md` — Build 2026-10-17-0440, copied from the synced file (synced 04:55 EDT, about 15 minutes after the build stamp). The repo copy keeps its `compatibility:` frontmatter line, as CHORE_027 did.

## Testing

- **Unit / integration / e2e:** not applicable — a docs-only reference file; nothing in the app or the tests reads it. The pre-push hook still runs the full gate.
