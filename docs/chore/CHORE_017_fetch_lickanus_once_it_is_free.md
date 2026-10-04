# CHORE_017 — Fetch Lickanus once it is free

**Status:** Done (approved 2026-10-03 18:05 EDT by the multiple-choice tool; fetched 2026-10-04 05:17 UTC on the first attempt, SHA-256 verified by fetch-nsfw.sh)
**Created:** 2026-10-03

## Summary

Add coldwood's **Minimax-H3-T2V_I2V-Lickanus** (Civitai model 2947971, version 3338446, file `H3.LickAnus-000015.safetensors`, fileId 3225017, 298,260,904 bytes, fp32, SHA-256 `236a965094172dcaf2910cdb69345660099056bb0541acca655327e7be995526`) to `spark/comfyui/nsfw-files.tsv` and fetch it with `fetch-nsfw.sh` once its Early Access ends (Civitai's 403 body: deadline 2026-10-04T01:07:11Z = 21:07 EDT), for the courtyard anus test at 0.15 without its trigger.

## Why

- The second anal-act candidate the owner chose for tonight (after CHORE_016's Xabsurd anal-v1-384). Its training captions are all two people (a partner's face at the buttocks, prone on a bed, half mixed-sex), so the test watches for a bed, a partner or a lying pose; 0.15 and no trigger keep its pull small.
- Serving config is code (CLAUDE.md §4a). No Hugging Face mirror exists (searched 2026-10-03).

## Changes

- [x] The manifest row (dest `loras/H3.LickAnus-000015.safetensors`, the Civitai URL with fileId, the SHA-256 and byte count above, a note naming this chore).
- [x] Fetched by `test/26-10-03-1700-courtyard-anus/overnight.sh` after 01:07 UTC (it retries `fetch-nsfw.sh` until the file lands, at most until 03:00 UTC, then skips the Lickanus draws and logs why); SHA-256 verified by the script.

## Testing

- **Unit / integration / e2e: none** — no TypeScript changes; the gate does not read the manifest.
- **Manual verification:** the fetch log line with the SHA-256 match; ComfyUI lists the file; the test's run.md records the draws.
