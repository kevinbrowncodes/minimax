#!/usr/bin/env bash
# spark/comfyui/run.sh — start the ComfyUI container (GPU attached, 127.0.0.1:8188) and wait until it answers.
# The flags live in container/comfyui-entrypoint.sh; COMFY_EXTRA_ARGS is passed through. Logs: docker logs -t minimax-comfyui
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

READY_TIMEOUT="${READY_TIMEOUT:-180}"
log() { printf '[run] %s\n' "$*"; }
die() { printf '[run] ERROR: %s\n' "$*" >&2; exit 1; }

docker image inspect "minimax-spark/comfyui:$COMFYUI_TAG" > /dev/null 2>&1 || die "image not built — run install.sh first"
if container_running; then
  log "already running at $COMFY_URL"
  exit 0
fi
if ss -ltn "sport = :$COMFY_PORT" 2>/dev/null | grep -q LISTEN; then
  die "port $COMFY_PORT is already in use by something that is not ours"
fi

mkdir -p "$SPARK_DATA"/{models,output,logs}
export COMFY_EXTRA_ARGS="${COMFY_EXTRA_ARGS:-}"
log "starting $COMFY_CONTAINER (extra args: '${COMFY_EXTRA_ARGS}')"
compose up -d comfyui

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

log "ready after ~${waited}s at $COMFY_URL"
curl -fsS "$COMFY_URL/system_stats" | jq -r '"[run] comfyui \(.system.comfyui_version)  pytorch \(.system.pytorch_version)  python \(.system.python_version | split(" ")[0])  device \(.devices[0].name)  ram_total \(.system.ram_total / 1073741824 | floor) GiB"'
