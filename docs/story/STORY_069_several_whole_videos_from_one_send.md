# STORY_069 — Several whole videos from one Send

**Status:** Proposed (drafted 2026-10-09 11:20 EDT for [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md); waits for the owner's go, after STORY_065)
**Epic:** [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md) — the third story, after [STORY_065](STORY_065_the_uncensored_model_in_the_composer.md)
**Estimate:** ≈ 2 h 30 min (`submitChains` and the `after` relation in the app's queue, the strip's summary and the toast, the minutes line, the Send label; unit, integration, e2e at both widths; two hand gates) · **Estimated completion:** midday of the day after it is started, or the same day if started in the morning

As the owner, I want **Draws ×N to apply to Send all**, so that one photo and my three scripts become N whole 31-second videos on fresh seeds, drawn one after another with each whole video landing in Recents before the next starts — the way every test round since 2026-10-05 was run from the chat (four to seven videos a round, reviewed as they landed).

## Current state (read from the code, 2026-10-09 10:50 EDT)

- **A chain is sent once.** `Composer.tsx:372–386`: with a chain and a plan, Send all calls `submitChain(state, prompts)` once and toasts *Queued — N segments, ≈ S s*; STORY_055 decided chains ignore the draw count and the strip's summary says so (`ChainStrip.tsx:44`: *· draws apply to single clips; the chain is sent once*; `Draws.test.tsx:86` asserts it).
- **`submitChain`** (`lib/submit-job.ts:153–168`) posts segment 1 as the composer would (its images, run-at, Edit), each next segment as an extension of the id just answered, the last with `endAnchor: "none"` (STORY_068); a refusal mid-way returns the accepted ids and the failing index. **`submitDraws`** (`:179–191`) posts one single-clip request N times, never with a seed.
- **The queue holds an extension until its source is done** (`lib/queue-runner.ts:57–90`: `sourceState`, `refreshPendingSources`); a fresh clip is submitted as soon as the adapter has a slot. So two chains posted back to back would interleave on the GPU: chain 1's segment 1, chain 2's segment 1, then the extensions as their sources finish — both whole videos land at the end, none early. `QueueEntry` (`queue-store.ts:26–36`) carries `notBefore` and nothing that says "after that job".
- **The minutes line** (`lib/spark-time.ts` › `sparkTimeLine(jobs, draws)`) already multiplies: *≈ 2 × 50 min* for draws of a single clip; for a chain it sums the segments.
- **The test tooling's rounds** (`test/<round>/<round>.sh`) ran `chain30.sh` once per seed in a `for` loop — strictly one whole video after another; the owner reviewed each as it landed and sometimes changed the next script before it drew (2026-10-05, 10-08).

## UI Mockup

**Reference capture:** none — agent.minimax.io has no draw count (STORY_055's departure stands); this story changes two lines of ours and one label.

```
The chain strip, Draws ×3 set (after)
┌ 3 segments · 10 s + 10 s + 10 s = 31.4 s · 3 draws, one after another ───────┐
│ [01] scene + script 1   [02] script 2   [03] script 3                        │
└────────────────────────────────────────────────────────────────────────────┘
                                                                [Send all ×3 ↑]
                                                       ≈ 3 × 1 h 21 min on the Spark

Send all → toast:  Queued — 3 chains of 3 segments, ≈ 3 × 31.4 s
            → the first chain's last segment's task page (the first whole video)

Scheduled, while chain 1 draws (the lines under Waiting)
   Chain 1 · script 2      Waiting — after script 1
   Chain 1 · script 3      Waiting — after script 2
   Chain 2 · script 1      Waiting — after chain 1
   Chain 2 · script 2      Waiting — after chain 2's script 1
   …

With Draws ×1 nothing changes (the strip, the toast and Send all read as today).
```

Narrow (iPhone 13): the strip's summary wraps; *×3* stays on the Send button; the Scheduled lines are the existing rows with the new reason text.

## Acceptance Criteria

- [ ] **Send all honours the draw count.** With `settings.agentDraws` = N > 1 and a chain in the composer, Send all posts **N chains**: `lib/submit-job.ts` › `submitChains(state, prompts, count)` runs `submitChain` N times in sequence, each chain's first segment from the same images and run-at (the first chain also carrying the Edit's `replaces`), never with a seed (the adapter draws one per job — asserted as STORY_055 asserts it). N = 1 is today's one `submitChain`, byte for byte.
- [ ] **Whole videos land in turn.** Chain k+1's first segment is held by the app's queue until chain k's last segment is done: `QueuedRequest` gains an optional `after: <jobId>` (the app's own field, never forwarded to the adapter — like `notBefore` and `replaces`); `queue-runner.ts` treats `after` exactly as it treats `continueFrom`'s source (`sourceState` → "done" releases it, "gone" fails the entry with *the video it was to follow did not finish*, "pending" holds it, and `refreshPendingSources` asks the server about an `after` source too). `submitChains` sets `after` on each chain's first segment to the previous chain's last segment id. The e2e asserts the stub receives the requests in the order c1s1, c1s2, c1s3, c2s1, c2s2, c2s3 and that c2s1 arrives only after c1s3 is terminal.
- [ ] **A refusal mid-way** (a 4xx/5xx on any segment of any chain) stops the sequence: the accepted segments stay as real requests; the composer shows *Chain k, segment j was not sent: <message>* and keeps the text, the image and the parameters (STORY_055's pattern, with the chain index); chains already fully posted are untouched.
- [ ] **The strip, the button, the toast and the line say the count:** the strip's summary ends *· N draws, one after another* (replacing STORY_055's *draws apply to single clips; the chain is sent once*, retired with this story); Send all reads *Send all ×N* (`aria-label="Send all, N draws"`); the toast reads *Queued — N chains of M segments, ≈ N × S s*; the minutes line reads *≈ N × <chain minutes> on the Spark* (`sparkTimeLine` with the chain's jobs and the count — the per-model rows STORY_065 adds apply).
- [ ] **The Scheduled page names the wait**: a held `after` entry's line reads *Waiting — after chain k* (its chain number from its position in the Send) beside the existing *Waiting — after script j* for extensions (`queue-view.ts`'s pattern); the entries' titles carry *Chain k ·* when a Send posted more than one chain (one title source, `lib/chain-title.ts`), and nothing when it posted one.
- [ ] **Retry chain** (`/api/jobs/:id/retry-chain`) redraws one chain, as today — it does not re-post the other chains of the Send (the AC is that the test now covers a Send of two).
- [ ] **Agent mode's straight-through chain** (STORY_053's `queue-chain` decision, `agent-decision.ts:17`) honours the count the same way — one code path, `submitChains`.
- [ ] **The Agent settings helper sentence** under *Draws* reads *Each draw is a job — or a whole chain — with its own seeds, queued one after another.*
- [ ] **A manual verification on the Spark in the Done note:** Draws ×2 with the owner's photo and three scripts on the uncensored model (STORY_065): the Scheduled page shows chain 2's first segment waiting on chain 1's last; two whole videos in Recents with their job ids, seeds and minutes; the second chain's first segment submitted within the runner's tick after the first chain's last went terminal.

