#!/usr/bin/env bash
# spark/comfyui/stop.sh — stop the ComfyUI container cleanly: interrupt any running job, then compose stop (30 s grace).
# Pass --down to also remove the container (its docker logs go with it).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

log() { printf '[stop] %s\n' "$*"; }
if container_running; then
  curl -fsS -X POST "$COMFY_URL/interrupt" > /dev/null 2>&1 || true
  log "stopping $COMFY_CONTAINER and the adapter"
  compose stop adapter comfyui
else
  log "ComfyUI not running"
  compose stop adapter 2>/dev/null || true
fi
if [ "${1:-}" = "--down" ]; then compose down --remove-orphans; fi
log "stopped"
