# BACKLOG_016 — Hold the face in back shots

**Status:** Open (2026-10-01, the owner: "Might be worth exploring if minimax supports character references… those seem to be key for back videos")
**Priority:** Medium — every back video in the colour round drifted in the face; it cost Male_Anatomy-only's courtyard back video its score (2, "his face changes").

## Summary

In back shots the subject's face is out of view for most of the clip, so when he looks back over his shoulder the model redraws a face from little evidence and it drifts from the photo — older, squarer, sometimes a different man. MiniMax-H3 ships a reference-to-video checkpoint (Ref2VA) that takes pictures as references for a character, and it is already on the Spark: `spark/data/models/diffusion_models/minimax_h3_ref2va_int8_convrot.safetensors` (34.0 GB, SFW models directory; not yet in `models-nsfw/`).

## User impact

Back videos are the ones where likeness fails; a reference that holds the face would make them shippable without relying on a lucky seed.

## Rough scope

1. Read the Ref2VA node (`MiniMaxH3ReferenceToVideo`) and MiniMax's full-reference prompt guide (`docs/references/prompt-guides/…_ref_en`) for how a character reference is passed and worded.
2. A spike: the colour-round back scripts, the same seed, FL2VA (today) against Ref2VA with the subject's face as the reference — does the face hold at every look-back, and does anatomy hold under the different checkpoint? Whether the anatomy adapters (trained on FL2VA or Eros Max) apply to Ref2VA at all is part of the question.
3. Copying the 34 GB file into `models-nsfw/` needs the owner's say-so (weights are precious).

## Dependencies

STORY_016 used the Ref2VA reference path for extensions before STORY_017 replaced it; its notes on the node's inputs and the 2.7× step time apply.

## Open questions

- Does Eros Max have a Ref2VA counterpart, or would reference shots mean the stock checkpoint plus adapters?
- One reference image (the face), or the full photo?
