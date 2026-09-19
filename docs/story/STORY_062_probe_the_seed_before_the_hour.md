# STORY_062 — Probe the seed before the hour

**Status:** Proposed (drafted 2026-09-19 13:30 EDT from [BACKLOG_012](../backlog/BACKLOG_012_a_cheap_probe_tells_a_cutting_seed_before_the_hour_is_spent.md) while STORY_061's verification draws; no code until approved)
**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the second half of [STORY_060](STORY_060_fewer_cuts_at_the_join.md)'s answer (*anchor + probe*), after [STORY_061](STORY_061_the_segment_ends_on_its_first_frame.md)
**Estimate:** ≈ 4 h (an adapter option with its test and a contract bump; the queue runner's probe step with its state machine; a setting; the chain list's new outcome; both widths; two hand gates) · **Estimated completion:** the day after approval, plus the Spark's verification (one chain, ≈ 3 h 45 min of GPU)

As the owner, I want each chain segment's seed **checked in 22 minutes before the hour is spent on it**, so that a seed that would cut is thrown away unseen and the segment I get is drawn from one that held — Retry chain stays a safety net that is not needed.

## Current state (read 2026-09-19 in the code and measured on the Spark)

- STORY_061 pins each segment's end; STORY_060 measured that this holds the join (8 of 8 on segment 2) **but not always the middle**: the confirming chain's segment 3 on an unprobed seed cut away and back between its pinned ends (row 17 of 060's Done note), and the adapter flagged it. The same segment on a seed whose 6-step probe held completed a 30 s chain with no cut (rows 19 and 21).
- **The probe:** the identical request at 6 sampling steps instead of 20 takes 22 min instead of 67 and told the full draw's outcome **5 of 5** times (060's rows 2, 4, 6, 15, 19 → 21), with and without the anchor. The seed's noise is the same tensor; the decision to reframe is made in the early steps. Whether **3 steps (≈ 12 min)** predict as well is unmeasured (`test/26-09-18-1500_cuts/edit-probe3.py` is ready) — see Open questions.
- Today the app's queue runner (`lib/queue-runner.ts`) submits a queued extension the moment its source is done (STORY_044/053); the adapter draws a seed and echoes it (`request.seed`), and the app can send a `seed` (STORY_060 used it). The chain list (STORY_057, `lib/chain-outcome.ts`) knows *waiting · queued · running · done · cut at the join · cut inside · failed · cancelled*.
- A probe is a full job on the adapter's side: it costs the queue one slot for 22 min and produces a clip and a `result.cuts` like any other.

## UI Mockup

**Reference capture:** none — the reference has no such step (a departure, reasoned below).

Two surfaces change, both existing ones. The chain list (STORY_057, `components/task/ChainOutcomes.tsx`) shows a segment being probed and how many probes it took; Agent settings (STORY_051/055's panel) gains one row under *Video generation default*.

```
Chain list, while segment 2 is being probed (desktop and narrow the same, one row per segment)
┌────────────────────────────────────────────────────────────┐
│ 1  done          In the first two seconds, the man…         │
│ 2  probing 1/2 · 22 min   For the first moment he holds…    │   ← the row is this page's segment
│ 3  waiting · after 2      For the first moment he leans…    │
└────────────────────────────────────────────────────────────┘
   then:  2  running · 41 %  For the first moment he holds…   (drawn from probe 1's seed)
   or:    2  probing 2/2 · 22 min …                            (probe 1 cut; a new seed)
   or:    2  running · 3 %  … (no probe held)                  (both probes cut: drawn anyway, the notice will say if it cut)

Task page, the request line of a segment drawn from a probe
   Continues segment 1 · 10.1 s · carried its last 1.6 s · ends where it began · seed held by probe 1 of 2

Agent settings › Video generation default (after)
┌──────────────────────────────────────────────────────────┐
│ Draws              Each draw is a job with its own seed…  │
│                    [x1] x2  x3  x4                        │
│ Probe the seed     A 22-minute draw at 6 steps before     │
│                    each segment after the first; a seed   │
│                    whose join cuts is thrown away.        │
│                    Off  [1]  2  3     (probes at most)    │
│ Model              Gemini 3.8 Flash · Vertex AI           │
└──────────────────────────────────────────────────────────┘
```

Narrow (iPhone 13): the settings sheet wraps the track under the text as *Draws* does; targets ≥ 44 px.

## Acceptance Criteria

- [ ] **The adapter takes `probe: true` on an extension** (contract v1.6): the graph is the same request at **6 steps** (`sigmas.steps`; the number is a server constant read from `capabilities.extension.probe.steps` — **the owner's decision, see Open questions**), everything else identical, including STORY_061's anchor; the job is measured like any other (`result.cuts`, `result.camera`) and its `request.seed` is the seed it ran with; `capabilities.extension.probe` says `{ steps, minutes }` so the UI can say the wait; refused on a fresh clip like `endAnchor`.
- [ ] **A setting, `agentProbes`, 0–3, default the owner's** (see Open questions), in `lib/settings.ts` and the Agent settings panel's *Probe the seed* row; PATCH validates it like `agentDraws`.
- [ ] **The queue runner probes before it draws:** when a queued extension's source is done and `agentProbes > 0`, the runner submits the same request with `probe: true` (no seed) instead of the draw, records the probe under the queue entry (`probes: [{ jobId, seed, outcome }]`), and polls it; when the probe is done with **no cut** (`result.cuts` has no `kind: "cut"`), the runner submits the full draw with `seed` = the probe's; when the probe **cut** and probes remain, it submits another probe; when none remain, it submits the full draw with no seed (today's behaviour) and the entry records that no probe held. A probe that fails or is cancelled counts as spent. Cancelling the queued segment cancels its running probe (`lib/cancel-job.ts`).
- [ ] **The probes are history entries** (`kind: "probe"`, linked to the segment they served, hidden from the gallery and the sidebar's recents, listed nowhere but the segment's own page), so the adapter's clip and measure are kept and reachable; the segment's page shows them as one line each under the request (*probe 1 · cut at 10.1 s · seed 2723109720*, *probe 2 · held · seed …*), with the probe's clip playable from the line.
- [ ] **The chain list says it:** a new outcome `probing` with the ordinal and the count (*probing 1/2 · 22 min*); the request line of a segment drawn from a held probe reads *seed held by probe k of n*; a segment drawn after every probe cut reads *no probe held*.
- [ ] **A manual extension (Extend on a finished clip) is not probed** — the setting is the agent's, for chains; a single Extend is the owner's own choice of seed. (Say so in the row's description.)
- [ ] **STORY_056/057 unchanged where they must be:** Retry chain redraws through the same path (so a redraw is probed too); a segment's outcome once drawn is judged as today.
- [ ] **A manual verification on the Spark in the Done note:** one straight-through chain from the office photo with the default probes; the probe rows, seeds and outcomes, the segments' `result.cuts`, the strips, the wall-clock per segment; the model id and the date.

## Departures from the reference

- No such step exists on agent.minimax.io — their cloud draws the whole video at once and the owner never sees a seed. Ours exposes it because on this model the seed decides the middle of a segment (STORY_060) and a 22-minute check is a third of a draw.

## Technical Notes

- Adapter: `capabilities.ts` gains `probe` (a boolean field, only with `continueFrom`) and `CAPABILITIES.extension.probe = { steps: 6, minutes: 22 }`; `mapping.ts` sets `sigmas.steps` from the continuation; the log names it; the stub records it and answers its scripts for the outcomes the gate needs (`done-with-cut-at-join` exists; a `done-probe-held` alias is enough).
- App: `queue-store.ts` gains `probes` on an entry and the runner's step becomes a small state machine (*ready → probing (n) → drawing*), driven by the same polls that learn a source is done (BUG_009's rule holds: a page or the poller must poll). `history-store.ts` gains `kind?: "probe"` and `probeFor?: id`; the gallery, recents and the sidebar filter it out; `chain-outcome.ts` gains `probing`.
- Time: at 060's rates a segment costs 67 + 22 k min for k probes; a chain of three with one held probe each ≈ 4 h 10 min against ≈ 3 h 25 min without — the price of not needing Retry chain on that chain.
- Not in this story: probing fresh clips (segment 1) — a cut inside a fresh clip is STORY_020's notice as today; a probe of the anchor's *middle* at 3 steps (measure first).

## Testing Plan

- **Unit (adapter `capabilities.test.ts`, `mapping.test.ts`)**: `probe: true` parses only with `continueFrom`; the graph's `sigmas.steps` is 6 and nothing else differs from the full graph. **Unit (app)**: `settings-store.test.ts` (0–3, default, garbage); `queue-runner.test.ts` — the state machine: a held probe leads to a draw with its seed, a cut probe to another probe, the last cut to a seedless draw, a cancelled probe counts as spent, `agentProbes: 0` is today's path byte for byte; `history-store.test.ts` — probe entries hidden from `list()`'s gallery view and recents; `chain-outcome.test.ts` — `probing` with ordinal and count.
- **Component**: `AgentSettingsPanel.test.tsx` (the row, save), `ChainOutcomes.test.tsx` (the probing row), `TaskPage.test.tsx` (the probe lines and the request line's suffix).
- **Integration (`test/integration/queue.test.ts`)**: a chain of three with `agentProbes: 1`: the stub receives a `probe: true` request for segment 2 first, then the draw with the probe's seed; with the probe scripted to cut (`done-with-cut-at-join`) and `agentProbes: 2`, a second probe then the draw; the probe entries are in history with `kind: "probe"` and not in the gallery list.
- **E2E (`e2e/scheduled.spec.ts`'s chain case, both widths)**: with the setting at 1, the chain list reads *probing 1/1 · 22 min* on segment 2 while the stub's probe runs, then *running*, then *done*; the stub's records show the probe then the draw with the same seed; the segment's page lists the probe line. `agent.spec.ts`'s straight-through case stays green with the setting at 0 (the default state of the stub run).
- **Manual verification** (not a gate): the chain above, in the Done note.

## Estimated Complexity

Large — the runner's state machine and its cancellation paths are the substance; the adapter and the UI rows are small.

## Open questions (for the owner, by the multiple-choice tool)

1. **The default:** probes off (today's chains, the anchor alone), or *1* probe per segment (22 min more a segment, a cut seed caught once)? Recommended: 1.
2. **The probe's steps:** 6 (measured 5 of 5) or 3 (≈ 12 min, unmeasured — a 36-minute experiment on the three known seeds settles it before this story starts)? Recommended: measure 3 first; ship whichever predicts.
3. **The probe's clip:** kept and playable from the segment's page (disk: ≈ 3 MB each), or discarded once judged? Recommended: kept.
