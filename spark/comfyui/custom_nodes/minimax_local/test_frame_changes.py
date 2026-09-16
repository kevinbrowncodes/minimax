"""The MiniMaxLocalFrameChanges node on a synthetic batch (BUG_010): every series has its full length, a hard cut shows in
all three, a linear fade shows in the three-second series only. Runs inside the ComfyUI image (torch is there):
    spark/comfyui/test-nodes.sh
"""
import unittest

import torch

from __init__ import LONG_SPAN, SPAN, MiniMaxLocalFrameChanges


def batch(n, h=48, w=64):
    """n frames of a mid-grey picture, float 0–1 as ComfyUI hands IMAGE tensors to a node."""
    return torch.full((n, h, w, 3), 0.5)


def series(images):
    import json
    payload = MiniMaxLocalFrameChanges().measure(images)["ui"]["text"][0]
    return json.loads(payload)


class FrameChanges(unittest.TestCase):
    def test_every_series_has_its_full_length_and_a_held_shot_measures_zero(self):
        n = 200
        s = series(batch(n))
        self.assertEqual(s["frames"], n)
        self.assertEqual(len(s["step"]), n - 1)
        self.assertEqual(len(s["second"]), n - SPAN)
        self.assertEqual(len(s["long"]), n - LONG_SPAN)  # BUG_010: was 1
        self.assertEqual((s["span"], s["longSpan"]), (SPAN, LONG_SPAN))
        self.assertEqual(max(s["step"] + s["second"] + s["long"]), 0)

    def test_a_hard_cut_is_one_full_step_and_straddled_by_every_window(self):
        n, cut = 200, 120
        images = batch(n)
        images[cut:] = 0.9  # 0.5 → 0.9 everywhere: a border change of 0.4 × 255 = 102
        s = series(images)
        self.assertAlmostEqual(s["step"][cut - 1], 102.0, places=1)
        self.assertEqual([j + 1 for j, v in enumerate(s["step"]) if v > 0], [cut])
        # second[i] compares frame i + 24 with frame i: tripped for i in [cut - 24, cut)
        self.assertEqual([i for i, v in enumerate(s["second"]) if v > 0], list(range(cut - SPAN, cut)))
        # long[i] compares frame i + 72 with frame i: tripped for i in [cut - 72, cut) — the whole window, not one value
        self.assertEqual([i for i, v in enumerate(s["long"]) if v > 0], list(range(cut - LONG_SPAN, cut)))

    def test_a_linear_fade_over_forty_frames_accumulates_in_the_three_second_series(self):
        n, start, length = 300, 150, 40
        images = batch(n)
        for k in range(length):
            images[start + k :] = 0.5 + 0.4 * (k + 1) / length  # 0.5 → 0.9 over 40 frames, 2.55 a frame
        s = series(images)
        self.assertAlmostEqual(max(s["step"]), 2.55, places=1)
        self.assertAlmostEqual(max(s["second"]), 102.0 * SPAN / length, places=0)  # 24 of the 40 frames: 61
        self.assertAlmostEqual(max(s["long"]), 102.0, places=0)  # the whole fade inside one 72-frame window
        peak = max(range(len(s["long"])), key=lambda i: s["long"][i]) + LONG_SPAN
        self.assertGreaterEqual(peak, start + length - 1)  # the peak window ends once the last faded frame is in it

    def test_the_border_is_the_set_not_the_person(self):
        n = 100
        images = batch(n)
        images[50:, 8:40, 12:52] = 0.9  # the middle of the picture changes, the outer 10 % does not
        s = series(images)
        self.assertEqual(max(s["step"] + s["second"] + s["long"]), 0)


if __name__ == "__main__":
    unittest.main()
