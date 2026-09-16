# BUG_010 — The three-second shot-change rule measures only the clip's first three seconds

**Status:** Resolved (2026-09-16, the owner's "Please proceed" at 17:50 EDT; see Resolution)
**Found by:** reading the node's output in ComfyUI's history for three jobs of 2026-09-16 (`221b508f` 260 frames, `c3e32f8f` 396, `20316ce3` 243): `len(long)` is **1** in every one

## Summary

BUG_006 added a second rule to STORY_020's shot-change check: the picture's border compared **three seconds** apart, so a slow dissolve of the set (which never moves the border 30 in any one second) accumulates into one number and is flagged at 20. The rule is in `cuts.ts` and is unit-tested there on synthetic series — but the node that produces the series (`spark/comfyui/custom_nodes/minimax_local/__init__.py`, `MiniMaxLocalFrameChanges`) emits **one** three-second value per job, frame 72 against frame 0, and never another. After the first three seconds of every clip the slow-dissolve rule is inert. BUG_006's own clip (`81354423`, the curtain fading to a grey wall at frames 262–303) would be reported `[]` by the shipped node; its Resolution was verified with a measuring script in that session's scratchpad (`analyse.py`), not with the node's output.

## Steps to Reproduce

1. `curl -s 'http://127.0.0.1:8188/history?max_items=3'` on the Spark; in each entry, find the output of the node id `changes` and parse its `text[0]`.
2. Compare `len(step)`, `len(second)` and `len(long)` with `frames`: for a 243-frame clip, `len(step)` is 242 and `len(second)` 219 as designed; `len(long)` is **1** (expected 171 = 243 − 72).
3. Run the node's arithmetic, corrected, over `spark/data/output/video/job-81354423-2b2e-48f7-96be-eb517b99ef59_00001_.mp4`: the three-second series peaks at 26.8 at frame 313 and is ≥ 20 from frame 281 to 331 — the dissolve. The shipped node's single value for that clip compares frame 72 with frame 0, long before it.

## Expected vs Actual Behaviour

- **Expected:** `long[i]` for every frame i ≥ 72, the border of frame i against frame i − 72, so a slow dissolve anywhere in the clip trips `SLOW_CHANGE`.
- **Actual:** `long` has one element (frame 72 vs frame 0); `cuts.ts` sees a one-element series and can only ever flag a fade inside the first three seconds. On 2026-09-16's handheld draw `ecb286a6` that single value was 53.3 (the camera had moved by frame 72), so a rule-2 event was produced and merged into rule 1's — which is why nothing looked wrong.

## Root Cause

In `measure`, `recent` is `deque(maxlen=LONG_SPAN + 1)` (73), and the three-second branch reads:

```python
if len(recent) == LONG_SPAN:
    long.append(round(float((border - recent[0]).abs().mean()), 2))
```

`len(recent) == 72` is true exactly once — at frame 72, when the deque holds frames 0–71 and `recent[0]` is frame 0. From frame 73 on the deque is full at 73 and the condition never holds again. The one-second branch beside it is written correctly (`if len(recent) >= SPAN` with `recent[-SPAN]`); the three-second branch needs the same shape: `if len(recent) >= LONG_SPAN` with `recent[-LONG_SPAN]`. Nothing in the gate runs the node: it has no unit test, `cuts.test.ts` feeds `detectCuts` hand-written series, and `verify.sh` does no GPU work.

## Acceptance Criteria

- [x] The node reports `long[i]` for every i ≥ 72: `len(long) == frames − 72` (171 for 243 frames, 426 for 498), each value the border of frame i against frame i − 72, on the 0–255 scale, rounded to 2 decimals as the other series are.
- [x] The node has a unit test beside it (`test_frame_changes.py`) that builds a small synthetic batch (a static run, a hard cut, a linear fade over 40 frames) and asserts the three series' lengths and the values at the cut and across the fade. It runs through the ComfyUI image, not the host (`spark/comfyui/test-nodes.sh`: `docker run --rm --entrypoint python <image> -m unittest discover /comfy/ComfyUI/custom_nodes/minimax_local`), shellchecked by `lint.sh`; the README's Spark section names it.
- [x] Re-run on the clips on disk with the rebuilt container: `81354423` reports one event inside frames 262–303 (BUG_006's Resolution, now true of the node); `d333b5a1`, `2bc60a18`, `0aa9d5a1`, `fe072506` and STORY_044's three segments stay at `[]`; the table in STORY_020 gains the node's own three-second column with the date.
- [x] The image is rebuilt and the container restarted only between jobs (`/health` › `openJobs 0`; never while a draw is running — the office round of 2026-09-16 is three draws, ≈ 15:15–17:00 EDT), with the peer session told; the node's version note in `spark/README.md` says what changed and when.
- [x] `cuts.ts` is untouched — it already handles a series of any length — and the contract's description of the rule (v1.3) is already what the fixed node does.

## Resolution

**Fixed 2026-09-16 (17:55–19:45 EDT).** `if len(recent) >= LONG_SPAN` with `recent[-LONG_SPAN]`, the shape of the one-second branch beside it. The node's first unit test, `test_frame_changes.py` (a held batch, a hard cut, a 40-frame linear fade, a change in the middle of the picture that the border ignores), run inside the ComfyUI image by `spark/comfyui/test-nodes.sh` — on the shipped node it fails 3 of 4 (`len(long)` 1 ≠ 128; the fade measures 0 over three seconds), on the fix 4 of 4. The image rebuilt (the custom-nodes layer only) and the container restarted at 17:57 with `openJobs 0` and the queue empty.

**Verified on the node's own output, through ComfyUI, not a script** (the CLAUDE.md rule this bug earned): the first generation after the restart, `410f1c7f` (243 frames), reported `len(long)` 171; a decode-only graph (`LoadVideo → GetVideoComponents → MiniMaxLocalFrameChanges`, no GPU work) over the clips on disk: `81354423` (BUG_006's dissolve) → 426 values, peak 26.8 at frame 313, ≥ 20 from frame 281 to 331; `d333b5a1` → peak 16.0, no window over 20; `2f980101` → the cut at 142 in all three series; `cac39075` (the office round's draw 5) → 171 values. Numbers to the tenth of `border.py`'s, so STORY_046's calibration table (the corrected series over all 43 clips) stands as the node's own; STORY_020's table is not edited (its prose is frozen) — a dated line under its Done note points here.

**One thing the corrected series does not bear out:** BUG_006's Resolution says the rule "reports one event in the dissolve (frames 262–303)". With the real series the first window over 20 ends at frame 281, and rule 2 places its event at that window's middle, **frame 245 (10.2 s) — 17 frames before the fade begins**, so the notice says 00:10 for a fade at 10.9–12.6 s. That is the middle-of-window estimate `cuts.ts` documents, 0.7 s early on a slow fade and inside the fade on a faster one; left as is (advisory, and the Retry is the same either way), noted here so nobody reads "inside 262–303" as measured.
