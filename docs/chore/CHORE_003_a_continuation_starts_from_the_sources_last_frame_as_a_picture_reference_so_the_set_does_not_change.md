# CHORE_003 — A continuation starts from the source's last frame as a picture reference, so the set does not change

**Status:** Done (2026-09-13)
**Created:** 2026-09-13, from STORY_016's manual verification

## Summary

The first real extension (segment 2 of the owner's chain, Ref2VA, 5 s context) kept the subject, the pose and the lighting across the seam but **replaced the set**: the last source frame shows the sequin curtain and the white rope barriers; the first new frame, one frame later, shows a plain black backdrop with no ropes, and the extension stays there. MiniMax's `video continuation` task type allows "transitions", and STORY_016's prompt wrapper pinned nothing but words ("the environment … continue unchanged").

MiniMax's full-reference guide has the mechanism for "start exactly here": a `<Picture N>` reference that "serves as a shot's first frame" with the phrase *"the shot begins from <Picture 1>"* (§2.2, §5.3), and the task type `keyframe completion`; Comfy-Org's Multiframe template locks a shot the same way (`<Picture 1>` on `ref_images` plus the Add Guide at frame 0). This chore adds the source's **last frame as `<Picture 1>`** next to `<Video 1>`/`<Audio 1>`, declares one continuous shot with no cut, and keeps the 22-frame pixel anchor.

## Why

Without it, every extension is a new shot on a new set — the opposite of "extend". The evidence: `spark/data/smoke/chain-2026-09-13T12-08-57-803Z-segment1-d333b5a1.mp4` (segment 1) and the joined `job-19d2394f…_00001_.mp4` (20.75 s), frames 242 vs 243.

## Changes

- [x] `spark/adapter/src/mapping.ts`: the extension graph adds `last_frame_ref` (`ImageFromBatch` of the source's last frame) wired to `ref_images.ref_image_0` of `MiniMaxH3ReferenceToVideo`; `REQUIRED_CLASSES` unchanged.
- [x] `spark/adapter/src/prompt.ts`: `subject_definitions` gains `<Subject 1>` (everything visible in `<Picture 1>`: the person, the set, the props, the lighting) and `<Picture 1>` (the last frame of `<Video 1>` and the first frame of `[Shot 1]`); `summary` is `[video continuation + keyframe completion + audio reference]` and says the target is a single continuous shot that begins from `<Picture 1>`; `retention_analysis` lists `<Subject 1>` and `<Picture 1>` as `fully_preserved`; `detailed_description` opens with "one continuous shot, no cut, no transition, the camera does not move" and `[Shot 1] The shot begins from <Picture 1>` before the owner's prose.
- [x] Tests updated: `mapping.test.ts` (the new node and input), `prompt.test.ts` (the labels, the task types, the first-frame phrase), `server.test.ts` (the submitted graph carries `ref_images.ref_image_0`).
- [x] BUG_002's `recover()` also consults ComfyUI's queue on start: an open job ComfyUI still lists is left open (the adapter can be redeployed under a running job); recorded in BUG_002's Resolution.

## Testing

- **Unit** (adapter): the graph and the prompt assertions above. **Integration** (adapter, fake ComfyUI): the submitted extension graph carries the picture reference; a restart under a listed job keeps it open. **E2E**: not applicable — the UI does not change (the stub's echo is unchanged). The real effect is checked by re-running segment 3 of the chain and comparing the seam frames; the result goes in STORY_016's Done note.
