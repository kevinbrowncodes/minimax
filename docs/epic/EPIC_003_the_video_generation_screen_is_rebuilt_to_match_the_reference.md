# EPIC_003 — The video generation screen is rebuilt to match the reference

**Status:** Done (2026-09-12) — four stories landed on the Spark in one evening; the end-to-end trial with the owner's image is recorded below

## Goal

Our own implementation of the MVP flow from [README.md → MVP Scope](../../README.md#mvp-scope), each surface a clone story citing its EPIC_001 capture, built against the stub generation server, with the model endpoint as configuration.

## Stories

Drafted 2026-09-12 from EPIC_001's component inventory, one per surface/state group, numbered in implementation order. Every story carries a **Departures from the reference** section ([CLAUDE.md → §6 rule 8](../../CLAUDE.md#6-key-rules)).

| # | Story | Status |
| --- | --- | --- |
| 012 | [The app shell matches the reference: sidebar, top bar and design tokens](../story/STORY_012_the_app_shell_matches_the_reference_sidebar_top_bar_and_tokens.md) | Done (2026-09-12) |
| 013 | [The composer and its video mode match the reference, with reference-image upload and the options the Spark supports](../story/STORY_013_the_composer_and_video_mode_match_the_reference_with_reference_image_upload.md) | Done (2026-09-12) |
| 014 | [A submitted job becomes a task page that shows progress, plays the result, can be cancelled, and is kept in history](../story/STORY_014_a_submitted_job_becomes_a_task_page_that_shows_progress_plays_the_result_and_is_kept_in_history.md) | Done (2026-09-12) |
| 015 | [Assets lists every finished video with a poster, a preview modal and download](../story/STORY_015_assets_lists_every_finished_video_with_a_poster_preview_and_download.md) | Done (2026-09-12) |
| 016 | [A finished video can be extended: the model continues it from its last second, and the longer clip plays in place](../story/STORY_016_a_finished_video_can_be_extended_the_model_continues_it_from_its_last_second_and_the_longer_clip_plays_in_place.md) | Done (2026-09-13) — owner-requested, promoted from BACKLOG_001; not MVP scope; the real chain ran the same day (BUG_002, BUG_003, CHORE_003 found and fixed by it) |
| 017 | [Extending a video keeps the scene, because the new frames are generated as part of the same clip](../story/STORY_017_extending_a_video_keeps_the_scene_because_the_new_frames_are_generated_as_part_of_the_same_clip.md) | Drafted (2026-09-14) — researched replacement for STORY_016's mechanism (native masked continuation on FL2VA); not MVP scope |

**Shared departures** (each story repeats the ones it touches): no agent thread, no billing, no ShowCase, out-of-MVP rows rendered inert, the session id in the path, 768P only and one model from `/api/capabilities`.

**The end-to-end trial (owner, 2026-09-12 evening) — done, 2026-09-12 19:42–20:33 local.** `app/playwright.trial.config.ts` + `app/e2e-trial/real-trial.spec.ts` (not part of the gate) drove the **production** UI container from the gate container's Chromium over the compose network: opened the home page, chose Video generation, set 16:9 · 768P · 10 s, uploaded `spark/data/input/01.jpg` through the reference tile, pasted the owner's prompt (`01-prompt.txt`), pressed Send, followed the task page (`Queued…`, `Generating… 2 % … 95 %`, `Your video is ready`), asserted the video element playable (readyState 4), clicked Download, and found the clip in Assets. Job `2bc60a18…`: **51 min 0 s** submit → ready (first sampling step ≈ 155 s, then ≈ 100 s per step, decode ≈ 3 min), **2 302 340 bytes**, h264 1344×768 24 fps + aac 32 kHz stereo, **10.125 s**; peak memory **68.0 GiB** (1526 samples). `cosmos3-api` and `spark-primary` were stopped by name for the run (owner's word) and started again at 20:34; the entry stays in the UI's history and Assets for the owner to open. One detour: Chromium refuses plain HTTP to a host named `app` (the `.app` TLD is HSTS-preloaded), so the trial targets the container name `minimax-app`.
