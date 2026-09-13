# BUG_003 — An extension's result points at the source video, because the adapter takes the first mp4 in ComfyUI's outputs

**Status:** Resolved
**Found:** 2026-09-13, on segment 3 of STORY_016's chain

## Summary

When an extension finishes, the adapter records the **source** clip as the result: the task page plays and downloads the 20.75 s segment-2 clip under a summary that says "31.4 s", and `sizeBytes` is the source's. The joined 31.375 s clip is on disk and correct.

## Steps to Reproduce

1. Extend a finished clip (STORY_016) and let it finish.
2. `GET /jobs/:id` → `result.sizeBytes` equals the source file's size; `GET /jobs/:id/result` streams the source video.

## Expected vs Actual Behaviour

- **Expected:** `result` names the file the graph's `save` node wrote (`job-<id>_00001_.mp4`) and the poster the `poster` node wrote.
- **Actual:** `result.video` is `job-<source id>_00001_.mp4`.

## Root Cause

`finalize` (`spark/adapter/src/server.ts`) flattens every file in ComfyUI's history `outputs` and takes the first `.mp4`. An extension's graph has a `LoadVideo` node, whose UI preview lists the **source** file in the history outputs, and ComfyUI orders it before `save`. STORY_006's graphs had one mp4, so "the first mp4" was always right.

## Acceptance Criteria

- [x] The result video is the `save` node's output and the poster the `poster` node's, by node id; the flattened search remains only as a fallback for a history without node ids.
- [x] The fake ComfyUI lists a `source_video` preview first for extension graphs, and `server.test.ts` asserts the stored result names the job's own file.
- [x] The record of segment 3 (`4f48037c`) was repaired by hand (video filename and size), and it is written down here and in STORY_016's Done note.

## Resolution (2026-09-13)

`ComfyClient.history` now also returns `byNode` (node id → files); `finalize` reads `byNode.save` and `byNode.poster` first. The fake lists the source preview first, and the extension test checks `store.get(id).result.video.filename === job-<id>_00001_.mp4`. Segment 3's adapter record and the UI's history entry were repaired by hand after the fix was identified (the file on disk was verified: 753 frames, 31.375 s, 5 683 477 bytes); segment 2's record had been written by hand under BUG_002 with the right file, so it was not affected.
