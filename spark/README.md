# The Spark — what is on the box, and what STORY_005 adds

> Everything below was read **on the Spark on 2026-09-12** with the commands named in each section, before anything of ours was installed. It is a description of that moment, not evidence of the current state: re-run the commands before relying on a number ([CLAUDE.md → §3 item 8](../CLAUDE.md#3-how-features-are-built-important), [§4a](../CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

## The box (as read 2026-09-12)

| Item | Value | Read with |
| --- | --- | --- |
| Machine | NVIDIA DGX Spark, one GB10 GPU, 20 × Cortex-X925 cores, aarch64 | `nvidia-smi`, `lscpu`, `uname -m` |
| OS / kernel | Ubuntu 24.04.4 LTS, kernel `6.17.0-1014-nvidia` | `/etc/os-release`, `uname -r` |
| NVIDIA driver | 580.142 (open kernel module), CUDA 13.0 per `nvidia-smi` | `nvidia-smi`, `/proc/driver/nvidia/version` |
| CUDA toolkit | 13.0 (`nvcc` V13.0.88) at `/usr/local/cuda-13.0` | `nvcc --version` |
| Compute capability | sm_121 (GB10, Blackwell); CUDA 12.x wheels cannot target it, cu130 wheels can | SparkyUI README on the box, PyTorch arch list |
| Python | 3.12.3 system; `uv` 0.11.18 with 3.11.15 and 3.13.13 also installed | `python3 --version`, `uv python list` |
| Unified memory | 121 GiB total (127 601 164 kB). At 12:48: 108 GiB used, 1 GiB free, **12–13 GiB available**; 16 GiB swap file (`/swap.img`) with 11.5 GiB in use | `free -g`, `/proc/meminfo`, `swapon --show` |
| Disk | One NVMe, `/` is 3.7 TB with 2.4 TB used and **1.2 TB free** (68 %). No other data volume | `df -h` |
| Docker | 29.2.1, NVIDIA Container Toolkit 1.19.0, default runtime `nvidia` | `docker --version`, `nvidia-ctk --version`, `docker info` |
| Tools | git 2.43, jq 1.7, ffmpeg/ffprobe 6.1.1, `hf` 1.14.0 (Hugging Face CLI, token file present), curl 8.5. shellcheck runs through the `koalaman/shellcheck:stable` image (`lint.sh`); a user-local binary was put in `~/.local/bin` for a few minutes this session and removed again | `command -v …` |

`nvidia-smi` shows `Memory-Usage: Not Supported` on the Spark's unified memory. Memory is measured from `/proc/meminfo` (`memwatch.sh` below), never from `nvidia-smi`.

## What was already running (as read 2026-09-12 12:48)

The Spark runs the owner's services. **None of them is ours to stop** — when memory is short, the list goes to the owner and only what he names is stopped, by name ([EPIC_004 → Working on two machines at once](../docs/epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md)).

| Container | Image | Up | RSS (`docker stats`) | GPU memory (`nvidia-smi`) |
| --- | --- | --- | --- | --- |
| `spark-primary` | `eugr/spark-vllm:latest` — vLLM serving `gemma-4-26B-A4B-NVFP4`, `--gpu-memory-utilization 0.40`, port 8004 in-container | 3 weeks | 215 MiB | **48 032 MiB** (`VLLM::EngineCore`) |
| `cosmos3-api` | `vllm/vllm-omni:cosmos3` — vLLM-Omni serving `nvidia/Cosmos3-Nano`, port 8000 | 4 days | 1.0 GiB | **50 045 + 1 510 MiB** (`vLLM-Omni::StageDiffusionProc-0` + `vllm serve`) |
| `cosmos3-flow`, `cosmos3-gateway`, `cosmos3-progress` | `spark-cosmos3-*` | 4 days | 17–43 MiB each | — |
| `flow-preview` | (untagged) | 5 days | 4 MiB | — |
| `hermes`, `hermes-proxy` | `nousresearch/hermes-agent`, `caddy:2` | 3 weeks | 401 / 15 MiB | — |
| `open-webui` | `ghcr.io/open-webui/open-webui:main` | 7 weeks | 37 MiB | — |
| `ogtv-pipeline` | `ogtv-studios-ogtv-pipeline` | 7 weeks | 11 MiB | — |

Plus the GNOME desktop (Xorg, gnome-shell, ~0.5 GiB of GPU memory) and VS Code's tunnel server. The two vLLM servers hold **~100 GB** of the 121 GiB between them; that is why only 12–13 GiB was available.

Listening ports at the time: 7860, 8000, 8001, 8080 (all interfaces), 11434 (localhost). **8188 was free**, so ComfyUI takes its default port.

## What was already installed (the owner's, untouched)

| Path | What | Notes |
| --- | --- | --- |
| `~/video-gen/ComfyUI` | ComfyUI **0.20.1** (commit `20f5e474`, May 2026), no venv | 504 GB of models (Flux, Wan 2.2, LTX, …). No H3 files |
| `~/ai/ComfyUI` + `~/ai/comfy-venv` | ComfyUI **0.30.0** (commit `1868372d`, Aug 2026) with the H3 nodes; venv has PyTorch **2.11.0+cu128** (arch list stops at sm_120, i.e. not the cu130 build) | 60 GB of H3 files already there: `minimax_h3_fl2va_pruned_int8_convrot`, `minimax_h3_ref2va_pruned_int8_convrot`, `qwen3vl_32b_minimax_h3_nvfp4_awq`, both VAEs. No launch script or output found, so whether it ever generated is unknown |
| `~/SparkyUI`, `~/video-gen/SparkyUI` | The SparkyUI Docker setup (ComfyUI + SageAttention for sm_121) | Its README argues **against** `--cache-none` and `--disable-mmap` on unified memory; STORY_005 uses the flags the story names and measures |
| `~/.local/lib/python3.12` (user site) | PyTorch **2.11.0+cu130** on the system Python | Arch list `sm_80 … sm_120` — cu130 wheels run on sm_121 through the sm_120 family target |
| `~/venvs/foley` | PyTorch 2.12.0+cu130 | HunyuanVideo-Foley |
| `~/cosmos-env` | Python 3.13, PyTorch 2.11.0+cu130 | Cosmos |
| `~/.cache/huggingface/hub` | 188 GB of Hugging Face cache | **No** `Comfy-Org/MiniMax-H3` or `MiniMaxAI/MiniMax-H3` in it |

Nothing of ours reuses these. STORY_005 builds its own image with a pinned ComfyUI and fetches its own copy of the weights so that the numbers are reproducible from the repo alone. **Nothing is installed on the host** (owner's rule, 2026-09-12): a first attempt at a host venv under `~/comfy` (ComfyUI v0.35.1, PyTorch 2.11.0+cu130 — it did see the GB10 as sm_121) was removed the same hour, and the same pinned versions went into the Dockerfile instead. (The owner's pruned int8 files are 21 GB each; the story measures the **full** FL2VA int8_convrot file, 34 GB, which is the one Comfy-Org recommends for cu130.)

Hugging Face download throughput measured at 12:55 with a single `curl` stream: **14.6 MB/s** (2 GB range of a VAE file). `hf download` parallelises, but plan on the order of an hour for the ~55 GB of weights.

## What STORY_005 adds

Everything is defined in the repo under [`spark/comfyui/`](comfyui/) and runs in containers. The only host-side pieces are thin shell wrappers that use tools the Spark already has (`docker`, `curl`, `jq`, `ffprobe`); nothing is installed on the host. Heavy files live in **`spark/data/`** (gitignored) and are bind-mounted into the container; set `SPARK_DATA=/some/volume` to put them elsewhere.

```
spark/comfyui/
  Dockerfile                  nvidia/cuda:13.0.2-runtime-ubuntu24.04 + venv + PyTorch 2.11.0+cu130 (aarch64) + ComfyUI at COMFYUI_TAG (v0.35.1)
  compose.yaml                services: comfyui (GPU, 127.0.0.1:8188), adapter (STORY_006, 127.0.0.1:4020 and http://adapter:4020 on the shared "minimax" network), fetch (one-shot, profile "tools")
spark/adapter/                the job-API adapter (STORY_006): TypeScript on Node 26 with no npm runtime dependencies, its own Dockerfile, unit + integration tests against a fake ComfyUI. STORY_034 put ffmpeg (Debian's, with fonts-dejavu-core) in the image — the one runtime dependency, an exception to the zero-dependency rule made on purpose: a download with Settings › General's watermark switch off is served as a copy with "AI-generated" burned in, made once per job and cached at data/adapter/watermarked/<job>.mp4 (the output mount is read-only). The adapter's tests inject the ffmpeg call and never need the binary
  container/comfyui-entrypoint.sh   python main.py --disable-mmap --disable-async-offload --disable-pinned-memory --cache-none [COMFY_EXTRA_ARGS]
  container/fetch-h3.sh       runs inside the image: disk gate, hf download, size check against the Hub, template copy
  h3.sh                       file names per precision, the 17k+5 frame rule (shared by host and image)
  lib.sh                      host paths + the compose invocation
  install.sh fetch-h3.sh run.sh stop.sh smoke.sh memwatch.sh lint.sh   host wrappers (see table)
  test-nodes.sh border.sh border.py                                    our ComfyUI node's tests and its measure over finished clips, both run inside the image (see table)
  h3_t2v_prompt.json          API-format graph derived from the official text-to-video template

spark/data/                   gitignored
  models/{diffusion_models,text_encoders,vae}/   the H3 files      (-> /comfy/ComfyUI/models)
  output/video/               what ComfyUI writes                   (-> /comfy/ComfyUI/output; read-only in the adapter as /comfy/output)
  adapter/jobs.json           the adapter's job table, survives restarts
  templates/                  the official video_minimax_h3_t2v.json
  logs/                       memwatch-<ts>.log, smoke-<ts>-comfyui.log (the container log for each run)
  smoke/                      smoke-<ts>-<precision>.mp4 and .txt summaries
  versions.txt                image id, ComfyUI tag/commit, PyTorch, CUDA, Python, driver — written by install.sh
```

| Script | Does | Env overrides |
| --- | --- | --- |
| `install.sh` | `docker compose build` of the ComfyUI image (pinned ComfyUI tag, pinned cu130 wheels) and the adapter image, creates the shared docker network `minimax`, then verifies from inside a container that CUDA sees the GB10; writes `spark/data/versions.txt`. Idempotent through docker's layer cache | `COMFYUI_TAG`, `CUDA_IMAGE`, `TORCH_VERSION`, `SPARK_DATA` |
| `fetch-h3.sh` | Runs the `fetch` service: refuses unless ≥ 300 GB is free behind the models mount, downloads from `Comfy-Org/MiniMax-H3` what FL2VA text-to-video and Ref2VA extensions (STORY_016) need at one precision (default `int8_convrot`), the text encoder (default `nvfp4_awq`, the template's default), both VAEs; verifies every size against the Hub; copies the official template | `H3_PRECISION`, `H3_TEXT_ENCODER`, `MIN_FREE_GB`, `HF_TOKEN` |
| `run.sh` / `stop.sh` / `verify.sh` | `docker compose up -d comfyui adapter` and wait for both health endpoints; `stop.sh` stops ComfyUI only and leaves the adapter up (the UI keeps answering; jobs get 503 with the start command until ComfyUI runs again — BUG_001), `--all` stops both; `verify.sh` proves the real chain without generating, `--generate [s]` runs the real trial through the UI. Logs: `docker logs -t minimax-comfyui`, `docker logs minimax-adapter` | `COMFY_PORT`, `COMFY_EXTRA_ARGS`, `ADAPTER_PORT`, `ADAPTER_API_KEY` |
| `memwatch.sh` | Samples used unified memory every 2 s from the host's `/proc/meminfo`; prints the peak on exit | `memwatch.sh [log] [interval]` |
| `smoke.sh` | Submits `h3_t2v_prompt.json` through `POST /prompt` at 1344×768, 5 s, 24 fps with the story's fixed prompt; polls `GET /history/<id>`; saves the MP4 through `GET /view`; runs `memwatch.sh` for the duration; keeps the container log; prints wall time, peak memory, load lines, file size and duration | `H3_PRECISION`, `H3_TEXT_ENCODER`, `WIDTH`, `HEIGHT`, `DURATION`, `SEED`, `STEPS` |
| `lint.sh` | shellcheck of every script through the `koalaman/shellcheck:stable` image | — |
| `test-nodes.sh` | the unit tests of our ComfyUI node (`custom_nodes/minimax_local/test_frame_changes.py`, BUG_010 — the first; before it nothing ran the node) inside the ComfyUI image, the repo's copy mounted over the image's so the working tree is what is tested | — |
| `border.sh` / `border.py` | the node's shot-change measure re-run over finished clips inside the ComfyUI image (PyAV decodes; nothing on the host), printing each clip's largest single-frame, one-second and three-second border change and the kind the adapter's rules give it — STORY_046's calibration; `spark/comfyui/border.sh spark/data/output/video/job-*.mp4` | — |
| `../gcloud/login.sh` / `status.sh` / `setup-vertex.sh` (STORY_047) | Google's CLI from its official image (root `compose.yaml` › `gcloud`, profile `tools`, the owner's uid; nothing on the host): `login.sh` is **run by the owner in his own terminal** — a URL to approve, a code to paste back, the login persisted under `spark/data/gcloud/`; `status.sh` prints "signed in: yes/no" and "key written: yes/no" (never an account or a token; `--revoke` forgets the login); `setup-vertex.sh <project-id> <billing-account-id> [region]` creates the project, links billing, enables Vertex AI, checks the key-creation org policy, creates `minimax-agent` (`roles/aiplatform.user`), writes the key to `spark/data/secrets/vertex-sa.json` and `VERTEX_PROJECT` / `VERTEX_LOCATION` into `.env`. `lint.sh` shellchecks these too | `SPARK_DATA` |

Run order on a fresh box:

```bash
spark/comfyui/lint.sh
spark/comfyui/install.sh
spark/comfyui/fetch-h3.sh
spark/comfyui/run.sh
spark/comfyui/smoke.sh
spark/comfyui/stop.sh
```

The measured numbers are in the story's Done note and in [README.md → Running the Model](../README.md#running-the-model).

## The STORY_005 run (2026-09-12)

`cosmos3-api` and `spark-primary` were stopped by name on the owner's say-so at 14:31:51 (available memory 15 → 114 GiB, swap 13 → 3 GiB) and started again at 14:50:52 after ComfyUI was stopped. The clip took 17 min 21 s submit → file at 1344×768 · 124 frames · 20 steps with `int8_convrot`, peak 66.8 GiB used, no swap. Full numbers: the story's Done note and [README.md → Running the Model](../README.md#running-the-model); raw logs in `spark/data/logs/`, summary in `spark/data/smoke/smoke-20260912-143222-int8_convrot.txt`.

## The STORY_006 and EPIC_003 runs (2026-09-12 evening)

STORY_006's verification: one 5 s text-to-video job through the UI route → adapter → ComfyUI, **17 min 33 s**, peak 63.8 GiB after `spark-primary` was stopped (the first attempt found the adapter's success-before-history race; fixed and rerun). EPIC_003's trial: one **10 s image-to-video** job through the real UI (Playwright against the production container), **51 min**, peak 68.0 GiB. Both nights' stops: `cosmos3-api` (owner: not required) and `spark-primary` (owner: "for now close"), restarted afterwards with `docker start`; both were up again at 20:34.

## Rules that apply on this box

- Read before you write: `nvidia-smi`, `free -g`, `df -h`, `docker ps` first, every session.
- Never stop, restart or remove a container, service or process that is not ours. List, ask, stop only what the owner names.
- Never delete a weights directory, a model file or anything we did not create without the owner saying so in that session.
- Nothing is installed on the host: the serving stack is the image, tooling runs through images. Weights, outputs and logs stay in `spark/data/` (gitignored) or `SPARK_DATA`. `git status --short` before every commit.