## Departures from the reference

- The reference generates one video per request. STORY_055 added draws for single clips; this story extends them to chains because a round is N whole videos per photo, and "one after another" is how the owner reviews (each landed video is judged before the next finishes).

## Technical Notes

- **`after` is the smallest change that gives the order.** The runner already has "wait for a job to finish" (an extension's source); `after` reuses `sourceState` and `refreshPendingSources` with a second field. No adapter, contract or stub change. Draws of single clips keep running in parallel on the adapter's slots as today (STORY_055) — Open question 1.
- **Chain numbering** is presentation: the queue entries carry `chainIndex` and `chainCount` from the Send (optional, app-only), read by the Scheduled page and the titles; absent on an old entry → no prefix.
- **`submitChains` opens the first chain's last segment** (STORY_044 opens the last segment's page for one chain; with N chains the first whole video is the one to watch first — STORY_055 opens the first draw's page for the same reason).
- **The straight-through path** (`agent-decision.ts` → `queue-chain`) and the review path's Send all call the same function — one branch in `Composer.tsx › send()`.
- Not in this story: a seed field; different scripts per draw; the rating page.

## Testing Plan

- **Unit (`app/lib/submit-job.test.ts`, extended):** (1) `submitChains` ×2 of 3 prompts posts 6 requests in order, the 4th with `after` = the 3rd's id, images on the 1st and 4th, `continueFrom` on the others, `endAnchor: "none"` on the 3rd and 6th, no `seed` anywhere; (2) ×1 is one `submitChain` (the existing assertions); (3) a refusal on request 5 returns `sent` = the first four ids, `chain: 2, index: 1`; (4) `replaces` only on the first request. **`queue-runner.test.ts`** (extended): an entry with `after` pending is not due; done → due; gone → failed with the message; `refreshPendingSources` asks about an `after` source. **`queue-view.test.ts`**: the *Waiting — after chain k* line. **`spark-time.test.ts`**: `sparkTimeLine(chainJobs, 3)` → *≈ 3 × 1 h 21 min on the Spark*. **`chain-title.test.ts`**: the prefix with and without a count.
- **Component (jsdom, StrictMode) — `Draws.test.tsx`** (rewritten where it asserted the retired sentence): ×3 with a chain → `submitChains` called with 3, the strip's summary *· 3 draws, one after another*, Send all *×3*; ×1 unchanged.
- **Integration (`app/test/integration/queue.test.ts`):** `POST /api/jobs` with `after` stores it and never forwards it (the stub's `received.request` has no `after`); an entry with `after` naming a pending job is held and `GET /api/jobs/:id` says *waiting*; marking the source done in the stub releases it on the next tick; a gone source fails it with the message.
- **E2E (`app/e2e/agent.spec.ts`'s chain flow, extended; `scheduled.spec.ts`; both widths):** Draws ×2 (`PATCH /api/settings`), the chain director's Send all of three segments against the stub with `done-after-1-poll`: the stub receives six requests in the order above; the Scheduled page shows *Waiting — after chain 1* on chain 2's first segment while chain 1 runs; after chain 1's last is done, chain 2's first is submitted (poll the stub's received list, never a sleep); both last segments reach `done` before the spec returns (`stub.reset` in `beforeEach`). **Unchanged halves:** `agent.spec.ts`'s single-chain case (×1) and `composer.spec.ts`'s Send all stay green; STORY_055's single-clip draws spec stays green.
- **Manual verification** (not a gate): the Spark row above.

## Estimated Complexity

Medium — one new function beside `submitChain`, one field through the queue store, runner and view, three strings; the e2e ordering assertion is where the care goes.

## Open questions (for the owner, by the multiple-choice tool, before implementation)

1. **Draws of single clips: still parallel?** Today ×N single clips are posted at once and run as the adapter's slots allow (STORY_055). Recommended: leave it — only chains get the `after` relation (a chain is the round's unit). Alternative: `after` on single draws too, so every Send is strictly sequential.
