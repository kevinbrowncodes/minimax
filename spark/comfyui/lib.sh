#!/usr/bin/env bash
# spark/comfyui/lib.sh — host-side shared paths and the compose invocation. Sourced by the host scripts.
# The host needs only docker, curl, jq and ffprobe (all already on the Spark); nothing is installed on it.
# shellcheck disable=SC2034  # the variables are used by the scripts that source this file
SPARK_COMFY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=h3.sh
. "$SPARK_COMFY_DIR/h3.sh"

# Weights, outputs, logs, smoke clips and templates. Default spark/data (gitignored); override with SPARK_DATA=/some/volume.
SPARK_DATA="${SPARK_DATA:-$(cd "$SPARK_COMFY_DIR/.." && pwd)/data}"
COMFYUI_TAG="${COMFYUI_TAG:-v0.35.1}"
COMFY_PORT="${COMFY_PORT:-8188}"
COMFY_URL="${COMFY_URL:-http://127.0.0.1:$COMFY_PORT}"
COMFY_CONTAINER="minimax-comfyui"
COMFY_SERVICE="comfyui"
SPARK_UID="$(id -u)"
SPARK_GID="$(id -g)"

# STORY_063: the NSFW container — the same image (its own tag if it ever diverges), its own port, models and output.
# One container runs at a time (run.sh stops the other first). NSFW=1 in the environment, or a script's --nsfw, points
# every script at it through use_nsfw; the *_SFW names keep the SFW side reachable after the switch.
COMFYUI_TAG_NSFW="${COMFYUI_TAG_NSFW:-$COMFYUI_TAG}"
COMFY_PORT_NSFW="${COMFY_PORT_NSFW:-8189}"
COMFY_URL_NSFW="${COMFY_URL_NSFW:-http://127.0.0.1:$COMFY_PORT_NSFW}"
COMFY_CONTAINER_NSFW="minimax-comfyui-nsfw"
COMFY_SERVICE_NSFW="comfyui-nsfw"
COMFY_PORT_SFW="$COMFY_PORT"
COMFY_URL_SFW="$COMFY_URL"
COMFY_CONTAINER_SFW="$COMFY_CONTAINER"
COMFY_SERVICE_SFW="$COMFY_SERVICE"
export SPARK_DATA COMFYUI_TAG COMFYUI_TAG_NSFW COMFY_PORT COMFY_PORT_NSFW SPARK_UID SPARK_GID

use_nsfw() {
  COMFY_CONTAINER="$COMFY_CONTAINER_NSFW"; COMFY_SERVICE="$COMFY_SERVICE_NSFW"
  COMFY_PORT="$COMFY_PORT_NSFW"; COMFY_URL="$COMFY_URL_NSFW"
  NSFW=1; export NSFW
}
if [ "${NSFW:-0}" = 1 ]; then use_nsfw; fi

compose() { docker compose --project-directory "$SPARK_COMFY_DIR" -f "$SPARK_COMFY_DIR/compose.yaml" "$@"; }

container_running_named() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]; }
container_running() { container_running_named "$COMFY_CONTAINER"; }
# Jobs running or waiting on a ComfyUI (GET /queue); "unknown" when it does not answer — callers treat unknown as busy.
comfy_queue_count() { curl -fsS -m 5 "$1/queue" 2>/dev/null | jq -r '(.queue_running | length) + (.queue_pending | length)' 2>/dev/null || echo unknown; }
