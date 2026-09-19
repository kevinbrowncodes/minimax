# BACKLOG_012 — A cheap probe tells a cutting seed before the hour is spent

**Status:** Open (2026-09-19 02:50 EDT, from [STORY_060](../story/STORY_060_fewer_cuts_at_the_join.md)'s lever 3) · **Priority:** High (raised 2026-09-19 07:30 — STORY_060's row 17: an anchored chain segment cut away and back between its pinned ends; the anchor guarantees the ends, the probe guards the middle. The other half of the path with [STORY_061](../story/STORY_061_the_segment_ends_on_its_first_frame.md))

## Summary

STORY_060 measured that the same extension request at **6 sampling steps instead of 20** (22 min instead of 67) agrees with the full draw on whether the join cuts: on the segment-2 prompt over `eb90ccb2`, seeds 2723109720 and 2356207568 cut at frame 243 in both, seed 1351805226 held in both — **3 of 3**; with the anchor in (STORY_061's form) the probe kept agreeing — **5 of 5** confirmed pairs by the end of the run, the last a chain's segment 3 on a fresh seed whose probe held and whose full draw completed a 30 s chain with no cut. The seed's noise is the same tensor; the decision to reframe at the first unprotected frame is made in the early, high-noise steps.

So a segment could be **probed** before it is drawn: submit the seed at 6 steps; if the adapter's shot-change check finds a cut at the join, discard the seed and probe another; when a probe holds, draw the full 20 steps with that seed. A bad seed then costs 22 min instead of 67, and the owner never sees it.

## User impact

- On a prompt where a third of seeds hold (STORY_060's), a held segment today costs on average three full draws (≈ 200 min, through Retry chain); with probes, ≈ 3 probes + 1 draw ≈ 133 min, and no retry on the page.
- On a prompt where seeds hold anyway (the 09-17/18 chains and draws), each probe is 22 min spent for nothing — a setting, not a rule.
- STORY_061's anchor held every cutting seed in STORY_060 at no extra cost; if that carries, the probe is rarely needed. Its place is the fallback: a segment whose beat must end *Anywhere* (the anchor off), or a prompt where the anchor turns out not to hold.

## Rough scope

- Adapter: a `steps` (or `probe: true`) request field on an extension (contract bump), the graph's `sigmas.steps` set from it; the probe's result measured as any job is (`result.cuts`); the probe's video kept or discarded (its own option).
- App: a queue step before a chain segment's draw — "probing seed 1 of 3 (22 min)…" on the task page and the chain list (STORY_057's rows gain a *probing* outcome); a setting for how many probes before giving up (1–3) and whether to probe at all; the full draw submitted with the probe's seed (the `seed` field already passes through `POST /api/jobs`).
- Still to measure before it is a story: **whether a 3-step probe (≈ 12 min) predicts as well** (`test/26-09-18-1500_cuts/edit-probe3.py` is ready), and the agreement on fresh seeds and another prompt.

## Dependencies

STORY_060 (Done note with the rows); STORY_061 decides how much of this is needed.

## Open questions

- Is the probe's decision stable across prompts, or only on this one? (Fresh seeds and a second prompt.)
- Keep the probe's 22-minute clip as a preview on the task page, or discard it?
- With STORY_061 on, does the anchor make a probe pointless (every seed holds) — measured by STORY_060's *probe × anchor* rows.
