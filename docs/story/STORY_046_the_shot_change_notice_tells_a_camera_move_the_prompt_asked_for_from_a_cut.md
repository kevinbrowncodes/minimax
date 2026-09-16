# STORY_046 — The shot-change notice tells a camera move the prompt asked for from a cut the model made

**Epic:** [EPIC_004](../epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md) (the model side) — the later story [STORY_020](STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md) named for a moving camera; promoted from [BACKLOG_010](../backlog/BACKLOG_010_the_shot_change_notice_tells_a_camera_move_from_a_cut.md) (remedies 1–3); after [BUG_010](../bug/BUG_010_the_three_second_shot_change_rule_measures_only_the_first_three_seconds.md)
**Status:** Done (2026-09-16 17:25 EDT — approved 16:50 ("can we do STORY_046 while we have generation in progress?"), built and gated while the office round's draw 3 finished, the adapter and the app rebuilt and restarted at 17:14 once `openJobs` was 0; the Done note below)
**Created:** 2026-09-16

As the owner, I want the amber notice under a finished video to mean "the model cut or wandered" and nothing else, so that a handheld or moving-camera clip that did exactly what the prompt said is not shown to me as a defect with a Retry button — and so that a real cut in such a clip is still caught.

## Current state (read from the code and measured on the clips on disk, 2026-09-16)

- **One measure, two rules, one word.** The node (`spark/comfyui/custom_nodes/minimax_local/__init__.py`) reports the picture's outer 10 % border compared one frame, one second and three seconds apart; `spark/adapter/src/cuts.ts` calls a one-second change ≥ `SHOT_CHANGE` (30) or a three-second change ≥ `SLOW_CHANGE` (20) an event, places it at the steepest single step in the first tripped window, merges events within 48 frames, and returns `Cut[]` as `{ frame, seconds }`. The app's `shotChangeNotice` (`app/lib/shot-change.ts`) turns any non-empty `cuts` into the one sentence *"The shot changed at … — the set or the framing is no longer what it was. Retry generates this again with a new seed."*; `CutNotice.tsx` renders it amber with Retry; `app/lib/inbox.ts` adds a `cut` event ("The shot changed at 00:11") beside "Your video is ready".
- **STORY_020 scoped the rule to a static camera in writing** ("a prompt that moves the camera … moves the border too, so the notice must say 'the set or the framing changed', never 'a cut', and a later story can gate the check on the prompt's camera language"). Every prompt until 2026-09-16 asked for a static camera. The office round (`test/26-09-17-0800_office`, a handheld selfie that follows the subject to a desk) is the first that does not: its draws are one continuous shot each and carry three and four flags.
- **A cut and a camera move are told apart by the single-frame step, which nothing reads today.** Re-running the node's arithmetic over the clips on disk: the real cuts step **46.5–49.7 in one frame** (`2f980101` f142; `7f201441` f142 and its fast dissolve f278; `98eb33ca` both); the handheld draws peak at **14.6** and **15.7**; a held shot at 2.4; BUG_006's slow dissolve at 2.8. Over one second the same handheld draws reach 48.4 and 52.9 — indistinguishable from the cuts (49.7–57.5) by that rule, which is why they are flagged.
- **The adapter already reads the prompt's camera language**, in one direction: `prompt.ts` wraps a prompt that lacks the format in *"The camera holds a perfectly static shot throughout the entire S.SS-second duration"*, and passes a prompt that already has the format unchanged. It does not record what the prompt asked of the camera.
- **The stub** reports `cuts: [{ frame: 270, seconds: 11.25 }]` for `done-with-cut` and `[]` for every other script (`tools/stub-generation-server/src/scripts.ts`); the contract is v1.3 (`docs/contracts/job-api.md`).

## UI Mockup

**Reference capture: none** — agent.minimax.io shows no cut check (STORY_020's Departure); this story changes what ours says. Tokens as STORY_020 used them (`docs/recon/2026-09-12/tokens.md`): the amber strip unchanged; the new quiet line in the muted text of the thread's meta rows (the *Processed 3035s ›* row above the result, STORY_026), 14 px / 22 px, no background, no button.

Desktop, the task page of a done job. **A cut** (a single-frame step ≥ 30 — whatever the prompt asked of the camera), and **a framing change on a prompt that asked for a static camera**: today's strip, unchanged —

```
│  MiniMax Local · 15:13                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠ The shot changed at 00:05 — the set or the framing is no longer what it was.      │   │
│  │   Retry generates this again with a new seed.                         [ Retry ]      │   │
│  ├──────────────────────────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────────────────────────────────────────────────┐                        │   │
│  │  │                    ▶  video (unchanged)                  │                        │   │
│  │  └──────────────────────────────────────────────────────────┘                        │   │
```

**A framing change on a prompt that asked for a moving camera** (the office round's draws): the quiet line, no Retry —

```
│  MiniMax Local · 15:13                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  The framing moved at 00:01, 00:04 and 00:08, as the prompt asked; no cut.           │   │
│  ├──────────────────────────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────────────────────────────────────────────────┐                        │   │
│  │  │                    ▶  video (unchanged)                  │                        │   │
│  │  └──────────────────────────────────────────────────────────┘                        │   │
```

**A cut inside a moving-camera clip**: the amber strip, listing only the cut's time (the framing events are not listed beside it — the strip is for what went wrong). **A clean result**: nothing, as today. **Narrow (iPhone 13):** the strip as STORY_020 (two lines, Retry below, full width, ≥ 44 px); the quiet line wraps to two lines and has no target.

**Inbox:** a cut, or a framing change on a static prompt, makes the `cut` event as today ("The shot changed at 00:11"); an expected framing move makes **no** event — "Your video is ready" is the whole news.

## Acceptance Criteria

- [x] **A third rule in `cuts.ts`, for cuts.** A single-frame border step ≥ `CUT_STEP` (30) is an event of kind `cut` at that frame. The one-second and three-second rules' events are kind `framing`. Merging as today (48 frames), and a `cut` wins the kind of a merged event; a `cut` also wins the frame, as a one-second event does over a three-second estimate today. `Cut` becomes `{ frame, seconds, kind: "cut" | "framing" }`.
- [x] **The adapter records what the prompt asked of the camera.** `cameraOf(prompt)` in `prompt.ts` returns `"moving"` when the description contains a move in the guide's vocabulary — `push in`, `pull out`, `pan left/right`, `tilt up/down`, `pedestal`, `arc shot`, `tracking shot`, `zoom`, `handheld`, `sway`, `camera follows`, `dolly` (case-insensitive, whole words, the list a named constant beside `I2VA_INSTRUCTION`; *corrected before implementation: the draft said bare `follows`, which would match a subject's gaze following something — the guide's phrase is "the camera follows a moving subject", so the phrase is what is matched*); `"static"` when it contains `static shot` and no move word; `"unknown"` otherwise. The prompt read is the one the model gets (after the adapter's wrapping — a wrapped prompt is always `"static"`). `result.camera` carries it; **contract v1.4** documents `cuts[].kind` and `result.camera`, both **absent** from an older server (the app treats absence as `kind: "framing"`, `camera: "unknown"` — today's behaviour).
- [x] **The notice's words follow the kind and the camera** (`shotChangeNotice` returns `{ tone, text, retry }`): any `cut` event, or a `framing` event with camera `static` or `unknown` → `tone: "warning"`, today's sentence listing the times of **those** events, `retry: true`; only `framing` events on camera `moving` → `tone: "note"`, *"The framing moved at 00:01, 00:04 and 00:08, as the prompt asked; no cut."*, `retry: false`; no events → nothing. `CutNotice` renders the warning as today (`data-testid="cut-notice"`, `role="status"`) and the note as the quiet line (`data-testid="framing-note"`, `role="status"`, no button).
- [x] **The Inbox** makes the `cut` event only when the notice is a warning; a note makes none (`inbox.ts`).
- [x] **The stub** speaks v1.4: `done-with-cut` reports `[{ frame: 270, seconds: 11.25, kind: "cut" }]` and `camera: "static"`; two new scripts — `done-with-framing-move` (`[{ frame: 24, seconds: 1, kind: "framing" }, { frame: 100, seconds: 4.17, kind: "framing" }, { frame: 204, seconds: 8.5, kind: "framing" }]`, camera `moving` — the office round's draw 1) and `done-with-cut-in-a-move` (the same three plus `{ frame: 142, seconds: 5.92, kind: "cut" }`, camera `moving`). Every other script: `[]`, camera `static`.
- [x] **Unchanged:** a static prompt with a framing change (STORY_020's clips: `2f980101`, `7f201441`, `98eb33ca`, BUG_006's `81354423`) shows the same warning at the same times as today; Retry's request is what it was; `cuts.ts`'s thresholds 30 and 20 are untouched; a clean result shows nothing.
- [x] **Calibration re-checked in the Done note:** the node's arithmetic re-run (`border.py`, kept as `spark/comfyui/border.py` — a thin ffmpeg + numpy wrapper run through the ComfyUI image, shellchecked) over every clip on disk that day, listing each clip's largest single-frame step and the kind the new rule gives it: every known cut ≥ 30, every moving-camera draw < 30, or the story says so and the number moves before the push.

## Departures from the reference

- The reference shows no cut check (STORY_020's Departure stands). The quiet line is ours — a moving-camera clip that did what it was told says so in one muted sentence rather than in the same amber as a defect, because the owner asked on 2026-09-16 why the notice kept appearing on good draws.

## Technical Notes

- `spark/adapter/src/cuts.ts`: `CUT_STEP = 30`; `eventsOf` unchanged; a new pass over `step` for single-frame events; `kind` carried through the merge (`fast` becomes a rank: cut > second > long). `cuts.test.ts`: the synthetic series gain a hard cut (one step of 45) inside a moving stretch (one-second changes of 40 across 60 frames): one `cut` at the step's frame and the framing events around it; the handheld case (steps ≤ 16, one-second ≥ 30 for most of the clip): framing only; the static cases as today with `kind: "framing"`.
- `spark/adapter/src/prompt.ts`: `CAMERA_MOVES` and `cameraOf`; `server.ts` sets `result.camera` from the prompt it submitted (the wrapped one). `spark/adapter/package.json` version bump; `docs/contracts/job-api.md` v1.4.
- `app/lib/job-api.ts`: `Cut.kind?`, `JobResult.camera?`; `app/lib/shot-change.ts`: `shotChangeNotice(cuts, camera)` → `{ tone, text, retry } | undefined`; `CutNotice.tsx` + `cut-notice.module.css`: the `.note` variant; `app/lib/inbox.ts`: the gate. History entries written before v1.4 have no `kind` — the reducer's defaults cover them, no migration.
- Sequencing: BUG_010 first (the three-second series), because this story's calibration re-run relies on the node's numbers being the node's. The adapter is rebuilt and restarted between jobs, the peer session told.

## Testing Plan

- **Unit (app, `pnpm test`)** — `shot-change.test.ts`: a `cut` on any camera → warning with only the cut's time and `retry: true`; framing on `static` / `unknown` / absent → warning as today; framing on `moving` → the note, `retry: false`; mixed (a cut among framing events on `moving`) → warning listing the cut's time only; `[]` and `undefined` → nothing. `CutNotice.test.tsx`: the warning renders the button, the note renders no button and the `framing-note` test id, both `role="status"`. `inbox.test.ts`: `done-with-framing-move`'s entry makes one event (ready), `done-with-cut`'s two. `job-api` parsing accepts entries with and without `kind` / `camera`.
- **Unit (adapter, `spark/adapter` Vitest)** — `cuts.test.ts` as in Technical Notes; `prompt.test.ts`: `cameraOf` on the office prompt (`handheld`, `sway`, `follows` → `moving`), STORY_020's wrapped prompt (`static`), the cove prompt (`perfectly static shot` → `static`), a prompt with neither (`unknown`), and a static prompt that mentions `pan` as a noun in the soundscape (the word list is matched in the description field only — the test pins that).
- **Integration (app, `pnpm test:integration`)** — the jobs route relays `cuts[].kind` and `result.camera` from the stub unchanged (`done-with-cut`, `done-with-framing-move`); the history store round-trips them; the stub's own `server.test.ts` covers the three scripts' payloads.
- **E2E (`pnpm test:e2e`)** — `task.spec.ts`: the existing STORY_020 case (`done-with-cut` → the amber notice, Retry without a seed) stays green and proves the unchanged half; a new case: `submit(page, "done-with-framing-move", …)`, wait for the terminal status response, close the preview, assert `framing-note` reads "The framing moved at 00:01, 00:04 and 00:08, as the prompt asked; no cut.", `cut-notice` is absent, and no Retry button is in the result bubble; a second new case: `done-with-cut-in-a-move` → `cut-notice` reads "The shot changed at 00:05" only. `shell.spec.ts`: the STORY_033 Inbox case (`done-with-cut` → two events) stays green; a new assertion after `done-with-framing-move`: the bell counts one. Narrow: the framing-note case repeated under `devices["iPhone 13"]`, the line wrapping and no target to measure.
- **Manual verification (the Spark, in the Done note with the date, the model and the checkpoint):** the office round's three draws re-read through the rebuilt adapter's `GET /jobs/:id` → `camera: "moving"`, their stored events without a `kind` (recorded by v1.4.0 — the app reads that as framing); *corrected before implementation: the draft also promised their task pages would show the quiet line, but a done job is not polled again, so the app's history keeps the v1.3 result it recorded — the quiet line is verified on the next moving-camera generation, and the Done note says which.* STORY_020's `2f980101`, `7f201441` and `98eb33ca` re-measured with `border.py`: a `cut` at frame 142 (5.92 s) in each; the calibration table from the AC above.

## Estimated Complexity

Medium — a rule and a field on the adapter, a word list, the contract bump and the stub's two scripts, then the notice's second voice and the Inbox gate in the app, with the tests at every layer: ≈ 2 h 15 min to build and gate, ≈ 20 min to rebuild and restart the adapter between jobs and verify on the three draws. No GPU time beyond what is already on disk.

## Done note (2026-09-16)

**What shipped.** Adapter 1.5.0 (`cuts.ts`: `CUT_STEP` 30, `stepEventsOf`, `kind` through the merge with the rank cut > one-second > three-second; `prompt.ts`: `CAMERA_MOVES`, `descriptionOf`, `cameraOf`; `server.ts`: `result.camera` computed from the stored request at read time, so every job answers, the done log line naming each event's kind and the camera). Stub: `done-with-cut` gains `kind: "cut"` and `camera: "static"`; `done-with-framing-move` and `done-with-cut-in-a-move` new. App: `Cut.kind?`, `JobResult.camera?`, `shotChangeNotice(cuts, camera)` → `{ tone, text, seconds, retry }`, `CutNotice` with the `.note` voice (`framing-note`), the Inbox's `cut` event only for a warning. Contract v1.4. `spark/comfyui/border.py` + `border.sh` (the node's measure over finished clips, run inside the ComfyUI image with PyAV — nothing on the host). README's shot-change paragraph.

**Gate.** All six steps by hand through `tools/gate/run.sh` at 17:00–17:14 EDT: typecheck, lint, unit (adapter 79, stub 25, app incl. the five touched files), integration 32, build (the production image), e2e **113 passed, 9 skipped** (the suite's codec skips) at desktop and iPhone 13 in 7.8 min; the hook re-runs them on the push.

**Tests that turned red and why.** One: STORY_020's "a history without the three-second series" case flattened `second` but left a 50 step at frame 142 and expected `[]` — a lone single-frame jump with a flat one-second series is not a clip that can exist, and under rule 3 that step is a cut. Rewritten to keep its intent (no `long` → rules 1 and 3 still run) with the step under `CUT_STEP` in its "nothing" branch. No user-perceivable behaviour was removed.

**AC corrections made before implementation, as §3 item 8 asks:** bare `follows` → the phrase `camera follows` (a subject's gaze follows things; the guide's phrase is "the camera follows a moving subject"); the manual verification on the three existing draws is adapter-only, because a done history entry is never re-recorded (`history-store.ts` › `recordStatus` returns a terminal entry unchanged) — their task pages still show v1.3's amber notice.

**Manual verification on the Spark (2026-09-16 17:14–17:20 EDT, MiniMax-H3 `minimax_h3_fl2va_int8_convrot`, ComfyUI 0.35.1, adapter 1.5.0).** `GET /jobs/:id` on the rebuilt adapter: `ecb286a6`, `f468d9b8`, `eaef80fc` → `camera: "moving"`, their stored events without a kind (recorded by 1.4.0); the cove draw `972ce675` (the skill's "perfectly static shot") → `"static"`; STORY_020's `2f980101` (a wrapped prompt) → `"static"`. Through the app's route, `/api/jobs/ecb286a6…` relays `camera: "moving"`; the history entry keeps its v1.3 result (`camera` absent), as corrected above. **The quiet line on a live task page — seen 2026-09-16 19:40 EDT on `cac39075`** (the office round's draw 5, `01.jpeg`, seed 1934850468, MiniMax-H3 `int8_convrot`, ComfyUI 0.35.1, adapter 1.5.0): the adapter reported three `framing` events and `camera: "moving"`, the history entry recorded them, and the server-rendered task page carries `framing-note` — "The framing moved at 00:01, 00:06 and 00:08, as the prompt asked; no cut." — with no amber strip and no Retry. **The cut voice inside a moving-camera clip, live, by accident on `410f1c7f`** (18:48 EDT): a contact sheet went up as the first frame (the round's `submit.py` picked the first PNG in the directory), the model cut to the office at frame 1 (a 75.2 single-frame border step, the largest on disk), the adapter reported `cut` at 0.04 s and `framing` at 4.63 and 8.54 s, and the page showed the amber notice naming 00:00 alone. Both verifications on the node fixed by BUG_010 (its three-second series full, 171 values).

**Calibration, every finished clip on disk (43, `spark/comfyui/border.sh`, 17:10 EDT).** Largest single-frame border step and the kind rule 3 + rules 1–2 give the biggest event:

| Clip | What it is | Step max (frame) | One-second max | Three-second max | Kind |
| --- | --- | --- | --- | --- | --- |
| `2f980101` | STORY_020's wide → close-up cut | **50.0** (142) | 50.0 | 49.9 | cut |
| `7f201441` | the same cut, then the fast dissolve | **49.6** (142) | 51.6 | 55.4 | cut |
| `98eb33ca` | the 31 s chain, both above | **49.3** (142) | 57.9 | 63.0 | cut |
| `19d2394f`, `4f48037c` | 2026-09-14 extensions, the framing changing after the seam | 23.6, 23.4 (243 — the seam) | 26.4, 26.2 | 26.1, 25.9 | framing |
| `eaef80fc`, `f468d9b8`, `ecb286a6` | the office round, handheld | 15.7, 15.8, 14.7 | 54.0, 53.0, 48.5 | 72.6, 62.7, 55.9 | framing |
| `8b98941a` | a large move in the last second | 13.7 | 60.5 | 65.2 | framing |
| `e8b108b1` | 5 s, a slow drift | 9.1 | 23.9 | 30.0 | framing |
| `81354423` | BUG_006's slow dissolve | 2.8 | 16.5 | 26.9 | framing |
| the 32 others | held shots, chain segments, the cove draws | ≤ 6.1 | ≤ 30.7 | ≤ 46.4 | none / framing |

Every known cut ≥ 30 in a frame (49.3–50.0); every moving-camera draw < 30 (≤ 15.8); the closest non-cut is a **seam** step of 23.6 on two 2026-09-14 extensions (STORY_017's overlap since made seams continuous: every later seam on disk steps ≤ 2.8) — so the threshold sits 1.27× above the largest non-cut step on disk and at 0.61 of the smallest cut. Recorded here so a future seam or whip-pan that lands between 24 and 30 is judged against these numbers, not remembered ones. The one-second and three-second columns confirm rules 1–2 cannot separate the handheld draws (48.5–54.0) from the cuts (50.0–57.9).

**Left open.** ~~[BUG_010](../bug/BUG_010_the_three_second_shot_change_rule_measures_only_the_first_three_seconds.md): the node still emits one three-second value per job~~ — fixed the same evening (Resolved 19:45 EDT); the node re-run through ComfyUI on the clips above gives the three-second column to the tenth. [BACKLOG_010](../backlog/BACKLOG_010_the_shot_change_notice_tells_a_camera_move_from_a_cut.md) remedy 4 (the measurements on the task page) stays in backlog.
