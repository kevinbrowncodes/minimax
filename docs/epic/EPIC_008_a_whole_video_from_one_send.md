# EPIC_008 — A whole video from one Send

**Status:** Proposed (2026-09-15 17:55 EDT) — drafted while STORY_043's chain finished, for the owner's approval; nothing of it is built. The owner, 2026-09-15: "I would like to do something similar [to the three-script chain] but through the UI where I attach the starting frame and then have you extend the video after 10 seconds"; "Ideally I would like to be able to paste 1 starting frame and however many scripts and hit send" — "i might send 6 scripts for instance and that would result in 1 minute length of video".
**Started:** —

## Goal

The owner attaches one starting image, pastes the scene and every script he has, presses Send once, and finds the whole video in the morning — six scripts, about a minute, generated as a chain of segments that each continue the one before, unattended. Two things stand between today and that, and they are the two stories: the composer sends one request, and the Spark refuses to extend a clip longer than 30 s.

## What exists today (read from the code, 2026-09-15 — not from memory)

- **The chain is real and unattended, three Sends at a time.** STORY_043 (Done 17:38 EDT) proved it on the Spark: an extension queued against a running clip waited in the line and was submitted the same second the clip finished, under the adapter's own job id, and finished — 38 min 52 s from the first Send to a 9.4 s video with nobody at the keyboard. Each further segment is one more Send from the previous task page's Extend or the Scheduled row's Queue an extension.
- **The composer sends one request** (`lib/submit-job.ts` › `buildJobRequest`, `Composer.tsx` › `send()`); the owner's scripts each open with a `[0:00-` line that the adapter already translates (`prompt.ts` › `bodyOf`), and the scene paragraph has none — a paste of scene + N scripts splits on that convention with no delimiter to invent.
- **The 30 s cap is memory, and the memory is the join.** The extension graph decodes the whole source into the graph to take its last 1.6 s and to join it with the new frames (`mapping.ts`: `GetVideoComponents` → `ImageBatch` → `SaveVideo`), at ≈ 12.4 MB a frame held three times over: 87.8–88.7 GiB for +10 s on a 10 s source, 96.7 GiB on 20.75 s (README › Running the Model), past the box's 121 GiB on a 63 s source. The model itself needs only the 39-frame tail; the generation is a fresh-clip-sized peak. The adapter already has ffmpeg (STORY_034) and its own writable volume; ComfyUI's output is read-only to it.
- **A gap between two finished stories**, found while reading the Edit path for STORY_044: Scheduled › Edit of a waiting extension drops its source (BUG_008). A chain's segments are exactly those rows.

## Time

| | |
| --- | --- |
| **Estimate to completion** (the three tickets below, once approved) | ≈ 4 h 15 min of build and gates — BUG_008 ≈ 30 min (a field carried through three places, the gate), STORY_044 ≈ 90 min (a pure chain module, the strip, the sequenced Send, the failure path, a title rule, a two-width e2e), STORY_045 ≈ 2 h 20 min (the graph reshaped, an ffmpeg module, the adapter's lookups and tests, the adapter rebuilt on the Spark between jobs) — plus the GPU: ≈ 65 min for STORY_044's same-day chain (three 5 s segments), ≈ 75 min for STORY_045's refused-today case (+10 s on the 31.4 s clip), and **≈ 6 h 25 min for the owner's six-script minute**, which runs unattended and is the epic's proof |
| **Basis** | today's measured pace from the commit log: EPIC_007's five tickets landed between 12:57 and 17:38 EDT — the Large STORY_041 ≈ 55 min of build over two stages, the Medium STORY_043 24 min, the Small STORY_042 and BUG_007 ≈ 20–40 min each, every gate run ≈ 7 min; the GPU times from the README's measured table (5 s ≈ 17 min, 10 s from an image ≈ 50 min, +10 s ≈ 67–71 min, +4 s on 5 s 21.5 min). STORY_045 is counted at the Large rate plus an hour for the Spark-side unknowns (the tail cut's exactness, the stream-copy seam) |
| **Estimated completion** | **If approved this evening (by ≈ 18:15 EDT, 2026-09-15) and the Spark stays free:** BUG_008 landed ≈ 18:50; STORY_044 built and deployed ≈ 20:30, its 3 × 5 s chain done ≈ 21:40 — the owner's three-script chain can then run overnight as its second verification (≈ 3 h, done ≈ 01:00). STORY_045 on **2026-09-16**: built and deployed ≈ 11:00 EDT, the 31 s clip extended ≈ 12:30, the six-script minute started ≈ 12:45 and finished **≈ 19:15 EDT, 2026-09-16** — the epic's close. Every hour the approval or the GPU slips moves the close by an hour; the minute needs the box mostly to itself for the six hours it runs |
| **Actual completion** | — |

