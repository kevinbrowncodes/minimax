#!/usr/bin/env bash
# Shot retry (CHORE_063, owner 2026-10-29): redraw a failed shot 2 or 3 on a new seed instead of scrapping the take.
#   retry.sh <K|B> <seed> <shot 2|3> "<why>"
# Keeps the shots before it, moves the failed shot (and any later one) aside into retries/, bumps the attempt count, queues the
# take for rotate.sh (which resumes it next) and stops the take in progress. Two retries per shot; the third failure is an NG.
cd "$(dirname "$0")"
L="$1"; S="$2"; N="$3"; WHY="$4"; MAX=2
case "$N" in 2|3) ;; *) echo "retry.sh: shot must be 2 or 3" >&2; exit 1;; esac
f="retry-$L-$N-$S.n"; n=$(cat "$f" 2>/dev/null || echo 0)
if [ "$n" -ge "$MAX" ]; then echo "retry.sh: $L $S shot $N already retried $n times — post it as an NG" >&2; exit 2; fi
n=$((n+1)); echo "$n" > "$f"
V=../../spark/data/output-nsfw/video; A=../../spark/data/output-nsfw/audio; D="retries/$S-shot$N-try$n"; mkdir -p "$D"
for k in $(seq "$N" 3); do
  mv "$V"/nsfw-"$L"-"$k"-"$S"_* "$D"/ 2>/dev/null
  mv "$A"/nsfw-"$L"-"$k"-"$S"_* "$D"/ 2>/dev/null
  [ "$k" -gt "$N" ] && rm -f "retry-$L-$k-$S.n"
done
echo "$L $S" >> retry.queue
pid=$(pgrep -f "chain\.sh [A-Z] $S " | head -1)
[ -n "$pid" ] && kill -TERM "$pid" $(pgrep -P "$pid") 2>/dev/null
curl -s -X POST http://127.0.0.1:8189/queue -H 'Content-Type: application/json' -d '{"clear":true}' >/dev/null
curl -s -X POST http://127.0.0.1:8189/interrupt >/dev/null
echo "$(date -u +%FT%TZ) RETRY: $L $S shot $N attempt $n of $MAX — $WHY (failed shot kept in $D)" >> run.log
