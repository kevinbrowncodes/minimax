# BUG_013 — Audio clicks at extension joins

**Status:** Open (2026-09-30)
**Found by:** the owner, listening to the courtyard round's 31 s videos: "the audio between the 10 second clips is jarring and even though it doesn't appear like a cut happen you can hear it."
**Fix:** [STORY_067](../story/STORY_067_smooth_audio_at_every_join.md)

## Summary

Where an extension joins its source, the picture is seamless but the sound is not. The join is a hard cut between two waveforms, and the source's own last ~50 ms is quieter than the rest of it, so every join has a short dip, and some have a sharp click.

## Steps to Reproduce

1. Extend any finished video by +10 s in the app.
2. Play the result across the join (at 10.125 s for a 10 s source).
3. Measure the audio in 50 ms windows around the join (method under Root Cause).

## Expected vs Actual Behaviour

- **Expected:** no audible change at the join: no dip, no click.
- **Actual:** measured on 10 app-made joins in `spark/data/output/video` (2026-09-30): a dip of **1–4.5 dB** at every join, and a sample step **17–22× the local norm** (a click) on 2 of the 10 and 3–4× on 3 more. The test rounds' own joins (outside the app, below) are worse: dips of 6–15 dB and a click at every join.

## Root Cause

- **A hard cut.** `spark/adapter/src/mapping.ts:184` joins with `AudioConcat(source_parts audio, new_audio)`: the source's whole track, then the extension's from the overlap onward. The two waveforms meet wherever they happen to be, so the step between the last source sample and the first new one is arbitrary: sometimes small, sometimes a click.
- **The source's tail dips.** Every decoded segment's last ~50 ms is 5–6 dB quieter than the second before it (seen on all three segments of `view-VL-424242`), so the cut lands on a quiet sliver.
- **The fix material is already in the graph and thrown away.** The masked continuation (STORY_017) regenerates the overlap's 1.625 s of sound as part of the new clip, so for that stretch the graph holds two versions of the same moment, the source's and the extension's, and a crossfade between them would hide the seam. `new_audio` (`mapping.ts:182`) trims the extension's version away.
- **Not in the app, only in the test rounds' tooling:** `test/*/chain30.sh` joins standalone segments with `ffmpeg -f concat -c copy`, which keeps each file's 32 ms AAC encoder priming and adds a gap and click at every join (a known ffmpeg behaviour). The app joins decoded audio inside ComfyUI and does not have this part.
- **Also seen, and not this bug:** in the test rounds the loudness climbs from segment to segment (−40, −34, −27 dB on `view-VL-424242`). The app's joins show steps of 0–3 dB only. The difference is likely the Eros Max TURBO checkpoint, which the H3 Motion Context author reports degrades audio. Tracked in STORY_067 › Open questions, not fixed here.

**How it was measured:** each file decoded to 16 kHz mono; RMS in 50 ms windows from −300 to +300 ms around the join; "dip" = the quietest window within ±100 ms minus the median of the outer windows; "click" = the largest sample-to-sample step within ±2.5 ms of the join divided by the median step over a second well before it.

## Acceptance Criteria

- [ ] Resolved by STORY_067 (every join in the app and the test tooling measures within its thresholds).
