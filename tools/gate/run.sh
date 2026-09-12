#!/usr/bin/env bash
# tools/gate/run.sh — run the gate steps of CLAUDE.md §4 inside the gate container, in order, stopping at the first failure.
#
#   tools/gate/run.sh                 all six steps
#   tools/gate/run.sh lint build      only the named steps, in gate order
#   tools/gate/run.sh --from 4        steps 4..6 (after a fix)
#
# Step 0 (always): pnpm install --frozen-lockfile, so node_modules in the bind mount match the lockfile.
# Step 5 also builds the production image (STORY_009's lesson: a change can pass `pnpm build` and still break the image).
# Steps whose root script does not exist print "no lane yet" and pass.
# When a unit or integration step fails, the files with the most uncovered branches are listed (coverage floors, STORY_011).
# GATE_DRY_RUN=<command>: run "<command> <step>" instead of the container (for run.test.sh only).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SPARK_UID="$(id -u)"; SPARK_GID="$(id -g)"
export SPARK_UID SPARK_GID

STEPS=(typecheck lint test test:integration build test:e2e)
from=1
want=()
while [ $# -gt 0 ]; do
  case "$1" in
    --from) from="$2"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) want+=("$1"); shift ;;
  esac
done

compose() { docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" "$@"; }
gate() { compose run --rm --no-deps -T gate "$@"; }
log() { printf '[gate] %s\n' "$*"; }
has_script() { jq -e --arg s "$1" '.scripts[$s] != null' "$ROOT/package.json" > /dev/null; }
run_step() {  # run_step <step>
  if [ -n "${GATE_DRY_RUN:-}" ]; then "$GATE_DRY_RUN" "$1"; return; fi
  gate pnpm run --silent "$1"
  if [ "$1" = "build" ]; then
    log "5/6 build — production image (docker compose build app)"
    compose build --quiet app
  fi
}
rank_coverage() {  # rank_coverage <step>
  local summary
  case "$1" in
    test) summary="$ROOT/app/coverage/coverage-summary.json" ;;
    test:integration) summary="$ROOT/app/coverage-integration/coverage-summary.json" ;;
    *) return 0 ;;
  esac
  [ -f "$summary" ] || return 0
  log "coverage: $(gate node tools/gate/src/coverage-rank.ts "${summary#"$ROOT"/}" 8 2>/dev/null | sed '1d' | sed 's/^/\n[gate]   /' | tr -d '\n' || true)"
}

if [ -z "${GATE_DRY_RUN:-}" ]; then
  docker image inspect minimax/gate:1.63.0-node26 > /dev/null 2>&1 || { log "ERROR: gate image missing — run tools/gate/build.sh"; exit 1; }
  t0=$(date +%s)
  log "0/6 install (pnpm install --frozen-lockfile)"
  gate pnpm install --frozen-lockfile --prefer-offline > /dev/null
else
  t0=$(date +%s)
fi

n=0
for step in "${STEPS[@]}"; do
  n=$((n + 1))
  [ "$n" -ge "$from" ] || continue
  if [ ${#want[@]} -gt 0 ]; then
    printf '%s\n' "${want[@]}" | grep -qx "$step" || continue
  fi
  ts=$(date +%s)
  if [ -z "${GATE_DRY_RUN:-}" ] && ! has_script "$step"; then
    log "$n/6 $step — no lane yet (script not defined in package.json), passing"
    continue
  fi
  log "$n/6 $step"
  if ! run_step "$step"; then
    rank_coverage "$step"
    log "FAILED at step $n/6: $step (after $(( $(date +%s) - ts ))s)"
    exit "$n"
  fi
  log "$n/6 $step ok in $(( $(date +%s) - ts ))s"
done
log "all requested steps green in $(( $(date +%s) - t0 ))s"
