"""MiniMax Local's own ComfyUI nodes (STORY_020). Copied into custom_nodes/ by spark/comfyui/Dockerfile.

MiniMaxLocalFrameChanges measures the outer border of every decoded frame — the top and bottom 10 % of rows plus the
left and right 10 % of columns: the set, not the person — and reports two series of mean absolute RGB differences on
the 0–255 scale as a `ui` text output (so it lands in /history under this node's id): `step[i]` between frames i and
i + 1, and `second[i]` between frames i and i + 24. The adapter (spark/adapter/src/cuts.ts) turns them into the
shot-change flags the task page shows. The node saves nothing and outputs nothing to the graph; one pass over the
frames, a rolling window of 25 borders, no copy of the batch.
"""
import json
from collections import deque

FPS_SPAN = 24
BORDER = 0.10


class MiniMaxLocalFrameChanges:
    CATEGORY = "minimax-local"
    RETURN_TYPES = ()
    FUNCTION = "measure"
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"images": ("IMAGE",)}}

    def measure(self, images):
        n = int(images.shape[0])
        h, w = int(images.shape[1]), int(images.shape[2])
        bh, bw = max(1, int(h * BORDER)), max(1, int(w * BORDER))
        step, second = [], []
        recent = deque(maxlen=FPS_SPAN + 1)
        for i in range(n):
            frame = images[i]
            parts = [frame[:bh].reshape(-1, 3), frame[h - bh:].reshape(-1, 3)]
            if h > 2 * bh:
                middle = frame[bh:h - bh]
                parts.append(middle[:, :bw].reshape(-1, 3))
                parts.append(middle[:, w - bw:].reshape(-1, 3))
            border = (__import__("torch").cat(parts, dim=0).float() * 255.0)
            if recent:
                step.append(round(float((border - recent[-1]).abs().mean()), 2))
            if len(recent) == FPS_SPAN:
                second.append(round(float((border - recent[0]).abs().mean()), 2))
            recent.append(border)
        payload = json.dumps({"frames": n, "span": FPS_SPAN, "step": step, "second": second})
        return {"ui": {"text": [payload]}}


NODE_CLASS_MAPPINGS = {"MiniMaxLocalFrameChanges": MiniMaxLocalFrameChanges}
NODE_DISPLAY_NAME_MAPPINGS = {"MiniMaxLocalFrameChanges": "Frame changes (MiniMax Local)"}
