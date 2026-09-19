# STORY_061 — The segment ends on its first frame

**Status:** Approved (2026-09-19 11:35 EDT — "its pretty clear lever 4 is the move then… please proceed"; the owner's answers: the default is *Where it began*, segment 1 stays silent; drafted 02:45 from STORY_060's rows)
**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — a follow-up of [STORY_060](STORY_060_fewer_cuts_at_the_join.md) (its lever 4′), and [BACKLOG_004](../backlog/BACKLOG_004_an_extension_can_still_change_the_scene_on_its_own_after_the_overlap.md)'s remedy 3
**Estimate:** ≈ 2 h 30 min (an adapter graph change with its unit test, a contract bump, a composer control at both widths, the chain's segments carrying it; two hand gates) · **Estimated completion:** the afternoon of the day it is approved

As the owner, I want every segment the app draws to **end on the frame it started from**, so that the model has to keep the shot for the whole segment — the join holds on the first draw and Retry chain stays the safety net I never need.

## Current state (read 2026-09-19 02:30 in the code and measured on the Spark)

- An extension continues its source through STORY_017's masked prefix: the source's last 39 frames become the new clip's protected first frames (`spark/adapter/src/mapping.ts › buildGraph`, the extension branch), the prompt and STORY_020's guard sentence do the rest. The model is told what to *start* from; nothing tells it where to *end*.
- STORY_060 measured, on one prompt and three seeds, that neither more context (overlap 56: 0 of 3 held) nor a beat rewritten to stay in frame (1 of 3, the same seed as the baseline) changes whether the join holds — the seed decides — and that **an end frame pinned at the segment's last frame held the join on every seed that had cut under everything else** (8 of 8 anchored draws of segment 2 across five seeds — two with a held draw's last frame, six with the *source's own last frame*, which the app always has; the rows are in 060's Done note). **The anchor holds the ends, not the middle:** 060's confirming chain had one segment cut away and back between its pinned ends, which the adapter flagged — so this story pairs with BACKLOG_012's probe, and its Testing Plan's manual verification draws the chain the way the product would.. The model's own guide node does it: `MiniMaxH3AddGuide` (`comfy_extras/nodes_minimax_h3.py`) writes a keyframe into the conditioning; `comfy/model_base.py` carries keyframes and the extension's noise mask in the same payload, so the two compose. It costs nothing at draw time (67 min either way).
- The source's last frame is the new clip's frame 38 (the last protected frame) — pinning it at frame 293 asks the segment to **return to where it began**: the beat may go anywhere in between, but the person is back in the starting pose at the end. STORY_053's chain director already writes beats that settle ("holds this same reclined posture … as the clip ends"); a beat that must end elsewhere (he stands and walks out) is the case the control below is for.

## UI Mockup

**Reference capture:** none — the reference has no extension option of this kind (a departure, [§6 rule 8](../../CLAUDE.md), reasoned below).

