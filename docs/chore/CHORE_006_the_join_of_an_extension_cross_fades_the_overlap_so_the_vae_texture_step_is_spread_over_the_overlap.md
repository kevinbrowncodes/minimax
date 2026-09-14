# CHORE_006 — The join of an extension cross-fades the overlap, so the VAE's texture step is spread over 1.6 s instead of one frame

**Status:** Open (2026-09-14)
**Created:** 2026-09-14, from STORY_017's verification

## Summary

STORY_017's extension keeps the scene (curtain, ropes, lighting, framing, the person's action all continue), but the join still has a one-frame step a measure can see: the last source frame is the original H.264 picture and the first kept new frame is a VAE decode, and on a sequin curtain the VAE re-renders the sparkle. Measured on `fe072506` (seam at frame 243): mean absolute difference 7.33 at the seam against 6.06 for the largest natural frame-to-frame change in the clip (ratio 1.21), with only a small tone shift (RGB −1.3/−1.5/−1.7); yesterday's cut measured 32.23 with a −25 tone shift. The community packs treat this as a known handover artefact and feather it.

## Why

The overlap frames exist in two versions — the source's originals and the decoded reconstruction the model continued from — and the join switches between them in one frame. Blending from the originals into the decoded overlap across the 39 overlap frames (or its last part) makes the switch gradual, and the first new frame then follows a decoded frame, not an original.

## Changes

- [ ] `spark/adapter/src/mapping.ts`: the join keeps the source up to the start of the overlap, then cross-fades the source's overlap frames into the decoded overlap frames over the overlap (k chunks of `ImageBlend` with rising factors, joined by `ImageBatch`), then the new frames; `result.frames` unchanged.
- [ ] Unit test for the blend chunking (factors rise monotonically 0 → 1, the chunk lengths sum to the overlap); integration test for the graph shape.
- [ ] Re-measure `seam-check.sh` on the same clip regenerated with the same seed: the seam's ratio at or under 1.0.

## Testing

- **Unit / integration** as above; **e2e: not applicable** (no UI change; the stub's result is the fixture). The effect is measured on the Spark with `seam-check.sh` and recorded here.
