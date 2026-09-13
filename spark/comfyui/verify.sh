#!/usr/bin/env bash
# spark/comfyui/verify.sh — prove the REAL chain, not the stub (BUG_001): the adapter answers, the UI container reaches
# it over the shared network, and the adapter enforces the Spark's capabilities through the UI's route. No GPU work.
#
#   spark/comfyui/verify.sh                 the three checks above (seconds)
#   spark/comfyui/verify.sh --generate [S]  also runs the real Playwright trial through the UI (S seconds, default 4;
#                                           needs ComfyUI up, the owner's image and prompt in spark/data/input, and
#                                           the memory a run needs — see spark/README.md)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
ADAPTER_URL="http://127.0.0.1:${ADAPTER_PORT:-4020}"
UI_URL="${UI_URL:-http://127.0.0.1:${APP_PORT:-3000}}"
generate=0; seconds=4
while [ $# -gt 0 ]; do
  case "$1" in
    --generate) generate=1; if [ "${2:-}" != "" ] && [ "${2#-}" = "$2" ]; then seconds="$2"; shift; fi; shift ;;
    *) printf '[verify] unknown option %s\n' "$1" >&2; exit 2 ;;
  esac
done
log() { printf '[verify] %s\n' "$*"; }
fail() { printf '[verify] FAIL: %s\n' "$*" >&2; exit 1; }
for t in curl jq docker; do command -v "$t" > /dev/null || fail "$t is required on the host"; done

log "1/3 the adapter answers on $ADAPTER_URL"
health="$(curl -fsS -m 10 "$ADAPTER_URL/health" 2>/dev/null)" || fail "no adapter on $ADAPTER_URL — run spark/comfyui/run.sh (or: docker compose --project-directory $HERE up -d adapter)"
jq -e '.ok == true and .server == "adapter"' <<< "$health" > /dev/null || fail "unexpected health body: $health"
log "    $(jq -c '{version, comfyui: {reachable: .comfyui.reachable, nodesVerified: .comfyui.nodesVerified, websocket: .comfyui.websocket}, openJobs}' <<< "$health")"

log "2/3 the UI container reaches the adapter through its own route ($UI_URL/api/capabilities)"
caps="$(curl -fsS -m 10 "$UI_URL/api/capabilities" 2>/dev/null)" || fail "the UI at $UI_URL did not answer /api/capabilities with 200 — is minimax-app up (docker compose up -d app) and on the minimax network?"
jq -e '.models[0].id == "minimax-h3" and (.resolutions | index("768P") != null)' <<< "$caps" > /dev/null || fail "the UI relayed something that is not the adapter's capabilities: $caps"
log "    models $(jq -c '[.models[].id]' <<< "$caps") ratios $(jq -c '.ratios | length' <<< "$caps") resolutions $(jq -c '.resolutions' <<< "$caps") durations $(jq -c '.durationsSeconds' <<< "$caps")"

log "3/3 the adapter enforces the Spark's limits through the UI route (a 2K request must be refused, no job created)"
refusal="$(curl -sS -m 10 -w '\n%{http_code}' -X POST "$UI_URL/api/jobs" -H 'content-type: application/json' -d '{"prompt":"verify","ratio":"16:9","resolution":"2K","durationSeconds":5}')"
code="${refusal##*$'\n'}"; body="${refusal%$'\n'*}"
[ "$code" = "400" ] || fail "expected 400 for 2K, got $code: $body"
jq -e '.error.code == "unsupported_option" and .error.field == "resolution"' <<< "$body" > /dev/null || fail "unexpected refusal body: $body"
log "    refused with: $(jq -r '.error.message' <<< "$body")"

if [ "$(jq -r '.comfyui.reachable' <<< "$health")" != "true" ]; then
  log "ComfyUI is not running: the UI works up to Send; a job would answer 503 with the start command. Start it with spark/comfyui/run.sh."
fi
log "real chain OK: adapter ↔ UI container ↔ adapter validation"

if [ "$generate" -eq 1 ]; then
  [ "$(jq -r '.comfyui.reachable' <<< "$health")" = "true" ] || fail "--generate needs ComfyUI up (spark/comfyui/run.sh) and the memory a run needs"
  [ -f "$SPARK_DATA/input/01.jpg" ] && [ -f "$SPARK_DATA/input/01-prompt.txt" ] || fail "--generate needs spark/data/input/01.jpg and 01-prompt.txt"
  log "running the real Playwright trial through the UI (${seconds}s clip; expect minutes)"
  docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" run --rm --no-deps -T \
    -e TRIAL_BASE_URL=http://minimax-app:3000 -e TRIAL_IMAGE=/work/spark/data/input/01.jpg -e TRIAL_PROMPT_FILE=/work/spark/data/input/01-prompt.txt \
    -e TRIAL_DURATION="$seconds" -e TRIAL_RATIO=16:9 -e TRIAL_OUT_DIR=/work/spark/data/smoke \
    gate pnpm --filter app exec playwright test --config playwright.trial.config.ts
  log "trial passed; the clip is in spark/data/smoke and in the UI's Assets"
fi
