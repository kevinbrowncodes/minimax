# BACKLOG_004 — An extension can still change the scene on its own after the overlap

**Status:** Open (2026-09-14) · **Priority:** High — it is the one way STORY_017's result can still fail the owner's definition of extending
**Promoted (2026-09-14):** remedies 1 and 4 are [STORY_020](../story/STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md) (the prompt in MiniMax's own format; every result measured for a shot change and flagged on the task page with Retry). Remedy 5 is **withdrawn**: the released checkpoints are CFG-distilled (model card), so there is no negative prompt to apply. Remedies 2 and 3 stay here — 2 is already one click in the UI; 3 pins the end pose to a frame we would have to supply, the owner's choice per block. The item stays open until they are built or withdrawn ([CLAUDE.md §3c](../../CLAUDE.md#3c-how-backlog-is-tracked)).
**More evidence (2026-09-14, STORY_020's scan of the whole chain):** segment 3 changed its framing 1.5 s after its own seam too (21.7 s), and the camera then tilted and pulled back through the squats although the script fixes it — three of the day's five generations changed shot or framing on their own, the two chained extensions at the same place, ≈ 1.5 s after the overlap ends.

## Summary

STORY_017's masked continuation makes the seam itself continuous (measured 0.08 and 0.04 of the clip's largest natural change on the 2026-09-14 chain, 1.21 on the morning run), and the morning's +10 s extension held the sequin-curtain set for all ten seconds. But in the owner's three-script chain the same day, segment 2 held the set for 1.4 s past the overlap and then **dissolved to a different set** (frames 270–278: a ramp of 9→13 per frame, then 43 — a black studio with two lamps instead of the curtain and ropes), and the rest of the chain stayed there. The base model also cut on its own inside a *fresh* clip that day (segment 1, frame 142, wide shot → close-up, despite "the camera stays completely fixed"). Two of five generations that day changed shot without being asked.

So the frozen overlap fixes what the model starts from; it does not stop the model from deciding, seconds later, to cut. That is the model's own behaviour (its prompt format is built around shots and cuts), and it is seed-dependent.

## What we know

- Morning run (`fe072506`, seed 2980271804): no jump above 6.1 in 20.75 s. Chain segment 2 (`7f201441`, seed 2011835001): the dissolve at 1.5 s after the seam. Same code, same prompt wrapper, same overlap.
- The chain's fresh segment 1 (`2f980101`) cut at 5.9 s; the morning's fresh segment 1 (`0aa9d5a1`) and yesterday's (`d333b5a1`) did not.
- Script2's first line ("steps his left foot back, pivoting into a right three-quarter stance") is a re-framing instruction the model may read as a new shot.

## Mitigations to measure (a story, one at a time, same prompt and seed)

1. ~~**Prompt:** the base format's single-shot lead is there already; add MiniMax's own camera vocabulary ("static shot", "no cut, no dissolve, no transition, no re-framing") and keep the owner's script free of shot-like phrasing — the cheapest test.~~ *(STORY_020, 2026-09-14: the adapter builds MiniMax's format; the scene paragraph is docs/scripts/scene.txt)*
2. **Overlap 56 frames (2.3 s)** — more real footage in the clip's own timeline; one click in the UI.
3. **A keyframe at the end** (`MiniMaxH3AddGuide`, the source's last frame re-anchored at the segment's last frame) so the shot must return to the same framing — cheap in the graph, but it constrains the end pose.
4. ~~**Seed sampling:** generate the extension twice and keep the one without a jump — the UI already lets the owner Retry; `seam-check.sh`-style jump scanning could flag a cut automatically in the adapter and offer a regenerate.~~ *(STORY_020: `result.cuts` + the notice's Retry; the mount is CHORE_009)*
5. ~~**Guidance:** the template runs with `BasicGuider` (no CFG); a guided sampler with a negative prompt ("cut, dissolve, new shot, camera move") is the model-side lever, unmeasured.~~ *(withdrawn: the checkpoints are CFG-distilled)*

## Dependencies

STORY_017 (Done) is the base; CHORE_006 (the seam feather) is independent of this.
