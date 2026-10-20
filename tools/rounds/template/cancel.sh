#!/usr/bin/env bash
# usage: cancel.sh <seed> "<why>" — stop the chain drawing this seed after its shot 1 (owner 2026-10-17: no glimpse -> NG); the batch moves on
cd "$(dirname "$0")"
pid=$(pgrep -f "chain\.sh [A-Z] $1 " | head -1)
[ -n "$pid" ] && kill -TERM "$pid" $(pgrep -P "$pid") 2>/dev/null
curl -s -X POST http://127.0.0.1:8189/queue -H 'Content-Type: application/json' -d '{"clear":true}' >/dev/null
curl -s -X POST http://127.0.0.1:8189/interrupt >/dev/null
echo "$(date -u +%FT%TZ) NG: seed $1 cancelled after shot 1 — $2" >> run.log
