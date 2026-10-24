# CHORE_055 — Creepy faces stop early

**Status:** Done (approved 2026-10-24 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-24

## Summary

The script supervisor (`.claude/skills/script-supervisor/SKILL.md`) checks his **expression** on every shot 1 as it lands, and cancels the take to Outtakes when the face reads creepy, so the remaining two shots (~45 min) are not drawn. The sealed score counts the face too.

## Why

Owner, 24 Oct 2026, on the hunk round's scene 1: takes 1 and 3 rated 2 ("the first 10 seconds … really awkward", "super awkward and creepy"), take 2 rated 4 ("better first 10 seconds"); then "monitor for creepy clips and stop early so we don't waste time again". Face crops from 2 to 8 s showed the cause: a wide-eyed, brows-up stare held into the lens with a toothy grin for about six seconds while the pose barely changed. My sealed scores were 4, 4, 4 because the checks and the scoring looked at beats, joins, anatomy and skin, never the face. Every one of those takes ran all three shots (~66 min each) before anyone saw the face.

## Changes

- [x] Section 3, a new row **Expression**: when shot 1 lands, crop his face at 2 fps through the shot (and through every later shot as it lands). **Creepy** = a toothy grin or leer held into the lens for 3 s or more (a wide-eyed stare alone is flagged, not cancelled). Clear in shot 1 → cancel (`cancel.sh`) to NG with the crop's seconds in the note; clear in a later shot → cancel too (the take cannot ship); unclear → let it run and flag it on the card.
- [x] Section 4, scoring: the face is scored like anatomy — a creepy face caps the take at 2; a calm face with the look landing at the end is the target.
- [x] Section 5: a creepy face in 2 takes running (not 3) is cause enough to diagnose the script (the expression words, how long the eyes are on the lens), because each one costs a full take; the fix follows the skill's existing rules.
- [x] Build stamp in the frontmatter.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** the rule, applied to the hunk round's first three takes' face crops (2–8 s), cancels takes 1 and 3 and passes take 2 — matching the owner's 2/4/2.

## Done note

Verified 2026-10-24 against the hunk round's face crops (2–8 s, 2 fps): takes 1 and 3 hold a toothy grin into the lens from ~3.5 s to ~8 s (4.5 s) → cancel; take 2 keeps the mouth closed until ~6.5 s (grin < 3 s) → passes. Matches the owner's 2/4/2. The first draft also cancelled on a wide-eyed stare alone, which would have cancelled take 2 (owner 4); the rule was narrowed to the held grin, the stare flagged only. Build 2026-10-24-1345.
