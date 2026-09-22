# BACKLOG_013 — Image generation on the Spark

**Status:** Open (raised by the owner, 2026-09-22 14:57 EDT: "there was a new qwen image model that just dropped … was thinking about maybe wiring it up here so that minimax can do image generation")
**Priority:** Low — behind [EPIC_010](../epic/EPIC_010_an_nsfw_model_in_its_own_container.md), which is the live queue. Out of MVP scope by [CLAUDE.md §1](../../CLAUDE.md); the MVP epics (001–004) are Done, so this is parkable rather than forbidden. Promotable to a spike or epic on the owner's go; nothing is drafted as stories yet.

## Decision — the licence (owner, 2026-09-22 15:02 EDT)

The assistant flagged the Qwen Research License §2.b commercial-use bar (quoted in full under Open question 1) and named the risk: if output reaches a monetised channel or site, an ordinary reading calls that commercial use.

**The owner's decision: the intended use is not commercial, so §2.b does not bar it, and Qwen-Image-2.1 stays a candidate.** Recorded here because [CLAUDE.md §4a](../../CLAUDE.md) requires a licence judgement of this kind to be written into the ticket rather than left in a session transcript — *"unless the owner decides otherwise in writing."*

Scope of the decision: it settles §2.b only. §4.b (display "Built with Qwen" on anything trained or improved with the model) and §4.c (do not use "Qwen" as a derivative's primary name) are obligations that still attach if we ship anything built on it, and any later change of use — a monetised surface, a paid product — reopens §2.b and this note with it.

## Summary

Add a still-image generation surface to MiniMax Local, served from the Spark in its own container, the way the video model is. The trigger is **Qwen-Image-2.1**, released 2026-09-20 — a unified text-to-image *and* image-editing model whose visual generator is 7B (32 single-stream DiT layers), small enough to sit beside the video stack rather than displace it.

The reference (agent.minimax.io) has its own image surface; nothing here says we clone theirs rather than build our own. That is an open question, not a decision.

## User impact

- Seed images for image-to-video are made on the box instead of sourced elsewhere — the thing that most obviously joins this to existing work, since [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md)'s agent mode already writes a prompt *from* a photo.
- Native RGBA output (an actual alpha channel, straight from the prompt) would give cut-out subjects with no matting step.
- Editing and generation are one model, so "change this one thing about this frame" is the same container, not a second model.

## Rough scope

- A serving container for the image model, on the pattern of `spark/comfyui/` — the model is a dependency, not a fixture ([CLAUDE.md §6 rule 10](../../CLAUDE.md)).
- An image job behind the **same async job API** the video adapter already speaks ([docs/contracts/job-api.md](../contracts/job-api.md)): create → poll → fetch. If the contract can carry an image job unchanged, this is much smaller than it looks; if it cannot, that is its own story.
- A UI surface for it, and its history/gallery.
- The memory arithmetic re-derived before anything is fetched ([CLAUDE.md §4a](../../CLAUDE.md)).

## Dependencies

- [EPIC_010](../epic/EPIC_010_an_nsfw_model_in_its_own_container.md) is Proposed and its stories are the live queue. One ticket at a time.
- The container-switching machinery from STORY_063 is the precedent for a third tenant on the box.

## Open questions

1. **The licence, and it decides everything else.** Read from the model's own repository on 2026-09-22 (`https://huggingface.co/Qwen/Qwen-Image-2.1/raw/main/LICENSE`): the **Qwen Research License Agreement**, §2.b — *"You shall not use the Materials for any commercial purpose without obtaining a separate commercial license from us."* §4.b requires "Built with Qwen" displayed on anything trained or improved with it; §4.c bars "Qwen" as the primary name of a derivative; §4.a notes export-control exposure. No content/acceptable-use restriction appeared in the LICENSE file itself.
   This is a **change from the original Qwen-Image**, whose LICENSE, read the same day, is **Apache-2.0** (commercial use permitted).
   **Settled** by the owner on 2026-09-22 — see Decision above. Non-commercial use, so §2.b is not a bar and 2.1 is a candidate. §4.b and §4.c still attach.
2. Which model, now that (1) is settled: Qwen-Image-2.1 is the front-runner, with the Apache-2.0 original Qwen-Image as the fallback if anything about the use changes. Whether a third model beats both is still a spike's question, alongside the measurements below.
3. Does the existing job-API contract carry an image job, or does it need a version bump? (Contract-version pact with the other session — see [EPIC_010](../epic/EPIC_010_an_nsfw_model_in_its_own_container.md).)
4. Coexistence: can the image container stay resident beside ComfyUI, or does it join the stop/start switch cycle? Measured, not assumed.
5. Do we clone the reference's image surface or design our own?

## Not yet established

- ComfyUI support: third-party write-ups claim day-zero, **the model card did not confirm it**. Diffusers day-zero (`QwenImage21Pipeline`) is on the card. Quantised builds exist on Hugging Face (GGUF repos are published); none has been checked on arm64.
- No generation time, step count at quality, or peak memory on a GB10 has been measured by us. The card's quick-start uses 40 steps; that is the card's number, not ours.
