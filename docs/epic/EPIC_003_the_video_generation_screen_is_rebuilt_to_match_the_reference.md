# EPIC_003 — The video generation screen is rebuilt to match the reference

**Status:** Stories drafted 2026-09-12 (implemented on the Spark; owner approved proceeding without per-story review)

## Goal

Our own implementation of the MVP flow from [README.md → MVP Scope](../../README.md#mvp-scope), each surface a clone story citing its EPIC_001 capture, built against the stub generation server, with the model endpoint as configuration.

## Stories

Drafted 2026-09-12 from EPIC_001's component inventory, one per surface/state group, numbered in implementation order. Every story carries a **Departures from the reference** section ([CLAUDE.md → §6 rule 8](../../CLAUDE.md#6-key-rules)).

| # | Story | Status |
| --- | --- | --- |
| 012 | [The app shell matches the reference: sidebar, top bar and design tokens](../story/STORY_012_the_app_shell_matches_the_reference_sidebar_top_bar_and_tokens.md) | Done (2026-09-12) |
| 013 | [The composer and its video mode match the reference, with reference-image upload and the options the Spark supports](../story/STORY_013_the_composer_and_video_mode_match_the_reference_with_reference_image_upload.md) | Ready |
| 014 | [A submitted job becomes a task page that shows progress, plays the result, can be cancelled, and is kept in history](../story/STORY_014_a_submitted_job_becomes_a_task_page_that_shows_progress_plays_the_result_and_is_kept_in_history.md) | Ready |
| 015 | [Assets lists every finished video with a poster, a preview modal and download](../story/STORY_015_assets_lists_every_finished_video_with_a_poster_preview_and_download.md) | Ready |

**Shared departures** (each story repeats the ones it touches): no agent thread, no billing, no ShowCase, out-of-MVP rows rendered inert, the session id in the path, 768P only and one model from `/api/capabilities`.

**The end-to-end trial (owner, 2026-09-12 evening):** once 015 lands, one 10 s image-to-video job is run through the real UI with the owner's `spark/data/input/01.jpg` and his prompt (`01-prompt.txt`) against the adapter and ComfyUI, driven by Playwright against the production container, and left in history for him to open in the morning.
