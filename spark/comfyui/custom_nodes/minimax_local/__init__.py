"""MiniMax Local's own ComfyUI nodes (STORY_020, BUG_006, BUG_010, STORY_067). Copied into custom_nodes/ by
spark/comfyui/Dockerfile; tested by the test_*.py files beside it, run inside the image by spark/comfyui/test-nodes.sh.
MiniMaxLocalAudioJoin (STORY_067) is documented at its class.

MiniMaxLocalFrameChanges measures the outer border of every decoded frame — the top and bottom 10 % of rows plus the
left and right 10 % of columns: the set, not the person — and reports three series of mean absolute RGB differences on
the 0–255 scale as a `ui` text output (so it lands in /history under this node's id): `step[i]` between frames i and
i + 1, `second[i]` between frames i and i + 24 (one second), and `long[i]` between frames i and i + 72 (three seconds —
BUG_006: a slow dissolve of the set spreads its change over more than one second). The adapter
(spark/adapter/src/cuts.ts) turns them into the shot-change flags the task page shows. The node saves nothing and
outputs nothing to the graph; one pass over the frames, a rolling window of 73 borders, no copy of the batch.
"""
import json
from collections import deque

SPAN = 24
LONG_SPAN = 72
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
        torch = __import__("torch")
        n = int(images.shape[0])
        h, w = int(images.shape[1]), int(images.shape[2])
        bh, bw = max(1, int(h * BORDER)), max(1, int(w * BORDER))
        step, second, long = [], [], []
        recent = deque(maxlen=LONG_SPAN + 1)
        for i in range(n):
            frame = images[i]
            parts = [frame[:bh].reshape(-1, 3), frame[h - bh:].reshape(-1, 3)]
            if h > 2 * bh:
                middle = frame[bh:h - bh]
                parts.append(middle[:, :bw].reshape(-1, 3))
                parts.append(middle[:, w - bw:].reshape(-1, 3))
            border = torch.cat(parts, dim=0).float() * 255.0
            if recent:
                step.append(round(float((border - recent[-1]).abs().mean()), 2))
            if len(recent) >= SPAN:
                second.append(round(float((border - recent[-SPAN]).abs().mean()), 2))
            # BUG_010: `== LONG_SPAN` with `recent[0]` was true once (the deque holds LONG_SPAN + 1), so `long` had one value
            if len(recent) >= LONG_SPAN:
                long.append(round(float((border - recent[-LONG_SPAN]).abs().mean()), 2))
            recent.append(border)
        payload = json.dumps({"frames": n, "span": SPAN, "longSpan": LONG_SPAN, "step": step, "second": second, "long": long})
        return {"ui": {"text": [payload]}}


JOIN_FADE_SECONDS = 0.25
JOIN_SKIP_SECONDS = 0.05
LEVEL_CAP_DB = 12.0
SILENCE_RMS = 1e-5


def _match_format(waveform, rate, to_rate, to_channels):
    """An AUDIO waveform [batch, channels, samples] at the source's sample rate and channel count."""
    torch = __import__("torch")
    if rate != to_rate:
        waveform = __import__("torchaudio").functional.resample(waveform, rate, to_rate)
    channels = int(waveform.shape[1])
    if channels != to_channels:
        mono = waveform.mean(dim=1, keepdim=True)
        waveform = mono.expand(-1, to_channels, -1).contiguous() if to_channels > 1 else mono
    return waveform.to(torch.float32)


class MiniMaxLocalAudioJoin:
    """STORY_067 (BUG_013): the sound of an extension joined to its source without a click or a dip.

    The masked continuation (STORY_017) regenerates the source's last `overlap_seconds` as the extension's first
    `overlap_seconds`, so the two tracks hold the same moment twice. Instead of butting the source's end against the
    extension's new part (AudioConcat — the click, and the source's own quiet last 50 ms — the dip), the output is:
    the source up to the join − skip − fade; a linear crossfade from the source to the extension's version of the same
    moment over the next `fade_seconds`; the extension from the join − skip on. With `level_match`, the extension is
    first scaled so its loudness over the shared moment equals the source's (capped at ±12 dB, skipped on silence).
    The output is exactly as long as source (to `source_seconds`) + the extension after its overlap.
    """

    CATEGORY = "minimax-local"
    RETURN_TYPES = ("AUDIO",)
    FUNCTION = "join"

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "source": ("AUDIO",),
            "extension": ("AUDIO",),
            "source_seconds": ("FLOAT", {"default": 10.0, "min": 0.0, "step": 0.001}),
            "overlap_seconds": ("FLOAT", {"default": 1.625, "min": 0.0, "step": 0.001}),
            "fade_seconds": ("FLOAT", {"default": JOIN_FADE_SECONDS, "min": 0.0, "step": 0.001}),
            "skip_seconds": ("FLOAT", {"default": JOIN_SKIP_SECONDS, "min": 0.0, "step": 0.001}),
            "level_match": ("BOOLEAN", {"default": True}),
        }}

    def join(self, source, extension, source_seconds, overlap_seconds, fade_seconds=JOIN_FADE_SECONDS,
             skip_seconds=JOIN_SKIP_SECONDS, level_match=True):
        torch = __import__("torch")
        rate = int(source["sample_rate"])
        src = source["waveform"].to(torch.float32)
        ext = _match_format(extension["waveform"], int(extension["sample_rate"]), rate, int(src.shape[1]))
        end = min(int(src.shape[-1]), round(source_seconds * rate))       # source sound past its video is dropped
        overlap = min(round(overlap_seconds * rate), int(ext.shape[-1]), end)
        skip = min(round(skip_seconds * rate), overlap)
        fade = max(0, min(round(fade_seconds * rate), overlap - skip))
        if level_match and overlap - skip > 0:
            ref = src[..., end - overlap:end - skip]
            own = ext[..., :overlap - skip]
            ref_rms = float(ref.pow(2).mean().sqrt())
            own_rms = float(own.pow(2).mean().sqrt())
            if ref_rms > SILENCE_RMS and own_rms > SILENCE_RMS:
                cap = 10 ** (LEVEL_CAP_DB / 20)
                ext = ext * min(cap, max(1 / cap, ref_rms / own_rms))
        cut = end - skip - fade                                               # where the source starts to fade
        ramp = torch.linspace(0.0, 1.0, fade, dtype=torch.float32) if fade else torch.zeros(0)
        blend = src[..., cut:end - skip] * (1 - ramp) + ext[..., overlap - skip - fade:overlap - skip] * ramp
        out = torch.cat([src[..., :cut], blend, ext[..., overlap - skip:]], dim=-1)
        return ({"waveform": out, "sample_rate": rate},)


NODE_CLASS_MAPPINGS = {"MiniMaxLocalFrameChanges": MiniMaxLocalFrameChanges, "MiniMaxLocalAudioJoin": MiniMaxLocalAudioJoin}
NODE_DISPLAY_NAME_MAPPINGS = {"MiniMaxLocalFrameChanges": "Frame changes (MiniMax Local)",
                              "MiniMaxLocalAudioJoin": "Audio join (MiniMax Local)"}
