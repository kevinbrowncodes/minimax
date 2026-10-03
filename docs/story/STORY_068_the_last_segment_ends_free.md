# STORY_068 — The last segment ends free

**Status:** Built (approved 2026-10-03 ~16:50 EDT — "Approved, build it"; code and tests landed the same afternoon, the gate green; the Spark verification is pending)
**Epic:** follows [STORY_061](STORY_061_the_segment_ends_on_its_first_frame.md) (the end pin) and [STORY_044](STORY_044_one_starting_frame_and_any_number_of_scripts_go_out_in_one_send.md) (Send all); no epic of its own
**Estimate:** ≈ 1 h 15 min (one line in `submitChain`, its unit tests, one e2e assertion, the gate) · **Estimated completion:** the same afternoon it is approved

As the owner, I want the **last segment of a chain I send with Send all to end wherever its script ends**, while the segments before it stay pinned, so that a video finishes on my final pose (a double biceps, a pinup) instead of snapping back to where that segment began in its last second.

## Current state (read 2026-10-03 in the code and measured on the Spark)

- `submitChain` (`app/lib/submit-job.ts:84-97`) posts segment 1 from the photo and each next segment as an extension of the one before; every extension goes through `buildJobRequest` (`:38`), which sends **the composer's one `endAnchor`** — `source-last-frame` by default, "Where it began" (STORY_061). So segments 2 … N are all pinned.
- The adapter pins by adding `MiniMaxH3AddGuide` with the source's last frame at the new clip's last frame (`spark/adapter/src/mapping.ts:181-186`). A segment must therefore end in the pose it started in.
- When the script's last beat ends in a different pose, the model follows the script and then **snaps back** in the final 0.2–1 s. Seen 2026-10-02/03 on four test videos: the shower back draws (pinup → facing camera, 29.9 → 30.1 s), the shower back redraw from the owner's original scripts (statue-hero pose → standing), courtyard video 1 seed 1134148901 (back double biceps → the segment's opening stance, ~29 s).
- **Measured fix, test tooling only** (`test/26-10-03-1300-courtyard/ext-standalone.sh`, segment 3 drawn with `--no-anchor`): courtyard video 2 (seed 357811543) and video 1's segment 3 redrawn unpinned both **ended in the scripted back double biceps, held to the cut — no snap, no cut flagged**. Segments 2 stayed pinned and their joins held. The owner chose this ("Last segment unpinned", 2026-10-03).
- Why the pin exists (STORY_060 → 061): unpinned extensions cut to a new shot in 2 of 3 draws on the worst seed; pinned, 8 of 8 held. Unpinning only the last segment keeps that protection for every join and limits the cut risk to the final segment, where the shot-change check (STORY_046) still flags any cut.

## UI Mockup

UI Mockup: no new control. The composer's **End** row (STORY_061) is unchanged and still decides single extensions and segments 2 … N−1. The only visible change is the task page's request line of a chain's **last** segment, which no longer reads "· ends where it began" (it reads nothing extra, exactly as an "Anywhere" extension does today, `TaskPage.tsx:347`).

```
Task page, request line — chain of 3, before → after
segment 2:  +10 s · 768P · carried its last 1.6 s · ends where it began     (unchanged)
segment 3:  +10 s · 768P · carried its last 1.6 s · ends where it began     (before)
segment 3:  +10 s · 768P · carried its last 1.6 s                           (after)
```

## Acceptance Criteria

- [x] **Send all with 3 or more segments** sends `endAnchor: "none"` on the **last** segment and the composer's `endAnchor` on every extension before it (`submitChain`). A chain of 2 (photo + one extension) sends `"none"` on its one extension.
- [x] **A chain whose first segment is itself an extension** (Send all in extend mode): the same rule — only the last segment is unpinned.
- [x] **Single extensions are unchanged:** Extend with one prompt still sends the composer's End choice; "Anywhere" chosen in the composer still unpins every extension of a chain.
- [x] **Retry chain** (`app/app/api/jobs/[id]/retry-chain/route.ts`) redraws each segment with the `endAnchor` it was first sent with, so a retried chain keeps its last segment unpinned.
- [x] **The task page** shows "· ends where it began" on segments 2 … N−1 and nothing on the last segment.
- [ ] **A manual verification on the Spark in the Done note:** one 3-segment Send all whose last script ends in a new pose — the last segment's graph has no `anchor` node, segment 2's has one, the result ends in the scripted pose with no snap and `result.cuts` empty (or the cut, if any, recorded).

## Technical Notes

- The change is in `submitChain`: pass an `endAnchor` override in the `SegmentRequest` for the last index (`i === prompts.length - 1 && continueFrom !== undefined`), and let `buildJobRequest` prefer `segment.endAnchor` over `state.endAnchor`. No adapter, contract or stub change: `"none"` is already a valid `endAnchor` (STORY_061's options) and the adapter already honours it.
- Agent mode's chain (STORY_053, `agent-decision.ts` → `queue-chain`) goes through `submitChain`, so it inherits the rule.
- The skills already tell the director to end the last segment in a held pose; nothing changes there.

## Testing Plan

- **Unit — `app/lib/submit-job.test.ts`** (extended): (1) a 3-segment `submitChain` from images: body 2 carries `endAnchor: "source-last-frame"`, body 3 carries `endAnchor: "none"`; (2) a 2-segment chain: body 2 carries `"none"`; (3) extend-mode Send all of 2 prompts: body 1 (an extension of the source) carries the composer's choice, body 2 `"none"`; (4) composer End set to "Anywhere": every extension body carries `"none"`; (5) `buildJobRequest` without a segment (a single Extend) still sends `state.endAnchor` — the existing assertions stay green.
- **Integration:** none new — `/api/jobs` already accepts and stores `endAnchor: "none"` (STORY_061's route tests cover both values); Retry chain's reuse of the stored `endAnchor` is already covered by its route test, which stays green.
- **E2E — `app/e2e/agent.spec.ts`** (extended, both widths; the draft said `extend.spec.ts`, which has no Send all flow): the chain director's Send all of three segments against the stub; read the stub's recorded requests (STORY_061's hook): the second carries `source-last-frame`, the third `none`; open the third segment's task page and assert its request line does **not** contain "ends where it began", the second's does. Regression cover: `extend.spec.ts`'s existing single-extension End test (the default and "Anywhere") and `composer.spec.ts`'s Send all flow staying green. **Corrected 2026-10-03 after the first gate run:** `scheduled.spec.ts`'s chain test ("one image and three scripts go out in one Send and run as a chain") asserted STORY_061's rule that segment 3 is pinned — the behaviour this story changes — so it is updated to expect `none` on the last segment, not kept green as written here; the draft named it without reading it (CLAUDE.md §3 item 8). The Send all e2e that actually runs is `agent.spec.ts`'s chain test (its `expectChainRan` helper), which gains the endAnchor and request-line assertions.
- **Not a test layer:** whether the unpinned last segment cuts on a given seed is the model's behaviour — the manual verification records it.

## Estimated Complexity

Small: one decision in `submitChain`, a few unit cases, one e2e assertion.
