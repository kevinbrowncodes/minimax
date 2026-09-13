#!/usr/bin/env bash
# spark/comfyui/fetch-h3.sh — run the one-shot fetch container: the H3 files FL2VA text-to-video and Ref2VA extensions need, at one precision,
# into $SPARK_DATA/models, sizes verified against the Hub, the official template into $SPARK_DATA/templates.
# The disk gate (>= MIN_FREE_GB free) runs inside, on the bind mount. See container/fetch-h3.sh.
#
# Env: H3_PRECISION (int8_convrot)   H3_TEXT_ENCODER (nvfp4_awq)   MIN_FREE_GB (300)   HF_TOKEN (optional)   SPARK_DATA
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

docker image inspect "minimax-spark/comfyui:$COMFYUI_TAG" > /dev/null 2>&1 || { printf '[fetch] ERROR: image not built — run install.sh first\n' >&2; exit 1; }
mkdir -p "$SPARK_DATA"/{models,templates}
export H3_PRECISION="${H3_PRECISION:-int8_convrot}" H3_TEXT_ENCODER="${H3_TEXT_ENCODER:-nvfp4_awq}" MIN_FREE_GB="${MIN_FREE_GB:-300}"
compose run --rm --no-deps -T fetch
