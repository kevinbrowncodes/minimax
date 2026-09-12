# EPIC_002 — The app has a skeleton, a stub generation server, and a test gate before any screen is built

**Status:** Stories drafted 2026-09-12 (implemented on the Spark, in containers; owner's decision that the whole product runs on the Spark)

## Goal

The testing foundation CLAUDE.md refers to: a Next.js + TypeScript app skeleton with `strict: true`, the stub generation server (async job API: create → status → result, with scripted outcomes and a tiny fixture video), Vitest unit and integration lanes, a Playwright e2e lane that starts the stub itself, coverage floors, and the Husky pre-push hook that runs the seven-step gate from [CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow).

## Why here

Stack choice waits for EPIC_001's confirmation of what the reference is built with (Next.js App Router, observed 2026-09-12). The gate must exist before the first clone story so that story ships with tests rather than promising them.

## Stories

Drafted 2026-09-12 from the expected shape. Numbers continue the global sequence and match the implementation order; STORY_006 (EPIC_004's adapter) lands after 011 because it is written against the contract STORY_008 defines.

| # | Story | Status |
| --- | --- | --- |
| 007 | [The app skeleton builds and serves a page from a container on the Spark](../story/STORY_007_the_app_skeleton_builds_and_serves_a_page_from_a_container_on_the_spark.md) | Done (2026-09-12) |
| 008 | [A stub generation server plays the video job API with scripted outcomes, so no test needs the model](../story/STORY_008_a_stub_generation_server_plays_the_video_job_api_with_scripted_outcomes.md) | Ready |
| 009 | [The app reaches the generation server only through its own API routes, proven against the stub](../story/STORY_009_the_app_reaches_the_generation_server_only_through_its_own_api_routes.md) | Ready |
| 010 | [Playwright drives the built app against the stub, inside the gate container](../story/STORY_010_playwright_drives_the_built_app_against_the_stub_inside_the_gate_container.md) | Ready |
| 011 | [The seven-step gate runs on every push from one script, with coverage floors](../story/STORY_011_the_seven_step_gate_runs_on_every_push_from_one_script_with_coverage_floors.md) | Ready |

**Containers first (owner, 2026-09-12):** the toolchain is an image (`tools/gate/Dockerfile`: Node 26, pnpm, Playwright's browsers); the app is an image; the stub is a service; the gate runs inside the gate container; nothing Node-related is installed on the Spark. The owner opens the UI from a browser on the LAN.
