# BACKLOG_005 — A local prompt rewriter expands a short script the way MiniMax's cloud does

**Status:** Open (2026-09-14) · **Priority:** Medium — the last part of "MiniMax's preferred way" we cannot do locally today

## Summary

MiniMax's own examples never hand H3 a short prompt. Their cloud runs **H3-Context-IR**, a hosted multi-stage rewriter (a vision-language model plus prompt logic) that turns the user's words and image into the model's full format: the instruction line, one `[Shot N]` block per shot with style, composition, subject, set and action, the soundscape and the music fields — 350–700 English words for a 5–10 s clip ([model card](../references/raw/model-card_MiniMaxAI_MiniMax-H3.md); [reference guide §5.2](../references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_ref_en.txt)). "Because H3-Context-IR relies on a multi-stage workflow and multiple hosted models and services, it is not included in this open-source release" (model card). STORY_020 gives the model the *structure* of its format around the owner's words; the *length and scene detail* still come only from what the owner types (his scripts are 160–180 words).

## User impact

A short prompt leaves the model to fill most of a ten-second clip from its own multi-shot prior — the root of the on-its-own cuts STORY_020 mitigates and flags. A rewriter would describe the reference image's set, lighting and subject the way MiniMax's examples do, so the model has less to invent.

## Rough scope

- A rewriter container on the Spark (an open VLM that fits beside the model — the memory split must be re-derived; or a rewrite step run *before* the model is loaded) that takes the prompt + first frame and emits base-format text; the composer shows the rewritten prompt for the owner to edit before submitting (the reference's "prompt optimisation" toggle is the surface to match, if its capture exists).
- The job record keeps both the owner's text and what was sent.

## Dependencies

STORY_020 (the format), EPIC_005's recon (whether and how the reference shows prompt rewriting). The Qwen3-VL text encoder on disk is truncated to 50 layers and cannot generate text.

## Open questions

Which VLM; whether the owner wants to see and edit the rewrite every time or only on request; memory.
