# CHORE_068 — A second picture for scene 2

**Status:** Implemented (2026-10-30 EDT — approved by the owner by the tool; template only, live-tested on an upcoming film; Done when that film's first scene-2 takes have been checked)
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md)

## Summary

Scene 2's shots carry a **second reference picture** beside the scene keyframe: a front double-biceps (or arms-up) frame taken from the round's own scene 1, face to the lens, cropped above the waistband. It rides as `<Picture 2>` in the reference node's second slot. On by default for scene 2 whenever the round has the file; scene 1 is unchanged.

## Why

Owner, 2026-10-30: his armpit hair sometimes goes missing in scene 2, and a frame with both arms up should prevent it — "I'm confident from what I've seen that it will work … but let's pay attention and make sure as well". No A/B (his call); the supervisor watches for it instead and counts. The keyframe alone held the chest (STORY_081 row 1, CHORE_066), but scene 2's keyframe rarely shows the arms raised, so the picture cannot carry what it does not show. EPIC_014 already listed a second reference as the next lever ("a torso crop as a second reference, `<Picture 2>`").

The picture comes from scene 1 (owner, by the tool) because it is the same man drawn by the same model in the same round. It is cropped above the waistband so a garment from scene 1 cannot ride into the nude scene; the node keeps a reference's aspect and only scales it down (`nodes_minimax_h3.py:265–269`), so a crop is used as it is.

## Changes

- [x] **`extend.py`** (template): `--ref-image2 <ComfyUI input name>` adds a second `LoadImage` wired to `"ref_images.ref_image_1"` on the `MiniMaxH3ReferenceToVideo` node; refused without `--ref-image` (the slots fill in order).
- [x] **`ext-standalone.sh`** (template): `REF_IMAGE2` in the environment → `--ref-image2`.
- [x] **`rotate.sh`** (template): a scene-2 take uploads `keyframes/scene-2-arms.png` when it exists and writes its name to `image2.txt`; a scene-1 take removes `image2.txt`.
- [x] **`chain.sh`** (template): with `REF` on and `image2.txt` present, exports `REF_IMAGE2` and logs "second picture … in shots 2–3"; `REF2=0` turns it off alone.
- [ ] **The prompts of scene 2's shots 2–3** name both pictures in the existing clause, nothing added: *the man in `<Picture 1>` and `<Picture 2>` — his face, hair, skin and the whole of his body exactly as pictured — the set and the lighting stay as they are*. No body words (owner's rule). Until CHORE_065 lands in the AMG skill, the round's `S2-b.txt` / `S3-b.txt` are edited by hand, as CHORE_066 did.
- [x] **The script supervisor** (`.claude/skills/script-supervisor/SKILL.md`): setting up scene 2, pick the frame from scene 1's kept takes (front double biceps or both arms up, face to the lens, sharp, no blink), crop it at native pixels above the waistband, save `keyframes/scene-2-arms.png` and show it to the owner. Checking scene 2: crop the armpits at full resolution whenever his arms go up; missing hair is a flag, and the round's count (takes with it held / takes with arms up) goes to `test/FINDINGS.md`.
- [x] ~~Copied into the live round named by the owner~~ — the owner (by the tool): "we will live test in an upcoming film"; template only, live rounds untouched.
- [x] **Shot 1 too (owner, by the tool, during the build):** `graph.py` `--ref-image2` swaps the fresh shot's `cond` for `MiniMaxH3ReferenceToVideo` (the keyframe as `<Picture 1>`, the arms frame as `<Picture 2>`) and pins the keyframe at frame 0 with `MiniMaxH3AddGuide`, the guider reading the guided conditioning; `draw.sh` passes `REF_IMAGE2`. Shot 1 already *starts* from the keyframe; only the arms picture was missing. This form (a first frame pinned by a guide plus reference pictures in one fresh shot) had not been drawn before; the first live shot is its validation.
- [x] **Scene 1's own keyframe stays out (owner, during the build):** the owner first asked for three pictures (scene 1's start, the double biceps, scene 2's start); scene 1's start is usually clothed and would pull the garment back, and scene 2's keyframe is that frame made nude, so two pictures.

## Testing

- **Unit / integration / e2e:** not applicable — round tooling and skill documents outside the app and the gate (the CHORE_063 / CHORE_066 precedent). `bash -n` on every changed script; `extend.py --no-post --dump` with both pictures shows the second slot wired and passes ComfyUI's validation on the first real shot. The pre-push hook still runs the full gate.
- **Dry runs (2026-10-30):** `extend.py --no-post` with both pictures → `MiniMaxH3ReferenceToVideo` with `ref_image_0` and `ref_image_1`; without `--ref-image` → refused; `graph.py --no-post` with `--ref-image2` → the reference node, `first_guide` at frame 0, the guider on the guide, the sampler on `cond`'s latent; every input checked against ComfyUI's `/object_info` for both nodes. `bash -n` on `chain.sh`, `draw.sh`, `ext-standalone.sh`, `rotate.sh`.
- **Manual verification:** the first scene-2 takes drawn with it: armpits cropped at every arms-up beat, the minutes per shot against the round's earlier takes, the join and the anatomy checks as usual. The Done note records the counts.
