# CHORE_040 — Promo frames are for the website

**Status:** Done (approved 2026-10-19 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-19

## Summary

CHORE_039's skill (`.claude/skills/promo-frames/SKILL.md`) was written for the wrong audience. It screened `promo/` for Instagram and X, so it left out the nude scene, the waistband pulls and the squat. The owner corrected it the same evening: **`promo/` is for his website**, and only **`promo/yt/`** has to meet a platform's rules (YouTube's community guidelines). This chore turns the screen around.

## Why

Owner, 2026-10-19: "I can't help that none of the promos are nude ones … the promos are for my website while the thumbnails in yt need to be modified/crop to meet youtube community standards". The vines film was redone by hand that evening to the corrected rule: 15 website frames across both scenes (the waistband pulls, the squat, the look over the shoulder, the frontal finish), and 14 YouTube squares, all cropped above the waistband or the glutes. The squat was skipped because no compliant crop of it is worth posting.

## Changes

- [x] The skill's description and opening: `promo/` is the website's shortlist across the whole film; `promo/yt/` is the YouTube set.
- [x] Step 3 becomes the website screen: every scene is in. Out are only blended crossfade frames and technical defects (blur, half blinks, mouth mid-movement, warped hands, a camera move in progress, a head cut off by the frame edge). The waistband and hand-at-the-front rules leave this step.
- [x] The shortlist grows to 10 to 16 frames, so both scenes are covered, numbered in film order as JPEG.
- [x] Step 5b carries the platform rules: each YouTube square is cropped above the waistband (front) or above the glutes (back), no garment pouch, glutes or genitals anywhere in the square. A frame with no compliant crop worth posting (a squat, a bend) gets no square, and the report says which frames were skipped.
- [x] The report: the reach note moves to the `yt/` set; the 4:5 crop offer goes (the website does not need it); the table marks which frames have a YouTube square.
- [x] Build stamp; `README.md` › Project Structure line for the skill updated to match.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** the vines film's hand-made set (15 website frames, 14 squares, the squat skipped) is the reference the edited text must reproduce. Check it by reading the skill against that folder; no second agent run is needed for a change of screen.

## Done note

Verified 2026-10-19 by reading the rewritten skill against the vines folder it must reproduce: 15 website frames in film order across both scenes (01 at 0.00 s to 15 at 60.50 s, the crossfade at 30.75 s and the headless 33.00 s frame left out), 14 squares in `promo/yt/` with nothing below the waistband or above the glutes cut line, the squat (11, 36.25 s) without a square. Build 2026-10-19-2130.
