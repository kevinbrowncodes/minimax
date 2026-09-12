# STORY_005 — One H3 clip renders on the Spark through ComfyUI, and its time and memory are written down

**Epic:** [EPIC_004](../epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md)
**Status:** Ready (drafted on the Mac 2026-09-12; implemented on the Spark)
**Created:** 2026-09-12
**Runs on:** the DGX Spark only. Nothing in this story touches `app/`, `recon/` or the Mac gate.

As the owner, I want a single MiniMax-H3 clip generated on the DGX Spark through ComfyUI with Comfy-Org's quantized weights, with the run's precision, settings, wall time and peak memory recorded, so that the job-API adapter (STORY_006) is built on a serving setup that is known to work and known to fit.

## Current state

Nothing of ours is on the Spark. What is actually there is unknown until looked at ([CLAUDE.md → §3 item 8](../../CLAUDE.md#3-how-features-are-built-important): the Spark is live state). The first act of this story is to look.

## UI Mockup

N/A (no UI change; the deliverables are scripts under `spark/comfyui/`, `spark/README.md`, and numbers in README → Running the Model).

## Acceptance Criteria

- [ ] **The box is described before it is changed.** `spark/README.md` records, as read on the Spark that day: OS and kernel, CUDA driver and toolkit versions, Python version, total and free unified memory (`free -g`), free disk on the volume that will hold weights (`df -h`), whether Docker and the NVIDIA container toolkit are present, and whether any ComfyUI, PyTorch or model files already exist. Nothing is installed or deleted until this is written.
- [ ] **Disk is checked before any download.** Weights plus outputs need at least 300 GB free (FL2VA files ~144 GB, room for a second precision and outputs). If less is free, the story stops and asks the owner which volume to use — it never deletes anything to make room.
- [ ] `spark/comfyui/install.sh` installs ComfyUI at a **pinned** tag or commit (0.30.0 or later, per MiniMax's self-hosting guide) with an aarch64 PyTorch built for CUDA 13 (`cu130`), into a directory **outside the repo** (default `~/comfy`; override by env var), in a virtual environment, idempotently (re-running does not re-download or break an existing install).
- [ ] `spark/comfyui/fetch-h3.sh` downloads from `Comfy-Org/MiniMax-H3` on Hugging Face only what FL2VA text-to-video needs at **one precision first — `int8_convrot`** (Comfy-Org's recommendation for cu130), plus the Qwen3-VL-32B text encoder in its quantized form, the video and audio VAEs, and the official MiniMax-H3 workflow template, into ComfyUI's models directory (outside the repo, gitignored), verifying file sizes against the listing and printing the total on disk. `fp8_scaled` is fetched only if int8 fails to load (see below).
- [ ] `spark/comfyui/run.sh` starts ComfyUI headless on `127.0.0.1:8188` with the flags the Spark needs — `--disable-mmap`, `--disable-async-offload`, `--disable-pinned-memory`, `--cache-none` (the safetensors memory-doubling issue on unified memory) plus any others the install proves necessary — and `spark/comfyui/stop.sh` stops it cleanly.
- [ ] `spark/comfyui/smoke.sh` submits the FL2VA text-to-video template through ComfyUI's HTTP API (`POST /prompt`), with a fixed prompt, **16:9 at 1344×768, 5 s, 24 fps** and the template's default steps, polls `GET /history/<id>` until done, and saves the MP4 via `GET /view` to an output directory outside the repo. It exits non-zero if ComfyUI errors or the file is missing or empty.
- [ ] `spark/comfyui/memwatch.sh` samples used unified memory every two seconds (from `/proc/meminfo`, since `nvidia-smi` reports no memory column on the Spark) into a log for the duration of the smoke run, and prints the peak.
- [ ] **The numbers are written down.** The Done note here and README → Running the Model record: ComfyUI version, PyTorch and CUDA versions, precision, flags, the smoke clip's wall time from submit to file, peak used memory, model-load time, output file size and duration, and whether the clip plays (checked by the owner or with `ffprobe`).
- [ ] If `int8_convrot` fails to load or run on sm_121, the failure is recorded verbatim, then `fp8_scaled` is fetched and tried; if that fails too, NVFP4 via the community node pack is the third try. Each attempt's outcome goes in the Done note.
- [ ] `git status` on the Spark shows no weights, outputs or logs: everything heavy lives outside the repo, and `.gitignore` already excludes `models/`, `*.safetensors`, `*.mp4`.

## Technical Notes

- **Read before you write on the Spark** ([CLAUDE.md → §4a](../../CLAUDE.md#4a-two-machines-the-mac-and-the-spark)). Another process may own the GPU. Never delete a weights directory without the owner saying so in that session.
- **If memory is short, do not free it yourself.** Other Docker containers and services on the Spark are the owner's. List them with their memory use and ask which are not required; stop only what he names, and record in the Done note what was stopped and how much it freed (EPIC_004 → Working on two machines at once).
- Starting points, to read rather than adopt blindly: MiniMax's self-hosting guide (ComfyUI 0.30.0+, Comfy-Org weights), Comfy-Org's MiniMax-H3 tutorial and templates, the NVIDIA-forum "one-click deploy" thread (Sol-Attn, 12 workflows, Docker packaging in the replies) and the SparkyUI container (aarch64 cu130 PyTorch, SageAttention for sm_121), and the memory-doubling thread (the flags above; upstream fixes in ComfyUI PR #13609 and safetensors PR #759 — check whether the pinned ComfyUI already includes them). All linked from EPIC_004.
- The weights are licensed under the MiniMax H3 Community License; the Spark is outside the excluded territories (owner, 2026-09-12). The download scripts print the licence name and where it was read.
- Prefer a plain venv on the host over Docker for the first run: one fewer layer between the numbers and the hardware. Docker is a later chore if it helps reproducibility.
- The smoke prompt is fixed so later precisions are comparable: "A small paper boat drifting across a rain puddle in soft morning light, gentle ripples, camera slowly pushing in." (the same prompt the reference rendered on 2026-09-12; its result is in the recon output for a side-by-side).

## Testing Plan

- **Unit** — N/A: the story is shell scripts with no branching logic beyond sequencing and checks. `shellcheck` runs on every script as the lint step and must be clean.
- **Integration** — `smoke.sh` *is* the integration test: install → serve → generate → file, end to end against the real ComfyUI on the Spark. It is run by hand on the Spark and is not part of the Mac gate (the Mac cannot reach the Spark and the gate must never depend on it).
- **E2E** — N/A (no UI).
- **Manual verification** (recorded in the Done note): the owner plays the smoke clip; the numbers above are in README → Running the Model.

## Estimated Complexity

L — most of the time is downloads and the first-run debugging of an aarch64 + sm_121 stack.
