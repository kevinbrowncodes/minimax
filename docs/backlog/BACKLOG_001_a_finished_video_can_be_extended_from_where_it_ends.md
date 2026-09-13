# BACKLOG_001 — A finished video can be extended from where it ends

**Status:** Open (2026-09-13) · **Priority:** High — the first thing the owner asked for after the first real clip

## Summary

The owner watched the first 10 s image-to-video clip on its task page and asked how to extend it. There is no way to today: the task page offers Download and Copy prompt, and the composer only starts a new generation from a prompt plus up to two reference images. "Extend" would take a finished video and generate its continuation, so a clip can grow past the model's single-run ceiling and past the wall time the owner is willing to wait for one run.

## User impact

- A 10 s clip is the longest the owner has waited for (51 min). Extending in 4–5 s steps (about 17 min each) is how longer pieces get made without one two-hour run.
- The story the owner is telling with his prompt scripts has segments; extend is how the next segment starts exactly where the last one ended.

## What exists (verified 2026-09-13 on the Spark, ComfyUI image `minimax-spark/comfyui:v0.35.1`, no GPU used)

- The H3 node set in `comfy_extras/nodes_minimax_h3.py` has **`MiniMaxH3AddGuide`** — "anchor image and/or audio guides at an arbitrary pixel frame of the target video"; its `image` input takes "image or video frames", a multi-frame batch "anchored as a clip and cropped down to the model's valid clip lengths: 5, 22, 39… (17k+5) frames", at `frame_idx` (negative counts from the end). That is a real continuation: feed the last 5 or 22 frames of the finished clip as the guide at frame 0 of a new generation, and the new clip starts in motion, not from a still.
- `MiniMaxH3ReferenceToVideo` also takes reference videos (2–15 s), but that is subject reference (ref2va), not continuation, and needs the Ref2VA checkpoint (EPIC_004 → Later).
- The adapter's graph (`spark/adapter/src/mapping.ts`) uses only `MiniMaxH3ImageToVideo` with `first_frame` / `last_frame`; nothing loads a video into the graph yet.
- PyAV 18.1 is in the ComfyUI image, so decoding a clip's last frames and joining two MP4s needs no new dependency and no host install.
- The 2026-09-12 recon capture shows no Extend control on the reference's task page or composer; the video plugin's skill text (where such an option would be described) was not captured. Whether the reference offers extend is unknown — this item is not a clone story until a capture says so.

## The manual path that works today (no code)

1. Decode the last frame of the finished clip (PyAV in the ComfyUI image, `docker run --rm --entrypoint python …`) into `spark/data/input/`.
2. New task in the UI: upload that frame as the reference, prompt the next segment, 4–5 s.
3. Join the two MP4s (PyAV, same image). Audio is a hard cut; motion restarts from a still, so a pose that is settled at the cut hides the seam best.

## Rough scope (when promoted)

- **Adapter:** `POST /jobs` accepts a `continueFrom: <jobId>` (or an uploaded video); the graph adds `LoadVideo` → frames → `MiniMaxH3AddGuide(frame_idx: 0)` with the tail of the source clip; the result is the new segment, and optionally a joined clip alongside it. Contract v1 gains one optional field, documented in `docs/contracts/job-api.md`; the stub gains a script for it.
- **UI:** an **Extend** action on the task page's result card (next to Download / Copy prompt) that opens the composer docked with the source clip attached as "continues task …", duration and ratio fixed to the source; the new task links back to its parent; Assets shows the joined clip.
- **Tests:** unit for the graph builder (guide node wired, tail length on the 17k+5 grid), integration for the new field against the stub, one e2e for Extend → new task → done against the stub; the real continuation is a manual verification step (model, checkpoint, date) as [CLAUDE.md §3 item 5](../../CLAUDE.md#3-how-features-are-built-important) requires.

## Dependencies

- Memory and time of a guided run are unmeasured; a first run is measured before the story commits to a default tail length (5 vs 22 frames).
- Stopping the owner's two vLLM containers by name for each run, until EPIC_004's coexistence item lands.

## Open questions

- Guide tail: 5 frames (the shortest valid clip) or 22? Longer tails carry more motion but cost more memory and constrain more of the new clip.
- Does the joined clip replace the source in Assets, sit beside it, or is joining left to the owner?
- Should the reference's own behaviour be re-captured first (a run on agent.minimax.io that asks the agent to extend), so the UI matches theirs if they have it?
