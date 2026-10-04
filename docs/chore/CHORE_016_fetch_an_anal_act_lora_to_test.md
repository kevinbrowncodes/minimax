# CHORE_016 — Fetch an anal-act LoRA to test

**Status:** Done (approved 2026-10-03 ~18:30 EDT — "Approved, go"; fetched 18:02 local file time, SHA-256 matched; listed by ComfyUI's LoraLoaderModelOnly)
**Created:** 2026-10-03

## Summary

Add one row to the NSFW container's fetch manifest (`spark/comfyui/nsfw-files.tsv`) for Xabsurd's **"Gay NSFW model for minimax h3" › anal-v1-384** (Civitai model 2898865, version 3279898, file `minimax_h3_t2v_gayanalh3_audio_384_v1_000004000.safetensors`, fileId 3164045, 155,109,920 bytes, fp16, SHA-256 `7335E7749F61A02B76235DFE5D493CB4097E0A21783C0641584FAC783B7267B3`, published 2026-09-06), and fetch it with `spark/comfyui/fetch-nsfw.sh`, so tonight's courtyard test can draw Equinox + this LoRA at 0.2.

## Why

- The owner wants a LoRA that draws the male anus correctly from behind (BACKLOG_014). With no anatomy wording (his rule since 2026-10-03), Equinox draws a closed cleft; the only adapters trained on the male anus in view are two-man act LoRAs.
- Of the five candidates checked on 2026-10-03 with his Civitai token, this is **the only one downloadable now**; the others (Xabsurd's newer "Anal 960²", coachbate's Anal Penetration and Gay Sex, coldwood's rearanalxxx and Lickanus) are Early Access (Buzz) — Lickanus goes free 2026-10-04 01:07 UTC. No Hugging Face mirror exists for any of them.
- Serving config is code (CLAUDE.md §4a): a file on the Spark that is not in the manifest does not exist the next time the box is rebuilt.
- The author's own caveats, recorded so the result is read fairly: "This is an action LoRA, not a character LoRA" (it teaches the act, not a body); this 384 version is the older, low-resolution one he says has colour cast and blurry contact areas; recommended strength 0.75–1.0, trigger `gayanal`, "fl2va more stable". The test runs it at **0.2 without the trigger**, so it may add a partner or pull the pose toward the act — that is what the test looks for.

## Changes

- [x] One row in `spark/comfyui/nsfw-files.tsv` under the LoRAs: dest `loras/minimax_h3_t2v_gayanalh3_audio_384_v1_000004000.safetensors`, source `https://civitai.com/api/download/models/3279898?fileId=3164045`, the SHA-256 and byte count above, note `Xabsurd anal-v1-384 (owner, 2026-10-03; CHORE_016) — courtyard anus test at 0.2`.
- [x] `fetch-nsfw.sh` run on the Spark (the token from `.env`, never printed); the file's SHA-256 verified by the script.
- [x] README › the NSFW container's model table gains the row if it lists LoRAs. *(It does not — the README points at the manifest; nothing to add.)*

## Testing

- **Unit / integration / e2e: none** — the gate does not read `nsfw-files.tsv` (it is the Spark's serving config, a shell manifest), and no TypeScript changes. If `fetch-nsfw.sh` has a manifest-format test (`spark/comfyui/test-*.sh`), it runs green with the new row.
- **Manual verification:** the fetch log shows the row downloaded and its SHA-256 matched; ComfyUI's `LoraLoaderModelOnly` lists the file (`/object_info`); the courtyard test's run.md records the draw.
