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
SPARK_UID="$(id -u)"
SPARK_GID="$(id -g)"
export SPARK_DATA COMFYUI_TAG COMFY_PORT SPARK_UID SPARK_GID

compose() { docker compose --project-directory "$SPARK_COMFY_DIR" -f "$SPARK_COMFY_DIR/compose.yaml" "$@"; }

container_running() { [ "$(docker inspect -f '{{.State.Running}}' "$COMFY_CONTAINER" 2>/dev/null)" = "true" ]; }
