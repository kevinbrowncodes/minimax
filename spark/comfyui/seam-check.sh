#!/usr/bin/env bash
# spark/comfyui/seam-check.sh — STORY_017's seam measure, without the GPU: decode a clip with PyAV inside the ComfyUI image
# and compare the frame-to-frame change AT the seam with the normal frame-to-frame change just before it.
#
#   spark/comfyui/seam-check.sh <mp4 under spark/data/output/video or an absolute path> <seam frame> [window frames=24] [limit=2.0]
#
# Prints the mean absolute pixel difference between frame seam-1 and frame seam, the median of the same measure over the
# `window` adjacent pairs before the seam, their ratio, and PASS when the ratio is <= limit (an extension that continues the
# scene changes no more at the seam than the footage does anyway) or FAIL. Exit 0 on PASS, 1 on FAIL, 2 on a usage error.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

[ $# -ge 2 ] || { sed -n '2,9p' "$0" >&2; exit 2; }
clip="$1"; seam="$2"; window="${3:-24}"; limit="${4:-2.0}"
case "$clip" in /*) ;; *) clip="$SPARK_DATA/output/video/$clip" ;; esac
[ -f "$clip" ] || { printf '[seam] no such file: %s\n' "$clip" >&2; exit 2; }
dir="$(cd "$(dirname "$clip")" && pwd)"; name="$(basename "$clip")"

docker run --rm --entrypoint python -v "$dir:/in:ro" "minimax-spark/comfyui:$COMFYUI_TAG" - "/in/$name" "$seam" "$window" "$limit" <<'PY'
import sys
import av
import numpy as np

path, seam, window, limit = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
first = seam - window - 1
if first < 0:
    print(f"[seam] the window of {window} frames does not fit before frame {seam}", file=sys.stderr)
    sys.exit(2)
frames = {}
with av.open(path) as container:
    for i, frame in enumerate(container.decode(video=0)):
        if first <= i <= seam:
            frames[i] = frame.to_ndarray(format="rgb24").astype(np.float32)
        if i > seam:
            break
if seam not in frames or first not in frames:
    print(f"[seam] the clip has fewer than {seam + 1} frames", file=sys.stderr)
    sys.exit(2)
def mad(a, b):
    return float(np.mean(np.abs(a - b)))
before = [mad(frames[i - 1], frames[i]) for i in range(first + 1, seam)]
at = mad(frames[seam - 1], frames[seam])
median = float(np.median(before))
ratio = at / median if median > 0 else float("inf")
verdict = "PASS" if ratio <= limit else "FAIL"
print(f"[seam] frame {seam - 1} -> {seam}: mean abs diff {at:.2f}; median over the {len(before)} pairs before: {median:.2f}; ratio {ratio:.2f} (limit {limit}) -> {verdict}")
sys.exit(0 if verdict == "PASS" else 1)
PY
