# SPIKE_005 — A reference image in every shot

**Status:** Superseded by [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md) (2026-10-29). The desk half is [SPIKE_005_ref2va_readme.md](SPIKE_005_ref2va_readme.md); the experiment ran the same day as STORY_081's manual verification and **the picture held** (hunk Take 4 shot 3: the keyframe's chest at the turn, +2.6 min per extension on Eros Max TURBO). Drafted 2026-10-29 at the owner's request: "Draft a spike".
**Estimate:** desk half ≈ 1.5 h; Spark half — the owner's budget, set before any GPU run (proposed: 6 takes, ≈ 4 h)
**Created:** 2026-10-29

As the owner, I want to know whether feeding the scene's keyframe into every shot as a reference image keeps his body the same across the joins, so that a wrong word in a script can no longer give him chest hair he does not have. I also want to know what it costs per shot, and whether our extensions can carry a reference at all.

## Current state (read from the box, 2026-10-29 ≈ 10:45 EDT)

- **The failure:** hunk scene 2 Take 4 (seed 926611381). *Corrected 2026-10-29 from the original film (`output-nsfw/video/hunk-T4-orig/hunk-B-926611381.mp4`); the first draft said "smooth chest" and "shots 1–2 kept it".* The keyframe has smooth pecs with a light patch of hair below the breastbone and a light trail down the abs. The anchor I wrote, in all three prompts, said "a heavy square chest, dark hair across his chest and down his abs". Shot 1 (0–10.1 s) kept the keyframe's light hair while he faced the camera, then he turned his back at ≈ 7 s. Shot 2 (10.1–20.75 s) is back-only, so the chest was never tested. Shot 3 (20.75–31.4 s), whose inputs (shot 2's last 90 frames and its end anchor) show only his back, drew hair across the pecs and dense on the abs when he turned to face the camera (≈ 27–31 s). **The wording is not the cause:** shot 3 redrawn 2026-10-29 (10:38 → 11:16 ET) with the corrected anchor ("a smooth chest with only a light trail of dark hair down the centre of his abs"), the same seed and the same shots 1–2, drew the same hairy chest at the turn, almost pixel for pixel. Takes 5–6 of that round were noted "chest hair thicker by the end". Body drift in extensions may also be behind the moles that appear only once the back is shown (straw scene 2, 4 of 4 shot 2s; frames not rechecked).
- **How a shot is drawn today:** shot 1 is `MiniMaxH3ImageToVideo` (inputs `clip`, `vae`, `prompt`, `width`, `height`, `length`; optional `first_frame`, `last_frame`). Shots 2–3 are standalone extensions (`extend.py`): 90 frames of the previous shot as context plus the text, and no picture of the keyframe.
- **What the box already has:**
  - ComfyUI on :8189 lists a `MiniMaxH3ReferenceToVideo` node. Its inputs are `clip`, `prompt`, `width`, `height`, `length`, `ref_image_size` (`match` | `max`), and optionally `vae`, `audio_vae`, `ref_images` (up to 9), `ref_videos` and reference audio; prompts tag them `<Picture i>` / `<Video k>`.
  - The node's own tooltip: "Reference tokens ride through every sampling step, so 'max' can be several times slower."
  - Checkpoints on disk: `minimax_h3_ref2va_int8_convrot` (34 GB, SFW, unused) and `pinkcherryMMH3Fl2va_v15Fl2vaRef2va_int8` (NSFW, named as an FL2VA + Ref2VA merge). Our stack runs `10Eros_Max_h3_TURBO-hybrid_beta5_int8` — whether its "hybrid" includes Ref2VA is unknown.

- **Scope (owner, 2026-10-29):** reference **images** only. Video references (`ref_videos`) are out of scope for now: [BACKLOG_017](../backlog/BACKLOG_017_video_references_in_a_shot.md). Related: [BACKLOG_016](../backlog/BACKLOG_016_hold_the_face_in_back_shots.md) (the face in back shots, the same mechanism). Background reading: [SPIKE_005_ref2va_readme.md](SPIKE_005_ref2va_readme.md).

## UI Mockup

N/A (a spike: reading and a controlled experiment; no product change).

## Acceptance Criteria

- [ ] **Can the reference ride with our extensions?** Read the node's source in the ComfyUI container and answer, quoting the file and line:
  - does reference conditioning combine with a video-context continuation in one graph, the way `extend.py` builds shots 2–3?
  - does it run on Eros Max TURBO with our two LoRAs, or does it need a Ref2VA checkpoint?
- [ ] **Measured vs asserted:** a table of each claim above (speed, identity fidelity, checkpoint support) and whether it was measured on our box or read from a tooltip or card.
- [ ] **The experiment** (once the owner sets the budget), on one existing round's scene with a known drift:
  - **Matrix:** with vs without the keyframe as a reference image, same seeds; `ref_image_size` `match` only, unless `match` fails and the budget allows `max`.
  - **Recorded per take:** minutes per shot (ComfyUI's clock), peak memory, join similarity, and a full-resolution body check at the end of each shot: chest hair, moles, face, accessories.
- [ ] **The answer in one paragraph:** does it stop the drift, at what cost per shot, and on which checkpoint.
- [ ] **Follow-ups:** a story to add the reference to the runner if it wins, or a chore noting the dead end if it doesn't.

## Technical Notes

- **The likely path:** add a reference image input to the extension graph built by `extend.py` (and to shot 1's graph), with the scene's keyframe as `<Picture 1>` in every shot's prompt. If the I2V and extension nodes cannot take a reference, the alternative is to draw every shot with `MiniMaxH3ReferenceToVideo` and pass the previous shot's tail as a `ref_video`. That changes how joins work, so it would be its own measured row.
- **Cost:** `match` keeps the reference at the generation's pixel area; the extra tokens ride every step, so expect some slowdown per shot. `max` (2048 px short edge) is "several times slower" by the node's own word and is not the default.
- **Scripts stay correct regardless:** the anchor-from-the-keyframe rule ([anchor-from-a-crop], CHORE_048) still applies. The reference is a safety net, not a replacement.

## Testing Plan

- **Unit / integration / e2e:** none — a spike changes no product code. Any runner change it leads to ships as its own story with tests.
- **Manual verification (the Done note records):** the checkpoint and LoRAs used, the date, the per-shot minutes with and without the reference, and the full-resolution body checks per take.

## Estimated Complexity

Small to medium. The desk half reads one node's source and builds two graphs. The Spark half is the owner's budget (proposed 6 takes ≈ 4 h); the spike stops at it.