The params popover in extend mode (STORY_017's `Overlap` row, `components/composer/Composer.tsx`) gains one row under it, the same segmented control as Overlap; the task page's request line (STORY_017's "carried its last 1.6 s") says when the end was pinned. Nothing else changes; the chain strip (STORY_044) carries the choice into segments 2 and 3 as it carries the overlap.

```
Desktop, the params popover in extend mode (after)
┌──────────────────────────────────────────────────────────┐
│ Duration (added)     +4s  +6s  [+10s]  +12s  +14s        │
│ Overlap (what the new clip starts from)                  │
│                      0.9 s   [1.6 s]   2.3 s             │
│ End (where the new clip finishes)                        │
│                      [Where it began]   Anywhere         │
└──────────────────────────────────────────────────────────┘
   "Where it began" pins the source's last frame at the segment's end (holds the shot)
   "Anywhere" is today's behaviour (the beat may leave the frame; the join may cut)

Task page, the request line (after)
   +10 s · 768P · carried its last 1.6 s · ends where it began
```

Narrow (iPhone 13): the row wraps like Overlap's; targets ≥ 44 px; the label reads *End*.

## Acceptance Criteria

- [ ] **The adapter takes `endAnchor: "source-last-frame" | "none"` on an extension** (contract v1.5; `capabilities.ts` validates it the way `overlapFrames` is validated: only with `continueFrom`, `none` when absent — **the default is the owner's decision, see Open questions**; anything else answers 400 `unsupported_option`). `buildGraph` adds, for `source-last-frame`, `anchor_frame = ImageFromBatch(source_parts, S − 1, 1)` and `anchor = MiniMaxH3AddGuide(positive: cond, vae: vae_video, latent: latent, image: anchor_frame, frame_idx: L − 1)`, and the guider takes `anchor`'s conditioning; for `none` the graph is today's. `REQUIRED_CLASSES` gains `MiniMaxH3AddGuide` (checked against `/object_info` at start, as the others are). The stored request and `GET /jobs/:id` carry `endAnchor` back.
- [ ] **The app sends it:** `lib/composer-state.ts` gains `endAnchor` (an `end-anchor` action), `submit-job.ts` sends it with `continueFrom` only; the params popover shows the *End* row in extend mode only; the choice is kept with the session's other params. The chain (STORY_044/053's plan and `submitChain`) sends the composer's value on segments 2 and 3, never on segment 1 (a fresh clip has no source).
- [ ] **The task page says it:** the request line reads *ends where it began* when the entry's request carried `source-last-frame`; nothing for `none` or for a job older than this story (`endAnchor` absent).
- [ ] **STORY_056/057 unchanged:** Retry and Retry chain repost the request as stored, so a pinned segment is redrawn pinned; the chain list's outcomes are unchanged.
- [ ] **A manual verification on the Spark in the Done note:** one +10 s extension of `eb90ccb2` through the app with *Where it began* on a seed that cut in STORY_060 — the adapter's `result.cuts` empty and the strip in one shot — and one 30 s chain drawn straight through with it, the model id and the date.

## Departures from the reference

- The *End* row does not exist on agent.minimax.io: their extension is a cloud feature with no exposed anchors. Ours exposes it because STORY_060 measured it as the one lever that holds the join on this model; the wording is the owner's plain-English style (STORY_017's Overlap row is the precedent).

## Technical Notes

- `mapping.ts`: the extension branch already has `source_parts`, `S`, `L`, `latent` and `cond`; the anchor is three graph entries. The keyframe's latent is encoded by the video VAE inside the node (`vae.encode` on a 1-frame batch — the node's tooltip: batches shorter than 5 frames use the first image). `frame_idx: L − 1` is the segment's last frame (293 for a +10 s extension at overlap 39; the node counts pixel frames and refuses an index outside the clip).
- The contract bump is additive (a new optional field); `README.md`'s adapter contract table and `docs/` contract notes gain the field and v1.5.
- Cost: none at draw time (STORY_060: 66–67 min with and without the anchor). The trade-off is the returned pose: a beat that must end elsewhere chooses *Anywhere*.
- The stub generation server (`tools/stub-generation-server`) records `endAnchor` with the request as it records `overlapFrames`, so the integration and e2e lanes can assert it; its `/capabilities` answers v1.5.
- Not in this story: the chain director's wording (a chore if STORY_060's last rows say the beat must return to the start for the anchor to hold — 060's Done note decides); a probe before the draw (BACKLOG_012).

## Testing Plan

- **Unit (adapter, `spark/adapter/src/mapping.test.ts`, `capabilities.test.ts`)**: `buildGraph` with `endAnchor: "source-last-frame"` emits `anchor_frame` at `batch_index S − 1`, `anchor` with `frame_idx L − 1` and the guider wired to it, and with `none` emits today's graph byte for byte; `parseRequest` accepts the two values only with `continueFrom`, answers 400 for a third value and for `endAnchor` on a fresh clip.
- **Unit (app)**: `composer-state.test.ts` — the `end-anchor` action, the default, the value cleared when extend mode is left; `submit-job.test.ts` — sent only with `continueFrom`; `chain.test.ts` — the plan's segments 2 and 3 carry it, segment 1 does not.
- **Integration (`app/test/integration/queue.test.ts`)**: an extension POSTed with `endAnchor` reaches the stub with it; a chain of three through `submitChain` shows it on segments 2 and 3 only; a Retry chain reposts it as stored.
- **E2E (`app/e2e/extend.spec.ts`, both widths)**: Extend a finished clip, the *End* row shows the two choices with the default selected; choosing the other and sending → the stub's recorded request carries the value; the task page's request line reads *ends where it began*. `scheduled.spec.ts`'s chain case: the straight-through chain's segments 2 and 3 carry the composer's value (the stub's records). Unchanged halves covered by `extend.spec.ts`'s existing cases (overlap, duration) and `agent.spec.ts`'s chain cases staying green.
- **Manual verification** (not a gate): the Spark row(s) above in the Done note.

## Estimated Complexity

Medium — the graph change is small but it is the adapter, so a contract bump, its unit test and a container rebuild; the UI row is STORY_017's pattern at both widths.

## Open questions (for the owner, by the multiple-choice tool)

1. **The default:** *Where it began* on for every extension (prevention first — the owner's stated priority; a beat that must leave chooses *Anywhere*), or off until chosen? Recommended: on. **Answered 11:35: *Where it began*.**
2. **Segment 1 of a chain from a photo** cannot be pinned (no source); the director's first beat is unaffected — say so in the strip or leave it silent? Recommended: silent (minimalism). **Answered 11:35: silent.**
