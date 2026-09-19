#!/usr/bin/env bash
# spark/comfyui/fetch-nsfw.sh — run the one-shot fetch-nsfw container (STORY_063): fill $SPARK_DATA/models-nsfw from
# nsfw-files.tsv — the base files copied locally from $SPARK_DATA/models (never re-downloaded), the variant files
# downloaded from Civitai / Hugging Face — every file checked against its SHA-256 and size; nothing deleted; a present,
# matching file is skipped. See container/fetch-nsfw.sh for the loop.
#
# Env: MIN_FREE_GB (100)   CIVITAI_TOKEN (needed for Civitai's NSFW files; read from the environment or the repo's .env,
#      never printed)   HF_TOKEN (optional)   SPARK_DATA
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
log() { printf '[fetch-nsfw] %s\n' "$*"; }
die() { printf '[fetch-nsfw] ERROR: %s\n' "$*" >&2; exit 1; }

docker image inspect "minimax-spark/comfyui:$COMFYUI_TAG_NSFW" > /dev/null 2>&1 || die "image minimax-spark/comfyui:$COMFYUI_TAG_NSFW not built — run install.sh first"
[ -f "$HERE/nsfw-files.tsv" ] || die "$HERE/nsfw-files.tsv is missing"
[ -d "$SPARK_DATA/models" ] || die "$SPARK_DATA/models is missing — the base files are copied from there (fetch-h3.sh first)"
mkdir -p "$SPARK_DATA"/{models-nsfw,output-nsfw}

# The tokens: the environment first, else the repo's .env (the owner's file, gitignored). Presence is reported, never the value.
env_value() { grep -E "^$1=" "$ROOT/.env" 2>/dev/null | head -n 1 | cut -d= -f2- | tr -d '"' || true; }
CIVITAI_TOKEN="${CIVITAI_TOKEN:-$(env_value CIVITAI_TOKEN)}"
HF_TOKEN="${HF_TOKEN:-$(env_value HF_TOKEN)}"
civ="absent"; [ -z "$CIVITAI_TOKEN" ] || civ="set"
hf="absent"; [ -z "$HF_TOKEN" ] || hf="set"
log "civitai token: $civ   hf token: $hf   min free: ${MIN_FREE_GB:-100} GB   into $SPARK_DATA/models-nsfw"
export MIN_FREE_GB="${MIN_FREE_GB:-100}" CIVITAI_TOKEN HF_TOKEN
compose run --rm --no-deps -T fetch-nsfw
