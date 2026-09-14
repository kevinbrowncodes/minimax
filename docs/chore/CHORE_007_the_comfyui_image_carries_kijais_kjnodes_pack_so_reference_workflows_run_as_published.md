# CHORE_007 — The ComfyUI image carries kijai's KJNodes pack, so reference workflows run as published

**Status:** In progress (2026-09-14)
**Created:** 2026-09-14, for STORY_020's control run (the owner: "is there an example of video extension working that we borrow and test against instead of using our own?" → "Please proceed!")

## Summary

Add [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes) (GPL-3.0, the same licence as ComfyUI; read from its `LICENSE` on 2026-09-14) to `spark/comfyui/Dockerfile` at a pinned commit (`d3cfe21625e5170126ce06fbfcfe1d88108688c3`, 2026-09-13), with its five pip requirements, and make `run.sh` fail loudly if the pack did not import.

## Why

The best borrowed example of masked video extension is the one written by the author of ComfyUI PR #15375, [PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json](../references/comfyui/examples/PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json): self-contained (its first clip is text-to-video), fixed seeds, full base-format prompts, with example outputs on the PR page. Checked against our live server on 2026-09-14, every node it uses exists **except seven, all from KJNodes**: `GetNode`/`SetNode` (its wiring), `ImageBatchExtendWithOverlap` (its join), `CreateFadeMaskAdvanced` (its mask), and three memory patches (`PathchSageAttentionKJ`, `MiniMaxH3MemoryEfficientSageAttentionPatch`, `MiniMaxChunkFeedForward`). Rewriting those with core nodes would make it our workflow again, which defeats the control. Copying the pack into the running container by hand would be a change the repo does not record ([CLAUDE.md §4a](../../CLAUDE.md#4a-one-machine-many-containers): serving config is code).

The SageAttention nodes need the `sageattention` package, which this image does not have (no aarch64 build tried); workflows that use them bypass those nodes — the control run records that as a deviation.

## Changes

- [x] `spark/comfyui/Dockerfile`: fetch the pack at the pinned commit into `custom_nodes/ComfyUI-KJNodes` (shallow, `.git` removed) and `pip install -r` its `requirements.txt` (`pillow`, `color-matcher`, `matplotlib`, `mss`, `opencv-python-headless`).
- [x] `spark/comfyui/run.sh`: after ComfyUI answers, `GET /object_info/ImageBatchExtendWithOverlap` must contain the class, else the script dies with a pointer to the container log (a custom node that fails to import is silently absent otherwise).
- [x] README → Running the Model: one line naming the pack, its commit and why it is there.

**Done (2026-09-14):** image `minimax-spark/comfyui:v0.35.1` rebuilt by `install.sh` (the pack's layer fetched at the commit; `opencv-python-headless` 5.0.0.93, `color-matcher` 0.6.0 installed); `stop.sh` + `run.sh` on the idle box: "ComfyUI ready after ~8s … custom nodes: ComfyUI-KJNodes loaded". The seven classes answer on `/object_info`.

## Testing

- **Unit / integration / e2e: not applicable** — no application or adapter code changes; the gate never runs the model container.
- **The check is the test:** `spark/comfyui/install.sh` builds the image; `spark/comfyui/run.sh` starts it and now asserts the pack loaded. The pack's own nodes are exercised by the control run recorded in STORY_020's verification.
