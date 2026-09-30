#!/usr/bin/env bash
# spark/comfyui/audio-seam-check.sh — BUG_013 / STORY_067's audio seam measure, without the GPU: decode a clip's sound with
# PyAV inside the ComfyUI image and measure it at each join.
#
#   spark/comfyui/audio-seam-check.sh <mp4 under spark/data/output/video or an absolute path> <join seconds> [<join seconds> ...]
#
# For each join, in 50 ms windows at 16 kHz mono: the level (dB) over the second before and after; the DIP — the quietest
# window within ±100 ms of the join minus the median of the windows 200–300 ms either side; the CLICK — the largest
# sample-to-sample step within ±2.5 ms of the join over the median step in a second well before it. PASS when the dip is
# no deeper than 1.5 dB and the click no more than 3× (STORY_067's thresholds), else FAIL. Exit 0 when every join
# passes, 1 when one fails, 2 on a usage error. The numbers screen; the owner's ear decides (a steady, quiet track is
# where a seam is easiest to hear and the numbers least telling).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

[ $# -ge 2 ] || { sed -n '2,11p' "$0" >&2; exit 2; }
clip="$1"; shift
case "$clip" in /*) ;; *) clip="$SPARK_DATA/output/video/$clip" ;; esac
[ -f "$clip" ] || { printf '[audio-seam] no such file: %s\n' "$clip" >&2; exit 2; }
dir="$(cd "$(dirname "$clip")" && pwd)"; name="$(basename "$clip")"

docker run --rm -i --entrypoint python -v "$dir:/in:ro" "minimax-spark/comfyui:$COMFYUI_TAG" - "/in/$name" "$@" <<'PY'
import sys
import av
import numpy as np

path, joins = sys.argv[1], [float(x) for x in sys.argv[2:]]
RATE = 16000
chunks = []
with av.open(path) as container:
    if not container.streams.audio:
        print("[audio-seam] the clip has no sound", file=sys.stderr)
        sys.exit(2)
    resampler = av.AudioResampler(format="flt", layout="mono", rate=RATE)
    for frame in container.decode(audio=0):
        for out in resampler.resample(frame):
            chunks.append(out.to_ndarray().reshape(-1))
a = np.concatenate(chunks).astype(np.float64)


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


failed = False
for j in joins:
    i = int(j * RATE)
    if i < RATE or i + RATE > len(a):
        print(f"[audio-seam] a join at {j} s needs a second of sound either side", file=sys.stderr)
        sys.exit(2)
    w = lambda o: db(a[i + int(o * RATE):i + int((o + 0.05) * RATE)])
    around = float(np.median([w(o) for o in (-0.3, -0.25, -0.2, 0.2, 0.25, 0.3)]))
    dip = min(w(o) for o in (-0.1, -0.05, 0.0, 0.05)) - around
    step = np.abs(np.diff(a[i - 40:i + 40])).max()
    norm = np.median(np.abs(np.diff(a[i - RATE // 2:i - RATE // 4]))) + 1e-9
    click = step / norm
    verdict = "PASS" if dip >= -1.5 and click <= 3.0 else "FAIL"
    failed |= verdict == "FAIL"
    print(f"[audio-seam] join {j:.3f} s: level {db(a[i - RATE:i - RATE // 10]):.1f} -> {db(a[i + RATE // 10:i + RATE]):.1f} dB; "
          f"dip {dip:+.1f} dB (limit -1.5); click {click:.1f}x (limit 3) -> {verdict}")
sys.exit(1 if failed else 0)
PY
