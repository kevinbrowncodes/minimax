# BACKLOG_010 — The shot-change notice tells a camera move the prompt asked for from a cut the model made

**Status:** Open — remedies 1–3 **built** by [STORY_046](../story/STORY_046_the_shot_change_notice_tells_a_camera_move_the_prompt_asked_for_from_a_cut.md) (Done 2026-09-16 17:25 EDT, struck through below); remedy 4 (the measurements on the page) stays here until built or withdrawn (CLAUDE.md §3c: partial delivery keeps the item open). Calibrating it found [BUG_010](../bug/BUG_010_the_three_second_shot_change_rule_measures_only_the_first_three_seconds.md) (the node's three-second series has one value), fixed first · **Priority:** Medium — every handheld or moving-camera prompt shows the amber notice on a clip that did what it was told, and the owner asked why (2026-09-16: "I often see these yellow boxes… can you help me understand why")

## Summary

[STORY_020](../story/STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md)'s check measures the picture's outer border one second apart and calls a change of 30 or more a shot change. It was calibrated on static-camera clips and STORY_020 scoped it that way in writing: *"it assumes a static camera, which every one of the owner's scripts asks for; a prompt that moves the camera … moves the border too, so the notice must say 'the set or the framing changed', never 'a cut', and a later story can gate the check on the prompt's camera language."* This is that later story's backlog item.

The first prompt that asks for a moving camera arrived on 2026-09-16 (`test/26-09-17-0800_office`, a handheld selfie that follows the subject as he leans to a desk). Draw 1 (`ecb286a6`) is one continuous shot — the frames either side of each flagged time are near-identical — and the notice reads **"The shot changed at 00:01, 00:04 and 00:08 — the set or the framing is no longer what it was. Retry generates this again with a new seed."** Measured: 158 of 219 one-second windows at or over 30, peak 48.6 at 2.7 s (the lean), largest **single-frame** step 14.8. The static-camera draws before it (STORY_044's chain) peak at 4.8 over a second and 3.2 in a frame. STORY_020's calibration table lists changes over **one second** (cuts 50.0–57.9), not in one frame; measured for this item on 2026-09-16 with the node's arithmetic re-run over the clips on disk (`border.py`, the session's scratchpad): the real cuts step **46.5–49.7 in one frame** (`2f980101` f142 49.7; `7f201441` f142 49.4 and its fast dissolve f278 47.0; `98eb33ca` the same two), the handheld draws peak at **14.6** (`ecb286a6`) and **15.7** (`f468d9b8`), a held shot at 2.4 (`d333b5a1`), BUG_006's slow dissolve at 2.8 (`81354423`). A single-frame threshold of 30 sits 2× above the handheld draws and at 0.65 of the smallest cut.

## User impact

The notice is a defect signal ("Retry"), and on a moving-camera prompt it fires on success. The owner cannot tell from the page whether the model wandered or the camera did what the prompt said, so either he retries a good draw or he learns to ignore the notice — and then misses the real cut it was built to catch. The director skill already tells prompt writers to expect the false alarm (`agents/skills/minimax-h3-director-thirst-trap/SKILL.md` → Known behaviour on our box), which is a workaround written down, not a product.

## Rough scope (remedies; any subset can ship, the item stays open until all are built or withdrawn)

1. ~~**A single-frame rule for real cuts.**~~ *(built, STORY_046)* A border step of ≥ 30 in one frame (cuts 46.5–49.7, handheld ≤ 15.7, see above) is reported as a **cut** regardless of the camera; the existing one-second and three-second rules keep catching dissolves and set changes. `Cut` grows a `kind: "cut" | "framing"` so the app can word each differently.
2. ~~**The prompt's camera language gates the framing rules.**~~ *(built, STORY_046)* When the prompt declares a move in MiniMax's vocabulary (`push in`, `pull out`, `pan`, `tilt`, `tracking shot`, `handheld`, `sway`, `follows`) the adapter still measures but reports framing events as `expected: true`; when it declares `static shot` / `holds a perfectly static shot`, as today.
3. ~~**The notice's words follow the kind.**~~ *(built, STORY_046 — the note's words: "The framing moved at …, as the prompt asked; no cut.")* A cut: today's amber strip with Retry. An expected framing move: no strip, or a quiet grey line under the player ("The framing moved at 00:01, 00:04 and 00:08, as the prompt asked") with no Retry. An unexpected framing move on a static prompt: today's strip.
4. **The measurements are visible.** *(stays in backlog)* The task page (or the Inbox event) can show the peak one-second change and the largest single-frame step, so a flagged draw can be judged without a frame strip.

## Dependencies

STORY_020 (the node, `cuts.ts`, `CutNotice.tsx`); BUG_006 (the three-second rule); the adapter's `Cut` type is shared with the app's `job-api.ts`; a calibration pass over the moving-camera draws as they accumulate (the office round's three draws are the first data).

## Open questions

- Is 30 for the single-frame rule safe against a fast whip-pan? None generated yet; the office round's handheld draws peak at 14.7–15.8 in a frame, and the largest non-cut step on disk is a 2026-09-14 seam at 23.6 (STORY_046's Done note has the table of all 43 clips).
- Should remedy 2 read the prompt, or should the composer expose a camera control (static / move) that the adapter trusts? The reference has no such control; reading the prompt keeps the composer as captured.
- ~~Does an expected framing move still deserve the Inbox event STORY_033 sends for a flagged job?~~ Decided in STORY_046: no — "Your video is ready" is the whole news.
