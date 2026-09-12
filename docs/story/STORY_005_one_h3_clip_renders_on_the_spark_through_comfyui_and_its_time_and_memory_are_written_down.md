# STORY_005 — One H3 clip renders on the Spark through ComfyUI, and its time and memory are written down

**Epic:** [EPIC_004](../epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md)
**Status:** Done (drafted on the Mac 2026-09-12; implemented and measured on the Spark 2026-09-12)
**Created:** 2026-09-12
**Runs on:** the DGX Spark only. Nothing in this story touches `app/`, `recon/` or the Mac gate.

As the owner, I want a single MiniMax-H3 clip generated on the DGX Spark through ComfyUI with Comfy-Org's quantized weights, with the run's precision, settings, wall time and peak memory recorded, so that the job-API adapter (STORY_006) is built on a serving setup that is known to work and known to fit.

## Current state

Nothing of ours is on the Spark. What is actually there is unknown until looked at ([CLAUDE.md → §3 item 8](../../CLAUDE.md#3-how-features-are-built-important): the Spark is live state). The first act of this story is to look.

## UI Mockup

N/A (no UI change; the deliverables are scripts under `spark/comfyui/`, `spark/README.md`, and numbers in README → Running the Model).

## Acceptance Criteria

- [x] **The box is described before it is changed.** `spark/README.md` records, as read on the Spark that day: OS and kernel, CUDA driver and toolkit versions, Python version, total and free unified memory (`free -g`), free disk on the volume that will hold weights (`df -h`), whether Docker and the NVIDIA container toolkit are present, and whether any ComfyUI, PyTorch or model files already exist. Nothing is installed or deleted until this is written.
- [x] **Disk is checked before any download.** Weights plus outputs need at least 300 GB free (FL2VA files ~144 GB, room for a second precision and outputs). If less is free, the story stops and asks the owner which volume to use — it never deletes anything to make room.
- [x] `spark/comfyui/install.sh` builds a Docker image from `spark/comfyui/Dockerfile` with ComfyUI at a **pinned** tag or commit (0.30.0 or later, per MiniMax's self-hosting guide) and an aarch64 PyTorch built for CUDA 13 (`cu130`), and verifies from inside a container that CUDA sees the GB10. **Nothing is installed on the host.** Idempotent (re-running rebuilds nothing that is unchanged). *(Changed 2026-09-12, owner: was "a venv outside the repo, default `~/comfy`".)*
- [x] `spark/comfyui/fetch-h3.sh` downloads from `Comfy-Org/MiniMax-H3` on Hugging Face only what FL2VA text-to-video needs at **one precision first — `int8_convrot`** (Comfy-Org's recommendation for cu130), plus the Qwen3-VL-32B text encoder in its quantized form, the video and audio VAEs, and the official MiniMax-H3 workflow template, into the models directory that is bind-mounted into the container (`spark/data/models`, gitignored; `SPARK_DATA` overrides), verifying file sizes against the listing and printing the total on disk. *(Changed 2026-09-12, owner: was "ComfyUI's models directory outside the repo".)* `fp8_scaled` is fetched only if int8 fails to load (see below).
- [x] `spark/comfyui/run.sh` starts the ComfyUI container headless, published on `127.0.0.1:8188` only, with the flags the Spark needs — `--disable-mmap`, `--disable-async-offload`, `--disable-pinned-memory`, `--cache-none` (the safetensors memory-doubling issue on unified memory) plus any others the install proves necessary — and `spark/comfyui/stop.sh` stops it cleanly.
- [x] `spark/comfyui/smoke.sh` submits the FL2VA text-to-video template through ComfyUI's HTTP API (`POST /prompt`), with a fixed prompt, **16:9 at 1344×768, 5 s, 24 fps** and the template's default steps, polls `GET /history/<id>` until done, and saves the MP4 via `GET /view` to an output directory outside the repo. It exits non-zero if ComfyUI errors or the file is missing or empty.
- [x] `spark/comfyui/memwatch.sh` samples used unified memory every two seconds (from `/proc/meminfo`, since `nvidia-smi` reports no memory column on the Spark) into a log for the duration of the smoke run, and prints the peak.
- [x] **The numbers are written down.** The Done note here and README → Running the Model record: ComfyUI version, PyTorch and CUDA versions, precision, flags, the smoke clip's wall time from submit to file, peak used memory, model-load time, output file size and duration, and whether the clip plays (checked by the owner or with `ffprobe`).
- [x] If `int8_convrot` fails to load or run on sm_121, the failure is recorded verbatim, then `fp8_scaled` is fetched and tried; if that fails too, NVFP4 via the community node pack is the third try. Each attempt's outcome goes in the Done note.
- [x] `git status` on the Spark shows no weights, outputs or logs: everything heavy lives in the gitignored `spark/data/` (or `SPARK_DATA`), and `.gitignore` already excludes `models/`, `*.safetensors`, `*.mp4`. *(Changed 2026-09-12, owner: was "outside the repo".)*

## Technical Notes

- **Read before you write on the Spark** ([CLAUDE.md → §4a](../../CLAUDE.md#4a-two-machines-the-mac-and-the-spark)). Another process may own the GPU. Never delete a weights directory without the owner saying so in that session.
- **If memory is short, do not free it yourself.** Other Docker containers and services on the Spark are the owner's. List them with their memory use and ask which are not required; stop only what he names, and record in the Done note what was stopped and how much it freed (EPIC_004 → Working on two machines at once).
- Starting points, to read rather than adopt blindly: MiniMax's self-hosting guide (ComfyUI 0.30.0+, Comfy-Org weights), Comfy-Org's MiniMax-H3 tutorial and templates, the NVIDIA-forum "one-click deploy" thread (Sol-Attn, 12 workflows, Docker packaging in the replies) and the SparkyUI container (aarch64 cu130 PyTorch, SageAttention for sm_121), and the memory-doubling thread (the flags above; upstream fixes in ComfyUI PR #13609 and safetensors PR #759 — check whether the pinned ComfyUI already includes them). All linked from EPIC_004.
- The weights are licensed under the MiniMax H3 Community License; the Spark is outside the excluded territories (owner, 2026-09-12). The download scripts print the licence name and where it was read.
- ~~Prefer a plain venv on the host over Docker for the first run: one fewer layer between the numbers and the hardware. Docker is a later chore if it helps reproducibility.~~ **Reversed by the owner on 2026-09-12, mid-implementation: everything self-contained in the repo and in Docker containers; nothing installed directly on the host.** The host venv that had just been built (ComfyUI v0.35.1, PyTorch 2.11.0+cu130 — it did see the GB10 as sm_121) was removed the same hour and the same pinned versions went into the Dockerfile. Host-side scripts stay thin and use only tools the Spark already has (`docker`, `curl`, `jq`, `ffprobe`); shellcheck runs through its official image (`lint.sh`).
- The smoke prompt is fixed so later precisions are comparable: "A small paper boat drifting across a rain puddle in soft morning light, gentle ripples, camera slowly pushing in." (the same prompt the reference rendered on 2026-09-12; its result is in the recon output for a side-by-side).

## Testing Plan

- **Unit** — N/A: the story is shell scripts with no branching logic beyond sequencing and checks. `shellcheck` runs on every script as the lint step and must be clean.
- **Integration** — `smoke.sh` *is* the integration test: install → serve → generate → file, end to end against the real ComfyUI on the Spark. It is run by hand on the Spark and is not part of the Mac gate (the Mac cannot reach the Spark and the gate must never depend on it).
- **E2E** — N/A (no UI).
- **Manual verification** (recorded in the Done note): the owner plays the smoke clip; the numbers above are in README → Running the Model.

## Estimated Complexity

L — most of the time is downloads and the first-run debugging of an aarch64 + sm_121 stack.

## Done note (2026-09-12, on the Spark)

**Result: one clip rendered on the first attempt, at `int8_convrot`.** No fallback to `fp8_scaled` or NVFP4 was needed, so neither was fetched or tried.

| Item | Measured |
| --- | --- |
| Stack | ComfyUI **v0.35.1** (commit `856a922`) in the image `minimax-spark/comfyui:v0.35.1` (id `71fed155…`), base `nvidia/cuda:13.0.2-runtime-ubuntu24.04@sha256:6a0e31b5…` (arm64), Python 3.12.3, **PyTorch 2.11.0+cu130**, CUDA 13.0, cuDNN 91900, driver 580.142. Attention backend as logged: `Using pytorch attention` (no SageAttention) |
| Precision | DiT `minimax_h3_fl2va_int8_convrot.safetensors` (34.04 GB, the full non-pruned file); text encoder `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` (15.69 GB, the official template's default); `minimax_h3_video_vae_fp16` (5.21 GB) + `minimax_h3_audio_vae_fp32` (0.61 GB). 52 GB on disk, every size verified against the Hub |
| Flags | `--listen 0.0.0.0 --port 8188 --disable-auto-launch --disable-mmap --disable-async-offload --disable-pinned-memory --cache-none` (container/comfyui-entrypoint.sh); port published on 127.0.0.1 only |
| Graph | `h3_t2v_prompt.json`: the official `video_minimax_h3_t2v.json` (pinned templates package 0.11.59, byte-identical to upstream main that day), non-turbo path: 20 steps, `res_multistep`, `simple`, denoise 1, BasicGuider, seed 1 fixed; 1344×768, 124 frames (5 s on the 17k+5 grid), 24 fps; the story's fixed prompt |
| Model load | Text encoder: requested 18:32:23 UTC, encode finished by 18:32:30 (**≈ 7 s**, files were in page cache). DiT: requested 18:32:30, sampling bar reports `Model Initialization complete!` at the first step after **51 s** |
| Sampling | 20 steps in **15 min 53 s** (47.65 s/step average, first step 51.36 s including the load) |
| VAE decode + save | audio VAE + video VAE + h264/aac mux: 18:48:28 → 18:49:40, **72 s** |
| Wall time | server `Prompt executed in 00:17:17`; **submit → file 1041 s (17 min 21 s)** (`smoke.sh`, prompt id `4caf8523…`) |
| Peak used memory | **66.8 GiB** at 14:49:25 local, during VAE decode. Sampling plateau 61.0 GiB (DiT 32.4 GB staged + text encoder 15.0 GB still resident + activations); text-encoder phase ≤ 32.7 GiB. Swap 3.0 → 3.4 GiB, i.e. nothing swapped during the run. Sampled every 2 s from `/proc/meminfo` (`spark/data/logs/memwatch-20260912-143222.log`, 520 samples) |
| Output | `spark/data/smoke/smoke-20260912-143222-int8_convrot.mp4`: **1 581 571 bytes (1.5 MiB)**, h264 1344×768 24 fps, **5.167 s**, aac 32 kHz stereo (`ffprobe`). Decodes with ffmpeg; a frame at 2.5 s was inspected and shows the prompt's subject. Sent to the owner for the play check |
| Idle cost | ComfyUI container idle after the run: ~4 GiB used (models released by `--cache-none`); stopped with `stop.sh` |

**What was stopped, and what it freed (owner's decision, by name, 2026-09-12).** Before the run the box had 12–15 GiB available with `spark-primary` (vLLM, 48 GB) and `cosmos3-api` (vLLM-Omni, ~52 GB) running. The owner named both. `docker stop cosmos3-api spark-primary` at 14:31:51 took 12 s and moved *available* from 15 GiB to **114 GiB** (swap in use 13 → 3 GiB). Both were started again with `docker start` at 14:50:52, after ComfyUI was stopped. The `cosmos3-flow`, `cosmos3-gateway`, `cosmos3-progress` helpers were left running throughout (≤ 43 MiB each).

**Decisions taken during implementation.**
- **Docker, nothing on the host** (owner, mid-story). The venv the story first asked for was built (ComfyUI v0.35.1, PyTorch 2.11.0+cu130 — it saw the GB10 as sm_121) and removed within the hour; the same pins went into `spark/comfyui/Dockerfile` and `compose.yaml`. One image, two services (`comfyui`, `fetch`); host scripts use only `docker`, `curl`, `jq`, `ffprobe`; shellcheck runs from its image. Heavy files live in gitignored `spark/data/`.
- **Text encoder at `nvfp4_awq`, not `int8_convrot`.** The story said "quantized form"; the official template ships `nvfp4_awq`, it is 11 GB smaller on disk and in memory, and Comfy-Org's int8 recommendation is for the diffusion model. The `int8_convrot` encoder (27 GB) is one env var away (`H3_TEXT_ENCODER=int8_convrot`) if a fidelity comparison is wanted.
- **Full DiT, not pruned.** Comfy-Org also publishes `*_pruned_*` files (40 GB at bf16 vs 66 GB; 21 GB vs 34 GB at int8). Nothing in ComfyUI's H3 code or the model card says what is pruned, so the full file was measured. The owner's own `~/ai/ComfyUI` holds the pruned int8 files.
- **Base image pinned by digest** as well as tag.

**Honest gaps.**
- The weights were downloaded by the `hf` CLI already on the host during the venv detour, then moved into `spark/data/models`. The container's `fetch` service was run afterwards and did the disk gate, the size verification against the Hub and the template copy, but its own download path has not been exercised on a cold directory yet.
- Only one precision was measured. "A second precision on the same prompt" stays in EPIC_004's Later list.
- `memwatch.sh` and `smoke.sh` run on the host; `ffprobe` there is the owner's install (6.1.1), not ours.

**Manual verification step (owner):** play `smoke-20260912-143222-int8_convrot.mp4` (also sent in the session). Model MiniMax-H3 FL2VA, checkpoint `minimax_h3_fl2va_int8_convrot` (Comfy-Org repackage), 2026-09-12.
