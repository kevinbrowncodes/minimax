"""spark/comfyui/border.py — the MiniMaxLocalFrameChanges node's border measure, re-run over finished clips (STORY_046).

Prints, for each clip, the largest single-frame border step (the cut rule, CUT_STEP 30), the largest one-second and
three-second changes (SHOT_CHANGE 30, SLOW_CHANGE 20), where each peaks, and the kind the adapter's rules would give the
biggest event — so a threshold can be checked against every clip on disk without ComfyUI's history. The arithmetic is the
node's (custom_nodes/minimax_local/__init__.py): the top and bottom 10 % of rows plus the left and right 10 % of columns,
mean absolute RGB on the 0–255 scale, frames decoded with PyAV as the image ships them (the encoded file, so a value can
sit a few tenths from the node's, which saw the frames before encoding: 48.4 here against 48.6 in the node on `ecb286a6`).
The three-second series is computed the way BUG_010 says the node should (every frame i ≥ 72 against i − 72), not the
way the node does today (once).

Runs inside the ComfyUI image, nothing on the host (border.sh wraps it):
    spark/comfyui/border.sh spark/data/output/video/job-*.mp4
"""
import sys
from collections import deque

import av
import numpy as np

SPAN, LONG_SPAN, BORDER = 24, 72, 0.10
CUT_STEP, SHOT_CHANGE, SLOW_CHANGE = 30, 30, 20


def measure(path):
    step, second, long = [], [], []
    recent = deque(maxlen=LONG_SPAN + 1)
    n = 0
    with av.open(path) as container:
        for frame in container.decode(video=0):
            f = frame.to_ndarray(format="rgb24")
            h, w = f.shape[0], f.shape[1]
            bh, bw = max(1, int(h * BORDER)), max(1, int(w * BORDER))
            parts = [f[:bh].reshape(-1, 3), f[h - bh:].reshape(-1, 3)]
            if h > 2 * bh:
                middle = f[bh:h - bh]
                parts += [middle[:, :bw].reshape(-1, 3), middle[:, w - bw:].reshape(-1, 3)]
            border = np.concatenate(parts).astype(np.float32)
            if recent:
                step.append(float(np.abs(border - recent[-1]).mean()))
            if len(recent) >= SPAN:
                second.append(float(np.abs(border - recent[-SPAN]).mean()))
            if len(recent) >= LONG_SPAN:
                long.append(float(np.abs(border - recent[-LONG_SPAN]).mean()))
            recent.append(border)
            n += 1
    return n, step, second, long


def peak(series, offset):
    if not series:
        return 0.0, None
    i = max(range(len(series)), key=lambda k: series[k])
    return series[i], i + offset


def main(paths):
    print("clip      frames  step-max @frame   second-max @frame   long-max @frame   kind of the biggest event")
    for path in paths:
        n, step, second, long = measure(path)
        s, sf = peak(step, 1)
        o, of = peak(second, SPAN)
        l, lf = peak(long, LONG_SPAN)
        kind = "cut" if s >= CUT_STEP else "framing" if o >= SHOT_CHANGE or l >= SLOW_CHANGE else "none"
        name = path.split("job-")[-1][:8] if "job-" in path else path[-8:]
        print(f"{name:8s}  {n:6d}  {s:8.1f} @{str(sf):>5s}   {o:10.1f} @{str(of):>5s}   {l:8.1f} @{str(lf):>5s}   {kind}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1:])
