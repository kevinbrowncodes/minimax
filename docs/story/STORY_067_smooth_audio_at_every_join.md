# STORY_067 — Smooth audio at every join

**Status:** Approved (2026-09-30 14:50 EDT: the owner, "prioritize getting this story done first then proceed with front and back video generations that way we have something to test the fix on"; the colour round was stopped to build it first)
**Fixes:** [BUG_013](../bug/BUG_013_audio_clicks_at_extension_joins.md)
**Estimate:** ≈ 4 h 30 min (revised with the in-graph design: one node and its tests, the graph change, an env switch, the test tooling, a deploy of both ComfyUI images) · **Estimated completion:** the evening of the day it is started

As the owner, I want the sound to carry straight through the point where an extension joins its source, so that a chained video is seamless to the ear as well as to the eye.

## Current state (read from the code and the files, 2026-09-30)

- **The join is in the graph.** `spark/adapter/src/mapping.ts:182–184`: `new_audio` = `TrimAudioDuration(decode_audio, start O⁄24, duration (L−O)⁄24)`; `joined_audio` = `AudioConcat(source_parts audio, new_audio)`; the video saves `joined_audio`. STORY_045 (moving the join out of the graph) is Proposed, not built.
- **The overlap exists twice in the graph.** The masked continuation (STORY_017) regenerates the last 1.625 s (39 frames) of the source as the first 1.625 s of the new clip, so `decode_audio` holds the extension's own version of the overlap. It is trimmed away and never saved.
- **ComfyUI has no crossfade node.** Its audio nodes (`/object_info`, 0.35.1): `AudioMerge` adds, averages, subtracts or multiplies with no ramp; `AudioAdjustVolume` is a fixed whole-dB gain. A blend has to be done outside the graph.
- **The adapter already post-processes a finished file with ffmpeg:** `watermark.ts` (STORY_034) makes a copy once per job into its own directory (ComfyUI's output mount is read-only to it), with the ffmpeg call injectable so the adapter's tests never need the binary. This story follows that pattern.

## What others do (researched 2026-09-30)

| Source | Approach | Relevance |
|---|---|---|
| [H3 Motion Context](https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context) (GPL-3.0, v0.3.1) | Pins the previous clip's audio into the next generation on the new clip's timeline; seam correlation "from about 0.45 … to 0.95+"; notes turbo LoRAs degrade audio | We already pin the audio (STORY_017); the seam we hear is the cut, not the generation |
| [MiniMax H3 Extender](https://github.com/pmhaidn/ComfyUI-Minimax-H3-Extender) (GPL-3.0) | "Phase-locked audio continuation" from the previous latent or waveform; trims pinned context from video and audio together | Same idea as ours |
| [ComfyUI-LTXVideo](https://github.com/Lightricks/ComfyUI-LTXVideo) and LTX-2 long-video workflows | "Linear transition with overlap": crossfade the overlapping region rather than cutting | **The approach taken here**, applied to the audio |
| [ffmpeg concat and AAC priming](https://github.com/browser-use/video-use/issues/162) | Stream-copying AAC segments clicks at every boundary; fix: copy the video, re-encode the audio once | Applies to the test tooling's joins, not the app's |

We adopt no GPL code; the blend is a few lines of ffmpeg arguments.

## UI Mockup

N/A (no UI change): the result file's sound changes; nothing on screen does.

## Correction before implementation (2026-09-30)

The first draft blended a copy **after** ComfyUI (an adapter ffmpeg post-step). Reading the chain case against the code showed it fails: the next extension loads its source from ComfyUI's own output file (`mapping.ts:135`, `LoadVideo "<file> [output]"`), which would still be the unblended original, so every earlier join in a chain would come back unblended. The blend therefore moves **into the graph**, replacing the hard `AudioConcat`, and the saved file is fixed at source. The owner's blind listening test the same day (`test/26-09-30-audio-seams/results.md`) confirmed the approach: on two of his videos he heard the untouched joins as *clear* and both crossfaded versions as *faint*. Level matching won on one video and tied on the other, so it is included, **on by default and switchable** (the owner's choice). The ACs below replace the first draft's. One more correction made while building: the measuring script is `spark/comfyui/audio-seam-check.sh`, beside STORY_017's `seam-check.sh` and run the same way (PyAV inside the ComfyUI image), not a host Python script under `spark/adapter/scripts/` (containers first).

## Acceptance Criteria

- [x] **A join node in our own pack.** `MiniMaxLocalAudioJoin` in `spark/comfyui/custom_nodes/minimax_local` takes the source's sound, the extension's decoded sound (overlap included), the source's length and the overlap in seconds, and returns one joined track: the source's sound up to the join − 0.30 s; a linear crossfade from the source's to the extension's version of the same moment over join − 0.30 → join − 0.05 s; the extension's sound from join − 0.05 s on. The source's last 50 ms (the dip, BUG_013) is never used. The joined track's length equals today's (source + the new part).
- [x] **Level matching, on by default.** Before blending, the extension's sound is scaled so its loudness over the overlap equals the source's over the same moment (both are the same 1.6 s, so the gain is exact, not an average), capped at ±12 dB and skipped on near-silence. `AUDIO_LEVEL_MATCH=0` in the adapter's environment turns it off (a new env var, named in the README).
- [x] **The adapter's extension graph uses it** in place of `AudioConcat` (`joined_audio`); the saved video carries the joined track; `new_audio` becomes the new part of the joined track (so it carries the gain). A fresh (non-extension) graph is unchanged byte for byte. `REQUIRED_CLASSES` gains the node, so an adapter pointed at a ComfyUI without it refuses to start (the existing check).
- [ ] **Chains keep every join fixed**, because the next extension loads the already-joined file.
- [ ] **Measured, not assumed:** a script prints BUG_013's dip and click numbers for a file and join times. On an extension drawn with the fix, every join has a dip of **≤ 1.5 dB** and a click of **≤ 3×**; the owner listens and judges.
- [x] **Test tooling:** the test rounds' standalone segments carry the joined track's new part and the blend window, and `chain30.sh` assembles the final audio from them sample-exact (video still stream-copied; audio re-encoded once). Not part of the app; recorded here so the test rounds stop adding their own click.

## Technical Notes

- **The node's arithmetic:** with the source's video length E seconds and overlap O seconds, the extension's first O seconds are the same moment as the source's E − O → E. Output = source[0 : E − 0.30] ++ lerp(source[E − 0.30 : E − 0.05], ext[O − 0.30 : O − 0.05]) ++ ext[O − 0.05 : end]. Source audio past E (an encoder's padding) is dropped. Sample rates and channel counts are matched to the source's.
- **Why 0.25 s ending 0.05 s before the join:** long enough to hide a phase mismatch, well inside the 1.625 s overlap, and it steps over the source's dipped last 50 ms. Both are node inputs with these defaults; the adapter passes them from exported constants.
- **Why linear, not equal-power:** the two signals are the same moment regenerated, so they are correlated; a linear crossfade keeps their sum at constant level where equal-power would bulge.
- **Deploy:** both ComfyUI images are rebuilt (the node is copied in at build) and restarted when idle; the adapter's version bumps.

## Open questions

1. **Loudness climbing through a chain** (−40 → −34 → −27 dB in the test rounds). Level matching at each join addresses the step at the join; a slow climb within a segment is the model's own and stays.
2. **Watermarked downloads** are made from the saved file, so they get the fixed join with no change.

## Testing Plan

- **Unit — the node** (`spark/comfyui/custom_nodes/minimax_local/test_audio_join.py`, run by `spark/comfyui/test-nodes.sh` inside the ComfyUI image):
  - the joined length is E + (extension − O) samples, the same as today's concat;
  - a source and an extension that are the same tone **in phase** join with no step larger than the tone's own;
  - the same tone **out of phase** at the join (the click case): a hard concat steps far beyond the tone's own step, the node's output does not (≤ 3×) — proving the test can fail;
  - a source whose last 50 ms is silent (the dip) shows no dip in the output;
  - an extension 12 dB quieter comes out within 0.5 dB of the source with level matching on, and unchanged with it off; a silent overlap leaves the gain at 1;
  - a different sample rate or channel count on the extension is matched to the source's; source audio beyond E is dropped.
- **Unit — the adapter** (`mapping.test`): an extension graph's `joined_audio` is `MiniMaxLocalAudioJoin` with the source's sound, the extension's decoded sound trimmed to L frames, E = S⁄24, O⁄24, the two timing constants and `level_match` true; with `audioLevelMatch: false` it is false; `new_audio` trims the joined track from S⁄24 for (L − O)⁄24; the fresh graph is unchanged byte for byte; `REQUIRED_CLASSES` lists the node. `server.test`: the option reaches `buildGraph`.
- **Integration:** none new — the stub generation server returns fixed files and runs no graph, so it cannot exercise the node; the node's own tests run the real code on real tensors (the BUG_010 lesson: the artefact is tested, not a re-implementation).
- **E2E:** no new spec. `app/e2e/extend.spec.ts` staying green proves the extension flow is unchanged at the UI.
- **Manual verification (not a gate):** extend a video twice on the Spark, run `seam_measure.py` on both joins, and the owner listens. Record the model, checkpoint, date and the numbers in the Done note.
