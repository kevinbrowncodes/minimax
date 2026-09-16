#!/usr/bin/env bash
# spark/comfyui/border.sh — run border.py (the shot-change measure over finished clips, STORY_046) inside the ComfyUI
# image, so nothing is installed on the host. Paths are host paths under spark/data/output; they are mounted read-only.
#
#   spark/comfyui/border.sh spark/data/output/video/job-*.mp4
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
[ $# -ge 1 ] || { sed -n '2,5p' "$0"; exit 2; }
OUTPUT="$(cd "$(dirname "$1")" && pwd)"
args=()
for p in "$@"; do args+=("/clips/$(basename "$p")"); done
compose run --rm --no-deps -T --entrypoint python -v "$HERE/border.py:/border.py:ro" -v "$OUTPUT:/clips:ro" comfyui /border.py "${args[@]}"
