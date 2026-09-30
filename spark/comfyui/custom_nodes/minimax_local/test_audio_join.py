"""The MiniMaxLocalAudioJoin node (STORY_067, BUG_013) on synthetic tones: the length matches today's concat, an in-phase
join stays smooth, an out-of-phase join clicks when butted and does not when joined, the source's dipped tail is not
heard, level matching brings a quiet extension up to the source, and formats are matched. Runs inside the ComfyUI image:
    spark/comfyui/test-nodes.sh
"""
import math
import unittest

import torch

from __init__ import JOIN_FADE_SECONDS, JOIN_SKIP_SECONDS, MiniMaxLocalAudioJoin

RATE = 32000
HZ = 220.0
SOURCE_S = 10.125          # a 243-frame source
OVERLAP_S = 1.625          # 39 frames
NEW_S = 10.625             # 255 new frames


def tone(seconds, start_s=0.0, rate=RATE, channels=2, gain=0.3, phase=0.0):
    """A sine at HZ from absolute time start_s, as ComfyUI's AUDIO dict ([batch, channels, samples])."""
    n = round(seconds * rate)
    t = torch.arange(n, dtype=torch.float32) / rate + start_s
    w = gain * torch.sin(2 * math.pi * HZ * t + phase)
    return {"waveform": w.expand(1, channels, n).clone(), "sample_rate": rate}


def join(source, extension, **kw):
    return MiniMaxLocalAudioJoin().join(source, extension, SOURCE_S, OVERLAP_S, **kw)[0]


def max_step_near(waveform, at_s, rate=RATE, half_ms=40):
    i, h = round(at_s * rate), round(half_ms / 1000 * rate)
    return float(waveform[0, 0, i - h:i + h].diff().abs().max())


def rms_db(waveform, a_s, b_s, rate=RATE):
    x = waveform[0, 0, round(a_s * rate):round(b_s * rate)]
    return 20 * math.log10(float(x.pow(2).mean().sqrt()) + 1e-12)


def own_step(gain=0.3, rate=RATE):
    return 2 * math.pi * HZ / rate * gain   # the tone's largest sample-to-sample step


class AudioJoin(unittest.TestCase):
    def test_the_joined_length_is_todays_source_plus_the_new_part(self):
        out = join(tone(SOURCE_S), tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S))
        self.assertEqual(out["waveform"].shape[-1], round(SOURCE_S * RATE) + round((OVERLAP_S + NEW_S) * RATE) - round(OVERLAP_S * RATE))
        self.assertEqual(out["sample_rate"], RATE)

    def test_an_in_phase_extension_joins_with_no_step_beyond_the_tones_own(self):
        out = join(tone(SOURCE_S), tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S))
        for at in (SOURCE_S - JOIN_SKIP_SECONDS - JOIN_FADE_SECONDS, SOURCE_S - JOIN_SKIP_SECONDS, SOURCE_S):
            self.assertLessEqual(max_step_near(out["waveform"], at), own_step() * 1.05)

    def test_an_out_of_phase_join_clicks_when_butted_and_not_when_joined(self):
        source = tone(SOURCE_S)
        extension = tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S, phase=math.pi / 2)   # the regenerated sound drifted a quarter cycle
        # today's concat: the source whole, then the extension from its overlap on
        butted = torch.cat([source["waveform"], extension["waveform"][..., round(OVERLAP_S * RATE):]], dim=-1)
        self.assertGreater(max_step_near(butted, SOURCE_S), own_step() * 10)            # proves the check can fail
        out = join(source, extension)
        self.assertLessEqual(max_step_near(out["waveform"], SOURCE_S - JOIN_SKIP_SECONDS), own_step() * 3)
        self.assertLessEqual(max_step_near(out["waveform"], SOURCE_S), own_step() * 3)

    def test_the_sources_dipped_last_fifty_ms_is_never_heard(self):
        source = tone(SOURCE_S)
        source["waveform"][..., -round(0.05 * RATE):] = 0.0                             # the decoded tail's dip
        out = join(source, tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S))
        around = rms_db(out["waveform"], SOURCE_S - 0.6, SOURCE_S - 0.4)
        self.assertAlmostEqual(rms_db(out["waveform"], SOURCE_S - 0.05, SOURCE_S), around, delta=0.5)

    def test_level_matching_brings_a_quiet_extension_to_the_source_and_can_be_turned_off(self):
        source = tone(SOURCE_S)
        quiet = tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S, gain=0.3 * 10 ** (-12 / 20))
        matched = join(source, quiet)
        self.assertAlmostEqual(rms_db(matched["waveform"], SOURCE_S + 1, SOURCE_S + 3), rms_db(source["waveform"], 1, 3), delta=0.5)
        unmatched = join(source, quiet, level_match=False)
        self.assertAlmostEqual(rms_db(unmatched["waveform"], SOURCE_S + 1, SOURCE_S + 3), rms_db(source["waveform"], 1, 3) - 12, delta=0.5)

    def test_the_gain_is_capped_and_a_silent_overlap_leaves_it_alone(self):
        source = tone(SOURCE_S)
        far = tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S, gain=0.3 * 10 ** (-30 / 20))
        out = join(source, far)
        self.assertAlmostEqual(rms_db(out["waveform"], SOURCE_S + 1, SOURCE_S + 3), rms_db(source["waveform"], 1, 3) - 18, delta=0.5)
        silent = tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S)
        silent["waveform"][..., :round(OVERLAP_S * RATE)] = 0.0
        out = join(source, silent)
        self.assertAlmostEqual(rms_db(out["waveform"], SOURCE_S + 1, SOURCE_S + 3), rms_db(source["waveform"], 1, 3), delta=0.5)

    def test_a_different_rate_and_channel_count_are_matched_to_the_source(self):
        extension = tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S, rate=48000, channels=1)
        out = join(tone(SOURCE_S), extension)
        self.assertEqual(out["sample_rate"], RATE)
        self.assertEqual(out["waveform"].shape[1], 2)
        self.assertLessEqual(max_step_near(out["waveform"], SOURCE_S), own_step() * 1.1)

    def test_source_sound_past_its_video_is_dropped(self):
        padded = tone(SOURCE_S + 0.032)                                                # an encoder's extra 32 ms
        out = join(padded, tone(OVERLAP_S + NEW_S, SOURCE_S - OVERLAP_S))
        self.assertEqual(out["waveform"].shape[-1], round(SOURCE_S * RATE) + round(NEW_S * RATE))


if __name__ == "__main__":
    unittest.main()
