#!/usr/bin/env bash
# SPIKE_001's night: one data point on the NSFW container (127.0.0.1:8189) — a 5 s image-to-video draw of the owner's photo with
# a prompt, a seed and a LoRA chain, waited on ComfyUI's /history, then measured: minutes (ComfyUI's own clock), peak memory
# (memwatch.sh), the shot-change measure (the changes node through the adapter's own detectCuts), the review strip. Appends a row
# to run.md and a line to run.log. Never stops the matrix on a failed draw.
#   draw.sh <label> <prompt-file> <seed> <lora-spec: file:strength,file:strength or -> [unet-file|-] [steps] [sampler] [scheduler]
set -u
cd "$(dirname "$0")"
LABEL="$1"; PROMPT_FILE="$2"; SEED="$3"; LORAS="$4"; UNET="${5:--}"; STEPS="${6:-20}"; SAMPLER="${7:-res_multistep}"; SCHEDULER="${8:-simple}"
C=http://127.0.0.1:8189
ROOT="$(cd ../.. && pwd)"
read -r WIDTH HEIGHT < size.txt     # written by matrix.sh from the photo's own ratio
IMAGE="$(cat image.txt)"            # the name ComfyUI gave the uploaded photo
lora_args=(); if [ "$LORAS" != "-" ]; then IFS=, read -ra specs <<< "$LORAS"; for s in "${specs[@]}"; do lora_args+=(--lora "$s"); done; fi
unet_args=(); [ "$UNET" = "-" ] || unet_args=(--unet "$UNET")
START=$(date -u +%FT%TZ); T0=$(date +%s)
MEMLOG="mem-$LABEL-$SEED.log"
"$ROOT/spark/comfyui/memwatch.sh" "$MEMLOG" 5 2>/dev/null & MEMPID=$!
PID=$(python3 graph.py --label "$LABEL" --prompt-file "$PROMPT_FILE" --image "$IMAGE" --width "$WIDTH" --height "$HEIGHT" --seconds "${SECONDS_LEN:-5}" --seed "$SEED" \
      --steps "$STEPS" --sampler "$SAMPLER" --scheduler "$SCHEDULER" "${unet_args[@]}" "${lora_args[@]}" --url "$C" --dump "graph-$LABEL-$SEED.json" 2>graph-$LABEL-$SEED.err) \
  || { kill "$MEMPID" 2>/dev/null; echo "$START $LABEL seed=$SEED — ComfyUI refused the graph: $(head -c 300 "graph-$LABEL-$SEED.err")" >> run.log; echo "| $LABEL | $(basename "$PROMPT_FILE" .txt) | $SEED | — | refused | — | — | — | — |" >> run.md; exit 1; }
echo "$START $LABEL seed=$SEED prompt=${PID:0:8} submitted (loras: $LORAS; unet: $UNET; $STEPS $SAMPLER/$SCHEDULER)" >> run.log
while true; do
  h=$(curl -s -m 20 "$C/history/$PID" || echo '{}')
  st=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); e=d.get('$PID'); print(e['status']['status_str'] if e else 'pending')" <<<"$h")
  case "$st" in success|error) break;; esac
  if ! curl -fsS -m 10 "$C/system_stats" >/dev/null 2>&1; then echo "$(date -u +%FT%TZ) $LABEL seed=$SEED — the NSFW container stopped answering" >> run.log; st=dead; break; fi
  sleep 30
done
kill -TERM "$MEMPID" 2>/dev/null; wait "$MEMPID" 2>/dev/null
PEAK=$(tail -1 "$MEMLOG" 2>/dev/null | sed -E 's/.*peak used ([0-9.]+) GiB.*/\1/')
if [ "$st" != "success" ]; then
  MSG=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); e=d.get('$PID') or {}; print(json.dumps(e.get('status',{}).get('messages',[]))[:400])" <<<"$h")
  echo "$(date -u +%FT%TZ) $LABEL seed=$SEED prompt=${PID:0:8} $st — $MSG" >> run.log
  echo "| $LABEL | $(basename "$PROMPT_FILE" .txt) | $SEED | comfy ${PID:0:8} | $st | — | $PEAK | — | — |" >> run.md
  exit 1
fi
read -r MIN F CHANGES < <(H="$h" python3 - "$PID" <<'PY'
import json, sys, os
d=json.loads(os.environ["H"])[sys.argv[1]]
msgs={m[0]: m[1] for m in d["status"]["messages"]}
t0=msgs.get("execution_start",{}).get("timestamp",0); t1=msgs.get("execution_success",{}).get("timestamp",t0)
f=next((i["filename"] for i in d["outputs"].get("save",{}).get("images",[]) if i["filename"].endswith(".mp4")), "?")
ch=d["outputs"].get("changes",{}).get("text",[""])[0]
print(round((t1-t0)/60000,1), f, json.dumps(ch))
PY
)
CUTS=$(docker exec -i minimax-adapter node --input-type=module -e '
const { parseFrameChanges, detectCuts } = await import("/adapter/src/cuts.ts");
let s = ""; for await (const c of process.stdin) s += c;
const ch = parseFrameChanges(JSON.parse(s)); const cuts = ch ? detectCuts(ch) : undefined;
console.log(cuts ? JSON.stringify(cuts.map((c) => ({ frame: c.frame, seconds: c.seconds, kind: c.kind }))) : "no measure");
' <<<"$CHANGES" 2>/dev/null || echo "no measure")
docker run --rm --entrypoint python -v "$ROOT/spark/data/output-nsfw/video:/in:ro" -v "$(pwd):/out" "minimax-spark/comfyui:v0.35.1" /out/strip.py "/in/$F" "/out/strip-$LABEL-$SEED.png" 18 >/dev/null 2>&1
WALL=$(( ( $(date +%s) - T0 ) / 60 ))
echo "| $LABEL | $(basename "$PROMPT_FILE" .txt) | $SEED | comfy ${PID:0:8} | $st | $MIN min (ComfyUI's clock; $WALL wall) | $PEAK | $CUTS | strip-$LABEL-$SEED.png |" >> run.md
echo "$(date -u +%FT%TZ) $LABEL seed=$SEED prompt=${PID:0:8} $st in $MIN min — peak $PEAK GiB — cuts $CUTS — $F" >> run.log
