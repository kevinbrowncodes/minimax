# BACKLOG_017 — Video references in a shot

**Status:** Open (2026-10-29, the owner: "for ours we will just focus on image support not video support for the time being, maybe in the future we will support video Ref2VA")
**Priority:** Low. Parked behind [SPIKE_005](../spike/SPIKE_005_a_reference_image_in_every_shot.md), which tries reference **images** first.

## Summary

`MiniMaxH3ReferenceToVideo` also takes up to 3 reference **videos** (`ref_videos`, 2–15 s each, 24 fps) with their soundtracks, named `<Video k>` in the prompt (`comfy_extras/nodes_minimax_h3.py:271–278, 312–350`). A short clip could carry what a still cannot: how he moves, a turn seen from every side, the back and the front in one reference.

## User impact

If a still image holds the body only from the side it shows, a short clip of him turning could hold front and back both. Unproven.

## Rough scope

1. Only after SPIKE_005 has its answer for images.
2. A reference clip of a few seconds (not the previous shot's tail, which is the continuity job the masked prefix already does), on whichever checkpoint SPIKE_005 found follows references.
3. Measure the time per shot: a reference video adds about 1,000 tokens per latent frame. The one we ran in September (124 frames) cost **2.7×** the step time (STORY_016). The arithmetic is in [SPIKE_005_ref2va_readme.md §7](../spike/SPIKE_005_ref2va_readme.md).

## Dependencies

SPIKE_005 (does our checkpoint follow references at all); STORY_016's notes on the reference-video route (a match cut to a new set when the reference was the source footage).

## Open questions

- Which clip: a turn in place drawn for the purpose, or a cut from a shipped take?
- A short clip to keep the cost down: is 2 s (the node's minimum) enough to carry the body?
