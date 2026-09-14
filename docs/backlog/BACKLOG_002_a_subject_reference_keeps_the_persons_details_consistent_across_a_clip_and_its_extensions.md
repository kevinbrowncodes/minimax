# BACKLOG_002 — A subject reference keeps the person's details consistent across a clip and its extensions

**Status:** Open (2026-09-14) · **Priority:** Medium — raised by the owner while STORY_017's run was in progress

## Summary

The owner sees fine details of the subject drift within a video: in a front double-biceps pose the man has armpit hair; when he strikes the same pose later in the video (or in an extension) he may not. He asked whether MiniMax offers a fix, and whether MiniMax supports character references at all.

## What the model offers (read 2026-09-14, in [docs/references/](../references/README.md))

- **Yes, MiniMax H3 supports character (subject) references** — that is the **Ref2VA** checkpoint's whole purpose ("omni-reference mode": up to 9 reference images, 3 videos, 3 audio clips; [model card](../references/raw/model-card_MiniMaxAI_MiniMax-H3.md)). The reference images ride through every sampling step; the prompt labels them `<Picture N>` and defines `<Subject N>` from them with "the main features to follow" and a `fully_preserved` retention line ([ref prompt guide](../references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_ref_en.txt) §2.1, §4.1). ComfyUI's node has `ref_image_size: "max"` (a 2048 px short edge) "for best identity fidelity" ([nodes_minimax_h3.py](../references/comfyui/comfy_extras/nodes_minimax_h3.py)). MiniMax's hosted API calls the same thing subject-reference-to-video. **The checkpoint is already on the Spark** (`minimax_h3_ref2va_int8_convrot`, 34 GB, fetched for STORY_016).
- **Why the detail drifts:** within one generation the model decides such details per frame from the prompt and its own coherence; across extensions (STORY_017) each new clip starts from the last 1.6 s of the previous one, so a detail not visible in those frames (arms down) is re-imagined when it reappears. Nothing in the current pipeline pins it.
- **The community combines both:** masked continuation for the seam *plus* a subject reference for appearance — xmarre's pack ("Video Reference guides motion, framing, timing, and appearance"), the PR #15375 author's workflow ("use your own reference image, one for each segment or one for all"), Herrgott's "repeated Last Frame anchors" as an identity reset ([community READMEs](../references/community/)).

## Possible solutions, cheapest first

1. **Say it in the prompt** (no code): MiniMax's base guide wants subject features stated explicitly; "dark armpit hair, visible whenever the arms are raised" in every segment's script is the first thing to try. Helps within a clip; weak across extensions.
2. **A subject reference on extensions and fresh clips (story):** Ref2VA checkpoint + one or more stills of the man in the poses that show the detail as `<Picture N>` / `<Subject 1>` with `ref_image_size: "max"`, **kept separate from the continuation mechanism** (the masked overlap of STORY_017 stays; the reference only carries appearance). UI: the composer's reference tiles in extend mode become "subject references" rather than first/last frames. Contract: `referenceImage` allowed on an extension with a `role`. Cost: a Ref2VA generation with reference tokens (STORY_016 measured ≈ 6.4 min per step with a 124-frame reference video; images cost far less).
3. **Keyframe anchors at the recurring pose (story):** `MiniMaxH3AddGuide` pins a still of the pose at the frame where it recurs (Comfy-Org's Multiframe template). Exact for that frame, needs the owner to place it in time.

## Open questions

- Does a reference image on the **FL2VA** weights help at all? The PR author's workflow feeds one through the reference node on FL2VA weights ("you don't have to prompt for it for it to take"), which would avoid the checkpoint swap; unmeasured.
- No generator guarantees fine-detail consistency; a reference reduces drift, it does not remove it. The story's verification would compare the same two poses with and without the reference on the same seed.
