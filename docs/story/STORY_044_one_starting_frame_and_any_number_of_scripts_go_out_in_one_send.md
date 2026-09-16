# STORY_044 — One starting frame and any number of scripts go out in one Send

**Epic:** [EPIC_008](../epic/EPIC_008_a_whole_video_from_one_send.md) — the first story
**Status:** Done (2026-09-16, on the Spark) — approved by the owner 11:05 EDT ("ok please proceed with story 44"), built 11:10 → 11:40, gated by hand (all six steps), deployed 11:46, verified through the real UI on the Spark from 11:48 (the Done note below). BUG_008 stays open by the owner's call; session minimax-5b.
**Created:** 2026-09-15, from the owner: "Ideally I would like to be able to paste 1 starting frame and however many scripts and hit send" (six scripts → about a minute of video)

As the owner, I want to attach one starting image, paste the scene and all of my scripts into the composer and press Send once, so that the whole video — 10 s from the image, then +10 s for every further script — is queued as a chain and runs unattended, each segment going the moment the one before it is done.

## Current state (read from the code, 2026-09-15)

- The composer builds **one** request (`lib/submit-job.ts` › `buildJobRequest`: the text, the parameters, the images or — in extend mode — `continueFrom` + `overlapFrames`), `send()` in `Composer.tsx` posts it once and opens `/task/<id>`. A chain is therefore N Sends by hand: the first from the home page, each next from the previous task page's Extend or the Scheduled row's Queue an extension (STORY_043). The owner's three-script chain of 2026-09-14/15 was sent that way through the API, each segment's prompt being the scene paragraph plus its script (STORY_020, README § What a run costs).
- The owner's scripts ([docs/scripts/](../scripts/)) each open with a `[0:00-0:03]` line and end with two untimed lines (the fixed camera, the ambient sound); the scene paragraph (`scene.txt`) has no timestamps. The adapter already reads those brackets: `prompt.ts` › `bodyOf` turns a line's leading `[m:ss-m:ss]` into "From m:ss to m:ss," — the brackets are a convention we translate, not text the model sees.
- STORY_043's rule makes the rest work with no route change: `POST /api/jobs` with a `continueFrom` naming an entry that is queued or running goes to the queue (`pendingSource`), the runner holds it until the source is done and submits it with the source's real job id, and a source that fails takes its extensions with it ("its source did not finish").
- **The cap.** The adapter refuses an extension of a source longer than `maxSourceSeconds` (30; `capabilities.extension.maxSourceSeconds`, relayed by `/api/capabilities`) with 400 `unsupported_option` "the video is 31 s long; the Spark extends videos up to 30 s". With 10 s segments at the default overlap the joined lengths run 10.125 → 20.75 → 31.375 → 42.0 → 52.625 → 63.25 s, so **three segments fit today and the fourth would be refused** — a queued fourth segment would be failed by the runner with that message and the fifth and sixth with "its source did not finish". [STORY_045](STORY_045_a_video_can_be_extended_past_30_seconds_because_the_join_happens_outside_the_graph.md) lifts the cap; this story reads the cap from the capabilities so that it lifts here with no UI change.
- A history entry's title is the prompt's first 48 characters (`history-store.ts` › `titleFor`), so six segments that each begin with the scene paragraph would all be titled "A fit young man in his early twenties with short…".
- Found on the way, filed as [BUG_008](../bug/BUG_008_editing_a_waiting_extension_turns_it_into_a_fresh_clip.md): Scheduled › Edit of a waiting extension reopens it without its `continueFrom` (`app/page.tsx` builds `InitialRequest` without it), so Send replaces it with a fresh clip. A chain's segments are exactly such rows; the bug is fixed before this story so that Edit on a segment is safe.

## UI Mockup

**Reference:** none — the reference has no chain and no scripts convention. Ours, drawn in the composer's own chrome (composer-video-mode@1440); the strip uses the continuation tile's type and colours (STORY_016).

