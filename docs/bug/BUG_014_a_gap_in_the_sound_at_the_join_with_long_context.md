# BUG_014 — A gap in the sound at the join with long context

**Status:** In progress (2026-10-21) — an off-by-default switch (`audioFreeSeconds`) is shipped and on trial in the rome context test at 0.3 s
**Found by:** the script supervisor, first take of the rome context test (STORY_080)

## Summary

Since STORY_080 made the extension carry 90 frames (3.75 s) of the source, the new segment's sound starts with about 0.1 s of near-silence and then plays about 9 dB louder than the source. In the joined video that is a tick of silence and a jump in level at the 10 s join. Takes drawn at the old 39-frame overlap show neither.

## Steps to Reproduce

1. On the Spark, extend any clip with `overlapFrames: 90` (the default since STORY_080) — e.g. `test/26-10-20-1800-rome-context`, seed 212404786, shot 2.
2. Measure the loudness of the new segment's first 0.2 s and of the source's last 0.2 s (`ffmpeg -ss <t> -t 0.05 … -af volumedetect`).

## Expected vs Actual Behaviour

| | Source end | New segment 0–0.05 s | 0.05–0.1 s | 0.1–0.2 s |
|---|---|---|---|---|
| Expected (39-frame takes: sheet K-2 547592378, 48699576) | — | −47 / −42 dB | −46 / −45 dB | −47 / −45 dB, level with the source |
| Actual (90 frames, rcx K-2 212404786) | −40 dB | **−77.5 dB** | **−90.3 dB** | **−31.6 dB** (+9 dB on the source) |

The runner's seam check: join 10.125 s dip **−53.3 dB** (limit −1.5); 39-frame takes dipped −0.7 to −3.4 dB.

## Root Cause

Not yet confirmed. The leading hypothesis, to be tested before any fix: the extension's decoded sound over the 90-frame overlap is offset from the source's by about 0.1 s (an audio-latent grid or decoder pre-roll effect that 39 frames did not trigger). Both symptoms follow from that one offset — `MiniMaxLocalAudioJoin` measures the loudness over a shared moment that contains the gap, so its level match boosts the extension (up to its +12 dB cap), and the gap lands at the start of the new part. The test: decode one 90-frame extension's audio and cross-correlate its overlap with the source's tail to measure the offset; repeat at 56 and 39.

**Measured 2026-10-20 ~19:30 UTC — hypothesis 1 ruled out:** the source's last 1.625 / 2.333 / 3.75 s were encoded with the audio VAE, cut to 65 / 93 / 150 ticks and decoded (a diagnostic graph on 8189, files `spark/data/output-nsfw/audio/diag-bug014-*`): the decoded sound matches the original within 1 dB at the start, middle and the last 0.2 s at all three lengths, with no silence and no offset. So the gap is not in encoding the hand-over; it is in the extension's generated or decoded sound around the hand-over boundary, or in how the join slices it. Next: the test round now saves each extension's whole decoded sound (`*_ext.flac`) to compare with the source tail directly. Second take at 90 frames: the same dip (−48.4 dB at 10.125 s), so 2 of 2.

**Measured 2026-10-20 ~23:00 UTC — the gap is in the model's generated sound, and it predates STORY_080:**
- Take 3's extension saved its whole decoded sound (`nsfw-K-2-476139520_ext`): continuous across the hand-over (−39 dB in the source's last second, −38 to −35 dB from 3.6 to 4.2 s), no gap, no step. Its new part and its preroll are clean too. So the join node and the encode are not the cause.
- Takes 1 and 2's new parts start with **~75 ms of near-silence** (−76 to −90 dB, about three 25 ms audio ticks) and then run 7–9 dB above the source. The silence is the first sound the model generates after the protected overlap; the level match then compares a loud regenerated overlap with the source, which is the jump.
- Across **every** new part on disk (431, almost all at 39 frames): **15 start silent (3 %)** — including rome's own 39-frame take K-2-651652552 and several earlier rounds. At 90 frames: **2 of 3** so far. So the defect is old and seed-dependent; the longer context may make it more frequent (3 takes is too few to say).
- Likely mechanism (not yet tested): the model generates near-silence for the first few audio ticks after a hard noise-mask edge. Candidate fix to test: protect a few ticks fewer than the overlap (let the model regenerate the overlap's last ~0.1 s of sound so the edge is not at the join), or crossfade from the overlap into the generated sound a little after the edge. Either must be measured on the shipped artefact's output.

## Acceptance Criteria

- [ ] The offset (or the real cause) is measured and written here, at 39, 56 and 90 frames.
- [ ] A 90-frame extension's join shows no dip below the seam check's limit and no level step beyond the 39-frame takes', on the shipped artefact's own output (CLAUDE.md §4c).
- [ ] A test in the adapter or the node's own tests (`spark/comfyui/custom_nodes/minimax_local/test_audio_join.py`) fails on the cause before the fix and passes after.
