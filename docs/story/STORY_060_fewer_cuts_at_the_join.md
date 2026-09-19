# STORY_060 — Fewer cuts at the join

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — a fourteenth story, the owner's (2026-09-18 14:15 EDT: "we need to create a story to look into how we can prevent redraws from occurring in the first place — preventing the camera from introducing a cut/scene change — there have got to be others online who found a way, or even MiniMax's own documentation … minimizing retries is critical as a redraw is a loss of compute time"); a spike in STORY_048's shape, after [STORY_059](STORY_059_plugins_becomes_skills.md); the open half of [BACKLOG_004](../backlog/BACKLOG_004_an_extension_can_still_change_the_scene_on_its_own_after_the_overlap.md) (remedies 2 and 3, never measured)
**Status:** Done (2026-09-19 11:15 EDT — 21 rows on the Spark; the answer: pin the segment's end and probe the seed; STORY_061 and BACKLOG_012 follow). **Budget extended by the owner 2026-09-18 19:55 EDT to 14:00 EDT on 2026-09-19** ("as much testing as possible … a highly confident path going forward of minimizing retries"): after the four levers, fresh seeds on the winner as probe + full-draw pairs, the two levers combined if each alone falls short, then the 30 s confirming chain. Approved (2026-09-18 14:25 EDT — the owner set the budget: the Spark until **08:00 EDT on 2026-09-19**; drafted 14:20 before any code or any GPU; it starts once STORY_059 is deployed)
**Created:** 2026-09-18

As the owner, I want the join between two segments of a chain to hold on the first draw far more often than it does today — Retry chain (STORY_056) is a safety net I never want to need, not a workflow — so that an hour of the Spark's time is not thrown away two times in three; and I want the answer found from MiniMax's own documentation and from what other people running this model have measured, then proved on our box with a controlled experiment before anything is changed in the skill or the adapter.

## Current state (read from the code and the night's draws, 2026-09-18)

- **What holds a join today:** the extension is generated with the source's last 39 frames (1.6 s) as a masked prefix — its first frames *are* the source's (STORY_017; `spark/adapter/src/comfy.ts`, the overlap options 22 / 39 / 56); the prompt is in the model's own format with the single-shot declaration in its first sentences (STORY_020: the cut rate fell from about half the draws to about one in ten); the chain director writes that sentence into every segment and opens segments 2..N on the previous hold (STORY_053). No guidance can be applied — the checkpoints are CFG-distilled (the model card; BACKLOG_004's remedy 5 withdrawn).
- **What it costs when it fails:** a +10 s extension is ≈ 67 min of GPU; a cut is known only when the draw is done and measured (`result.cuts`, STORY_020 / BUG_010); Retry chain (STORY_056) redraws the segment and everything behind it — another 67 min per segment.
- **The night's numbers:** two chains, six joins, one cut (STORY_053 › Addenda 1–2). The same segment-2 prompt of chain 2 drawn three times: `7b2636b9` cut at frame 243, `801f78a1` held, `f4abcfc7` cut at frame 243 — **two of three**, on a prompt that carries the guard sentence word for word, with the video context in place. Both cuts open the same way: a new frontal shot at desk level as the man leans to the desk. Chain 1's segment 2 — a like beat, a like prompt — held once of once. BACKLOG_004 (2026-09-14) saw the same: cuts cluster ≈ 1.5 s after the overlap ends, on the beat that moves the subject.
- **Unmeasured levers already on the table:** BACKLOG_004 › remedy 2 (overlap 56 — more real footage in the clip's own timeline) and remedy 3 (a keyframe at the end, `MiniMaxH3AddGuide`, so the shot must come back to the same framing); the base guide's line *"FL2VA generally favors a single shot so the model can interpolate continuously from the first frame to the last frame"* (`docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en` § FL2VA); the community's Infinite Continuation Suite (`docs/references/community/HerrgottMargott_…`), which uses repeated **Last Frame keyframe anchors** for "visual control and quality resets" and copies the previous latent into the next target ("Native Masked AV continuation", ComfyUI PR #15375) — ours already does the masked prefix; the anchors it does not.
- **The graph:** `spark/comfyui/h3_t2v_prompt.json` — `BasicScheduler` `simple`, `res_multistep`, 20 steps (the README's measured table); a cut is a property of the sampled latent, so whether a low-step, low-resolution **probe** of the same seed shows the same cut is an open question — and if it does, a five-minute probe could veto a seed before the hour is spent.

## UI Mockup

N/A (a spike: reading, a controlled experiment on the Spark, a written answer and a decision; the follow-ups that change the skill, the adapter or the UI are their own tickets, each with a mockup where it has a surface).

## Acceptance Criteria

- [x] **The sources are read, that day, and quoted**: MiniMax's base prompt guide and the I2VA/FL2VA sections (`docs/references/prompt-guides/`), the model card (`docs/references/raw/model-card_MiniMaxAI_MiniMax-H3.md`), the blog (`docs/references/blog/`), the ComfyUI PRs (`docs/references/comfyui/PR-15224.md`, `PR-15375.md`, `PR-15439.md`) and the community suite's README — every sentence that bears on shots, cuts, camera, continuation, keyframes and last frames, in a table with the file and the line. **The web is searched** for what others running MiniMax-H3 (ComfyUI, the model's GitHub issues, the community suite's issues and releases, Reddit / Discord write-ups if findable) have measured about cuts on extensions and how they hold the camera — each finding with its URL, its date and what was actually measured vs asserted. The Done note says which of the levers below came from where.
- [x] **A controlled experiment on the Spark, the same prompt and the same seeds under each lever**, measured by the shot-change check and the seam measure, never by eye alone. The prompt is the one that cuts — chain 2's segment 2, as sent (`7b2636b9`'s entry) — against its source `eb90ccb2`; the seeds are the three it has been drawn with (1351805226 held; 2723109720 and 2356207568 cut) plus as many fresh ones as the budget allows, so a lever is judged against the *same* seeds that cut. The levers, one at a time:
  1. **Overlap 56** (2.3 s of context instead of 1.6) — BACKLOG_004 › 2; one click, nothing to build. *First: no engineering, the cleanest comparison.*
  2. **The beat rewritten to stay inside the framing**: the same segment with its action kept where the last one ended (the lean toward the desk without leaving the chair's frame; the forearm to the armrest, not the desk) — the prompt-side lever the chain director would carry; the words in the Done note. *Second: plain draws, the same seeds.*
  3. **A low-cost probe of the seed**: the same request at fewer steps and/or a lower resolution (e.g. 6 steps at 768P, or 20 steps at 480P — whichever the graph allows), timed; then whether its cut/no-cut agrees with the full draw's on the same seed. If the probe predicts the full draw, a "probe then draw" story follows; if it does not, that is written down and the idea is closed. *Third: cheap to try, so it runs between the plain draws, not at the end.*
  4. **A last-frame anchor** (`MiniMaxH3AddGuide` with a frame from the source's own shot at the segment's end — the source's last frame, or the last frame of a held draw) — BACKLOG_004 › 3 / the suite's keyframe anchors; needs the adapter's graph to take an end frame (a spike script, not a product change). *Last: the most to set up, the likeliest to snag; and because it changes the inputs the model sees, its seeds are not strictly comparable — two holds on the two cutting seeds is strong, one hold could be luck (said so in the Done note).*
  Each lever gets the same seeds; each draw's `result.cuts`, seam ratio, seed, minutes and the frame strip go in the Done note's table.
- [x] **A budget the owner set** before the GPU runs: **the Spark until 08:00 EDT on 2026-09-19** (≈ 16 h from a 15:30 start, ≈ 14 full-length draws); the story stops at it and reports what it has. Each data point is **one +10 s extension of `eb90ccb2`** (the join at frame 243), never a whole chain — a chain's first segment says nothing about joins. If one lever clearly wins with ≈ 3 h left, the last draws are **one full 30 s chain with that lever**, as the confirmation.
- [x] **The answer, in one paragraph**: which lever (or which two) cut the join's failure rate, by how much, at what cost per segment; and **the follow-up tickets**: a CHORE for the chain director's wording if lever 2 held, a story for the adapter/graph if 1 or 4 did (the overlap default, or an end-frame option and its UI), a story for "probe then draw" if 3 predicts. Nothing in the product changes inside this story.
- [x] **BACKLOG_004 is updated**: remedies 2 and 3 struck through with the measurements, or left open with the numbers that say they do not help.

## Departures from the reference

- N/A — nothing of the reference's is touched; this is the model on our box.

## Technical Notes

- The experiment runs through the app's own routes where it can (`POST /api/jobs` with `continueFrom: eb90ccb2…`, `overlapFrames`, and — new for the spike only — a `seed`: the adapter already accepts `request.seed` and logs it), so every draw is a normal job in history with its shot-change measurement, its page and its Retry; the strips and seams by the scripts of STORY_053's addenda. For lever 4 (the anchor) the spike posts to ComfyUI directly with a modified graph (`spark/comfyui/h3_t2v_prompt.json` + the guide node), the way STORY_017's designed run did, and records the graph in the Done note.
- A run script under `test/` (untracked, as the rounds are) drives the matrix: prompt × lever × seed, one at a time, the poller on each, the results appended to a `run.md`.
- The probe's (lever 3's) timing is measured with its first run: if a 6-step 768P extension takes ≈ 20 min it is not a probe; a 480P run needs the grid's arithmetic checked (`lib/extend.ts`, the adapter's `grid.ts`). The levers are numbered in the order they run (the owner, 2026-09-18 14:40).

## Testing Plan

- **Unit / integration / e2e — none**: the spike changes no product code; a lever that becomes a ticket brings its tests with it. Said so, as STORY_048 did.
- **Manual verification (the Spark, in the Done note with the date, the model id, the seeds and the job ids)**: the matrix above, every draw measured by `result.cuts` and `seam-check.sh`, every strip saved under `spark/data/smoke/`; the sources' quotes with file and line; the web findings with URLs and dates.

## Estimated Complexity

Medium in reading and writing (≈ 2 h), large in GPU — every full-length draw of a +10 s extension is ≈ 67 min: three seeds × three levers is nine draws ≈ 10 h, plus probes. The budget is the owner's — **until 08:00 on 2026-09-19** (set 2026-09-18 14:25): lever 1 and lever 2 on the three known seeds (6 draws ≈ 6 h 45 min), lever 3's probes on the three seeds (short runs, timed), lever 4 on the two seeds that cut (2 draws ≈ 2 h 15 min), then more seeds on the best lever or the confirming chain with the hours left; ≈ 20 ¢ of Vertex if the rewritten prompt is asked of the director rather than written by hand.

## Done (2026-09-19 11:15 EDT)

**Model:** MiniMax-H3 FL2VA int8 (`minimax_h3_fl2va_int8_convrot.safetensors`) on the Spark's ComfyUI v0.35.1, 20 steps `res_multistep`/`simple`, 1344×768, +10 s extensions of `eb90ccb2` (243 frames; the join at frame 243) at overlap 39 unless said. **Run:** 2026-09-18 15:04 → 2026-09-19 11:08 EDT, 21 rows (16 full draws, 5 probes), `test/26-09-18-1500_cuts/` (untracked: `run.md`, `run.log`, the strips, the graphs, the edits). Every row measured by the adapter's own shot-change check (`result.cuts` for the app's draws; the `changes` node's text through the adapter's `detectCuts` for the direct ones) and `seam-check.sh`; minutes are ComfyUI's own `execution_start → execution_success`.

### The sources (read 2026-09-18 14:30–14:50 EDT)

| File (docs/references/) | Line | What it says about shots, cuts, continuation |
| --- | --- | --- |
| prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en.txt | 62 | "FL2VA generally favors a single shot so the model can interpolate continuously from the first frame to the last frame. Use multiple shots only when they are explicitly specified. The last frame must be reached by the final [Shot N] at the end of the video." |
| same | 54–55 | I2VA: the first frame "belongs to [Shot 1]"; the recommended structure "first-frame anchor → action onset → continuous development → result or reaction" |
| same | 86, 92 | timestamps are cuts: "begin each [later shot] with a strictly increasing cut time"; "For ordinary cuts, use `the camera cuts to`" |
| same | 96–108 | camera motion = type + amplitude + speed; `Static Shot` — "The camera position and lens remain still" |
| raw/model-card_MiniMaxAI_MiniMax-H3.md | 178 | the FL2VA checkpoint takes "Text; optional first frame, last frame, or both" — the last-frame anchor is a first-class input |
| comfyui/PR-15375.md | 1–18 | per-token latent noise masks: the masked-prefix continuation we run (STORY_017) |
| community/HerrgottMargott_…_README.md | 11, 58 | "Repeated Last Frames can also act as quality resets, pulling composition, identity and image quality back toward a clean reference"; 39 frames of protected context (ours) |

Nothing in MiniMax's documents states a cut rate for continuations or a way to forbid a cut; the guide's one single-shot mechanism is FL2VA's interpolation towards a supplied last frame — which is lever 4.

| Web (read 2026-09-18 14:45) | Measured vs asserted |
| --- | --- |
| github.com/NikoDemon80/ComfyUI-H3-Motion-Context | latent-copied context of 5/22/39/56 frames; **asserts** cuts come from "contradictory prompts (the model renders unions)", a missing "airlock" (a 2 s hold before new framing), prompt timing; **measures** a join correlation (0.95 latent vs 0.45 lossy) — a seam number, not a cut rate |
| github.com/HerrgottMargott/Herrgotts-H3-Infinite-Continuation-Suite | 39-frame protected context; Last Frames as "visual endpoints and quality resets"; no cut rate, no seed or step advice |
| github.com/tritant/ComfyUI_MiniMax_H3_Extender | motion context on/off, three FL2VA image guides at chosen frame indices; nothing measured |
| kat3ri/ComfyUI-MiniMax-H3-Extend, pmhaidn/ComfyUI-Minimax-H3-Extender | listed by the search, not read |

**No one online reports a measured cut rate at the join or a lever proven to lower it.** The "airlock" idea is lever 2; the last-frame anchor is lever 4 (and BACKLOG_004 › 3); overlap 56 is one of the Motion-Context node's options (lever 1); the probe (lever 3) is nowhere mentioned.

### The matrix

The same prompt (chain 2's segment 2 — `7b2636b9`'s entry, the lean to the desk) over the same source, the three seeds it had been drawn with at full quality before the experiment (2723109720 cut, 2356207568 cut, 1351805226 held):

| Lever | Seed 2723109720 (cut at baseline) | Seed 2356207568 (cut at baseline) | Seed 1351805226 (held at baseline) |
| --- | --- | --- | --- |
| 1 | cut | cut | cut |
| 2 | cut | cut | held |
| 3 | cut | cut | held |
| 4 | held | held | held |

- **Lever 1 (overlap 56)** changed nothing on the cutting seeds and **broke the seed that held**; it also costs 72.8 min a draw against 66.2 (311 frames to sample instead of 294). Closed.
- **Lever 2 (the beat rewritten to stay in the chair, 490 words, no desk)** matched the baseline exactly — the same two seeds cut, the same one held. The words are not what decides the join; the seed is. No chore for the director's wording follows from this.
- **Lever 3 (the same request at 6 steps, 22 min)** agreed with the 67-minute draw on every seed — and kept agreeing with the anchored draw (row 15 against row 12): **5 of 5 probes told the full draw's outcome** (row 19's probe against row 21 the fifth). A probe predicts; it does not prevent.
- **Lever 4 (an end frame pinned at the segment's last frame through `MiniMaxH3AddGuide`)** held the join on **every seed, 8 of 8 full draws on segment 2** — the two seeds that had cut under the baseline, overlap 56, the rewritten beat and the probe; the seed that held; and two fresh seeds — with a held draw's last frame (2 rows) and with **the source's own last frame** (6 rows; the form the app can apply by itself), with the in-frame beat and with the original "lean to the desk" beat alike (the lean plays out *inside* the shot and he settles back by the last frame). The anchored draws of different seeds come out nearly the same clip: with the end pinned, the seed stops deciding the join. Zero cost at draw time (67.2–67.4 min either way).
- **The confirming chain found the anchor's limit.** Segment 3 (a fresh seed, continuing the anchored held segment 2, its last frame pinned): the join held for 5 frames, then the model **cut away** at frame 503 to a different shot for 8 s and **cut back** at frame 701 to reach the pinned end. The anchor guarantees the two ends of a segment, not the middle; a seed that wants another framing can still insert one. The adapter flagged both cuts. The probe of a second fresh seed for the same segment held at 6 steps (23 min), and its full draw held too — **the 30 s chain with no cut in 753 frames, drawn the way the product would: pin the ends, probe the seed, draw.**

Every row, in the order it ran (2026-09-18/19; minutes on ComfyUI's clock; "held" = the adapter found no cut and the strip is one shot; `seam-check.sh`'s ratio reads FAIL on the near-still in-frame rows because the clip's largest natural change is ≈ 2.2 — the absolute change at the seam, 2.5–2.7 against 52–85 for the cuts, is the measure there):

| # | Lever | Seed | Steps | Min | Join | Seam Δ | Job / prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 · overlap 56 | 2723109720 | 20 | 73.1 | cut @243 | 84.7 | 358ce0f2 |
| 2 | 3 · probe | 2723109720 | 6 | 22.3 | cut @243 | 75.6 | 2cb75188 |
| 3 | 1 · overlap 56 | 2356207568 | 20 | 72.8 | cut @243 | 66.9 | 62b6e5fc |
| 4 | 3 · probe | 2356207568 | 6 | 22.3 | cut @243 | 77.3 | 03ca028e |
| 5 | 1 · overlap 56 | 1351805226 | 20 | 72.7 | cut @243 | 51.8 | 4cadab5e |
| 6 | 3 · probe | 1351805226 | 6 | 22.2 | held | 3.1 | ee642680 |
| 7 | 2 · in-frame beat | 2723109720 | 20 | 66.3 | cut @243 | 63.4 | 0867222b |
| 8 | 2 · in-frame beat | 2356207568 | 20 | 66.2 | cut @243 | 68.7 | 9bdf29f5 |
| 9 | 2 · in-frame beat | 1351805226 | 20 | 66.2 | held | 2.6 | 7fdc5e89 |
| 10 | 4 · held draw's last frame, original beat | 2723109720 | 20 | 67.3 | held | 2.7 | 4f66b89b |
| 11 | 4 · held draw's last frame, original beat | 2356207568 | 20 | 67.4 | held | 2.7 | b5b79e70 |
| 12 | 4′ · source's last frame, in-frame beat | 2723109720 | 20 | 67.3 | held | 2.5 | 33710ec8 |
| 13 | 4′ · source's last frame, in-frame beat | 2356207568 | 20 | 67.2 | held | 2.6 | 66ccc706 |
| 14 | 4′ · source's last frame, original beat | 2723109720 | 20 | 67.2 | held | 2.6 | 9f67936d |
| 15 | 3 × 4′ · probe, in-frame beat | 2723109720 | 6 | 22.6 | held | 4.5 | 31c7011e |
| 16 | 4′ · source's last frame, original beat | 1351805226 | 20 | 67.3 | held | 2.6 | ee3e354a |
| 17 | chain segment 3, anchored (seg 2 = row 12's clip) | 2943023845 (fresh) | 20 | 67.3 | join held; **cut @503 and @701** | 1.6 | 59cbdea7 |
| 18 | 4′ · source's last frame, original beat | 3160933460 (fresh) | 20 | 67.4 | held | 2.6 | d2a24c73 |
| 19 | 3 × chain segment 3 · probe | 1061484666 (fresh) | 6 | 22.7 | held | 1.4 | 3d1fe21d |
| 20 | 4′ · source's last frame, original beat | 1061484666 (fresh) | 20 | 67.3 | held (framing moved at 11.4 s and 15.5 s — the camera swings round him during the lean, the prompt's moving camera; no cut) | 2.6 | 3b10a94c |
| 21 | chain segment 3, anchored, the probe-held seed | 1061484666 (fresh) | 20 | 67.3 | held — **the 30 s chain, no cut in 753 frames** | 1.4 | abde68a1 |

The strips (`strip-<label>-<seed>.png`, 18 frames each) are in the run directory; the anchored ones show one shot end to end.

### The answer

**Pin the segment's end.** Of the four levers, only the end-frame anchor changed whether a join holds: 8 of 8 on segment 2 across every seed tried, including two the anchor had never seen, at no extra GPU time — where the baseline held 1 of 3, more context held 0 of 3 and the rewritten beat 1 of 3. The form the app can ship is the **source's own last frame** pinned at the new segment's last frame (BACKLOG_004 › 3), which asks each segment to return to where it began — the chain director's beats already settle that way, and a beat that must end elsewhere turns it off. **The anchor holds the ends, not the middle:** one anchored draw of nine — the chain's segment 3 — cut away and back between its pinned ends, and the adapter caught it. The **6-step probe** (22 min, a third of a draw) told the full draw's outcome 5 of 5 times, with and without the anchor — so the confident path is **anchor + probe**: pin the ends on every segment, and before the hour is spent run the seed at 6 steps and draw only a seed whose probe held all the way through. Cost per held segment: 67 min when the first probe holds (+22 min for the probe), against a 200-minute expectation through Retry chain on a prompt where a third of seeds hold. Prevention first: Retry chain stays the safety net that is not needed.

### Follow-up tickets

- **[STORY_061 — The segment ends on its first frame](STORY_061_the_segment_ends_on_its_first_frame.md)** (Proposed): the anchor in the adapter's extension graph (contract v1.5), an *End: Where it began / Anywhere* row in the extend options, carried by the chain's segments 2 and 3; the default is the owner's decision.
- **[BACKLOG_012 — A cheap probe tells a cutting seed before the hour is spent](../backlog/BACKLOG_012_a_cheap_probe_tells_a_cutting_seed_before_the_hour_is_spent.md)** — raised to High by row 17: the probe is the other half of the path. Still to measure: whether 3 steps (≈ 12 min) predict as well (`edit-probe3.py` is ready).
- **No chore for the chain director's wording:** lever 2 matched the baseline; the anchor held with the original beat.
- **A candidate chore for STORY_057's outcomes:** a cut 5 frames after the join (row 17) reads *cut inside*; for the viewer it is a join failure — widen *cut at the join* to a cut within the first second after the source's last frame.
- **BACKLOG_004 updated:** remedy 2 struck through with the numbers; remedy 3 promoted to STORY_061.

### The Spark through the night

`thermal.sh` logged every 60 s from 20:00 (909 readings by 11:10): GPU 66–84 °C at 96 % load (peak 84 °C), the hottest ACPI zone 83–93 °C against a 104.8 °C critical trip, NVMe 55–56 °C, clocks at 2.26–2.48 GHz throughout. The driver's *software* thermal limiter was active in 2 of 909 readings and its counter advanced 15.5 s over the 9.5 h from 01:44 (`throttle-counters-0145.txt`) to 11:10 (`throttle-counters-end.txt`); the *hardware* limiter never fired (counter unchanged). Three "headroom 0–1 °C" alerts (01:43, 04:34, 06:35) were one-reading glitches of nvidia-smi's T.Limit field at the sampling→decode hand-off (74 °C, 60 W, no slowdown active when checked live). `guard.sh` (the brake that freezes the matrix on an alert or five readings ≥ 86 °C) never tripped. The owner chose *continue as planned* at 06:25 when asked.

### Corrections recorded

1. The baseline's seed 2723109720 was first quoted as job `7b2636b9` from the app's history; the adapter's job for it is `71bf9699` (the app's id and the adapter's differ) — the graph read back from ComfyUI's history is the adapter's.
2. `draw.sh`'s wall-clock minutes include the probe that ran ahead of a draw (rows 3 and 5 read 94–95 min); the table uses ComfyUI's own timestamps (`minutes.py`).
3. `seam-check.sh`'s ratio rule fails the near-still in-frame rows (largest natural change ≈ 2.2); the adapter's check and the absolute seam change are the measure there, said above.
4. The story's lever 4 named "the source's last frame, or the last frame of a held draw"; both were run (rows 10–11 vs 12–18) because only the first is product-realisable.
5. `direct.sh` first picked the first `.mp4` in the prompt's outputs, which is the *source* (LoadVideo lists it); it reads the `save` node's output now — caught in the dry run against the finished baseline before any row was written.
