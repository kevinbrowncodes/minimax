# CHORE_042 — Five YouTube favorites

**Status:** Done (approved 2026-10-19 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-19

## Summary

The promo-frames skill (`.claude/skills/promo-frames/SKILL.md`) also marks its top 5 YouTube squares in `promo/yt/` with `-favorite`, chosen as a community-post carousel, and the report gives them in posting order. This replaces CHORE_041's "the `yt/` squares are not marked".

## Why

Owner, 2026-10-19: "please also make sure to provide your top 5 favorites for the yt folder as well". YouTube community posts take up to 5 images, so the five favorites are the post. On the vines film they were 01, 06, 09, 12 and 15, marked by hand that evening, posted hero first: 06, 01, 09, 12, 15.

## Changes

- [x] Step 6: exactly 5 squares in `yt/` get `-favorite` before `.jpg` (`06-19.75s-hand-on-chest-the-look-yt-favorite.jpg`).
- [x] How to pick: for YouTube's feed, not the site. Lead with the hero, then vary the mood (a quiet cover, the physique shot), include a back frame that teases the second half without showing anything, and end on the closing look. Five different poses. A website favorite is not automatically a YouTube favorite.
- [x] Six favorites: the line "the `yt/` squares are not marked" becomes "the `yt/` set has its own five favorites (Step 6)".
- [x] Step 7, the report: the five in posting order, with one line each on why, and a note that YouTube's limit of 5 images per post should be checked on the upload screen.
- [x] Build stamp.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** the vines `yt/` folder (5 favorites of 14 squares) matches the edited text when read against it.

## Done note

Verified 2026-10-19 by reading the edited skill against the vines `yt/` folder: 5 of 14 squares carry `-favorite` (01, 06, 09, 12, 15), five different poses, the hero (06) first in the posting order, one back tease (12). Build 2026-10-19-2215.
