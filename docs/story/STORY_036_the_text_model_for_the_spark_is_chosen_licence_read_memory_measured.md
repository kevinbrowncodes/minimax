# STORY_036 — The text model for the Spark is chosen: licence read, memory measured

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — [BACKLOG_006](../backlog/BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md)'s first story
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6"); **the pick itself is the owner's, in writing, before any weights are fetched**
**Created:** 2026-09-15

As the owner, I want a text model served on the Spark — MiniMax's own if one fits, otherwise the smallest capable open model that does — chosen from licences read that day and memory measured on the box, so that the chat and the agents run locally.

## Current state

Nothing serves text on the Spark. The video model (ComfyUI, started per run) peaks at 64–97 GiB of the 121 GiB; the owner's other containers stay stopped. BACKLOG_006 lists what is known from memory: MiniMax's M2-line text models are ≈ 230B-parameter MoEs (≈ 115 GB at 4-bit), the reference's M2.7 / M3 are of unknown availability.

## UI Mockup

N/A (no UI change) — this story produces a decision, a serving container and measurements; STORY_037 consumes them.

## Acceptance Criteria

- [ ] **Candidates, read that day from their own repositories:** MiniMax-M2.5 / M2.1 / M2 (and M2.7 / M3 if published), plus two smaller open models that fit beside the video model (e.g. a Qwen3 30B-A3B / 14B class and a Gemma/Llama class — the story names them); for each: licence name and terms (territory, commercial use), parameter count, weight size at the quantisation that fits, the serving stack that runs it on arm64 + CUDA 13, and whether it can run beside a video job or only between jobs. The table goes in the story and the README's Running the Model section.
- [ ] **The owner picks** (a line in this story with the date). Nothing is fetched before that line exists.
- [ ] **Served and measured:** the pick runs in a container defined in `spark/llm/` (Dockerfile, `run.sh` / `stop.sh` like ComfyUI's, weights under `spark/data/models`, gitignored) behind an OpenAI-compatible HTTP API on `127.0.0.1` and the `minimax` docker network; measured on the Spark: memory at rest and at 8k context, tokens/s, time to first token, and whether a video job and the model coexist — written in the README's memory split.
- [ ] The gate stays model-free (no test touches the LLM container).

## Departures from the reference

- The reference's models are MiniMax-M3 / M2.7 in the cloud; ours is whatever fits the Spark.

## Technical Notes

- Serving: `llama.cpp` (server) or `vLLM` — whichever has a working arm64 CUDA 13 image; measured in the story.
- The memory arithmetic per CLAUDE.md §4a: weights + KV cache at the served context + headroom, beside the video model's 70 GiB or not.

## Testing Plan

- **Unit / Integration / E2E:** not applicable — no app code; the container's `run.sh` has a smoke test (`curl` a completion) like ComfyUI's `smoke.sh`.
- **Manual verification:** the measurements above, on the Spark, dated in the Done note.

## Estimated Complexity

Large (a serving stack on the Spark).
