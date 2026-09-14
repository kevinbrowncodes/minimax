#!/usr/bin/env bash
# spark/comfyui/seam-check.sh — STORY_017's seam measure, without the GPU: decode a clip with PyAV inside the ComfyUI image
# and compare the frame-to-frame change AT the seam with the largest frame-to-frame change the clip has anywhere else.
#
#   spark/comfyui/seam-check.sh <mp4 under spark/data/output/video or an absolute path> <seam frame> [limit=1.0]
#
# Prints the mean absolute pixel difference between frame seam-1 and frame seam, the global RGB shift across the seam
# (a brightness or tone step), the largest such difference between any other two adjacent frames, and the seam's rank.
# PASS when the seam changes no more than limit × that largest natural change (a continued scene moves at the seam
# no more than the footage moves anyway), else FAIL. Exit 0 on PASS, 1 on FAIL, 2 on a usage error.
#
# The first version compared the seam with the median change over the second before it; a script that ends in a held
# pose makes that baseline near zero, so it failed a visually continuous seam and a cut alike (2026-09-14). The clip's
# own largest motion is the baseline a viewer actually has.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

[ $# -ge 2 ] || { sed -n '2,10p' "$0" >&2; exit 2; }
clip="$1"; seam="$2"; limit="${3:-1.0}"
case "$clip" in /*) ;; *) clip="$SPARK_DATA/output/video/$clip" ;; esac
[ -f "$clip" ] || { printf '[seam] no such file: %s\n' "$clip" >&2; exit 2; }
dir="$(cd "$(dirname "$clip")" && pwd)"; name="$(basename "$clip")"

docker run --rm -i --entrypoint python -v "$dir:/in:ro" "minimax-spark/comfyui:$COMFYUI_TAG" - "/in/$name" "$seam" "$limit" <<'PY'
import sys
import av
import numpy as np

path, seam, limit = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
frames = []
with av.open(path) as container:
    for frame in container.decode(video=0):
        frames.append(frame.to_ndarray(format="rgb24").astype(np.float32))
if seam < 1 or seam >= len(frames):
    print(f"[seam] frame {seam} is not inside the clip's {len(frames)} frames", file=sys.stderr)
    sys.exit(2)
diffs = np.array([float(np.mean(np.abs(frames[i - 1] - frames[i]))) for i in range(1, len(frames))])
at = diffs[seam - 1]
others = np.delete(diffs, seam - 1)
largest = float(others.max())
where = int(np.argmax(others)) + 1
if where >= seam:
    where += 1
shift = frames[seam].mean(axis=(0, 1)) - frames[seam - 1].mean(axis=(0, 1))
rank = int((others > at).sum())
ratio = at / largest if largest > 0 else float("inf")
verdict = "PASS" if ratio <= limit else "FAIL"
print(f"[seam] frame {seam - 1} -> {seam}: mean abs diff {at:.2f}; RGB shift {np.round(shift, 2).tolist()}; "
      f"largest change elsewhere {largest:.2f} (frames {where - 1} -> {where}); {rank} pairs change more than the seam; "
      f"ratio {ratio:.2f} (limit {limit}) -> {verdict}")
sys.exit(0 if verdict == "PASS" else 1)
PY
