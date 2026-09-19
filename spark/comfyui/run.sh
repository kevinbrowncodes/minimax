#!/usr/bin/env bash
# spark/comfyui/run.sh — start a ComfyUI container (GPU attached) and the adapter (127.0.0.1:4020, and http://adapter:4020
# on the shared network) and wait until both answer.
#
#   run.sh          the SFW container, minimax-comfyui on 127.0.0.1:8188 (what runs today)
#   run.sh --nsfw   the NSFW container, minimax-comfyui-nsfw on 127.0.0.1:8189 (STORY_063) — its own models-nsfw/ and output-nsfw/
#
# One container at a time (the owner, 2026-09-19): before starting one, the other is stopped — and the start is REFUSED while a
# job is running or waiting on the other, so a switch never interrupts a draw. The flags live in container/comfyui-entrypoint.sh;
# COMFY_EXTRA_ARGS (COMFY_EXTRA_ARGS_NSFW for the NSFW container) is passed through. Logs: docker logs -t <container>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

log() { printf '[run] %s\n' "$*"; }
die() { printf '[run] ERROR: %s\n' "$*" >&2; exit 1; }
for arg in "$@"; do
  case "$arg" in
    --nsfw) use_nsfw ;;
    *) die "unknown option $arg (use --nsfw)" ;;
  esac
done
READY_TIMEOUT="${READY_TIMEOUT:-180}"

if [ "${NSFW:-0}" = 1 ]; then
  IMAGE="minimax-spark/comfyui:$COMFYUI_TAG_NSFW"
  OTHER_CONTAINER="$COMFY_CONTAINER_SFW"; OTHER_URL="$COMFY_URL_SFW"; OTHER_SERVICE="$COMFY_SERVICE_SFW"; OTHER_FLAG=""
  MODELS_DIR="$SPARK_DATA/models-nsfw"; OUTPUT_DIR="$SPARK_DATA/output-nsfw"
  export COMFY_EXTRA_ARGS_NSFW="${COMFY_EXTRA_ARGS_NSFW:-}"; extra="$COMFY_EXTRA_ARGS_NSFW"
else
  IMAGE="minimax-spark/comfyui:$COMFYUI_TAG"
  OTHER_CONTAINER="$COMFY_CONTAINER_NSFW"; OTHER_URL="$COMFY_URL_NSFW"; OTHER_SERVICE="$COMFY_SERVICE_NSFW"; OTHER_FLAG=" --nsfw"
  MODELS_DIR="$SPARK_DATA/models"; OUTPUT_DIR="$SPARK_DATA/output"
  export COMFY_EXTRA_ARGS="${COMFY_EXTRA_ARGS:-}"; extra="$COMFY_EXTRA_ARGS"
fi

docker image inspect "$IMAGE" > /dev/null 2>&1 || die "image $IMAGE not built — run install.sh first"
if container_running; then
  log "already running at $COMFY_URL"
  exit 0
fi

# --- one container at a time: the other one goes down first, never mid-job ----------------------------
if container_running_named "$OTHER_CONTAINER"; then
  n="$(comfy_queue_count "$OTHER_URL")"
  [ "$n" = 0 ] || die "$OTHER_CONTAINER has $n job(s) running or waiting (or did not answer) — never mid-job: wait for it to finish (or stop.sh$OTHER_FLAG), then run again"
  log "stopping $OTHER_CONTAINER first (one container at a time; its queue is empty)"
  compose stop "$OTHER_SERVICE"
fi
if ss -ltn "sport = :$COMFY_PORT" 2>/dev/null | grep -q LISTEN; then
  die "port $COMFY_PORT is already in use by something that is not ours"
fi

mkdir -p "$MODELS_DIR" "$OUTPUT_DIR" "$SPARK_DATA/logs"
log "starting $COMFY_CONTAINER from $IMAGE (extra args: '$extra')"
docker network inspect minimax > /dev/null 2>&1 || die "the shared docker network minimax is missing — run install.sh"
mkdir -p "$SPARK_DATA/adapter" "$SPARK_DATA/output-nsfw"
compose up -d "$COMFY_SERVICE" adapter

waited=0
until curl -fsS "$COMFY_URL/system_stats" > /dev/null 2>&1; do
  if ! container_running; then
    printf '%s\n' "--- last 40 container log lines ---" >&2; docker logs --tail 40 "$COMFY_CONTAINER" >&2 2>&1 || true
    die "the container exited before ComfyUI answered on $COMFY_URL"
  fi
  if [ "$waited" -ge "$READY_TIMEOUT" ]; then
    die "ComfyUI did not answer on $COMFY_URL within ${READY_TIMEOUT}s (container still running; see docker logs $COMFY_CONTAINER)"
  fi
  sleep 2; waited=$((waited + 2))
done

log "ComfyUI ready after ~${waited}s at $COMFY_URL"
# CHORE_007: a custom-node pack that fails to import is silently absent from /object_info; assert the pinned one loaded.
curl -fsS "$COMFY_URL/object_info/ImageBatchExtendWithOverlap" | jq -e 'has("ImageBatchExtendWithOverlap")' > /dev/null 2>&1 \
  || die "ComfyUI-KJNodes did not load (ImageBatchExtendWithOverlap is missing from /object_info) — see docker logs $COMFY_CONTAINER"
log "custom nodes: ComfyUI-KJNodes loaded"
ADAPTER_URL="http://127.0.0.1:${ADAPTER_PORT:-4020}"
waited=0
until curl -fsS "$ADAPTER_URL/health" > /dev/null 2>&1; do
  if [ "$(docker inspect -f '{{.State.Running}}' minimax-adapter 2>/dev/null)" != "true" ]; then
    printf '%s\n' "--- adapter log ---" >&2; docker logs --tail 20 minimax-adapter >&2 2>&1 || true
    die "the adapter container exited before it answered on $ADAPTER_URL"
  fi
  [ "$waited" -lt 60 ] || die "the adapter did not answer on $ADAPTER_URL within 60s (see docker logs minimax-adapter)"
  sleep 2; waited=$((waited + 2))
done
log "adapter ready at $ADAPTER_URL (and http://adapter:4020 on the minimax network): $(curl -fsS "$ADAPTER_URL/health")"
curl -fsS "$COMFY_URL/system_stats" | jq -r '"[run] comfyui \(.system.comfyui_version)  pytorch \(.system.pytorch_version)  python \(.system.python_version | split(" ")[0])  device \(.devices[0].name)  ram_total \(.system.ram_total / 1073741824 | floor) GiB"'
