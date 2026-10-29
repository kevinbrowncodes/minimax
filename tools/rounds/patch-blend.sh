#!/usr/bin/env bash
# Patch blend (CHORE_061): keep an upscaled take everywhere except a small moving patch, where the original render shows
# through. The upscaler redraws the hole as a stitched vertical slit; the original draws it naturally (hunk back take 4,
# 2026-10-29). The patch follows a keyframed path, has a feathered elliptical edge, light grain, and fades in and out.
#   patch-blend.sh <upscaled.mp4> <original.mp4> <out.mp4> <x> "<t:y t:y ...>" [w] [h]
#   x: patch centre in upscaled pixels; t:y pairs: time (s) and patch-centre y, in order; the patch is shown from the first
#   to the last time. w/h: patch size (default 220x320). Both videos must have the same frame count and rate.
set -eu
UP="$1"; ORIG="$2"; OUT="$3"; X="$4"; PATH_PTS="$5"; W="${6:-220}"; H="${7:-320}"
IFS=x read -r UW UH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$UP")
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
Y=$(python3 - "$PATH_PTS" <<'PY'
import sys
pts=[tuple(map(float,p.split(":"))) for p in sys.argv[1].split()]
e=str(pts[-1][1])
for (t0,y0),(t1,y1) in reversed(list(zip(pts,pts[1:]))):
    e=f"if(lt(t\\,{t1})\\,{y0}+({y1}-{y0})*(t-{t0})/{t1-t0}\\,{e})"
print(f"if(lt(t\\,{pts[0][0]})\\,{pts[0][1]}\\,{e})")
PY
)
T0=$(echo "$PATH_PTS" | awk '{split($1,a,":"); print a[1]}')
T1=$(echo "$PATH_PTS" | awk '{split($NF,a,":"); print a[1]}')
FO=$(python3 -c "print($T1-0.3)")
ffmpeg -v error -y -f lavfi -i "color=black:s=${W}x${H},format=gray" -frames:v 1 \
  -vf "geq=lum='255*clip((1-hypot((X-${W}/2)/(${W}/2)\,(Y-${H}/2)/(${H}/2)))/0.45\,0\,1)'" "$TMP/mask.png"
ffmpeg -v error -y -i "$UP" -i "$ORIG" -loop 1 -i "$TMP/mask.png" -filter_complex "
[1:v]scale=${UW}:${UH}:flags=lanczos,crop=${W}:${H}:${X}-${W}/2:($Y)-${H}/2,noise=alls=5:allf=t,format=yuva420p[p];
[2:v]format=gray,setpts=PTS-STARTPTS[m];
[p][m]alphamerge,fade=t=in:st=${T0}:d=0.3:alpha=1,fade=t=out:st=${FO}:d=0.3:alpha=1[pa];
[0:v][pa]overlay=x=${X}-${W}/2:y=($Y)-${H}/2:enable='between(t,${T0},${T1})':shortest=1[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -c:a copy "$OUT"
echo "patch-blend: wrote $OUT (patch ${W}x${H} at x=${X}, ${T0}-${T1} s)"
