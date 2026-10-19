# CHORE_041 — Six favorites in every promo set

**Status:** Done (approved 2026-10-19 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-19

## Summary

The promo-frames skill (`.claude/skills/promo-frames/SKILL.md`) marks its top 6 website frames by appending `-favorite` to their file names in `promo/`, chosen for the owner's site audience, with the reason for each in the report.

## Why

Owner, 2026-10-19, on the vines set: asked for the top favorites to carry `-favorite`, then "I meant to say 6 and add that to the skill as well". The six marked by hand that evening: the band drawn down (09.50 s), the hand-on-chest look (19.75 s), the deep squat (36.25 s), the look over the shoulder (40.50 s), the hand on the glute looking back (50.00 s) and the frontal finish (60.50 s).

## Changes

- [x] Step 5: after the shortlist is saved, exactly 6 frames get `-favorite` before `.jpg` (`06-19.75s-hand-on-chest-the-look-favorite.jpg`); the film-order number stays first so the folder still sorts by time.
- [x] How to pick: judged for the site's audience, not for craft alone; cover both scenes and each scene's payoff; no two favorites of the same pose; the hero is always one of them.
- [x] The `yt/` squares are not marked; the YouTube set keeps its own posting order.
- [x] Step 7, the report: the table marks the favorites, with one line each on why.
- [x] Build stamp.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** the vines folder (6 favorites, 15 frames) matches the edited text when read against it.

## Done note

Verified 2026-10-19 by reading the edited skill against the vines folder: 6 of 15 frames carry `-favorite` (04, 06, 11, 12, 14, 15), both scenes and each payoff covered, the hero (06) among them, `yt/` unmarked. Build 2026-10-19-2200.
