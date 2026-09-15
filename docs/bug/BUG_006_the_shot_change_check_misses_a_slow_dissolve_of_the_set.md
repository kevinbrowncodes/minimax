# BUG_006 — The shot-change check misses a slow dissolve of the set

**Status:** Resolved (2026-09-15) — the fix landed while the overnight chain ran; see Resolution
**Found by:** the overnight chain (STORY_020's verification), chain 2 segment 2, job `81354423`, seed 1614451648

## Summary

STORY_020's check (`result.cuts`) reported `[]` for an extension in which the black sequin curtain **dissolved into a plain grey backdrop** over about 1.7 s (frames ≈ 262–303, 10.9–12.6 s, 0.8 s after the overlap ended). The lamps, the stanchions, the floor and the man stayed, so the seam measured continuous (0.79) and the person's action went on; the owner's definition of extending ("same set") was broken anyway.

## Steps to Reproduce

Run STORY_020's border scan (`spark/adapter/src/cuts.ts` rule; `analyse.py` in the session's scratchpad) on `spark/data/output/video/job-81354423-2b2e-48f7-96be-eb517b99ef59_00001_.mp4`; view frames 243, 280 and 340.

## Expected vs Actual Behaviour

Expected: `result.cuts` names a change near 11 s and the task page shows the notice. Actual: `[]`; the border's largest change over one second was **16.5** (frames 286–291), under the threshold of 30.

## Root Cause

The rule compares the border with itself **one second earlier**. A dissolve that takes ~1.7 s spreads its change over more than one window, and dark sequins → mid-grey is a moderate change in mean absolute RGB, so no single one-second window reached 30. The threshold was calibrated on a fast dissolve (9 → 13 per frame, then a 43 step) and on hard cuts; a held shot's border never moved more than 11.2 over a second on the calibration clips, so 16.5 is above every clean clip but under the threshold that was chosen to keep a 2.7× margin.

## Acceptance Criteria

- [x] The node also reports the border compared **three seconds** apart (`long[i]`, span 72), so a slow dissolve accumulates into one number; the calibration table in STORY_020 gains the 3-second column for every clip on disk (the clean ones, the cuts, the dissolves, tonight's chain segments).
- [x] `cuts.ts` flags a shot change where **either** the one-second border change reaches `SHOT_CHANGE` (30) **or** the three-second change reaches `SLOW_CHANGE` (set from the table: above every clean clip's three-second maximum with margin, below this dissolve's); events merge as before; the reported frame is the largest single step inside the window that tripped it.
- [x] Unit tests: the 2026-09-14 slow dissolve (a 40-frame ramp whose one-second change peaks at 16 and whose three-second change reaches the new threshold) is flagged; a held shot with the person moving is not; a hard cut is flagged once, not twice.
- [x] The stub, the contract and the README say the check looks one and three seconds apart.
- [ ] Re-run on `81354423`: one event near frame 262–303; on chain 1's three segments and chain 2's segment 1: none.

## Resolution

`SLOW_CHANGE = 20` over a 72-frame span, from the measurement of every clip on disk at 23:30 (border, mean absolute RGB, largest change over 1 s / 2 s / 3 s / 4 s):

| Clip | What it is | 1 s | 2 s | 3 s | 4 s |
| --- | --- | --- | --- | --- | --- |
| `2bc60a18`, `9504c191`, `db8654c4` | held shots, still poses | 2.5–2.9 | 3.1–3.2 | 3.2–3.7 | 3.4–4.1 |
| `40ea4550`, `c00b63a3` | chain 1's extensions (20.75 s, 31.4 s), held | 5.8–6.1 | 6.8 | 6.8 | 6.7–6.8 |
| `0aa9d5a1`, `fe072506` | held shots (the 2026-09-14 morning run) | 9.7 | 12.2–12.3 | 12.5–13.7 | 12.6–14.6 |
| `d333b5a1` | the first clip (2026-09-13), held, the noisiest border | 11.2 | 14.0 | **16.1** | 17.7 |
| `81354423` | **the slow dissolve** (curtain → grey wall over 1.7 s) | 16.5 | 26.7 | **26.9** | 26.9 |
| `2f980101`, `7f201441` | a hard cut; the fast dissolve | 50.0, 51.6 | 50.0, 53.8 | 49.9, 55.4 | 49.9, 54.8 |

The one-second rule stays at 30 (nothing held reaches 12; every cut and fast dissolve exceeds 37). The three-second rule at 20 sits 1.24× above the noisiest held shot and at 0.74 of the slow dissolve; two seconds separates as well (14.0 vs 26.7) but three gives a slow fade more room to accumulate. The stub's `done-with-cut` is unchanged (it reports the event, not the series). Re-run on `81354423`: the check now reports one event in the dissolve (frames 262–303); chain 1's segments and chain 2's segment 1 stay at none (recorded in STORY_020's table).
