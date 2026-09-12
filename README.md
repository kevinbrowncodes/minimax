# MiniMax Local

> A self-hosted video generation workstation: a web UI that recreates the video generation surface of [agent.minimax.io](https://agent.minimax.io), backed by a video generation model served on the owner's NVIDIA DGX Spark.

> This README is the source of truth for **what the project is**. How we work (tickets, testing bar, gates, guardrails) lives in [CLAUDE.md](CLAUDE.md).

**Status (2026-09-12):** greenfield. Nothing below the MVP Scope and Architecture sections is decided yet; each `TBD` is filled in by the story that settles it.

---

## Purpose

Generate videos locally on a DGX Spark, through an interface that matches the MiniMax agent web app's video generation flow, instead of paying per generation in their cloud or using a generic frontend.

## MVP Scope

**In scope — the video generation flow, end to end:**

- Prompt entry, with reference image attachment (text-to-video and image-to-video)
- The generation options the reference exposes (model, duration, resolution, aspect ratio — enumerated by recon)
- Submit, with the job's progress shown while it runs, and cancel
- Result preview and playback in place, and download
- History / gallery of past generations, with reopen

**Out of scope until the MVP epic is Done** — chat, the media agent's other modalities, image generation, music, editing tools, anything else agent.minimax.io does. These live in `docs/backlog/` as they come up ([CLAUDE.md → §3c](CLAUDE.md#3c-how-backlog-is-tracked)) and are never built early.

## Architecture

One machine hosts everything (owner's decision, 2026-09-12): the **DGX Spark** runs the UI, the job-API adapter, ComfyUI with the model, the stub generation server and the whole test gate, each as a container defined in this repo. The owner's Mac, or any device on the LAN, is only a browser opening the UI's URL; development happens on the Spark through a VS Code tunnel. Nothing is installed on the Spark itself.

| Container | Role | Reached via |
| --- | --- | --- |
| UI (`app/`, EPIC_002) | The video generation screen | a URL on the LAN |
| Adapter (`spark/adapter/`, STORY_006) | Create → status → result job API in front of ComfyUI | the compose network; the UI's configured base URL |
| ComfyUI (`spark/comfyui/`, STORY_005) | Runs MiniMax-H3 on the GPU | 127.0.0.1:8188 and the compose network only |
| Stub generation server (`tools/`, EPIC_002) | Scripted outcomes and a fixture video for the test gate | the gate only |

The UI talks to the generation server through configuration only (base URL, optional key). The protocol is an async job: create a generation, poll its status, fetch the result file. Locally the same variables point at a **stub generation server** that returns scripted outcomes and a tiny fixture video, so nothing in the test gate depends on the Spark being reachable.

Work is planned as two epics:

1. **UI recon and rebuild** — capture the reference's video generation surface with Playwright through the owner's own logged-in session (see [CLAUDE.md → §3e](CLAUDE.md#3e-how-recon-is-recorded) and [§4b](CLAUDE.md#4b-recon-with-playwright)), then recreate it as our own code.
2. **Video model on the Spark** — choose a model whose license permits it, install a serving stack, fetch the weights, fit them in the Spark's unified memory at a usable resolution and clip length, run the server as a service, and point the UI at it. See [Running the Model](#running-the-model) for the open question this epic starts with.

## Tech Stack

**Reference (observed 2026-09-12, logged out):** a Next.js App Router app served from a CDN; system sans-serif body text with **Outfit** and **Source Serif** loaded as web fonts (both SIL Open Font License) plus KaTeX; app API under `/v1/api/` on the same origin.

**Ours:** TypeScript everywhere, `strict: true`. Node 26, pnpm 10 workspaces. Recon: Playwright 1.63 + tsx + Vitest. App stack is chosen in EPIC_002 with Next.js App Router as the working assumption, matching the reference.

## Project Structure

Present today: `recon/`, `docs/`, `spark/`, the workspace files. The rest is created by the epics that need it.

```
app/          the UI
tools/        the stub generation server, its fixture video and image, other dev tooling
spark/        the ComfyUI image (Dockerfile, compose) and scripts that run the model on the Spark; spark/data/ (gitignored) holds weights, outputs, logs
recon/        Playwright recon scripts (profile and raw output are gitignored)
docs/
  epic/       EPIC_NNN_*.md
  story/      STORY_NNN_*.md
  bug/        BUG_NNN_*.md
  backlog/    BACKLOG_NNN_*.md
  chore/      CHORE_NNN_*.md
  recon/      dated captures, measured tokens, component inventory, interaction notes
```

## Features

TBD — enumerated by the recon component inventory of the video generation surface. The MVP Scope section above is the outline.

## Testing

TBD — defined by the testing-foundation epic. The bar itself (70/20/10 pyramid, stub generation server, no test may depend on the real model) is in [CLAUDE.md → §3](CLAUDE.md#3-how-features-are-built-important).

## Running Recon

```bash
pnpm install
pnpm recon:login    # opens a Chromium window; sign in to agent.minimax.io with GitHub yourself
pnpm recon:check    # prints session: signed-in | signed-out | unknown (exit 0 / 1 / 2)
```

The session lives in `recon/.profile/` and raw captures in `recon/out/`; both are gitignored. Curated captures land in `docs/recon/<date>/`. See [CLAUDE.md → §4b](CLAUDE.md#4b-recon-with-playwright).

## Running the UI

TBD (EPIC_002). Dev server on port 3000.

## Running the Model

**Status (2026-09-12, measured on the Spark): STORY_005 is Done.** ComfyUI runs on the Spark in a container built from `spark/comfyui/Dockerfile`, with the Comfy-Org quantized MiniMax-H3 weights, and rendered one 5 s clip at 1344×768. STORY_006 adds the job-API adapter and the env vars the UI reads. Numbers below are from that one run; re-measure before relying on them ([spark/README.md](spark/README.md) has the box and the scripts).

| Item | Value (STORY_005, 2026-09-12) |
| --- | --- |
| Serving stack | **ComfyUI v0.35.1** in the image `minimax-spark/comfyui:v0.35.1` (base `nvidia/cuda:13.0.2-runtime-ubuntu24.04`, arm64, pinned by digest; Python 3.12.3; **PyTorch 2.11.0+cu130**; CUDA 13.0; driver 580.142). Launched with `--disable-mmap --disable-async-offload --disable-pinned-memory --cache-none`, published on 127.0.0.1:8188 only. Our job-API adapter in front of it is STORY_006. Nothing is installed on the host |
| Model / checkpoint | **MiniMax-H3 FL2VA, `minimax_h3_fl2va_int8_convrot` (34 GB)** + text encoder `qwen3vl_32b_minimax_h3_nvfp4_awq` (16 GB) + video VAE fp16 + audio VAE fp32; Comfy-Org repackage, 52 GB in `spark/data/models` (gitignored) |
| Licence | MiniMax H3 Community License; the Spark is outside the excluded territories |
| Measured | 1344×768, 124 frames (5.17 s) at 24 fps, 20 steps `res_multistep`/`simple`: **17 min 21 s submit → file** (text encoder ≈ 7 s, DiT load 51 s, sampling 15 min 53 s at 47.7 s/step, VAE decode + mux 72 s). Output 1.5 MiB h264 + aac 32 kHz stereo |
| Memory split | **Peak 66.8 GiB used** (VAE decode); sampling plateau 61 GiB = DiT 32.4 GB staged + text encoder 15 GB resident + activations; no swap. The box's other services must leave ≈ 70 GiB free: on 2026-09-12 that meant stopping `spark-primary` and `cosmos3-api` (owner's call, by name) for the run |
| Port / env vars | ComfyUI 127.0.0.1:8188 on the Spark; the UI's env vars are set by STORY_006 |

The Spark facts (OS, CUDA, memory, disk, what was already installed and running) are in [spark/README.md](spark/README.md), read before anything was changed. Run order: `spark/comfyui/lint.sh`, `install.sh`, `fetch-h3.sh`, `run.sh`, `smoke.sh`, `stop.sh`.

**Open question #1 (2026-09-12): which model.** The obvious candidate is MiniMax's own **MiniMax-H3** (Hailuo 3.0), open-weighted on 2026-08-03. Facts read from its Hugging Face model card and LICENSE file that day:

- 33B parameters. Two checkpoints: **H3-Base-FL2VA** (text and first/last-frame to audio-video, 0–2 input images) and **H3-Base-Ref2VA** (reference-driven, up to 9 images / 3 clips / 3 audio files). 4–15 s clips at 24 fps with 32 kHz stereo audio; short side defaults to 768 px, with 2K attributed to a separate H3-Regenerate-2K module whose availability is unverified. Inference via SGLang, vLLM, Diffusers, or ComfyUI.
- Weight size on disk and VRAM requirements are **not stated** on the card. 33B parameters at bf16 is roughly 66 GB of weights before activations, which is an estimate, not a measurement; the phase-2 epic measures the real footprint on the Spark.
- **License: MiniMax H3 Community License Agreement.** Its Excluded Territories are the European Union, the United Kingdom, the Republic of Korea, and the United States of America, and it states: "You may not use, reproduce, modify, distribute, or display the MiniMax H3 Works or any of their Outputs or results outside the Applicable Territory." Commercial use above 20 million USD yearly revenue needs separate authorization.

**Decided 2026-09-12: the Spark is used outside the excluded territories, so H3's open weights are licensed for it and phase 2 builds toward MiniMax-H3 on the Spark.** **Serving stack (owner's choice, 2026-09-12): ComfyUI on the Spark with Comfy-Org quantized H3 weights, fronted by our own small job-API adapter** so the UI keeps speaking create → status → result. Precision (int8 / fp8 / NVFP4) and the exact workflow are settled by the first EPIC_004 story, which measures them; see [EPIC_004](docs/epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md) for the options that were weighed ([CLAUDE.md → §4a](CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

Sources: [MiniMaxAI/MiniMax-H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3), [MiniMax H3 LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE).

## Deployment

Local only, all on the Spark: the model container is started by `spark/comfyui/run.sh` (weights in `spark/data/`); the UI and adapter containers by the scripts EPIC_002 and STORY_006 add. The UI is opened from a browser on the LAN. There is no CI as of 2026-09-12.
