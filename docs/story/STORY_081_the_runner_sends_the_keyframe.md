# STORY_081 — The runner sends the keyframe

**Status:** Implemented (2026-10-29 12:50 EDT — **row 1 held**; rows 2 and 3 not needed; the attribution row and the runner's default are the owner's call; Done when the push's gate is green)
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md) — the first story, and the owner's test

As the owner, I want the round runner to pass the scene's keyframe into an extension shot as a reference picture, so that shot 3 of hunk scene 2 Take 4 can be redrawn with **no words about his chest hair either way** and the chest at the turn tells us whether the picture holds him where the words did not.

## Current state (read 2026-10-29 10:40–12:00 EDT)

- **The redraw of this morning is the baseline.** `output-nsfw/video/nsfw-B-3-926611381_00001_.mp4` (landed 11:16 EDT) is shot 3 drawn with the corrected anchor ("a smooth chest with only a light trail of dark hair down the centre of his abs"), the same seed and the same shots 1–2 as Take 4. It has the same hairy chest at the turn (≈ 27–31 s) as the original (`hunk-T4-orig/`). The wording is not the lever.
- **How an extension is built.** `tools/rounds/template/extend.py` posts a payload to the adapter container, which runs its own `buildGraph` (`spark/adapter/src/mapping.ts`) with a `continuation`; the script then rewires the LoRA chain and the standalone outputs and POSTs the graph to ComfyUI on :8189. In that graph `cond` is `MiniMaxH3ImageToVideo` with `clip`, `vae`, `prompt`, `width`, `height`, `length` and no frames (`mapping.ts`, the continuation branch: "Text conditioning only"); the guider reads `cond` (or `anchor` when the end anchor is on, off by default since 2026-10-10); the sampler reads the masked `latent`, never `cond`'s own latent. `ext-standalone.sh` calls it; `chain.sh` calls that per segment and **resumes any segment whose file already exists**.
- **The reference node.** `MiniMaxH3ReferenceToVideo` (`comfy_extras/nodes_minimax_h3.py:241–363`): the same inputs as `cond` plus `ref_image_size` and the Autogrow `ref_images`. In the API graph the slot is the dotted key `"ref_images.ref_image_0"` (STORY_016's graph, commit `d4f282f`, used `"ref_videos.ref_video_0"` the same way and ran). The conditioning it returns carries `minimax_refs`; `MiniMaxH3AddGuide` appends `minimax_keyframes` to whatever it is given; the model merges both (`comfy/model_base.py:2186–2197`). Nothing in the code stops a reference, the masked prefix and the end anchor sharing a graph; nobody has drawn it.
- **The keyframe is in the container** as `hunk/scene-2.png` (`test/26-10-29-1600-hunk/image.txt`), 1344×768, the name `LoadImage` takes.
- **The checkpoint question is open.** Eros Max TURBO is labelled a FL2VA/Ref2VA hybrid; unproven. `pinkcherryMMH3Fl2va_v15Fl2vaRef2va_int8.safetensors` (21 GB, an FL2VA + Ref2VA merge) is on disk as the fallback row the owner approved (2026-10-29 12:00).
- **Cost today:** an extension is 38.2 min (40 jobs, 10-28/29, ±0.4). One reference image adds ≈ 2,000 tokens to a row of ≈ 91,000; the estimate is +1.4 min.

## Why the prompt names the picture (the research the owner asked for, 2026-10-29)

**Recommendation: name it, at its first appearance, as what he is to keep — and never with the first-frame alignment line.** The evidence, read today:

| Source | What it says |
| --- | --- |
| ComfyUI's own Ref2VA template note (`docs/references/comfyui/templates/video_minimax_h3_r2v.json`, node 116) | "**prompt**: reference the inputs by tag, in the exact order they were connected, for example `<Picture 1>` … then describe the target scene" |
| ComfyUI's multiframe docs (`docs/references/comfy-docs/minimax-h3-multiframe.md:83–84`) | "`<Picture 1>` is the image connected to the first `ref_images` slot… Pictures connected only to Add Guide nodes… are **not visible to the text encoder**" — so a reference is the only picture the prompt can name in an extension |
| MiniMax's reference guide (`docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md`, §2.1–2.2, §3, §5.3) | an image that only defines a character is cited **inside a subject definition** (`<Subject 1> is the young woman in <Picture 1>, with…`), the task type is `reference generation`, the label is used "at the first clear appearance" and kept in later shots; `fully_preserved` means keep what it defines |
| ComfyUI's official multiframe prompt (the same template, node 138) | follows that guide to the letter: `subject_definitions:` → `<Subject 1> is the woman in <Picture 1>, featuring…` → `summary: [keyframe completion + reference generation]` |
| tritant's extender (`docs/references/community/tritant_…_README.md:318–345`) | "strongly recommended to place a `subject_definitions` block at the **beginning of every clip prompt**… Repeating these definitions… helps MiniMax H3 maintain the intended reference roles" |
| joeygambino's multishot suite (`…joeygambino_…_README.md:655–670, 752–760`) | every reference is declared `<Picture N> is a reference photograph of <Subject 1>` — "with one character that is correct and it is why single-character references work well"; measured: "fl2va lands on a supplied frame and ref2va only **nudges** toward one" (26 dB vs 16 dB) |
| HerrgottMargott's suite (`…README.md:165–180`) | "the masked previous AV context does **not** need to be mentioned in the prompt" — only the picture is named, as the rounds already do |
| Runware, RunDiffusion, Luma (web, 2026-10-29) | "give each reference one job"; name the identity markers to keep (face, hair, wardrobe); references encourage continuity, they do not guarantee it |

**Two things the research rules out.** (1) The I2VA alignment line shot 1 uses — "at 0.00 seconds into the target video, `<Picture 1>` … is fully referenced" — is *keyframe-completion* language: it tells the model frame 0 **is** the picture. In an extension frame 0 is the kept footage (his back), so that line would fight the 90 kept frames and invite a cut at the join. (2) Leaving the picture unnamed: nothing in any source does that; the encoder presents "Picture 1:" before the text and the guides all refer back to it.

**So the rows are, in order** (each ≈ 40 min; the ladder stops at the first that holds):

| Row | Prompt | Checkpoint | Why |
| --- | --- | --- | --- |
| **1** | the rounds' base format, the picture named once at first appearance: *the man in `<Picture 1>` — his face, hair, beard, skin and the whole of his body exactly as pictured — the set and the lighting stay as they are*; the hair clause deleted | Eros Max TURBO (Equinox) | the smallest change against this morning's draw that follows every source above |
| **2** | the same, with the guide's header in front: `subject_definitions:` / `summary: [video continuation + reference generation]` / `retention_analysis:` lines (the text in the notes below) | Eros Max TURBO | the format MiniMax and ComfyUI's own templates use; only if row 1 shows no difference |
| **3** | whichever of 1 or 2 ran last | **PinkCherry** (`--unet pinkcherryMMH3Fl2va_v15Fl2vaRef2va_int8.safetensors`), LoRAs unchanged | the owner's approved fallback: settles whether the checkpoint or the idea is the problem |

## UI Mockup

N/A (no UI change): a flag on the round runner and one experiment.

## Acceptance Criteria

- [x] **`extend.py --ref-image <name>`** (optional; default none, today's graph byte for byte): after `buildGraph` returns, the script adds `ref_image` = `LoadImage(<name>)` and replaces `cond` with `MiniMaxH3ReferenceToVideo` carrying the same `clip`, `vae`, `prompt`, `width`, `height` and `length`, `ref_image_size: "match"` and `"ref_images.ref_image_0": ["ref_image", 0]`. Nothing else in the graph changes: the masked `latent`, the LoRA rewiring, the anchor (when on) chained onto `cond`, the guider, the standalone outputs and the dangling-reference check all stay as they are.
- [x] **A dry-run diff proves it:** `extend.py --no-post --dump` with and without `--ref-image` on the same arguments differ in exactly two nodes (`cond` replaced, `ref_image` added); the dangling check passes both ways. The two dumps and the diff are kept in the round folder.
- [x] **`ext-standalone.sh` passes `REF_IMAGE`** (an env var; empty = off) as `--ref-image`; `chain.sh` exports `REF_IMAGE` from `image.txt` when `REF=1`. **The default stays off** in this story; the Done note says whether to flip it, and the flip is a one-line chore.
- [x] **The manual verification below is run and recorded** in the Done note, row by row, with the date, the checkpoint, the LoRAs, the seed, ComfyUI's minutes against 38.2, the peak memory, the join similarity, and the body check.
- [x] **The answer in one paragraph** in the Done note: does the picture hold his chest at the turn, on which checkpoint, with which wording, at what cost per shot — and whether 082/083 go ahead.

## Technical Notes

- **The graph after the swap** (the continuation branch of `buildGraph`, then this script): `ref_image` → `cond` (`MiniMaxH3ReferenceToVideo`) → [`anchor` (`MiniMaxH3AddGuide`, when on)] → `guider`; `latent` (masked) → `sample`. The reference node's own latent output is unused, as `cond`'s was.
- **Resize:** `match` scales the reference *down only* to the shot's pixel area; `hunk/scene-2.png` is already 1344×768, so it goes in as it is. `max` would change nothing for our keyframes (never scales up).
- **The experiment's files** (`test/26-10-29-1600-hunk/`):
  1. Move this morning's shot 3 aside, or `chain.sh` resumes it: `output-nsfw/video/nsfw-B-3-926611381_00001_.mp4` and `…_poster_00001_.png` → `output-nsfw/video/hunk-T4-smooth/`; `output-nsfw/audio/nsfw-B-3-926611381_new_00001.flac` and `…_preroll_00001.flac` → `output-nsfw/audio/hunk-T4-smooth/`. (Shots 1–2 stay; they are the same files Take 4 and the redraw used.)
  2. `prompts/S3-ref.txt` from `prompts/S3-b.txt` with exactly two edits — the camera sentence's last clause becomes *"the man in `<Picture 1>` — his face, hair, beard, skin and the whole of his body exactly as pictured — the set and the lighting stay as they are for the whole video"*, and the anchor loses *", a smooth chest with only a light trail of dark hair down the centre of his abs"* (leaving *"…huge rounded shoulders, a heavy square chest, a broad tapering back, round tight glutes and strong thighs."*). No other word changes. `S1-ref.txt` and `S2-ref.txt` are copies of `S1-b.txt` / `S2-b.txt` (never drawn: segments 1–2 resume).
  3. Row 2's header, placed before `integrated_multimodal_description:` with a blank line after each block:
     ```
     subject_definitions:
     <Subject 1> is the man in <Picture 1>: his face, hair, beard, skin and the whole of his body as pictured.

     summary:
     [video continuation + reference generation] The target video continues the footage already in frame; <Subject 1> keeps the appearance of <Picture 1> throughout; the set and the lighting stay as they are.

     retention_analysis:
     <Subject 1> (appears in [Shot 1]): fully_preserved - his face, hair, beard, skin and body are exactly as in <Picture 1>; only his pose and position change.
     ```
     and the camera sentence then says *the man, `<Subject 1>`,* at his first appearance.
  4. The run: `REF=1 SEGS=3 ./chain.sh B 926611381 "PenisV2_minimax-h3_epoch60.safetensors:0.45,Male_Anatomy-v2.02-ep4.safetensors:0.4" 10Eros_Max_h3_TURBO-hybrid_beta5_int8.safetensors 8 res_multistep simple -ref` (row 3 swaps the unet argument). `chain.sh` refuses a second join under the same label and seed, so the final is joined by hand or the label gets a suffix — the Done note says which.
- **The comparison:** the chest crop at +8.75 s of shot 3 (≈ 29.5 s of the film; the frame this morning's comparison used) beside the keyframe, the original and the smooth-wording draw; the turn checked at 4 fps from +6 s to the end for a snap toward the keyframe's pose or framing; the full-resolution anatomy check; the face.
- **If row 1 holds, one more row is optional** for attribution: the picture in with the smooth-chest words left in, so the removed words are not credited with the fix. The owner decides whether 40 min of attribution is worth having before 082.

## Testing Plan

- **Unit / integration / e2e:** none — `extend.py`, `ext-standalone.sh` and `chain.sh` are round tooling under `tools/rounds/template/`, outside the app and the gate (the precedent is CHORE_063 and STORY_080's runner change). The flag is off by default, so no existing round's graph changes. `bash -n` on both scripts; the dry-run diff above is the check that the graph is what the AC says; the pre-push hook still runs the full gate.
- **Manual verification (not a gate):** the rows above on the Spark, in order, each recorded as the AC lists. The first second of row 1 is also the test that the combined graph passes ComfyUI's validation.

## Estimated Complexity

Small for the code (≈ 1 h: the flag, the swap, the dry run, the files), then 40 min of GPU per row — one row if it holds, up to three if it does not (≈ 2 h 15 min of GPU at worst). About 2 h to the answer from the go, up to 3 h 30 min with the fallback rows.

## Done note (2026-10-29)

**Code** (12:08–12:09 EDT): `--ref-image` in `tools/rounds/template/extend.py`, `REF_IMAGE` in `ext-standalone.sh`, `REF=1` in `chain.sh`, and the same three edits in `test/26-10-29-1600-hunk/`'s copies; default off. Dry run kept in the round folder (`dryrun-B-3-926611381-{plain,ref}.json`, `dryrun-B-3-926611381.diff.txt`): added `ref_image`, changed `cond` only, `guider.conditioning = cond`, `sample.latent_image = latent`, the prompt identical, no anchor (shot 3 is unpinned) — exactly the AC.

**Row 1** — Eros Max TURBO hybrid beta5 int8 + HMPenis v2 0.45 + Male_Anatomy v2.02 0.4, 8 steps `res_multistep`/`simple`, seed 926611381, shots 1–2 of Take 4 kept, `hunk/scene-2.png` as `<Picture 1>` at `match`, prompt `prompts/S3-ref.txt` (the picture named once in the camera sentence, the hair clause deleted, nothing else changed). ComfyUI prompt `399844d0`, submitted 12:09, landed 12:50.

| Measure | Row 1 (picture) | Same job this morning (no picture, smooth words; `d10fad10`) |
| --- | --- | --- |
| ComfyUI's clock | **41.1 min** | 38.5 min |
| Wall | 41 min | 38 min |
| Peak memory | 68.9 GiB | (shot 2 of the take: 67.4 GiB) |
| Join 2→3 similarity | 0.939 (limit 0.45) | — |
| Chest at the turn (+8.75 s = 29.5 s of the film) | **the keyframe's: smooth pecs, a light central trail** | hair across the pecs, dense on the abs (same as the original) |
| Turn at 4 fps (+6 s to the end) | the scripted turn and the fingers-behind-the-head hold; no snap toward the keyframe's pose or framing | — |
| Anatomy, full resolution, +8.0 / 8.75 / 9.5 / 10.4 s | correct (flaccid, cut, scrotum in place) | — |
| Face | calm; at +10.4 s the slight closed-mouth smile the script asks for, no toothy grin | — |
| Set, lighting, framing | unchanged through the shot | — |

Pictures: `frames/t4-ref1-chest.png` (keyframe · original · smooth words · row 1), `frames/t4-ref1-turn.png`, `frames/t4-ref1-4fps.png`, `frames/t4-ref1-anatomy-face.png`. The joined film is `output-nsfw/video/hunk-B-926611381.mp4`; the two earlier versions sit in `hunk-T4-orig/` and `hunk-T4-smooth/`. Audio seam check on the joined file: FAIL at both joins (click 3.1× / 3.6× against the 3× limit, a dip of 3.3 dB at the first) — the first join is the untouched Take 4 join, so this is the take's standing audio state, not the reference's doing; logged, not fatal, as `chain.sh` says.

**Rows 2 and 3:** not run — row 1 held on the first try, so the guide's header (row 2) and PinkCherry (row 3) were not needed. `prompts/S3-ref2.txt` (row 2's prompt) is left in the round folder for a later wording test.

**The answer.** On Eros Max TURBO with the Equinox LoRAs, the scene keyframe passed as a reference picture — named once in the prompt as `<Picture 1>` with what to keep, and with no words about his chest hair either way — held his chest to the keyframe's at the turn where the same seed drew it hairy twice without the picture. It cost **+2.6 min per extension** (41.1 vs 38.5; the estimate was +1.4) and about +1.5 GiB; the join, the blocking, the anatomy and the face were unaffected. The combined graph (reference + masked prefix, no anchor) ran first time. **082 and 083 go ahead** (Friday, per the owner). Open for the owner: the attribution row (the picture in with the smooth-chest words left in, 40 min) and whether the runner's `REF=1` becomes the rounds' default now.