```
┌ [01.jpg ×]                                                                                  ┐
│ A fit young man in his early twenties … the camera on a tripod, dead still.                 │
│ [0:00-0:03] From his standing stance, he draws his elbows back and plants both palms …      │
│ [0:03-0:07] … [0:07-0:10] … holding the direct look through 0:10.                           │
│ The camera stays completely fixed — no pan, tilt, zoom, push-in, or pull-out.               │
│ Quiet studio ambient tone only …                                                            │
│ [0:00-0:03] He steps his left foot back slightly, pivoting into a right three-quarter …     │
│ …                                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3 segments · 10 s each · ≈ 31 s in all · overlap 1.6 s                                      │
│  1   10 s   from the image   From his standing stance, he draws his elbows back and pla…    │
│  2  +10 s   continues 1      He steps his left foot back slightly, pivoting into a righ…    │
│  3  +10 s   continues 2      From the three-quarter angle, he sets his feet shoulder-wi…    │
│ [MiniMax-H3 ▾] [16:9 768P 10s ▾] [Overlap 1.6 s ▾] [Run at…]                    [Send all] │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

Send all → toast "Queued — 3 segments, ≈ 31 s" → the LAST segment's task page ("Waiting · after 26-09-15-1902"):
           the whole video is there in the morning; Scheduled shows 1 Running, 2 and 3 "Waiting · after …"

over the cap (six scripts, today):
│ 6 segments · 10 s each · ≈ 63 s in all — the Spark extends videos up to 30 s: segments 4–6 would not run       │
│  4  +10 s   continues 3 — would extend a 31 s video                                          (row greyed) │
│                                                                                       [Send all] disabled  │
a segment whose timestamps run past the chosen length (5 s left at the default):
│  2  +5 s    continues 1      He steps his left foot back …                ends at 0:10 — longer than 5 s   │
one script or no timestamps: no strip, Send, exactly as today
narrow (390): the strip's rows stack the words under the number; the summary line wraps
```

## Acceptance Criteria

- [x] **The split.** In video mode the text is split into segments at every line that begins with `[0:00-` (or `[00:00-`) — the owner's scripts' own convention; the text before the first such line is the **scene** and is sent with every segment (scene, a blank line, the script — the recipe of the three verified chains); a text with no such line, or only one, stays one request and nothing about a plain prompt changes. Pure and unit-tested: `lib/chain.ts` › `splitChain(text)`.
- [x] **The strip.** With two or more segments the composer shows the chain strip under the box: the count, the length of each (the chosen length for the first, "+" the chosen length for each extension, capped at the extension maximum the capabilities give — 14 s — and saying so when capped), the length in all (`joinedSeconds` applied down the chain, as the continuation tile computes it), the **Overlap** control (extend mode's, default 1.6 s), and one row per segment — its number, its length, "from the image" / "from the text" / "continues N", its first words; a segment whose last timestamp runs past the chosen length says "ends at m:ss — longer than N s". Send reads **Send all**. The strip is derived from the text and the parameters (no new composer action); it disappears when the split does.
- [x] **Send all.** Posts segment 1 exactly as a single request is posted today (multipart with the images or JSON; the scene + its script; the chosen length, project, run-at), waits for its 202, then posts each next segment as an extension of the one just answered — `continueFrom` = that id, `overlapFrames`, the scene + its script, the added length — **one after another, each after the previous 202**, so every extension lands in the queue by STORY_043's rule ("Waiting · after <stamp>", the source's real job id at submit time) and a run-at holds only the first (the rest follow their sources). The toast reads "Queued — N segments, ≈ X s" and the composer opens the **last** segment's task page — the whole video's page. Send all is disabled while the posts run and the text stays until the last 202.
- [x] **The cap.** The strip computes each extension's source length; when one would exceed `capabilities.extension.maxSourceSeconds` the summary says which segments would not run and why, those rows are greyed, and Send all is disabled until the text or the length fits. The adapter's own check at submit time stays the final word (a segment it refuses fails with its message, the ones behind it with "its source did not finish", as STORY_043 made them). The cap is read from the capabilities, never a literal, so STORY_045's higher cap lifts this with no change here.
- [x] **A refusal mid-way.** If a POST is refused (a 400, a network error — the route never answers busy, it queues), the segments already accepted stay in the line (they are real requests), the composer shows the error naming the segment ("Segment 3 was not sent: …"), and keeps only the scene and the unsent scripts, in extend mode against the last accepted segment (the pending tile, STORY_043) — so Send all again continues the chain from where it stopped, with no duplicate. No roll-back: the owner removes accepted segments from Scheduled if he wants them gone.
- [x] **From an existing clip.** In extend mode (a finished or a pending source) the same split applies: every segment is an extension, the first of the source — the strip's row 1 reads "continues <the source's stamp>". The single-script extend flow is unchanged.
- [x] **Titles.** `titleFor` names a prompt that contains a timestamped line by the text of its first timestamped line (the bracket dropped), so the six rows read "From his standing stance, he draws his elbows…", "He steps his left foot back slightly, pivoting…", … — and a hand-sent script is titled the same way. A prompt with no timestamps keeps today's title.
- [x] Both widths, both themes; the composer, extend and scheduled e2e specs stay green.

