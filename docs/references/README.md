# References — MiniMax H3, as served on the Spark

A local copy of everything public that explains the model this project runs, fetched **2026-09-13** by [`fetch.sh`](fetch.sh) (CHORE_002). Text and JSON only — weights, videos and images stay in the gitignored `spark/data/`. Paths here are what stories cite; a site can change or vanish without the citation rotting.

**What does not exist as of 2026-09-13, checked while fetching:** MiniMax has published **no technical report and no PDF** for H3 (the model card's News section lists only the prompt-writing skills; the announcement post is the closest thing to a paper). MiniMax's API has **no video-extension endpoint** — one task makes at most 15 s ([api-reference/minimax-api_video-generation.md](api-reference/minimax-api_video-generation.md)); "30 s with extension" claims on third-party sites are not in the official docs. The reference UI's Extend, if it has one, was never captured (see BACKLOG_001 / STORY_016).

## Start here

| Question | Read |
| --- | --- |
| What is H3, what does it take in, what does it put out | [raw/model-card_MiniMaxAI_MiniMax-H3.md](raw/model-card_MiniMaxAI_MiniMax-H3.md) — variants (FL2VA first/last frame, Ref2VA omni-reference), input limits, the three-module system (Context-IR → Base → Regenerate-2K; only Base is open), architecture (encoder, video and audio VAEs, omni-transformer) |
| May we run it here | [raw/LICENSE_MiniMax-H3.txt](raw/LICENSE_MiniMax-H3.txt) — the MiniMax H3 Community License, dated 2026-08-02, with its Excluded Territories (EU, UK, South Korea, US); El Salvador is not one (EPIC_004 decision #1) |
| How to write a prompt it understands | [prompt-guides/](prompt-guides/) — MiniMax's official guides: `base_en` (T2VA / I2VA / FL2VA / L2VA: the instruction line, the three fields, shots and cuts, camera motion, dialogue, on-screen text, soundscape, music) and `ref_en` (Ref2VA subject definitions and `<Picture N>` tags); ComfyUI's summary in [comfy-docs/minimax-h3-prompt-guide.md](comfy-docs/minimax-h3-prompt-guide.md) |
| What the code that runs on the Spark actually does | [comfyui/](comfyui/) — the H3 nodes, model, VAEs and text encoder from **our** ComfyUI image (v0.35.1, commit 856a922), plus the three PRs that added them |
| How ComfyUI expects H3 to be wired | [comfyui/templates/](comfyui/templates/) — the six official local workflows, and [comfy-docs/](comfy-docs/) — ComfyUI's H3 guides |
| How MiniMax serves it themselves | [api-reference/](api-reference/) — the hosted API (v2 create / query / list / delete, Context-IR, 2K regeneration) and the self-hosting guide (ComfyUI or SGLang) |

## The files

### `raw/` — MiniMax and Comfy-Org, verbatim

| File | What | Source | License |
| --- | --- | --- | --- |
| `LICENSE_MiniMax-H3.txt` | The MiniMax H3 Community License Agreement (2026-08-02) | huggingface.co/MiniMaxAI/MiniMax-H3 `LICENSE` | itself |
| `model-card_MiniMaxAI_MiniMax-H3.md` | The official model card: variants, specs, architecture, deployment (SGLang, vLLM), reproducible 768p cases, the 2K workflow, prompting guidance | huggingface.co/MiniMaxAI/MiniMax-H3 `README.md` | MiniMax H3 Community License |
| `github_MiniMax-AI_MiniMax-H3_README.md` | The GitHub README (same content as the card plus the skills note and local `file://` conditions) | github.com/MiniMax-AI/MiniMax-H3 | same |
| `model-card_Comfy-Org_MiniMax-H3.md` | Comfy-Org's repackaged weights: which file is which (bf16, int8_convrot, fp8_scaled, pruned; text encoders incl. nvfp4_awq; VAEs; turbo LoRAs; embeddings; Fun ControlNet) | huggingface.co/Comfy-Org/MiniMax-H3 `README.md` | same (`license_name: minimax-h3-community-license-agreement`) |
| `minimax-api_llms.txt`, `comfy-docs_llms.txt` | The two doc sites' page indexes (every page has a `.md` twin, which is how the pages below were fetched) | platform.minimax.io/docs, docs.comfy.org | — |

### `model-config/` — the shipped configs (small JSON)

`FL2VA_model_index.json`, `FL2VA_transformer_config.json` (the 33B DiT's shape), `FL2VA_text_encoder_config.json` (Qwen3-VL-32B), `FL2VA_video_vae_config.json`, `FL2VA_audio_vae_config.json` + `metadata.json`, `Ref2VA_model_index.json`, `Ref2VA_transformer_config.json`. From huggingface.co/MiniMaxAI/MiniMax-H3, MiniMax H3 Community License.

### `prompt-guides/` — MiniMax's official prompt-writing skill

`h3-prompt-writing_SKILL.md`, `VIDEO_PROMPT_WRITING_GUIDE_base_en.txt`, `VIDEO_PROMPT_WRITING_GUIDE_ref_en.txt` — from github.com/MiniMax-AI/MiniMax-H3 `.claude/skills/h3-prompt-writing/` (the model card links the same texts under `docs/`). MiniMax H3 Community License.

### `api-reference/` — MiniMax platform docs (Mintlify `.md` pages)

| File | Page |
| --- | --- |
| `minimax-api_video-generation.md` | Video Generation guide: MiniMax H3 (768P/2K, 4–15 s) and H3 Max (480P/768P, 5–15 s), first/last frame, ≤ 9 images / 3 videos / 3 audios, prompt ≤ 7000 characters |
| `minimax-api_video-generation-v2-create.md`, `…-v2-query.md`, `…-v2-list.md`, `…-v2-delete.md` | The v2 task API (content array of text / image / video / audio; async task id; polling; cancel/delete) |
| `minimax-api_video-generation-v2-h3-context-ir.md` | Context-IR: turns multimodal context into the structured prompt H3 wants (not open-sourced; the prompt guides describe the same structure) |
| `minimax-api_video-generation-v2-regeneration.md` | Regenerate a 768P H3 result at 2K (not open-sourced — the reason our "2K" option is a Departure) |
| `minimax-api_video-prompt.md` | "H3 Feature Highlights" — a gallery of representative prompts and what they demonstrate |
| `minimax-api_local-deploy-h3.md`, `minimax-api_local-deploy.md` | Run and self-host H3: ComfyUI path and the SGLang H3-Base service |
| `minimax-api_models.md` | Release notes for MiniMax's models |

© MiniMax, copied for reference.

### `comfy-docs/` — ComfyUI's H3 documentation (docs.comfy.org, `.md` pages)

| File | Page |
| --- | --- |
| `minimax-h3.md` | The H3 guide: model files, the template library, native resolution 1344×768 (0.98 MP, multiples of 32), Sage Attention |
| `minimax-h3-native.md` | The native workflows in depth: T2V, I2V, R2V, prompting tips, **"Anchoring guides at any frame (#15439)"** and **"Inpainting and extension with latent noise masks (#15375)"** |
| `minimax-h3-multiframe.md` | The Multiframe Reference workflow: chained Add Guide nodes pin stills (and audio) at frame indexes; `frame_idx = round(seconds × 24)` |
| `minimax-h3-fun-controlnet.md` | Fun ControlNet Union (Canny, Depth, HED, MLSD, Pose) and video inpainting with masks |
| `minimax-h3-prompt-guide.md` | ComfyUI's summary of MiniMax's prompt guides, plus the community style embeddings |

© Comfy Org, copied for reference.

### `comfyui/` — the implementation that runs here

| Path | What |
| --- | --- |
| `comfy_extras/nodes_minimax_h3.py` | The nodes: `EmptyMiniMaxH3LatentAV`, `MiniMaxH3ImageToVideo` (t2va / fl2va), `MiniMaxH3ReferenceToVideo` (ref2va), `MiniMaxH3AddGuide`, `MiniMaxH3SigmaShift`, the Fun ControlNet nodes; the 17k+5 frame rule (`align_frame_count`), 768 short edge, 32-pixel canvas, `MAX_PIXELS = 768 × 1344`, 24 fps, audio latent 40 fps |
| `comfy/ldm/minimax/model.py`, `vae.py`, `audio_vae.py`, `controlnet.py` | The DiT (`FRAME_PER_TOKEN`, `FRAME_RESCALE`, keyframe injection), the video VAE, the audio VAE, the ControlNet patch |
| `comfy/text_encoders/minimax.py` | The Qwen3-VL-based encoder with per-token modality tags |
| `LICENSE` | ComfyUI's GPL-3.0 — these files are copies from `minimax-spark/comfyui:v0.35.1` (ComfyUI commit 856a922), kept for reading; nothing here is linked into the app |
| `PR-15224.md`, `PR-15439.md`, `PR-15375.md` | The PR descriptions: H3 support; Add Guide at any frame ("feed the first 22 frames of an existing video plus its audio into one AddGuide at frame_idx 0 and the model generates the continuation of both streams"); per-token latent noise masks ("extending a clip while keeping the existing content stable") |
| `templates/video_minimax_h3_{t2v,i2v,i2v_continuation,r2v,multiframe_reference,fun_controlnet_union}.json`, `templates/image_to_video_minimax_h3.json` | The six official local workflows (UI format) and the I2V subgraph blueprint our `spark/comfyui/h3_t2v_prompt.json` was derived from. Fetched from github.com/Comfy-Org/workflow_templates `main`; the image ships the same six in `comfyui-workflow-templates-json 0.1.74`. Note: `i2v_continuation` is an image-to-video product-shot template (a 2 s turbo I2V), **not** a video continuation |
| `examples/PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json` | The community "masked video and audio extensions" workflow attached to PR #15375: Ref2VA segments chained with a 22-frame overlap that is cut at the join (`ImageBatchExtendWithOverlap`, `TrimAudioDuration 0.925 s`, `AudioConcat`) — "repeat this pattern for unlimited length videos" |
| `examples/PR15375_droz_MiniMaxH3_PerRowMasking_Example_v2.json`, `examples/PR15439_video_minimax_h3_r2v_addguides_v1.json` | The other example workflows attached to those PRs |

### `community/` and `blog/`

| File | What | License |
| --- | --- | --- |
| `community/joeynyc_MiniMax-H3-DGX-Spark_README.md` | The vLLM-Omni FP8 route on one DGX Spark (EPIC_004 option A): measured memory and times, sm_121 patches | Apache-2.0 (code); the model is not |
| `community/sglang_cookbook_MiniMax-H3.md` | The SGLang diffusion cookbook page MiniMax's card points at (option C) | © LMSYS |
| `blog/minimax-h3-blog.html`, `blog/minimax-h3-blog.md` | "MiniMax H3: An Open Model Breaking the Boundaries Between Tasks and Modalities" — the announcement (2026-07-31); the `.md` is text extracted from the HTML | © MiniMax |

## What these say about continuing a video (the basis of STORY_016)

- The mechanism is `MiniMaxH3AddGuide` ([nodes_minimax_h3.py](comfyui/comfy_extras/nodes_minimax_h3.py)): an image batch of 5, 22, 39… frames (17k+5; shorter batches use one frame) is VAE-encoded and injected as a keyframe latent at `frame_idx` (negative counts from the end), optionally with audio anchored at the same index and cropped to the remaining duration. Chained nodes anchor several frames.
- ComfyUI's docs and the PR say it outright: the first 22 frames of an existing video plus its audio at frame 0 → the model continues both streams ([comfy-docs/minimax-h3-native.md](comfy-docs/minimax-h3-native.md), [PR-15439.md](comfyui/PR-15439.md)). For *extending*, the guide is the source's **last** 22 frames.
- The community extension workflow does the join the obvious way: cut the 22 overlapping frames (≈ 0.92 s) from the new segment, concatenate frames and audio ([examples/PR15375_…BasicMaskedExtension_v1.4.json](comfyui/examples/PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json)). It uses Ref2VA weights; ours are FL2VA — STORY_016's manual verification is where that difference gets measured.
- A second route exists — per-token latent noise masks (`denoise_mask` on the sampler, PR #15375) — for regenerating part of a clip while keeping the rest; more machinery, deferred.
- `LoadVideo` (`comfy_extras/nodes_video.py` in the image) accepts `"<path> [output]"`, so a finished clip in ComfyUI's output directory can feed a new graph without an upload (`folder_paths.annotated_filepath`).

## Refreshing

`docs/references/fetch.sh` re-fetches everything (curl for the sites, `docker cp` from the ComfyUI image for the sources). Run it, update the date at the top of this file, and read the diff before committing — a changed page is a changed fact.
