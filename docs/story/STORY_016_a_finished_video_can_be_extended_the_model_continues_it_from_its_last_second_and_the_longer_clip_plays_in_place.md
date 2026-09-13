# STORY_016 — A finished video can be extended: the model continues it from its last second, and the longer clip plays in place

**Epic:** [EPIC_003](../epic/EPIC_003_the_video_generation_screen_is_rebuilt_to_match_the_reference.md) (UI) — the adapter half extends EPIC_004's STORY_006
**Status:** Drafted (2026-09-13) — awaiting the owner's approval
**Created:** 2026-09-13 · promoted from [BACKLOG_001](../backlog/BACKLOG_001_a_finished_video_can_be_extended_from_where_it_ends.md)

As the owner, I want an **Extend** action on a finished video that lets me describe what happens next and choose how many seconds to add, so that the Spark continues the clip from its last second — motion and sound unbroken — and the longer video plays, downloads and appears in Assets like any other, so that a piece can grow past what one run makes in the time I am willing to wait.

## Current state

The task page's result card offers Download and Copy prompt (STORY_014). The composer starts a new job from a prompt and up to two reference images (STORY_013). The adapter builds one graph, `MiniMaxH3ImageToVideo` with optional first/last frame (STORY_006). Nothing loads a finished video back into a generation. The owner's first real clip (10 s, 2026-09-12) is the one he asked to extend.