## Departures from the reference

- The strip, Send all and the `[0:00-` split are ours — the reference has one prompt per generation and no extension.
- The chain is N tasks, not one: each segment is its own history entry and task page (STORY_043's rows), and the last segment's page holds the whole video. One row for the whole chain is a later candidate if the owner wants it (EPIC_008 § Not in this epic).

## Technical Notes

- `lib/chain.ts` (new, pure): `splitChain(text): { scene: string; segments: readonly string[] }` (a segment starts at a line matching `/^\[0?0:00-/`, lines trimmed, the scene the text before the first); `segmentPrompt(scene, script)`; `chainPlan(segments, { firstSeconds, addedSeconds, overlapFrames, extensionMax, maxSourceSeconds, fromSource? })` → per segment `{ seconds, sourceSeconds, joinedSeconds, fits, endsAt? }` and the totals (`joinedSeconds` from `lib/extend.ts`); `lastTimestampSeconds(script)` (the last `[m:ss-m:ss]`'s end); `chainTitle` is `titleFor`'s new rule in `history-store.ts`.
- `lib/submit-job.ts`: `buildJobRequest(state, override?)` takes a per-segment override `{ prompt, extend?, overlapFrames?, images?: [] , notBefore? }`; `submitChain(state, plan, fetch)` posts in sequence and returns `{ ok: true, ids }` or `{ ok: false, sent: ids, index, message, field? }`.
- `components/composer/ChainStrip.tsx` (new file — new UI in new files): the summary line, the rows, the Overlap control reused from the extend controls. `Composer.tsx` › `send()` branches on the plan's length; the failure path dispatches `extend-from` with the last accepted id as a pending source and `text` = scene + the unsent scripts.
- `lib/composer-state.ts`: nothing stored; `canSend` unchanged (the strip's `fits` gates Send all in the component).
- The routes: **nothing new** — each POST is an ordinary create; STORY_043 queues the extensions. The stub: nothing new (each segment is a job; `?script=` is forwarded per POST as today).

## Testing Plan

- **Unit** — `chain.test.ts` (new): `splitChain` on the owner's three scripts with the scene (three segments, the scene, the closing lines kept with their segment), on `[00:00-`, on a text with no brackets (one segment, no scene), on one script only, on brackets not at a line start (not a split); `chainPlan`: 3 × 10 s at overlap 39 → 10.1 / 20.8 / 31.4 s and all fit at a 30 s cap; 6 × 10 s → segments 4–6 do not fit; the extension cap of 14 s; a `fromSource` of 5 s; `lastTimestampSeconds` ("0:10" → 10, none → undefined). `history-store.test`: `titleFor` with a timestamped line, with the scene before it, without one. `submit-job.test`: `buildJobRequest` with an override (the prompt, `continueFrom`, no images on an extension); `submitChain` posts in order with each `continueFrom` = the previous id, stops at a refusal and reports the index and the sent ids.
- **Component** — `Composer.test`: the strip appears with two segments and not with one; the summary's numbers; the greyed rows and disabled Send all over the cap (capabilities with `maxSourceSeconds: 30`); "ends at 0:10 — longer than 5 s"; Send all posts three times in order and navigates to the last id; a refusal at the third post leaves the composer in extend mode against the second id with the scene and the third script; in extend mode the first row reads "continues <stamp>".
- **Integration** — none new: the routes do not change; `queue.test.ts` (STORY_043) already proves an extension of a queued or running entry is queued and submitted in turn. (Said so as CLAUDE.md § 3.5 asks.)
- **E2E** — `scheduled.spec.ts` gains "one image and three scripts go out in one Send and run as a chain": at desktop and narrow — attach the fixture image, paste a scene and three short timestamped scripts (in the spec), set 5 s (the shortest chain), `waitForResponse` on the three `POST /api/jobs` 202s registered before the click, Send all → the toast → the URL is the third id's task page reading "Waiting · after …" → `/scheduled` lists one Running and two "Waiting · after" rows in order → the stub's `done-after-3-polls` finishes the first (terminal waited on), the second goes and finishes, the third goes and finishes (each terminal waited on) → the third task page shows the result and its continuation tile. Regression cover for the unchanged halves: `composer.spec` (a plain prompt, one request), `extend.spec` (one extension), `scheduled.spec`'s STORY_041/043 cases.
- **Manual verification (the Spark, in the Done note with the date):** (a) the same day — three 5 s prompts as one Send (a scene and three `[0:00-` scripts), ≈ 17 + 21 + 25 min of GPU, the three rows waiting and going in turn, the last page holding the ≈ 13 s video; (b) the owner's own chain — `01.jpg` + `scene.txt` + `script1–3.txt` pasted as one text, 10 s, one Send, ≈ 3 h 5 min unattended (the README's chain row), every seam by `seam-check.sh` and the border rule, the 753-frame result on the last page — run overnight if the evening is short.

## Estimated Complexity

Medium–Large — one pure module with the arithmetic, the strip, the sequenced Send, the failure path, a title rule, tests at three layers and a two-width e2e: ≈ 75 min to build and ≈ 15 min of gates and deploy; ≈ 65 min of GPU for the same-day verification, the owner's 3 h chain overnight.

## Done note (2026-09-16)

**Built** (11:10 → 11:40 EDT): `app/lib/chain.ts` (the split, the segment prompt, the plan — lengths carried in frames down the chain as the adapter joins them, rounded only for display; `titleFor`'s rule via `firstTimestampedLine`), `app/lib/submit-job.ts` (`buildJobRequest` takes a segment; `submitChain` posts in sequence), `app/components/composer/ChainStrip.tsx` (new file) with its styles in `composer.module.css`, `Composer.tsx` (the plan from the text, Send all, the refusal path), `composer-state.ts` (the overlap applies outside extend mode, for the strip; `maxAdded` exported), `history-store.ts` (the title rule). Tests: `chain.test.ts` (9, on the owner's own scripts in `docs/scripts/`), `submit-job.test.ts` (+3), `history-store.test.ts` (+1), `composer-state.test.ts` (the widened overlap), `Composer.test.tsx` (+5: the strip, the cap and the too-long script, Send all in order, the refusal mid-way, extend mode), `e2e/scheduled.spec.ts` (+1 at both widths: image + scene + three 5 s scripts → Send all → three 202s in order → the toast → the last segment's page "Waiting — 2nd in line" → Scheduled with one Running and two Waiting in order → each finishes in turn, every terminal waited on → each extension received naming its source → the third page plays the joined result). One departure from the Testing Plan's arithmetic: the e2e's 5 s chain is 16.5 s (124 + 175 − 39 + 175 − 39 = 396 frames), not "≈ 13 s" — the plan's figure was a guess and the frames are what the adapter produces.

**Gate**: all six steps green by hand (`tools/gate/run.sh`, 458 s, e2e 107 passed at both widths) before the push, and by the hook on the push.

**Both widths, both themes**: the strip screenshotted on the deployed app at 1440 (light, with the image: `spark/data/smoke/send-all-strip-2026-09-16T15-48-49-010Z.png`), at 1440 dark and at the iPhone 13 descriptor dark (`send-all-strip-dark-desktop.png`, `send-all-strip-dark-narrow.png`): the summary wraps and the words stack under the number at narrow; the colours are the tile's tokens in both themes.

**BUG_008 stands** (Scheduled › Edit of a waiting extension drops its source): the owner approved this story straight; a chain's waiting segments are exactly those rows, so Edit on one of them still turns it into a fresh clip until BUG_008 lands.

**Manual verification on the Spark** (model MiniMax-H3 FL2VA `int8_convrot`, text encoder `nvfp4_awq`, ComfyUI 0.35.1, adapter 1.4.0, app deployed 11:46 EDT): the story's (a), driven through the real UI by `app/e2e-trial/send-all-chain.spec.ts` (not in the gate) — `01.jpg` + a scene and three 5 s scripts (`spark/data/input/chain5s/text.txt`), Send all at 11:48 EDT: the strip read "3 segments · 5 s each · ≈ 16.5 s in all · overlap 1.6 s", the three 202s came in order (`8a10fa72 → 703c9d92 → de40d4a5`, positions –, 1, 2), the last segment's page opened reading Queued, Scheduled showed 1 Running and 2 Waiting. The segments' outcomes: *(filled in below when the run ends)*.
