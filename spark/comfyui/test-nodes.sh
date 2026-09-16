#!/usr/bin/env bash
# spark/comfyui/test-nodes.sh — run the unit tests of our ComfyUI nodes (custom_nodes/minimax_local) inside the ComfyUI
# image, where torch is (BUG_010: nothing tested the node before). The repo's copy is mounted over the image's so the
# tests see the working tree, not the last build. Exits with unittest's status.
#
#   spark/comfyui/test-nodes.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
compose run --rm --no-deps -T --entrypoint python -v "$HERE/custom_nodes/minimax_local:/nodes:ro" -w /nodes comfyui -m unittest discover -s /nodes -p 'test_*.py' -v
