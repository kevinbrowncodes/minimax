# BACKLOG_015 — Recheck the audio join on a busy clip

**Status:** Open (2026-09-30, from STORY_067's Done note)
**Priority:** Medium — the owner will provide a new photo; run it then.

## Summary

STORY_067 fixed the click at extension joins and the owner heard its first video as fine, but that clip was filmed in a quiet studio with little background sound. A clip with continuous, busy sound (surf, wind, a crowd) is the harder test. A 25 ms dip also remains at every join in the numbers (−7.2 and −2.2 dB on `blue-CL-424242`), made by the model at the boundary between pinned and generated sound.

## What to do

1. Draw an extension with the fix on a busy-audio clip (the owner's next photo), listen at each join, and run `spark/comfyui/audio-seam-check.sh`.
2. If the dip is audible there, try in order: **(a)** pin one fewer audio latent step (the last 25 ms of the overlap is regenerated rather than kept); **(b)** end the crossfade after the boundary, blending into the extension's new sound. Each is one or two GPU draws on the same seed, compared by ear.

## Open questions

- Does a busy bed hide the dip or expose it?
