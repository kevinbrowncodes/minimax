# CHORE_061 — Patch blend for upscaled takes

**Status:** Done (owner's decision, 2026-10-29)

## Summary

`tools/rounds/patch-blend.sh` keeps an upscaled take everywhere except a small moving patch, where the original render shows through. It takes the upscaled file, the original, a patch centre x and a keyframed `t:y` path. The patch has a feathered elliptical edge, light grain to match the upscale, and a 0.3 s fade in and out. It is shown only between the first and last keyframe.

## Why

The owner's upscaler sharpens the face and body but redraws the hole as a stitched vertical slit, and can draw a dark line on the scrotum. The original render draws both naturally. A hand-built blend on hunk back take 4 fixed it ("OMG.. that actually worked!!!"), and the owner asked for it as a reusable tool.

## Changes

- [x] `tools/rounds/patch-blend.sh`.
- [x] A line in `tools/rounds/README.md`.

## Testing

- **Unit / integration / e2e:** not applicable; a standalone ffmpeg script outside the app. Verified by re-running it on hunk back take 4 with the same path: the output frame matches the approved hand-built blend byte for byte (same md5 on a 420×420 crop at 16 s). The pre-push hook still runs the full gate.
