# EPIC_004 — A video model runs on the DGX Spark behind the same job API

**Status:** In progress on the Spark from 2026-09-12, in parallel with EPIC_002/003 on the Mac (owner's decision)

## Goal

The UI's configured generation endpoint points at the Spark, and a real video comes back.

## Decision #1 — which model: MiniMax-H3 (2026-09-12)

**The Spark is used in El Salvador (owner, 2026-09-12), which is not an Excluded Territory** under the MiniMax H3 Community License (EU, UK, South Korea, United States). H3's open weights are therefore licensed for it, and this epic builds toward **MiniMax-H3 on the Spark**. The remaining decision is the **flavor** — checkpoint (FL2VA / Ref2VA), precision or quantization, and serving stack — chosen from options with pros and cons the owner reviews before any weights are fetched (owner's instruction, 2026-09-12; see Open question #2 below).

## Decision #2 — H3 flavor: **B, ComfyUI on the Spark with Comfy-Org quantized weights** (owner, 2026-09-12)

The owner chose B over the recommended A. Consequences this epic must carry:

- **The job API is ours to write.** ComfyUI exposes a queue (`POST /prompt`, `GET /history/{id}`, `GET /view`) and a websocket for progress; EPIC_004 adds a small adapter that presents the create → status → result shape the UI and the stub already speak, and maps the UI's ratio, duration and resolution onto a ComfyUI workflow graph. The adapter is the only thing the UI talks to.
- **Launch flags are part of the serving config**: `--disable-mmap` (and the related offload flags) or the Spark loads every safetensors file twice.
- **Precision is a story-level choice** among int8_convrot (Comfy-Org's recommendation for cu130), fp8_scaled and NVFP4 (fastest on Blackwell, lowest fidelity); the first story measures at least two on the same prompt and records time and memory.
- **Both checkpoints are available** (FL2VA and Ref2VA), so the reference's subject-reference behaviour is reachable later without changing the stack.
- Starting points to evaluate, not to adopt blindly: the NVIDIA-forum one-click deploy (Sol-Attn), the SparkyUI container, and Comfy-Org's own MiniMax-H3 tutorial and templates.

The options as presented, kept for the record:

**Facts the options rest on** (sources at the end of this section, read 2026-09-12):

- The Spark: one GB10, 128 GB unified memory (about 121 GB usable), aarch64, compute capability sm_121, CUDA 13. `nvidia-smi` shows no memory column on unified memory; that is normal.
- H3-Base ships in bf16. Each partition (FL2VA or Ref2VA) holds the 33B DiT (~62 GB), the Qwen3-VL-32B text encoder (~64 GB), two VAEs, processor and tokenizer — about 134–144 GB on disk per partition, ~270 GB for both. FL2VA covers text-to-video and first/last-frame image-to-video (what the reference's ShowCase examples do); Ref2VA is for subject/audio/video references.
- **H3-Regenerate-2K and H3-Context-IR are not open-sourced.** Local output is 768 px on the short edge (1344×768 at 16:9), 4–15 s, 24 fps, stereo 32 kHz audio. The reference UI's "2K" option cannot be matched locally — a Departure for EPIC_003.
- MiniMax's own recipes assume 8×B200 or 4×H200; a single GPU means the encoder and DiT cannot both stay resident in bf16, so every single-GPU path either quantizes or streams layers.
- ComfyUI on the Spark loads each safetensors file twice (mmap copy plus device copy from the same pool), halving usable memory unless launched with `--disable-mmap` and related flags; fixes are in progress upstream.

| | Option | Pros | Cons |
| --- | --- | --- | --- |
| **A** | **vLLM-Omni with online FP8 on one Spark** (the community project *MiniMax-H3-DGX-Spark*, Apache-2.0, FL2VA) — **recommended** | Measured on a Spark: ~89 GiB loaded, ~111 s per request, ~81 s with Cache-DiT approximation, at 768×448. Exposes OpenAI-style `POST /v1/videos` (async) and `/v1/videos/sync`, MP4 back — the create → status → result shape our UI and stub already use. | FP8 weights, not bf16 reference quality. Four sm_121-specific patches that may break on vLLM-Omni updates. Only 768×448 benchmarked; 1344×768 time and memory unmeasured. FL2VA only until Ref2VA is added. Needs `--trust-remote-code`. |
| **B** | **ComfyUI on the Spark with Comfy-Org quantized weights** (int8_convrot / fp8_scaled / NVFP4 via a community node pack; the NVIDIA-forum one-click deploy with Sol-Attn, or the SparkyUI container) | The largest Spark community and the most tuning: both FL2VA and Ref2VA, LoRAs, multi-shot and keyframe workflows, NVFP4 speed on Blackwell. Reported ~6 min for a 5 s 720p clip; 15 s at 960×540 NVFP4 in ~9 min of sampling. | A workflow engine, not a job API — we write an adapter over ComfyUI's HTTP/websocket protocol. Memory-doubling flags required. Lowest precision of the four. A GUI process to keep alive. |
| **C** | **SGLang diffusion**, MiniMax's official pinned baseline, single-GPU layerwise-offload mode (bf16 or online FP8) | Reference quality; MiniMax's own `/v1/videos` request shape, identical to their hosted platform. | No Spark validation found. Single GPU streams DiT blocks over the host link every step (consumer-card figures: 8–12 s per step at 480p, i.e. many minutes per clip). aarch64 wheels for `sglang[diffusion]` unverified. |
| **D** | **Diffusers ModularPipeline behind our own small job server** | No third-party patches; full control over precision and offload; bf16 possible. | We build serving, offload and the job queue ourselves. No measurements anywhere. Slowest path to a first video. |

**Recommendation: A**, with B as the fallback if A's patches do not survive the vLLM-Omni version on the Spark. The first EPIC_004 story measures A at 1344×768 · 5 s before anything else is built on it.

Sources: [MiniMax self-host guide](https://platform.minimax.io/docs/guides/local-deploy-h3) · [vLLM-Omni MiniMax-H3 recipe](https://github.com/vllm-project/vllm-omni/blob/main/recipes/MiniMaxAI/MiniMax-H3.md) · [MiniMax-H3-DGX-Spark project](https://github.com/joeynyc/MiniMax-H3-DGX-Spark) · [DGX Spark H3 benchmark](https://ai-muninn.com/en/blog/dgx-spark-minimax-h3-span-upscaler) · [NVIDIA forum one-click deploy](https://forums.developer.nvidia.com/t/dgx-spark-one-click-deploy-for-minimax-h3-12-workflows-sol-attn-acceleration/379894) · [NVIDIA forum memory-doubling thread](https://forums.developer.nvidia.com/t/buyers-beware-dgx-spark-limited-to-64gb-in-comfyui/356573) · [SGLang H3 cookbook](https://lmsysorg.mintlify.app/cookbook/diffusion/MiniMax/MiniMax-H3) · [Comfy-Org repackage](https://huggingface.co/Comfy-Org/MiniMax-H3) · [MiniMax-H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3) · [official GitHub](https://github.com/MiniMax-AI/MiniMax-H3)

## Superseded — open question #1 as first posed (kept for the record)

Read from the official LICENSE on 2026-09-12: **MiniMax-H3**'s Community License excludes the EU, UK, South Korea and the **United States** and forbids use, reproduction, modification, distribution or display of the works and their outputs outside the applicable territory ([README.md → Running the Model](../../README.md#running-the-model)). If the Spark sits in an excluded territory, H3's open weights are not licensed for it. The owner chooses between:

- (a) MiniMax's hosted video API behind the same job interface — keeps the MiniMax model, loses the on-Spark half;
- (b) a different open-weight video model on the Spark whose license permits it.

The decision, and the license terms it rests on (read from the model's own repository that session), are recorded here before the first story is drafted ([CLAUDE.md → §4a](../../CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

## Stories (in implementation order)

| # | Story | Status |
| --- | --- | --- |
| 005 | [One H3 clip renders on the Spark through ComfyUI, and its time and memory are written down](../story/STORY_005_one_h3_clip_renders_on_the_spark_through_comfyui_and_its_time_and_memory_are_written_down.md) | Ready |
| 006 | [The Spark answers create, status and result for a video job, so the UI never talks to ComfyUI directly](../story/STORY_006_the_spark_answers_create_status_and_result_for_a_video_job_so_the_ui_never_talks_to_comfyui_directly.md) | Draft |

Later: a second precision measured against the first on the same prompt; Ref2VA; the UI's env pointed at the Spark with a manual verification note.

## Working on two machines at once

From 2026-09-12 the Spark session works this epic while the Mac session works EPIC_002 and EPIC_003. Rules that keep them from colliding:

- The Spark session touches only `spark/`, `docs/story/STORY_005…`/`006…`, this epic, `spark/README.md`, and the Running the Model section of the root README. It never touches `app/`, `recon/`, or `tools/`.
- The Spark has no recon browser profile and must never run the recon scripts.
- Both sessions commit to `develop` with explicit paths and **pull before every push**; a conflict in the root README is resolved by keeping both machines' sections.
- Weights, outputs and logs live outside the repo on the Spark; `.gitignore` already excludes them, and `git status --short` is read before every commit.
- Story numbers continue the global sequence (005, 006, …); the Mac's EPIC_002 stories take the next free numbers when drafted, so the two sessions must pull before drafting a story.