## Stories (in implementation order)

| # | Ticket | Status | Estimate | Started | Estimated done | Actual done |
| --- | --- | --- | --- | --- | --- | --- |
| — | [BUG_008 — Editing a waiting extension turns it into a fresh clip](../bug/BUG_008_editing_a_waiting_extension_turns_it_into_a_fresh_clip.md): `InitialRequest` carries `continueFrom` / `overlapFrames`, the composer reopens in extend mode, `replaces` keeps the source and history in step. First, so that Edit on a chain's segment is safe | Open | ≈ 30 min | — | ≈ 18:50 EDT if approved by 18:15 | — |
| 044 | [One starting frame and any number of scripts go out in one Send](../story/STORY_044_one_starting_frame_and_any_number_of_scripts_go_out_in_one_send.md): the text splits at every `[0:00-` line, the scene before the first goes with every segment, the strip under the box shows the segments and the length in all, **Send all** posts them one after another (each an extension of the one just answered — STORY_043 queues them), the last segment's task page is the whole video's; the cap read from the capabilities greys what would not run; titles from the first timestamped line. Works to three 10 s segments today, to six once 045 lands | Proposed | ≈ 90 min + ≈ 65 min GPU (+ ≈ 3 h overnight, the owner's chain) | — | ≈ 20:30 EDT built; ≈ 21:40 verified | — |
| 045 | [A video can be extended past 30 seconds because the join happens outside the graph](../story/STORY_045_a_video_can_be_extended_past_30_seconds_because_the_join_happens_outside_the_graph.md): the adapter cuts the source's tail with ffmpeg and uploads only that; the graph saves only the new part; the adapter joins source + segment with ffmpeg into its own volume; the seam still measured (offset); `maxSourceSeconds` 30 → 120; the memory split re-derived from the measurement | Proposed | ≈ 2 h 20 min + ≈ 75 min GPU + ≈ 6 h 25 min the minute | — | 2026-09-16 ≈ 11:00 EDT built; ≈ 19:15 the minute done | — |

The order is a recommendation: 044 first because it is usable at once (three segments) and carries no GPU risk, 045 second because it needs the adapter rebuilt on the Spark and a night of GPU to prove. The owner may swap them — then 045's verification (a) runs first and 044's verification is the minute itself.

## Rules that apply on the Spark

- **One generation at a time; the chain is the queue's** (EPIC_007's rules stand: the runner submits, never reconfigures; the line survives a restart; a queued job is an ordinary job afterwards).
- **The adapter is rebuilt only between jobs** (`/health` › `openJobs 0`), the peer session `minimax-db` told before and after; ComfyUI is never restarted by the app.
- **The memory split is re-derived before it is tried** (CLAUDE.md § 4a): STORY_045's Done note records the measured peak of an extension on the longest source it extended, and the README's split changes only from that measurement.
- **Weights, outputs and the joined clips stay on the Spark's disk**, gitignored; the joined directory is the adapter's own volume beside `watermarked/`.

## Not in this epic

- **A chain as one row and one task page** (a "6 segments · 63 s" card with the segments inside): the segments are separate tasks (STORY_043's rows) and the last one's page is the whole video; a grouped view is a later candidate if the owner asks once he has used it.
- **A script file import** ("upload script1.txt … script6.txt"): the paste is the owner's own description of the feature; a file picker is the same split behind a button — later, if wanted.
- **A different image per segment**, or a last-frame anchor per segment (BACKLOG_004): the chain continues the footage, not a new picture.
- **Re-running one segment in the middle of a finished chain** (a new seed for segment 3 with 4–6 regenerated after it): each segment's task page has Retry today; re-chaining behind it is a later story.
- **Text chat, other modalities** — unchanged since EPIC_006.

## Testing stance

The gate stays model-free (CLAUDE.md § 4a): STORY_044 is proven against the stub at both widths (three POSTs in order, the rows waiting and going, the last page holding the result), and its arithmetic in unit tests that share `lib/extend.ts` with the tile; STORY_045 is proven in the adapter's own unit tests (the graph shape, the ffmpeg arguments, the offset, the two directories) with the ffmpeg calls injectable as the watermark's are. The real thing is two manual verifications recorded in the Done notes with the date, the model and the checkpoint: +10 s on a clip the adapter refuses today, and the owner's six-script minute through one Send.

## Working rules carried over

One ticket at a time, landed, deployed and verified before the next; the story is the spec; explicit paths staged; the pre-push hook is the gate and never runs beside a hand gate (EPIC_007's lesson: two gates on one box collide on the e2e port); every claim about the Spark verified that session; the owner's `01.jpg` and `minimax.code-workspace` are never committed.
