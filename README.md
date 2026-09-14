# MiniMax Local

> A self-hosted video generation workstation: a web UI that recreates the video generation surface of [agent.minimax.io](https://agent.minimax.io), backed by a video generation model served on the owner's NVIDIA DGX Spark.

> This README is the source of truth for **what the project is**. How we work (tickets, testing bar, gates, guardrails) lives in [CLAUDE.md](CLAUDE.md).

**Status (2026-09-14):** the MVP works end to end on the Spark. All four epics are Done: the reference is captured, the UI is rebuilt, MiniMax-H3 runs on the GPU behind the job API, and a finished video can be extended. What is left is written down as bugs, chores and backlog items in `docs/`.

---

## Quick Start

**Open the UI:** **<http://spark-1.local:3000>** — from any browser on the LAN. The Spark's hostname is `spark-1` and it publishes itself over mDNS (Bonjour), so macOS, iOS and Linux find it by name; on a device that does not resolve `.local` (some Windows and Android setups, or a VPN that swallows mDNS) use the address it points at, **<http://192.168.1.33:3000>**. Both were checked on 2026-09-14 (`avahi-resolve -n spark-1.local` → `192.168.1.33`, and the UI answered `200` on the name). `APP_PORT` in `.env` changes the port. Nothing is installed on the machine you browse from, and the UI and adapter containers are `restart: unless-stopped`, so they come back when the Spark reboots; the GPU half does not — see below.

### Make a video

1. **New task** in the sidebar, then the **Video generation** chip under the message box.
2. Optional: **+ Reference** attaches a first frame (PNG, JPEG or WebP). A second image becomes the last frame.
3. Type the prompt. MiniMax's own prompt guides are in [docs/references/prompt-guides/](docs/references/prompt-guides/); three worked example scripts are in [docs/scripts/](docs/scripts/).
4. **Video parameters** sets the ratio, the resolution (768P — 2K is not open-sourced) and the duration (4–15 s).
5. **Send.** The task page follows the job from queued to a playable result, with **Stop generation** while it runs, then **Download** and **Copy prompt**. Everything finished is also in **Assets**.

### Extend a finished video

On a finished video, press **⤴ Extend** (on the result card, or **Extend** in an Assets tile's ⋯ menu). The composer then shows the clip being continued and the **overlap** — the last 0.9 / 1.6 / 2.3 s of it that become the new clip's own first frames, so the scene carries on rather than cutting — the duration means seconds **added** (+10 s by default), and **Send** returns the source and its continuation as one clip, which can be extended again. How it works and why: [STORY_017](docs/story/STORY_017_extending_a_video_keeps_the_scene_because_the_new_frames_are_generated_as_part_of_the_same_clip.md).

### The GPU half has to be running

The UI and the adapter are always up; **ComfyUI is started per session**, because a generation needs most of the Spark's memory. Run these on the Spark, from the repo root:

| Command | What it does |
| --- | --- |
| `spark/comfyui/run.sh` | Starts ComfyUI (GPU) and the adapter, and waits until both answer |
| `spark/comfyui/stop.sh` | Stops ComfyUI; the adapter stays up, so the UI keeps working up to Send |
| `spark/comfyui/verify.sh` | Proves the real chain — adapter, UI, validation — in seconds, without touching the GPU |
| `spark/comfyui/seam-check.sh <clip> <frame>` | Measures an extension's seam (the frame-to-frame change at the join against the footage's own), without the GPU |
| `docker ps` | Expect `minimax-app`, `minimax-adapter`, and `minimax-comfyui` while generating |

### What a run costs (measured on the Spark)

| Job | Time | Peak memory |
| --- | --- | --- |
| 5 s text-to-video | ≈ 17 min | 64 GiB |
| 10 s from a reference image | ≈ 50 min | 71 GiB |
| +10 s extension of a 10 s clip | ≈ 2 h 10 min | 88 GiB |
| +10 s extension of a 20 s clip | ≈ 2 h 15 min | 97 GiB |

The Spark has 121 GiB in total, so a generation needs the box mostly to itself: stop other memory-hungry containers first, by name, and start them again afterwards.

### If something looks wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| "The Spark's adapter is not reachable" under the composer | the adapter container is down | `spark/comfyui/run.sh` |
| Send answers "ComfyUI is not running on the Spark" | the GPU half is stopped — everything else is fine | `spark/comfyui/run.sh` |
| A job sits at "Queued…" for a minute or two | ComfyUI is loading a 34 GB checkpoint, or another job is ahead | wait; `docker logs -f minimax-comfyui` shows it |
| "The Spark is busy" | the open-job limit is reached | let the running job finish |

Deeper detail: [Running the UI](#running-the-ui), [Running the Model](#running-the-model), and [spark/README.md](spark/README.md) for the box itself.

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

**Ours:** TypeScript everywhere, `strict: true` and `noUncheckedIndexedAccess`. Node 26 and pnpm 10 in the gate image (`tools/gate/Dockerfile`), never on the host. App (STORY_007): Next.js 16 App Router, React 19, TypeScript 5.9 (typescript-eslint does not support TS 7 yet; `recon/` keeps TS 7), ESLint 9 with typescript-eslint strict type-checked rules and `eslint-config-next`, Vitest 5 with jsdom and React Testing Library. E2E: Playwright 1.63 (the same as recon), browsers baked into the gate image. Production UI image: `app/Dockerfile`, Next standalone output on `node:26-bookworm-slim`.

## Project Structure

Present today: `app/` (skeleton), `tools/gate/`, `spark/`, `recon/`, `docs/`, the root `compose.yaml`, the workspace files. The rest is created by the stories that need it.

```
app/          the UI
tools/        gate/ (the toolchain image and the gate runner), the stub generation server with its fixtures (STORY_008), other dev tooling
spark/        the ComfyUI image (Dockerfile, compose) and scripts that run the model on the Spark; spark/data/ (gitignored) holds weights, outputs, logs
recon/        Playwright recon scripts (profile and raw output are gitignored)
docs/
  epic/       EPIC_NNN_*.md
  story/      STORY_NNN_*.md
  bug/        BUG_NNN_*.md
  backlog/    BACKLOG_NNN_*.md
  chore/      CHORE_NNN_*.md
  recon/      dated captures, measured tokens, component inventory, interaction notes
  references/ the MiniMax H3 model card, license, prompt guides, MiniMax's and ComfyUI's H3 docs, the official workflow templates and the node sources from our ComfyUI image, with an index (CHORE_002)
```

## Features

What the UI does today, each matched to the reference capture the story cites ([docs/recon/2026-09-12/](docs/recon/2026-09-12/)):

| Feature | Story |
| --- | --- |
| The shell: sidebar, Recents with an unread dot, top bar, the reference's measured tokens | STORY_012 |
| The composer: video mode, reference-image upload (0–2), model menu, the parameters popover (ratio, resolution, duration) greyed to what the Spark can actually do | STORY_013 |
| The task page: the prompt bubble, the working indicator, the Progress panel, **Stop generation**, playback in place, Download, Copy prompt, Retry, and history that survives a reload | STORY_014 |
| Assets: every finished video as a poster tile, search and filter chips, a preview modal, Download, Open task, Delete from history | STORY_015 |
| **Extend**: continue a finished video by +4…14 s (default +10), with the context the model watches as a setting, joined into one clip | STORY_016 |

Deliberate departures from the reference (an agent thread we do not have, 2K the Spark cannot produce, an Extend the reference does not offer) are listed in each story under **Departures from the reference**.

## Testing

Three layers, all run inside the gate container against the [stub generation server](tools/stub-generation-server/README.md); no test depends on the model ([CLAUDE.md → §3](CLAUDE.md#3-how-features-are-built-important)).

| Layer | Command | What it is |
| --- | --- | --- |
| Unit | `tools/gate/run.sh test` | Vitest (jsdom) for `app/lib/**` and the stub's own logic — pure helpers, the job-status reducer, polling with fake timers, upload validation, the stub's scripts and multipart parser |
| Integration | `tools/gate/run.sh test:integration` | Vitest (node) calling the app's route handlers directly against a stub started in-process (`app/test/integration/`) |
| E2E | `tools/gate/run.sh test:e2e` | Playwright 1.63 against the production build (`pnpm build` first) with the stub started by the config; projects `desktop` (Chromium, 1440×900) and `narrow` (`devices["iPhone 13"]`, WebKit); fixtures in `app/e2e/fixtures/` for stub scripts, terminal-status waits, playability and settling |

**Fixture codec (measured 2026-09-12 in the gate image, Chromium 1243 and WebKit 2359 on arm64):** both browsers report `canplay` for `fixture.mp4` (H.264 baseline + AAC) and for `fixture.webm` (VP9 + Opus). The stub therefore serves `fixture.mp4` by default, the same container format the real server produces; `STUB_FIXTURE=webm` switches. The probe is `app/e2e/fixture-codec.spec.ts` and writes its verdict to `app/test-results/codec-probe-<project>.json` on every run.

**What the gate proves, and what it does not.** Every e2e spec in the gate drives the real UI build against the **stub** generation server, by design: the gate never depends on the model. It proves the UI, its routes and any contract-conformant server work together. The **real chain** — the UI container → the adapter → ComfyUI on the GPU — is proven by `spark/comfyui/verify.sh` (adapter health, the UI relaying the adapter's capabilities, the adapter refusing `2K` through the UI route; seconds, no GPU) and by `spark/comfyui/verify.sh --generate [seconds]`, which runs the real Playwright trial through the UI (`app/e2e-trial/`, minutes, needs ComfyUI up and the memory a run needs). Both are run by hand and recorded in the story or bug they belong to. **Extending a video (STORY_016)** follows the same split: `app/e2e/extend.spec.ts` drives Extend → the continuation tile → Send → the joined result against the stub, the frame arithmetic, the full-reference prompt and the graph are unit-tested in the adapter and mirrored in `app/lib/extend.ts`, and the real continuation is the story's manual verification (the owner's three-script chain, `docs/scripts/`).

**Coverage floors** (Vitest v8, enforced by the unit and integration lanes; set from the measured baseline minus 2 on 2026-09-12 and never lowered — [CLAUDE.md → §4](CLAUDE.md#4-dev-workflow)):

| Lane | lines | branches | functions | statements |
| --- | --- | --- | --- | --- |
| `app` unit (`app/lib/**`) | 87 | 84 | 90 | 87 |
| `app` integration (`app/app/api/**`, model client, config, upload validation) | 90 | 73 | 98 | 90 |
| stub generation server | 93 | 82 | 98 | 88 |
| gate helper (`tools/gate/src`) | 60 | 61 | 98 | 66 |

When a floor fails, `tools/gate/run.sh` prints the files with the most uncovered branches (`tools/gate/src/coverage-rank.ts`).

**The gate and the hook.** `tools/gate/run.sh` runs the six steps in order inside the gate container (step 5 also builds the production image, `docker compose build app`) and stops at the first failure, naming it; `--from N` restarts after a fix. `pnpm install` (inside the container) installs husky's `.husky/_` shims and points `core.hooksPath` at them through the bind mount (`tools/gate/install-hooks.sh` does the same by hand); `.husky/pre-push` runs the gate only when a ref is pushed to `develop`. Measured on the Spark on 2026-09-12: the whole gate takes **27 s** with a warm image cache and about 45 s when the lockfile changed (image dependency stage rebuilt). `--no-verify` skips everything and is for emergencies only, with the justification in the commit message.

## Running Recon

Recon captures the reference (agent.minimax.io) through the owner's own signed-in session, from the Spark, in the gate container — nothing is installed on the host ([CLAUDE.md → §3e](CLAUDE.md#3e-how-recon-is-recorded), [§4b](CLAUDE.md#4b-recon-with-playwright)).

```bash
recon/login.sh                       # the Spark has no display (CHORE_005): Chromium runs headless with its DevTools port on the LAN
                                     # for the few minutes of the login; on the Mac open chrome://inspect/#devices → Configure… →
                                     # add 192.168.1.33:9222 (the IP, not the name) → inspect the agent.minimax.io target → sign in with GitHub
recon/run.sh check                   # prints session: signed-in | signed-out | unknown (exit 0 / 1 / 2)
recon/run.sh capture [--generate N]  # dated screenshots into docs/recon/<date>/ and the raw network log into recon/out/<date>/
recon/run.sh tokens <date>           # measured tokens → docs/recon/<date>/tokens.md + tokens.json
recon/run.sh interactions <date>     # the network notes → docs/recon/<date>/interactions.md + endpoints.md
```

The session lives in `recon/.profile/` and raw captures in `recon/out/`; both are gitignored. Generations on the reference cost the owner credits: the count is agreed before a capture and written in the notes. The scripts never type credentials, never read cookies, and stop and ask when the session has expired.

## Running the UI

Everything runs in containers on the Spark (STORY_007). The host needs only `docker`, `jq` and a browser somewhere on the LAN.

```bash
cp .env.example .env            # once; set MODEL_BASE_URL to the adapter's URL for production (the stub URL is the default)
tools/gate/build.sh             # once (and after tools/gate/Dockerfile changes): the toolchain image, Node 26 + pnpm + Playwright browsers
tools/gate/run.sh               # the gate: install, typecheck, lint, unit, integration, build, e2e — inside the gate container
docker compose --profile dev up app-dev      # hot-reload dev server on port 3000 (Ctrl-C to stop)
docker compose up -d --build app             # production build served on port 3000, restarts with the box
```

Open `http://spark-1.local:3000` (or `http://192.168.1.33:3000`) from any browser on the LAN — see [Quick Start](#quick-start). The adapter stays up whenever the Spark is up (it needs no GPU); the model itself is started with `spark/comfyui/run.sh` when the memory is free and stopped with `spark/comfyui/stop.sh`; `spark/comfyui/verify.sh` proves the real chain in seconds. `tools/gate/run.sh lint build` runs only the named steps; `--from 4` restarts after a fix. Dependencies land in `node_modules/` inside the repo tree (written by the container, gitignored); the pnpm store persists in the `minimax_pnpm-store` volume; the UI's history in the `minimax_app-data` volume.

**A real run through the UI, driven by Playwright** (EPIC_003's trial; not part of the gate — it needs ComfyUI and the adapter up, `spark/comfyui/run.sh`):

```bash
docker compose run --rm --no-deps -T -e TRIAL_IMAGE=/work/spark/data/input/01.jpg -e TRIAL_PROMPT_FILE=/work/spark/data/input/01-prompt.txt -e TRIAL_DURATION=10 \
  gate pnpm --filter app exec playwright test --config playwright.trial.config.ts
```

## Running the Model

**Status (2026-09-12, measured on the Spark): STORY_005 is Done.** ComfyUI runs on the Spark in a container built from `spark/comfyui/Dockerfile`, with the Comfy-Org quantized MiniMax-H3 weights, and rendered one 5 s clip at 1344×768. STORY_006 adds the job-API adapter and the env vars the UI reads. Numbers below are from that one run; re-measure before relying on them ([spark/README.md](spark/README.md) has the box and the scripts).

| Item | Value (STORY_005, 2026-09-12) |
| --- | --- |
| Serving stack | **ComfyUI v0.35.1** in the image `minimax-spark/comfyui:v0.35.1` (base `nvidia/cuda:13.0.2-runtime-ubuntu24.04`, arm64, pinned by digest; Python 3.12.3; **PyTorch 2.11.0+cu130**; CUDA 13.0; driver 580.142). Launched with `--disable-mmap --disable-async-offload --disable-pinned-memory --cache-none`, published on 127.0.0.1:8188 only. Our job-API adapter in front of it is STORY_006. Nothing is installed on the host |
| Model / checkpoint | **MiniMax-H3 FL2VA, `minimax_h3_fl2va_int8_convrot` (34 GB)** for fresh jobs **and extensions** (STORY_017: an extension is the same clip continued on FL2VA, no checkpoint swap); `minimax_h3_ref2va_int8_convrot` (34 GB) is fetched and on disk for a future subject-reference story, unused today + text encoder `qwen3vl_32b_minimax_h3_nvfp4_awq` (16 GB) + video VAE fp16 + audio VAE fp32; Comfy-Org repackage, 52 GB in `spark/data/models` (gitignored) |
| Licence | MiniMax H3 Community License; the Spark is outside the excluded territories |
| Measured | **5 s, text-to-video** (STORY_005/006): 1344×768, 124 frames at 24 fps, 20 steps `res_multistep`/`simple`: **17 min 21 s submit → file** (text encoder ≈ 7 s, DiT load 51 s, sampling ≈ 47 s/step, VAE decode + mux 72 s), 1.0–1.5 MiB h264 + aac 32 kHz stereo. **10 s, image-to-video through the UI** (EPIC_003 trial): 243 frames, first step ≈ 155 s then ≈ 100 s/step, decode ≈ 3 min, **51 min submit → ready**, 2.3 MB, 10.125 s | **Extending a clip (STORY_016, 2026-09-13, Ref2VA, +10 s with a 5.2 s context):** 2 h 12 min and 2 h 17 min per step (≈ 6.4 min per sampling step against ≈ 2.4 for a fresh FL2VA clip — the reference clip rides through every step); a fresh 10 s image-to-video clip the same morning: 49.9 min. The owner's three-script chain came out as 753 frames = 31.375 s.
| Memory split | **Peak 64–68 GiB used** (VAE decode; 63.8 GiB for 5 s, 68.0 GiB for 10 s image-to-video); sampling plateau 61 GiB = DiT 32.4 GB staged + text encoder 15 GB resident + activations; no swap. The box's other services must leave ≈ 70 GiB free: on 2026-09-12 that meant stopping `spark-primary` (48 GB reserved by its `--gpu-memory-utilization 0.40`) and `cosmos3-api` (owner's call, by name) for each run. Coexistence needs one of them lowered — EPIC_004 → Later | **Extensions (2026-09-13):** peak 87.8 GiB for +10 s on a 10 s source, **96.7 GiB** for +10 s on a 20.75 s source (the join holds the whole source as frames: ≈ 12.4 MB per 1344×768 frame) — the reason `maxSourceSeconds` is 30. Swap stayed at 3.3 GiB.
| Adapter (STORY_006) | `spark/adapter/`, the job-API contract ([docs/contracts/job-api.md](docs/contracts/job-api.md)) in front of ComfyUI: uploads references, submits the graph, follows progress over ComfyUI's websocket (with `/history` and `/queue` polling as the backstop), cancels through `/queue` or `/interrupt`, serves results and first-frame posters from the output mount with `Range` support, persists jobs to `spark/data/adapter/jobs.json`. Zero runtime dependencies; image `minimax-spark/adapter` (267 MB); service `adapter` in `spark/comfyui/compose.yaml` |
| Ports / env vars | ComfyUI `127.0.0.1:8188`; adapter `127.0.0.1:4020` (`ADAPTER_PORT`) and `http://adapter:4020` on the shared docker network `minimax` that the UI's `app` service joins. The UI reads `MODEL_BASE_URL` (default `http://adapter:4020`) and `MODEL_API_KEY` (= the adapter's `ADAPTER_API_KEY`, optional). Set them in `.env` (see `.env.example`) |

The Spark facts (OS, CUDA, memory, disk, what was already installed and running) are in [spark/README.md](spark/README.md), read before anything was changed. Run order: `spark/comfyui/lint.sh`, `install.sh` (builds both images and creates the `minimax` network), `fetch-h3.sh`, `run.sh` (ComfyUI + adapter), `smoke.sh` (ComfyUI directly) or a job through the UI, `stop.sh`. The adapter's own tests: `pnpm --filter adapter test` inside the gate (unit + integration against a fake ComfyUI).

**Open question #1 (2026-09-12): which model.** The obvious candidate is MiniMax's own **MiniMax-H3** (Hailuo 3.0), open-weighted on 2026-08-03. Facts read from its Hugging Face model card and LICENSE file that day:

- 33B parameters. Two checkpoints: **H3-Base-FL2VA** (text and first/last-frame to audio-video, 0–2 input images) and **H3-Base-Ref2VA** (reference-driven, up to 9 images / 3 clips / 3 audio files). 4–15 s clips at 24 fps with 32 kHz stereo audio; short side defaults to 768 px, with 2K attributed to a separate H3-Regenerate-2K module whose availability is unverified. Inference via SGLang, vLLM, Diffusers, or ComfyUI.
- Weight size on disk and VRAM requirements are **not stated** on the card. 33B parameters at bf16 is roughly 66 GB of weights before activations, which is an estimate, not a measurement; the phase-2 epic measures the real footprint on the Spark.
- **License: MiniMax H3 Community License Agreement.** Its Excluded Territories are the European Union, the United Kingdom, the Republic of Korea, and the United States of America, and it states: "You may not use, reproduce, modify, distribute, or display the MiniMax H3 Works or any of their Outputs or results outside the Applicable Territory." Commercial use above 20 million USD yearly revenue needs separate authorization.

**Decided 2026-09-12: the Spark is used outside the excluded territories, so H3's open weights are licensed for it and phase 2 builds toward MiniMax-H3 on the Spark.** **Serving stack (owner's choice, 2026-09-12): ComfyUI on the Spark with Comfy-Org quantized H3 weights, fronted by our own small job-API adapter** so the UI keeps speaking create → status → result. Precision (int8 / fp8 / NVFP4) and the exact workflow are settled by the first EPIC_004 story, which measures them; see [EPIC_004](docs/epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md) for the options that were weighed ([CLAUDE.md → §4a](CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

Sources: [MiniMaxAI/MiniMax-H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3), [MiniMax H3 LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE).

## Deployment

Local only, all on the Spark: the model container is started by `spark/comfyui/run.sh` (weights in `spark/data/`); the UI and adapter containers by the scripts EPIC_002 and STORY_006 add. The UI is opened from a browser on the LAN. There is no CI as of 2026-09-12.
