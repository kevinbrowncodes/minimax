#!/usr/bin/env bash
# Autopilot (owner 2026-10-16/17): never idle. Scene 1 (K) takes until scene 2 is aligned (keyframes/scene-2.png + s2-aligned.flag),
# then alternate K and B with fresh seeds, scene 1 first (owner 2026-10-18). A queued request (next.sh) runs first. touch s2-only.flag to draw scene 2 only (owner 2026-10-23). touch STOP to end after the take in progress.
cd "$(dirname "$0")"; echo $$ > rotate.pid
P2=PenisV2_minimax-h3_epoch60.safetensors; MA=Male_Anatomy-v2.02-ep4.safetensors; EM=10Eros_Max_h3_TURBO-hybrid_beta5_int8.safetensors
log() { echo "$(date -u +%FT%TZ) rotate: $*" >> run.log; }
if [ -x next.sh ]; then mv next.sh next-running.sh; exec ./next-running.sh; fi
up() { curl -fsS -F "image=@keyframes/$1" -F overwrite=true -F subfolder=__ROUND__ http://127.0.0.1:8189/upload/image | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('subfolder','')+'/' if d.get('subfolder') else '')+d['name'])"; }
IMG1=$(up scene-1.png) || { log "upload failed"; exit 1; }
log "starts — scene 1 until scene 2 is aligned, then alternating; touch STOP to end"
i=0
while [ ! -f STOP ]; do
  # Shot retry (CHORE_063): a take queued by retry.sh resumes first; its kept shots are skipped, the failed one is redrawn.
  if [ -s retry.queue ]; then
    read -r RL RS < retry.queue; sed -i 1d retry.queue
    [ "$RL" = B ] && RV="-b" || RV=""
    log "retry: resuming $RL $RS"
    SEGS=3 ./chain.sh "$RL" "$RS" "$P2:0.45,$MA:0.4" "$EM" 8 res_multistep simple "$RV" || log "$RL $RS failed"
    continue
  fi
  if [ -f s2-aligned.flag ] && [ -f keyframes/scene-2.png ] && { [ -f s2-only.flag ] || [ $((i % 2)) = 1 ]; }; then
    IMG2=$(up scene-2.png) || { log "scene-2 upload failed"; exit 1; }; L=B; IMG=$IMG2; VAR="-b"
  else L=K; IMG=$IMG1; VAR=""; fi
  s=$(( (RANDOM << 15 | RANDOM) )); echo "$L $s" >> seeds-rotate.txt
  echo "$IMG" > image.txt
  SEGS=3 ./chain.sh "$L" "$s" "$P2:0.45,$MA:0.4" "$EM" 8 res_multistep simple "$VAR" || log "$L $s failed"
  i=$((i+1))
done
log "STOP found — ended"
