#!/usr/bin/env bash
# One standalone +10 s continuation: emits only its own 255 new frames. Measured like draw.sh (minutes, peak, strip).
#   ext-standalone.sh <label> <source-file> <source-frames> <prompt-file> <seed> <lora-spec> <unet|-> <steps> [sampler] [scheduler]
set -u
cd "$(dirname "$0")"
LABEL="$1"; SRC="$2"; FRAMES="$3"; PROMPT="$4"; SEED="$5"; LORAS="$6"; UNET="${7:--}"; STEPS="${8:-20}"; SAMPLER="${9:-res_multistep}"; SCHED="${10:-simple}"
C=http://127.0.0.1:8189; ROOT="$(cd ../.. && pwd)"
lora_args=(); if [ "$LORAS" != "-" ] && [ -n "$LORAS" ]; then IFS=, read -ra specs <<< "$LORAS"; for s in "${specs[@]}"; do lora_args+=(--lora "$s"); done; fi
unet_args=(); [ "$UNET" = "-" ] || unet_args=(--unet "$UNET")
# Owner (2026-10-03): the LAST segment is drawn unpinned ("Anywhere") so it can end in the script's final pose; earlier
# extensions stay pinned (STORY_061) so the joins hold. Segment 3 is the last in these 3-segment chains.
anchor_args=(); case "$LABEL" in *-3) anchor_args=(--no-anchor) ;; esac
# Owner (2026-10-09): the unpinned-middle test — UNPIN_MIDDLE=1 draws every extension unpinned (segment 2 too).
# Owner (2026-10-10 13:45): unpinned is the DEFAULT on Equinox (0 shot changes in 14 twin draws); UNPIN_MIDDLE=0 re-pins as a fallback.
[ "${UNPIN_MIDDLE:-1}" = 1 ] && anchor_args=(--no-anchor)
# Hand-over length (owner 2026-10-19 A/B): frames of the previous shot the extension continues from; default 90 (3.75 s, STORY_080); the adapter accepts 22, 39, 56 or 90.
OVERLAP="${OVERLAP:-90}"
# EPIC_014 / STORY_081: REF_IMAGE=<ComfyUI input name> sends the scene's keyframe as a reference picture (<Picture 1>) with this shot; empty = off.
ref_args=(); [ -n "${REF_IMAGE:-}" ] && ref_args=(--ref-image "$REF_IMAGE")
# Shot retry (CHORE_063): retry.sh bumps retry-<label>-<seed>.n; each attempt samples on a new seed, files keep the take's seed.
ATTEMPT=$(cat "retry-${LABEL}-${SEED}.n" 2>/dev/null || echo 0); SAMPLE_SEED=$(( SEED + 7919 * ATTEMPT ))
START=$(date -u +%FT%TZ); T0=$(date +%s)
"$ROOT/spark/comfyui/memwatch.sh" "mem-$LABEL-$SEED.log" 5 2>/dev/null & MEMPID=$!
PID=$(python3 extend.py --label "$LABEL" --source "video/$(basename "$SRC")" --frames "$FRAMES" --prompt-file "$PROMPT" \
      --seed "$SEED" --sample-seed "$SAMPLE_SEED" --overlap "$OVERLAP" --standalone "${anchor_args[@]}" "${ref_args[@]}" --steps "$STEPS" --sampler "$SAMPLER" --scheduler "$SCHED" "${unet_args[@]}" "${lora_args[@]}" --url "$C" --dump "graph-$LABEL-$SEED.json" 2>"graph-$LABEL-$SEED.err") \
  || { kill "$MEMPID" 2>/dev/null; echo "$START $LABEL seed=$SEED — refused: $(head -c 300 "graph-$LABEL-$SEED.err")" >> run.log; exit 1; }
echo "$START $LABEL seed=$SEED prompt=${PID:0:8} submitted (attempt $ATTEMPT, +10 s standalone of $(basename "$SRC"), $FRAMES frames, overlap $OVERLAP)" >> run.log
while true; do
  h=$(curl -s -m 20 "$C/history/$PID" || echo '{}')
  st=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); e=d.get('$PID'); print(e['status']['status_str'] if e else 'pending')" <<<"$h")
  case "$st" in success|error) break;; esac
  curl -fsS -m 10 "$C/system_stats" >/dev/null 2>&1 || { st=dead; break; }
  sleep 30
done
kill -TERM "$MEMPID" 2>/dev/null; wait "$MEMPID" 2>/dev/null
PEAK=$(tail -1 "mem-$LABEL-$SEED.log" 2>/dev/null | sed -E 's/.*peak used ([0-9.]+) GiB.*/\1/')
MIN=$(( ($(date +%s) - T0) / 60 ))
if [ "$st" != "success" ]; then echo "$(date -u +%FT%TZ) $LABEL seed=$SEED $st after ${MIN}m" >> run.log; exit 1; fi
echo "$(date -u +%FT%TZ) $LABEL seed=$SEED success in ${MIN} min — peak ${PEAK} GiB" >> run.log
