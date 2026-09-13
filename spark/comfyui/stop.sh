#!/usr/bin/env bash
# spark/comfyui/stop.sh — stop ComfyUI cleanly (interrupt any running job, then compose stop; ComfyUI gets SIGINT).
# The adapter stays up so the UI keeps working up to Send (BUG_001); `stop.sh --all` stops the adapter too, and
# `--down` also removes the containers (their docker logs go with them).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

log() { printf '[stop] %s\n' "$*"; }
all=0; down=0
for arg in "$@"; do
  case "$arg" in
    --all) all=1 ;;
    --down) all=1; down=1 ;;
    *) printf '[stop] unknown option %s (use --all or --down)\n' "$arg" >&2; exit 2 ;;
  esac
done
if container_running; then
  curl -fsS -X POST "$COMFY_URL/interrupt" > /dev/null 2>&1 || true
  log "stopping $COMFY_CONTAINER"
  compose stop comfyui
else
  log "ComfyUI not running"
fi
if [ "$all" -eq 1 ]; then
  log "stopping the adapter too"
  compose stop adapter
else
  log "the adapter stays up (the UI answers; jobs get 503 until ComfyUI runs again) — stop.sh --all stops it too"
fi
if [ "$down" -eq 1 ]; then compose down --remove-orphans; fi
log "done"
