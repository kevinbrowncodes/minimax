#!/usr/bin/env bash
# One chained video of SEGS segments (SEGS=6 → ~61 s; default 3 → 31 s): the skill's scripts as consecutive segments, each ending in a held state
# the next continues from. seg 1 = S1 (10 s image-to-video), seg 2 = S2, seg 3 = S3 (+10 s masked continuations, standalone).
#   chain30.sh <label> <seed> <lora-spec|-> <unet|-> <steps> [sampler] [scheduler] [prompt-variant, e.g. -nopink]
set -u
cd "$(dirname "$0")"
SEGS="${SEGS:-3}"; L="$1"; SEED="$2"; LORAS="$3"; UNET="${4:--}"; STEPS="${5:-8}"; SAMPLER="${6:-res_multistep}"; SCHED="${7:-simple}"; VAR="${8:-}"
OUT=../../spark/data/output-nsfw/video
log() { echo "$(date -u +%FT%TZ) hat: $*" >> run.log; }
seg_file() { ls -t "$OUT"/nsfw-"$1"-"$SEED"_*.mp4 2>/dev/null | head -1; }
frames_of() { ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$1"; }
# Join check (owner 2026-10-19): picture similarity (SSIM) across a join, last frame of the previous segment vs the
# new segment 0.35 s in. Calibrated on 47 past takes: every jump the owner called a cut scored 0.18-0.41; every take he
# shipped scored 0.48 or more. Below JOIN_MIN (0.45) the take is cancelled after that segment.
JOIN_MIN="${JOIN_MIN:-0.45}"
join_ssim() { python3 - "$1" "$2" <<'PY'
import subprocess,sys,tempfile,os
a,b=sys.argv[1],sys.argv[2]
d=tempfile.mkdtemp()
def grab(src,args,out): subprocess.run(["ffmpeg","-loglevel","error","-y",*args,"-i",src,"-frames:v","1",out],check=True)
grab(a,["-sseof","-0.05"],f"{d}/a.png"); grab(b,["-ss","0.35"],f"{d}/b.png")
r=subprocess.run(["ffmpeg","-hide_banner","-i",f"{d}/a.png","-i",f"{d}/b.png","-lavfi","ssim","-f","null","-"],capture_output=True,text=True).stderr
v=[x for x in r.split() if x.startswith("All:")]; print(v[0][4:] if v else "1")
PY
}
# A second run with the same label+seed would re-join the FIRST run's segments (seg_file picks newest by
# mtime), producing a byte-identical "v2" file that looks like a fresh draw. It did, on 09-28. Refuse instead.
if ls "$OUT"/__ROUND__-"$L"*-"$SEED".mp4 "$OUT"/__ROUND__-"$L"-"$SEED".mp4 >/dev/null 2>&1; then
  log "$L seed $SEED: a final already exists — refusing to re-join (would duplicate, not redraw)"; exit 0
fi
log "=== $L seed $SEED  loras=$LORAS  unet=$UNET  steps=$STEPS  $SAMPLER/$SCHED  prompts=S1-${SEGS}$VAR"
[ -n "$(seg_file "${L}-1")" ] && log "$L seed $SEED: seg 1 already drawn — resuming" || SECONDS_LEN=10 ./draw.sh "${L}-1" "prompts/S1$VAR.txt" "$SEED" "$LORAS" "$UNET" "$STEPS" "$SAMPLER" "$SCHED" \
  || { log "$L seg1 FAILED"; exit 1; }
for n in $(seq 2 "$SEGS"); do
  [ -n "$(seg_file "${L}-${n}")" ] && { log "$L seed $SEED: seg $n already drawn — resuming"; continue; }
  prev=$((n-1)); src="$(seg_file "${L}-${prev}")"
  [ -n "$src" ] || { log "$L: no output from seg $prev"; exit 1; }
  ./ext-standalone.sh "${L}-${n}" "$src" "$(frames_of "$src")" "prompts/S${n}$VAR.txt" "$SEED" "$LORAS" "$UNET" "$STEPS" "$SAMPLER" "$SCHED" \
    || { log "$L seg$n FAILED"; exit 1; }
  j=$(join_ssim "$src" "$(seg_file "${L}-${n}")"); log "$L seed $SEED: join $prev->$n similarity $j"
  if python3 -c "import sys; sys.exit(0 if float('$j') < float('$JOIN_MIN') else 1)"; then
    log "JOIN-JUMP: $L seed $SEED cancelled at join $prev->$n (similarity $j < $JOIN_MIN)"; exit 3
  fi
done
l=/tmp/c30-$L-$SEED.txt; : > "$l"
for n in $(seq 1 "$SEGS"); do f="$(seg_file "${L}-${n}")"; [ -n "$f" ] && echo "file '$(cd "$(dirname "$f")" && pwd)/$(basename "$f")'" >> "$l"; done
FINAL="$OUT/__ROUND__-$L-$SEED.mp4"; v=2; while [ -e "$FINAL" ]; do FINAL="$OUT/__ROUND__-$L-v$v-$SEED.mp4"; v=$((v+1)); done
# STORY_067: the picture is stream-copied as before; the sound is assembled sample-exact from the pieces the join node
# made: each segment's own track, with its last 0.30 s replaced by the NEXT segment's blended window (the crossfade from
# this segment into the next's regenerated overlap, level-matched), then re-encoded once. No AAC stream copy, no click.
pre() { ls -t "$OUT"/../audio/nsfw-"$L"-"$1"-"$SEED"_preroll_*.flac 2>/dev/null | head -1; }
# Segments 2 and 3: their own sound from the lossless flac extend.py saves, not the mp4's AAC track, so every splice is
# lossless on both sides (the AAC edge clicked at the second join, 2026-10-02). Falls back to the mp4 when absent.
own() { ls -t "$OUT"/../audio/nsfw-"$L"-"$1"-"$SEED"_new_*.flac 2>/dev/null | head -1; }
ins=(); fc=""; k=0; joins=(); t=0
for n in $(seq 1 "$SEGS"); do
  f="$(seg_file "${L}-${n}")"; nxt="$(pre $((n+1)))"
  a="$f"; [ "$n" -gt 1 ] && [ -n "$(own "$n")" ] && a="$(own "$n")"
  [ "$a" = "$f" ] && [ "$n" -gt 1 ] && log "$L: no lossless sound for seg $n — using the mp4's AAC track"
  ins+=(-i "$a")
  t=$(python3 -c "print(round($t+$(frames_of "$f")/24,4))"); [ "$n" -lt "$SEGS" ] && joins+=("$t")
  if [ "$n" -lt "$SEGS" ] && [ -n "$nxt" ]; then
    d=$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$a")
    fc+="[$k:a]atrim=end=$(python3 -c "print(round($d-0.30,6))"),asetpts=N/SR/TB,aformat=sample_rates=32000:channel_layouts=stereo[p$k];"; k=$((k+1))
    ins+=(-i "$nxt"); fc+="[$k:a]asetpts=N/SR/TB,aformat=sample_rates=32000:channel_layouts=stereo[p$k];"; k=$((k+1))
  else
    [ "$n" -lt "$SEGS" ] && log "$L: no blended window for seg $((n+1)) — that join is butted"
    fc+="[$k:a]asetpts=N/SR/TB,aformat=sample_rates=32000:channel_layouts=stereo[p$k];"; k=$((k+1))
  fi
done
for i in $(seq 0 $((k-1))); do fc+="[p$i]"; done; fc+="concat=n=$k:v=0:a=1[a]"
ffmpeg -nostdin -y -f concat -safe 0 -i "$l" -map 0:v -c:v copy -an "$FINAL.video.mp4" >> ffmpeg.log 2>&1 \
  && ffmpeg -nostdin -y "${ins[@]}" -filter_complex "$fc" -map "[a]" -c:a aac -b:a 160k "$FINAL.audio.m4a" >> ffmpeg.log 2>&1 \
  && ffmpeg -nostdin -y -i "$FINAL.video.mp4" -i "$FINAL.audio.m4a" -map 0:v -map 1:a -c copy -movflags +faststart "$FINAL" >> ffmpeg.log 2>&1 \
  && log "$L joined: $(basename "$FINAL") — $(frames_of "$FINAL") frames, sound $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$FINAL") s" || log "$L concat FAILED"
rm -f "$FINAL.video.mp4" "$FINAL.audio.m4a"
# Measure every join of the final file (STORY_067's thresholds); a FAIL is logged, not fatal — the owner's ear decides.
[ -e "$FINAL" ] && log "$L seams: $(../../spark/comfyui/audio-seam-check.sh "$(cd "$(dirname "$FINAL")" && pwd)/$(basename "$FINAL")" "${joins[@]}" 2>&1 | sed 's/\[audio-seam\] //' | paste -sd '|')"
rm -f "$l"
