#!/usr/bin/env bash
# spark/comfyui/container/comfyui-entrypoint.sh — runs inside the image: ComfyUI headless with the flags the Spark needs.
#
# --disable-mmap --disable-async-offload --disable-pinned-memory: without them each safetensors file is held twice on
# unified memory (mmap copy + device copy from the same pool). --cache-none frees a model as soon as its node is done.
# COMFY_EXTRA_ARGS (e.g. "--verbose DEBUG") is appended verbatim.
set -euo pipefail
cd /comfy/ComfyUI
# shellcheck disable=SC2086  # COMFY_EXTRA_ARGS is meant to word-split
exec python main.py --listen "${COMFY_LISTEN:-0.0.0.0}" --port "${COMFY_PORT:-8188}" --disable-auto-launch \
  --disable-mmap --disable-async-offload --disable-pinned-memory --cache-none ${COMFY_EXTRA_ARGS:-}
