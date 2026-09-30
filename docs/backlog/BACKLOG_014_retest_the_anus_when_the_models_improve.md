# BACKLOG_014 — Retest the anus when the models improve

**Status:** Open (raised by the owner, 2026-09-29: *"for the time being though I just need the butts shown not the anus hole but later on I want to revisit and retest once there's been improvement in the field"*)
**Priority:** Low — deferred on purpose. Nothing to do until a new checkpoint or adapter gives a reason to think the answer has changed.

## Summary

MiniMax-H3 and every stack tried on it render male buttocks well and the anus badly. The owner's own observation (2026-09-29): *"in general the buttocks I've seen are fine… its showing the anus i.e. the hole that I've seen these models really struggle at doing."* Until that improves, rear-view prompts show the buttocks and do not ask for the anus. This item is the reminder to come back and retest.

## The evidence it rests on

SPIKE_001's 09-22 matrix, prompt P3 (buttocks, 5 s, the office photo), 9 stacks × 3 seeds, owner-rated. From `docs/spike/SPIKE_001_ratings.csv`, the `buttocks` column (the cheeks) against the `between` column (the anus):

| | Right | Minor | Wrong |
|---|---|---|---|
| Cheeks | 21/27 | 3 | 3 |
| Anus | 13/27 | 4 | 10 |

Per stack, the anus was right on: C5 NaughtyTimes v3 3/3; C0 stock, C1 Mystic XXX, C2v1 Mystic + HMPenis v1, C4 Mystic + Male_Anatomy 2/3 each; C6, C7 1/3; C3, C8 0/3. **NaughtyTimes was the only stack to get it right every time**, which is where its lead on buttocks came from — on the cheeks alone six stacks tie at 3/3.

Two further observations from the owner's review of C7-P3 frames (2026-09-29), to check again at retest time:

- **Pigmentation.** Anogenital skin rendered close to the tone of the surrounding buttock on a darker-skinned subject, where the real anatomy is noticeably darker. Likely training-data bias toward light-skinned subjects. The current rubric cannot see it — "holds / minor / wrong" judges shape, not colour.
- **Proportion and the glute boundary.** Seed 31337 inflated the glutes wider than the shoulders and drew the pale region as a separate object with its own colour and texture, seamed at the edge.

## What would trigger the retest

Any one of:

- A new MiniMax-H3 checkpoint or merge (a successor to Eros Max, a new base release).
- A LoRA that targets the male anus or buttocks. **None exists as of 2026-09-29**: searched `iamgroot1212/minimax-h3-loras` (47 files), `Wanamingo/MiniMax-H3-LoRAs` (30), `Hearmeman/minimax-h3-loras` (16), `WarmBloodAban/Minimax_H3_LoRAs` (1). The closest are `MMH3-Hybrid-PussyAnusEnhancer` (female) and `MMH3-I2V-Spanking` (an act).
- The owner deciding the anus is wanted in a shot.

## Rough scope when it happens

A spike on SPIKE_001's pattern: the P3 buttocks prompt (or a successor that asks for the anus explicitly), the new candidate against NaughtyTimes as the incumbent, screen at 1 seed and confirm at 3. Add a pigmentation question to the rating page. Seed with a rear-view photo so the model animates the anatomy rather than inventing it — the beach round's lesson.

## Open questions

1. Does stating pigmentation in the scene anchor fix the colour on its own, before any new model arrives? It is cheap to try — the same kind of fix that "large" was for size.
2. Is NaughtyTimes' 3/3 real or seed luck? It is n=3; the retest should include it as the control.
