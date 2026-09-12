#!/usr/bin/env bash
# spark/comfyui/lint.sh — shellcheck every script here, through the official shellcheck image (nothing installed on the host).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
docker run --rm -v "$HERE:/mnt:ro" koalaman/shellcheck:stable -x -P SCRIPTDIR ./*.sh ./container/*.sh
echo "[lint] shellcheck clean"
