# CHORE_062 — Allow the hole in the deep wide squat

**Status:** Done (owner's decision, 2026-10-29)

## Summary

The no-hole rule (CHORE_060) gets one exception. Back scenes may show the hole in the deep wide squat with no spread, glutes square to the lens. Upscaled takes are fixed with `tools/rounds/patch-blend.sh` (CHORE_061). Spreads, pulls, bends and released squeezes stay banned. Skill Build 2026-10-29-1015; the script-supervisor anatomy row matches.

## Why

The original render draws the hole naturally in the deep wide squat: waterfall shipped at 5, and hunk back take 4 was rated 5. Only the owner's upscaler broke it, and the patch blend now fixes that. In every other move the original render is wrong too (bends failed 5 of 6, spreads 3 of 3), so there is nothing good to blend back in.

## Changes

- [x] The back-scene paragraph, the shot-list column and final-check item 8 in the AMG skill; build bumped.
- [x] The anatomy row in the script-supervisor skill.
- [x] Same morning (owner): vary the reveal — the squat is the proven reveal, not the only one; a back scene may try a new stance-based reveal from its keyframe as an experiment, judged on full-res anatomy, back to the squat after two anatomy fails; one reveal per back scene; the variety review flags a reveal from the last two films (Build 2026-10-29-1030).

## Testing

- **Unit / integration / e2e:** not applicable; skills with no runtime code. The pre-push hook still runs the full gate.
- [x] Same morning (owner): the ban is lifted — spreads, pulls, bends and released squeezes are allowed again; every reveal must read circular, and a vertical slit sends the take to Outtakes (checked on the original render at full res; the blend only fixes the upscale). Build 2026-10-29-1045.