**Read 2026-09-13, in [docs/references/](../references/README.md):** MiniMax's own API has no extension — 15 s is the most one task makes ([minimax-api_video-generation.md](../references/api-reference/minimax-api_video-generation.md)). ComfyUI's H3 nodes do: `MiniMaxH3AddGuide` anchors "a clip … cropped to the model's valid clip lengths: 5, 22, 39… frames" at any frame, and its documentation gives the recipe verbatim — *"feed the first 22 frames of an existing video plus its audio into a `MiniMaxH3AddGuide` at frame 0, and the model generates the continuation of both streams"* ([minimax-h3-native.md](../references/comfy-docs/minimax-h3-native.md), PR [#15439](../references/comfyui/PR-15439.md)). A community workflow attached to PR #15375 chains such segments "for unlimited length videos" with a 22-frame overlap that is cut at the join ([PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json](../references/comfyui/examples/PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json)). Every node the graph needs is in our ComfyUI image (v0.35.1, commit 856a922; checked by name 2026-09-13), and `LoadVideo` reads a file from ComfyUI's output directory when the name ends in ` [output]` (`folder_paths.annotated_filepath`), so the finished clip needs no upload.

## UI Mockup

**Reference capture: none shows an Extend.** Re-opened 2026-09-13: [video-params-open@1440](../recon/2026-09-12/video-params-open@1440.png) has three radio groups and nothing else; [assets-video-preview-hover@1440](../recon/2026-09-12/assets-video-preview-hover@1440.png) has download, open-in-new and close. The two places such an action would live were never captured: the Assets tile's kebab ("click timed out once; fixed, not re-run" — [inventory.md](../recon/2026-09-12/inventory.md)) and a finished job in the thread (the agent never posted one — [interactions.md §4](../recon/2026-09-12/interactions.md)). MiniMax's API offers no extension either. **So Extend is a Departure: an improvement the owner asked for (2026-09-13), designed here.** The owner was asked for screenshots of those two places the same day; if they show an Extend on the reference before implementation starts, this section is rewritten against them and the story says so.

The surfaces it attaches to are captured and their tokens reused: the task page's result-card actions row (STORY_014: 14 px links, the time at the end), the docked composer ([task-submitted@1440](../recon/2026-09-12/task-submitted@1440.png)), the composer's 90×90 tiles with 12 px radius on `rgb(245,245,245)` (STORY_013), and the Assets tile kebab ([assets-video-tile-hover@1440](../recon/2026-09-12/assets-video-tile-hover@1440.png)).

```
done — the result card gains Extend (desktop)
│ ◉ Your video is ready                                        │
│ ┌────────────────────────────────────────────┐              │
│ │ ▶  <video controls poster=…>              │              │
│ └────────────────────────────────────────────┘              │
│ 10.1 s · 1344×768 · 2.2 MB                                   │
│ ⤓ Download   ⧉ Copy prompt   ⤴ Extend          08:33 PM     │
│                                                              │
after ⤴ Extend — the docked composer is in extend mode          the parameters popover, extend mode
│ ┌ composer (docked) ───────────────────────────┐            │ ┌ Video parameters ───────────────┐
│ │ ┌────────┐                                   │            │ │ Ratio                            │
│ │ │ poster │ Continues · 10.1 s            (×) │            │ │ [21:9][●16:9][4:3][1:1][3:4][9:16]│  ← all disabled,
│ │ └────────┘                                   │            │ │  fixed by the video being extended│    source's checked
│ │ Describe what happens next…                  │            │ │ Resolution                       │
│ │                                              │            │ │ [●768P][2K — not on the Spark]   │  ← disabled
│ │ + Agent Team  (◎ MiniMax-H3)  (▭16:9 768P +5s) (↑)│        │ │ Duration (added)                 │
│ └──────────────────────────────────────────────┘            │ │ [+4s][●+5s][+6s] … [+14s]        │
│      MiniMax Local generates on your Spark                   │ └──────────────────────────────────┘
   no "+ Reference" tile while extending; (×) = "Stop extending" restores the normal composer

the new task page (after Send)                                 Assets — the tile's kebab
│ ┌────────────────────────────────────────────┐              │ ┌ Actions for job-2bc6….mp4 ─┐
│ │ @video-creator He lowers his arms and …    │              │ │ Open task                  │
│ │ Continues [0:00-0:03] From his standing st… · 10.1 s │    │ │ Extend                     │  ← new, → /task/<id>?extend
│ └────────────────────────────────────────────┘              │ │ Download                   │
│ ◉ Queued… → Generating… 37 % → Your video is ready           │ │ Delete from history        │
│ ┌────────────────────────────────────────────┐              │ └────────────────────────────┘
│ │ ▶  the joined clip: 15.8 s                 │
│ └────────────────────────────────────────────┘
│ 15.8 s · 1344×768 · 3.6 MB
│ ⤓ Download   ⧉ Copy prompt   ⤴ Extend          09:10 PM     ← an extension can be extended again
failed: │ ⓘ Request failed — <message>  [Retry] │  Retry re-posts the same extension (continueFrom kept)
```

Narrow (390): the continuation tile keeps its 90×90 poster with the caption below it, × is a 44 px target; the duration group wraps onto two rows; everything else as STORY_013/014 at 390.

## Acceptance Criteria

**Contract — [docs/contracts/job-api.md](../contracts/job-api.md) v1.1 (both servers):**

- [ ] `POST /jobs` accepts an optional `continueFrom: <jobId>`. With it, the job is an **extension** of that job: `durationSeconds` is the number of seconds **added**, `ratio`, `resolution` and `model` must equal the source's, and no `referenceImage` part may be sent. `GET /jobs/:id` echoes `request.continueFrom`. The result is the **joined** video (source followed by the continuation), and `result.durationSeconds` is the joined length.
- [ ] `GET /capabilities` gains `extension: { durationsSeconds: { min: 4, max: 14, step: 1 }, maxSourceSeconds: 30 }`.
- [ ] Errors: `continueFrom` that is not a `done` job of this server, or whose output file is gone → `400 validation` (field `continueFrom`); a source longer than `maxSourceSeconds` → `400 unsupported_option` (field `continueFrom`); `durationSeconds` outside `extension.durationsSeconds` → `400 unsupported_option` (field `durationSeconds`); a differing `ratio`/`resolution`/`model` → `400 validation` (that field); a reference image → `400 validation` (field `referenceImage`).

**Adapter (`spark/adapter/`):**

- [ ] The graph for an extension (`buildGraph` with a continuation) adds: `LoadVideo` reading the source's own output file as `"<subfolder>/<filename> [output]"`; `GetVideoComponents`; the guide = the source's **last 22 frames** (`ImageFromBatch`, `batch_index = sourceFrames − 22`, `length = 22`) and the source's **last 22⁄24 s of audio** (`TrimAudioDuration`, `start_index = sourceSeconds − 22⁄24`, `duration = 22⁄24`) into `MiniMaxH3AddGuide` (`positive` ← `cond`, `latent` ← `cond`'s latent, `vae` and `audio_vae` wired, `frame_idx = 0`), whose output feeds the `BasicGuider`; `cond` has no `first_frame`/`last_frame` and `length = segment`; the join = source frames followed by the segment **from frame 22 on** (`ImageFromBatch` `batch_index = 22`, `length = segment − 22`) via `ImageBatch`, and source audio followed by the segment's audio **from 22⁄24 s on** (`TrimAudioDuration`) via `AudioConcat` (`after`), into the existing `CreateVideo` → `SaveVideo`; the poster is frame 0 of the joined clip. `REQUIRED_CLASSES` gains `LoadVideo`, `GetVideoComponents`, `MiniMaxH3AddGuide`, `ImageBatch`, `TrimAudioDuration`, `AudioConcat`.
- [ ] **Segment length** = `lengthForSeconds(added + 22⁄24)`: at least the requested seconds are new after the 22 overlapping frames are cut, snapped up to the model's 17k+5 grid. New frames per request: +4 s → 124 − 22 = 102 (4.25 s); +5 s → 158 − 22 = 136 (5.67 s); +10 s → 277 − 22 = 255 (10.6 s); +14 s → 362 − 22 = 340 (14.2 s, the model's trained ceiling of 362 frames — the reason `max` is 14).
- [ ] The job record stores `result.frames`; a joined result has `frames = sourceFrames + segment − 22` and `durationSeconds = frames ⁄ 24`. A source recorded before this story (no `frames`) counts as `lengthForSeconds(request.durationSeconds)`, which is exact because no such record is an extension.
- [ ] Extending an extension works (the source's `result.frames` is what is read), up to `maxSourceSeconds`.

**Stub (`tools/stub-generation-server/`):**

- [ ] Mirrors the contract: validates `continueFrom` against its own jobs (must exist and be `done` under its script), the matching-parameters rule, the extension duration range and the no-upload rule; echoes `request.continueFrom` in status and in `/__stub/jobs/:id/received`; serves the fixture as the result as for any job; `capabilities.extension` present. The README documents it.

**UI — composer (`components/composer/Composer.tsx`, `lib/composer-state.ts`, `lib/submit-job.ts`):**

- [ ] The composer has an **extend mode** entered with a source `{ id, title, durationSeconds, ratio, resolution, model, posterUrl }`: the tile row shows one **continuation tile** (the source's poster, caption "Continues · 10.1 s", a × labelled "Stop extending") and no "+ Reference" tile; dropping files does nothing; the model pill is disabled; in the parameters popover the Ratio and Resolution groups are disabled with the source's values checked and the note "fixed by the video being extended"; the Duration group lists `capabilities.extension.durationsSeconds` as `+Ns` and the pill reads e.g. `16:9 768P +5s`; the textarea placeholder is "Describe what happens next…".
- [ ] Send in extend mode posts JSON `{ prompt, ratio, resolution, durationSeconds, model, continueFrom }` to `/api/jobs` and navigates to the new task; a 4xx shows the server's message as today. × restores the normal composer (mode, images, defaults).

**UI — task page, history, Assets:**

- [ ] A `done` result card shows **⤴ Extend** after Copy prompt; clicking it puts the docked composer in extend mode for this entry and focuses the textarea. Opening `/task/:id?extend` for a `done` entry does the same on load.
- [ ] `POST /api/jobs` records `continuesFrom: { id, title }` in the history entry (the source's title from history, or its id when the source is no longer in history); the bubble of such an entry shows "Continues *<source title>* · 10.1 s" linking to `/task/<source id>`; the result card's summary shows the joined duration; Retry of a failed extension re-posts `continueFrom`.
- [ ] Assets: the tile's kebab gains **Extend** (between Open task and Download) linking to `/task/<id>?extend`.
- [ ] Narrow (390): the continuation tile and its × are ≥ 44 px targets; the duration group wraps; the extend flow passes in the narrow project.

## Departures from the reference

- Extend does not exist in the reference captures, and MiniMax's API caps a task at 15 s; ours is an owner-requested improvement (2026-09-13). If the reference turns out to have one, the visual rules of this story change to match it, not the mechanism.
- No reference images while extending: the source's last second is the reference. A last-frame target for an extension is a later story.
- The result of an extension is the joined clip, not the new segment alone; the source stays in history and Assets untouched.

## Technical Notes

- **Mechanism** (references above): the source's last 22 frames + 22⁄24 s of audio anchored at frame 0 make the segment begin as a reconstruction of the source's last second; those 22 frames are cut at the join so nothing repeats. 22 is the smallest clip length with motion in it (5 is the other candidate: a still, in effect). Whether the FL2VA weights we serve continue as well as Ref2VA (the multiframe template's weights) is what the manual verification decides; a weight switch is a follow-up story, not a change here.
- **Memory**: `GetVideoComponents` holds the whole source as float frames (≈ 12.4 MB per 1344×768 frame) and `ImageBatch` allocates the joined batch beside it: a 30 s source ≈ 9 GB, transiently 2× at the join, on top of the ≈ 68 GiB generation peak — inside the 121 GiB with margin; a 60 s source would not be. Hence `maxSourceSeconds: 30` for this story; lifting it means joining outside the graph (a later story). The AddGuide's VAE encode of 22 frames is small. Measured, not assumed: see the manual verification.
- **Time**: one generation of `segment` frames (≈ the same as a fresh clip of that length: 5 s ≈ 17 min, 10 s ≈ 51 min on 2026-09-12) plus decoding and re-encoding the source (seconds).
- **Adapter plumbing**: `createJob` resolves `continueFrom` in the `JobStore` (done, file present via `safeOutputPath`, `frames` known), then `buildGraph(template, request, [], { continuation: { file, frames } })`. `result.frames` is added to `JobResultFiles`; `finalize` derives `durationSeconds` from it. The status body's `request` includes `continueFrom` when set.
- **Stub**: `continueFrom` is stored on the job and echoed; its "done" check uses `stateOf`; no new script is needed — the usual scripts choose the outcome of the extension.
- **UI state**: `ComposerState` gains `extend?: ExtendSource`; actions `extend-from` (sets ratio/resolution/model from the source, clamps `durationSeconds` into the extension range) and `clear-extend`; `ratio`/`resolution`/`model` actions are no-ops while extending; `add-images` is refused; `paramsLabel` renders `+Ns`. `buildJobRequest` always sends JSON with `continueFrom` in extend mode. `Composer` takes `extend?: ExtendSource` and `onStopExtending` from the task page, which owns the "extending" flag (set by the Extend action or `?extend`). `HistoryEntry` gains `continuesFrom?: { id, title }` written by the jobs route.
- **Capabilities**: `Capabilities.extension` is optional in the UI's type; a server without it hides nothing today (both servers have it), and the composer's duration group falls back to the plain range if it is missing.

## Testing Plan

- **Unit — adapter** (`spark/adapter/src/mapping.test.ts`): `extensionLength` gives 124/158/277/362 for +4/+5/+10/+14 and every value is on the 17k+5 grid; `buildGraph` with a continuation wires exactly the nodes of the AC (asserted by node id, class and inputs: the `[output]` file name, the guide's `batch_index`/`length`, the audio trim's `start_index`/`duration`, `frame_idx` 0, `vae`/`audio_vae` present, the guider fed by the guide, no `first_frame`, the join's `batch_index` 22 and lengths, `CreateVideo` fed by the join, the poster from frame 0 of the join) and without a continuation the graph is unchanged from STORY_006 (existing cases stay green). `capabilities.test.ts`: `continueFrom` parsed from JSON and multipart, the extension range 4–14 with `unsupported_option`, a reference image with `continueFrom` refused, `capabilities.extension` shape. `job-store.test.ts`: `result.frames` round-trips through the JSON file.
- **Integration — adapter** (`spark/adapter/src/server.test.ts` against `test/fake-comfy.ts`, which records submitted graphs): a done job is extended by +5 → 202, the submitted graph carries the continuation nodes, status echoes `request.continueFrom`, and the finished result reports `frames = source + 158 − 22` and the matching `durationSeconds`; extending the extension reads the joined `frames`; an unknown id, a queued job, a job whose file was removed, a source over 30 s, a differing ratio, and an out-of-range duration each answer the AC's 400 with its field; ComfyUI down → 503 with the start command (BUG_001 case stays green).
- **Unit — stub** (`tools/stub-generation-server/src/server.test.ts`): `continueFrom` accepted for a done job and echoed in status and `received`; refused (400, field) for an unknown id, a job not yet done, a differing ratio, an upload, an out-of-range duration; `capabilities.extension` present.
- **Unit — app**: `lib/composer-state.test.ts` — `extend-from` copies the source's ratio/resolution/model, clamps the duration into the extension range, ignores later ratio/resolution/model actions, refuses `add-images`, `clear-extend` restores; `paramsLabel` reads `+5s`. `lib/submit-job.test.ts` — extend mode sends JSON with `continueFrom` even when images had been attached before. `lib/history-store.test.ts` — `continuesFrom` persisted and listed. `components/composer/Composer.test.tsx` — extend mode renders the continuation tile with the poster and caption, no Reference tile, disabled Ratio/Resolution radios with the note, `+Ns` durations, the placeholder; Send posts `continueFrom`; × leaves extend mode. `components/task/TaskPage.test.tsx` — Extend on a done entry switches the docked composer to extend mode; `?extend` does it on mount; an entry with `continuesFrom` renders the "Continues" link; Retry of a failed extension re-posts `continueFrom`. `components/assets/AssetsPage.test.tsx` — the kebab lists Extend linking to `/task/<id>?extend`.
- **Integration — app** (`test/integration/jobs.test.ts`): `POST /api/jobs` with `continueFrom` → 202 and the history entry carries `continuesFrom` with the source's title, the stub's `received` carries `continueFrom`; a refused `continueFrom` relays the stub's 400 and writes no entry; `GET /api/capabilities` relays `extension`.
- **E2E** (`e2e/extend.spec.ts`, desktop and narrow), each step with the wait registered before the click ([CLAUDE.md §6b](../../CLAUDE.md#6b-e2e-test-conventions)): **(1) Extend end to end** — `submit` a `done-after-1-poll` job and await its terminal response; click Extend; assert the continuation tile "Continues · 5.0 s" (the fixture's duration) is visible, no "Add reference image" button, the parameters pill reads `+5s`, and the Ratio radios are disabled; fill "and then he bows"; register `waitForTerminalStatus`; Send; assert the URL is a *different* `/task/<id2>`, the bubble says "Continues" with a link to `/task/<id1>`, the terminal status is `done`, `expectPlayable(video, "/api/jobs/<id2>/result")`, the result card offers Extend again, and `stubApi.received(id2).request.continueFrom === id1`. **(2) From Assets** — with a done job, open Assets, the tile's kebab, click Extend; assert the URL `/task/<id1>?extend`, the continuation tile visible; click "Stop extending"; assert the Reference tile is back and `stubApi.jobs()` did not grow. **(3) A failed extension retries** — extend with `fails-after-2-polls`; assert "Request failed" and Retry; register the terminal wait; click Retry; assert a new task whose `received` carries `continueFrom`. Regression cover: `task.spec.ts` (the result card's Download and Copy prompt, reopen, cancel), `composer.spec.ts` (the popover's groups all enabled outside extend mode), `assets.spec.ts` (the kebab's other items). Fixture note: no new stub script is needed; the duration arithmetic is the adapter's and is unit-tested there, so the e2e asserts only the fixture's playability (rule 10).
- **Manual verification (not a gate):** on the Spark, with ComfyUI up and the owner's two containers stopped by name, extend the 2026-09-12 clip `job-2bc60a18…` (10 s, 16:9) by **+5 s** through the UI at `http://192.168.1.33:3000` with a next-segment prompt; watch the seam at 10.1 s for motion and sound continuity; confirm the joined clip is 15.8 s, plays and downloads, and appears in Assets; record wall time and peak memory (`spark/comfyui/memwatch.sh`) with the model, checkpoint and date in the Done note. If the continuation is visibly discontinuous, the Done note says so and a follow-up story evaluates the Ref2VA weights.

## Estimated Complexity

L
