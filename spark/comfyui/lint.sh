#!/usr/bin/env bash
# spark/comfyui/lint.sh — shellcheck every host script under spark/ (comfyui and, since STORY_047, gcloud), through
# the official shellcheck image (nothing installed on the host).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPARK="$(cd "$HERE/.." && pwd)"
cd "$SPARK"
docker run --rm -v "$SPARK:/mnt:ro" koalaman/shellcheck:stable -x -P SCRIPTDIR ./comfyui/*.sh ./comfyui/container/*.sh ./gcloud/*.sh
echo "[lint] shellcheck clean"
