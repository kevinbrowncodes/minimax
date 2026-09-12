#!/usr/bin/env bash
# spark/comfyui/install.sh — build the ComfyUI image (pinned ComfyUI tag, aarch64 cu130 PyTorch) and verify CUDA sees
# the GB10 from inside it. Nothing is installed on the host. Idempotent: docker's layer cache makes a re-run a no-op.
#
# Env: COMFYUI_TAG (v0.35.1)  CUDA_IMAGE  TORCH_VERSION / TORCHVISION_VERSION / TORCHAUDIO_VERSION  SPARK_DATA
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

log() { printf '[install] %s\n' "$*"; }
die() { printf '[install] ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "docker is required"
docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q nvidia || die "the NVIDIA container runtime is not registered with docker"
[ "$(uname -m)" = "aarch64" ] || die "the image pins aarch64 wheels; this machine is $(uname -m)"

mkdir -p "$SPARK_DATA"/{models,output,logs,smoke,templates,adapter}
docker network inspect minimax > /dev/null 2>&1 || { docker network create minimax > /dev/null; log "created the shared docker network minimax"; }
log "data dir $SPARK_DATA (gitignored); image minimax-spark/comfyui:$COMFYUI_TAG; uid:gid $SPARK_UID:$SPARK_GID"

log "building (base ${CUDA_IMAGE:-nvidia/cuda:13.0.2-runtime-ubuntu24.04 pinned by digest}, ComfyUI $COMFYUI_TAG, torch ${TORCH_VERSION:-2.11.0+cu130})"
compose build comfyui
log "building the adapter image (spark/adapter/Dockerfile)"
compose build adapter

log "verifying PyTorch + CUDA inside the image"
compose run --rm --no-deps -T --entrypoint python comfyui - <<'PY'
import sys, torch
print(f"  python {sys.version.split()[0]}  torch {torch.__version__}  cuda {torch.version.cuda}  cudnn {torch.backends.cudnn.version()}")
if not torch.cuda.is_available():
    sys.exit("  ERROR: torch.cuda.is_available() is False inside the container")
p = torch.cuda.get_device_properties(0)
print(f"  device {p.name}  sm_{p.major}{p.minor}  arch list {torch.cuda.get_arch_list()}")
PY

{
  echo "date=$(date -Iseconds)"
  echo "image=$(docker image inspect -f '{{.Id}}' "minimax-spark/comfyui:$COMFYUI_TAG")"
  echo "comfyui_tag=$COMFYUI_TAG"
  echo "comfyui_commit=$(compose run --rm --no-deps -T --entrypoint git comfyui -C /comfy/ComfyUI rev-parse --short HEAD | tr -d '\r')"
  compose run --rm --no-deps -T --entrypoint python comfyui -c "import sys, torch; print(f'python={sys.version.split()[0]}'); print(f'torch={torch.__version__}'); print(f'cuda={torch.version.cuda}')" | tr -d '\r'
  echo "driver=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null || echo unknown)"
} > "$SPARK_DATA/versions.txt"
log "wrote $SPARK_DATA/versions.txt:"
sed 's/^/  /' "$SPARK_DATA/versions.txt"
log "done"
