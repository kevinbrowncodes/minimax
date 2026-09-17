#!/usr/bin/env bash
# Follows the segments of a chain trial (agent-chain.spec.ts's agent-chain-<stamp>.json) on the deployed app every
# 60 s until all are terminal — the polls are what let history learn a source is done so the queue runner submits the
# next extension (BUG_009). The log lands beside the json. Run detached (setsid nohup) — it lives for hours.
#   app/e2e-trial/agent-chain-poll.sh spark/data/smoke/agent-chain-<stamp>.json [http://localhost:3000]
set -u
JSON="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; LOG="${JSON%.json}.log"; BASE="${2:-http://localhost:3000}"
IDS=$(python3 -c "import json; print(' '.join(json.load(open('$JSON'))['ids']))")
while true; do
  open=0
  for id in $IDS; do
    s=$(curl -s -m 20 "$BASE/api/jobs/$id" || echo '{}')
    st=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); r=d.get('result') or {}; print(d.get('status','?'), d.get('progress','?'), json.dumps(r.get('cuts')), r.get('camera'), r.get('frames'))" <<<"$s" 2>/dev/null || echo "? ? ?")
    case "$st" in done*|failed*|cancelled*) ;; *) open=$((open+1));; esac
    echo "$(date -u +%FT%TZ) ${id:0:8} $st"
  done >> "$LOG"
  [ "$open" -eq 0 ] && { echo "$(date -u +%FT%TZ) all terminal — poller exiting" >> "$LOG"; exit 0; }
  sleep 60
done
