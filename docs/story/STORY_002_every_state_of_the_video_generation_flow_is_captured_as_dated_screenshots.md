# STORY_002 — Every state of the video generation flow is captured as dated screenshots

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Done (2026-09-12) — one recorded gap: the post-cancel thread state
**Created:** 2026-09-12

As the assistant building the clone, I want a dated screenshot of every state of the reference's video generation flow, at the wide and the narrow width, so that each clone story can cite the exact picture it must match.

## Current state (first authenticated run, 2026-09-12, 1440×900)

- Signed in, the sidebar reads: New task, Search, Plugins, Scheduled, Assets, Connect Mobile, More (MaxHermes, MaxClaw), Projects (Add new project), Recents ("No task history"), Agent Team, and a user chip at the bottom. No "Sign in" control anywhere — STORY_001's classifier holds.
- **Video generation is a mode of the home composer at `/`**, entered by the "Video generation H3" chip. In that mode the composer shows a **Reference** tile (Add reference), a **video-creator** plugin tag inline with the prompt, and a bottom bar: Add attachment (+), Agent Team switch, **Model** (menu: MiniMax-H3.0, MiniMax-H3-Max, Hailuo-2.3), **Video parameters** (popover: Ratio 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16; Resolution 768P / 2K; Duration 5s–15s), the agent model selector (MiniMax-M3), and Send.
- Below the composer, a **ShowCase** row of four example scenes. Clicking one loads its prompt, reference image and parameters into the composer and shows a "Clear selected scene" control.
- **Assets** (`/assets`) is the history/gallery: tabs From Agent / From You / Star, type filters (All … Images, Videos, Audio), a search field, and an empty state ("No assets yet").
- A promotional carousel card sits bottom-right on the home; its close control is labelled in Chinese ("关闭").
- What a submitted generation looks like (the task page, progress, the result player, download) is **not yet observed** — it needs a real generation.

## UI Mockup

N/A (no UI change; the deliverable is `docs/recon/<date>/`). The capture list is the mockup:

```
Automatable without a generation (part 1 — this story's first run):
  home-signed-in            composer in its default mode
  composer-video-mode       after the Video generation chip: Reference tile, video-creator tag, bottom bar
  model-menu-open           the Model menu
  video-params-open         the Video parameters popover
  agent-model-menu-open     the MiniMax-M3 selector menu
  attach-menu-open          the + (Add attachment) menu, if it is a menu
  scene-selected            a ShowCase scene loaded: prompt + reference image + params + clear control
  composer-typed            our own prompt typed (never sent), no reference
  assets-empty              /assets in its empty state, and the Videos filter selected
  narrow-home, narrow-video-mode, narrow-video-params, narrow-assets   the same at 390px

Needs a real generation (part 2 — after the owner approves N):
  task-submitted            immediately after Send
  task-generating           frames every few seconds while the job runs
  task-done                 the result rendered and playable
  result-download           the download affordance
  assets-one-video          /assets with the generated video, Videos filter
  task-cancelled            submit then cancel (only if N ≥ 2)
```

## Acceptance Criteria

- [x] `pnpm recon:capture` reuses the STORY_001 session, **refuses to run unless the session reads signed-in**, dismisses the announcement modal, and captures every part-1 state above to `docs/recon/<YYYY-MM-DD>/<state>@<width>.png`, at 1440 and 390 wide as listed.
- [x] Each run writes `manifest.json` beside the screenshots: state, width, URL path (never a query string), capture time, and whether the state was reached automatically or by the owner.
- [x] The run performs **no generation** unless started with `--generate N`; without the flag the Send control is never clicked and Enter is never pressed in the composer. Part-2 states are a separate run once the owner has approved N (recorded in the Done note); until then `--generate` with N > 0 prints that it is not yet implemented and exits non-zero.
- [x] Before every screenshot the owner's display name in the sidebar user chip is replaced with "Owner" in the page (the site is not changed — only the page in our browser), so committed captures carry no account name.
- [x] Throughout the run, first-party network traffic (method, host, path with ids replaced by placeholders, status, content type; JSON response bodies) is appended to `recon/out/<date>/network.jsonl` as raw material for STORY_004. Analytics and pixel hosts are excluded. Nothing under `recon/out/` is committed.
- [x] The composer is left as it was found: a selected scene is cleared and typed text removed before the run ends.
- [x] Unit tests cover the pure helpers (file naming, manifest entries, query-string stripping, id placeholders, noise-host filtering) and pass with `pnpm test`.

## Technical Notes

- Node runs the TypeScript directly (CHORE_001), so `page.evaluate` callbacks are plain arrows with no injected helpers.
- One persistent context → one viewport at a time; narrow states are taken by resizing the same page to 390×844 and reloading. This gives layout, not touch semantics; STORY_003's breakpoint pass and EPIC_003's e2e use device descriptors.
- Menus are closed with Escape between states; a scene is cleared with its own "Clear selected scene" control.
- The generation flow (part 2) is written after the owner approves N, against what the first submitted task actually shows; guessing the task page's structure now would violate [CLAUDE.md → §3 item 8](../../CLAUDE.md#3-how-features-are-built-important).

## Testing Plan

- **Unit** — `recon/src/capture-plan.test.ts`: `screenshotFile` builds `<state>@<width>.png` and rejects names outside `[a-z0-9-]`; `manifestEntry` keeps the path and drops the query string and hash; `dateStamp` formats a local date as `YYYY-MM-DD`. `recon/src/network-log.test.ts`: `isNoise` is true for the analytics hosts seen on 2026-09-12 and false for the reference origin; `sanitizePath` replaces UUIDs and long numeric ids with placeholders and drops the query.
- **Integration / E2E** — N/A (third-party site behind a login; generations cost credits). Manual: the assistant runs part 1 and reviews every screenshot against the list; the owner reviews the committed set and approves N for part 2.

## Estimated Complexity

M

## Done note — part 1 (2026-09-12)

`pnpm recon:capture` ran twice. The first run exposed that the reference's "Clear selected scene" control deselects the ShowCase card but leaves the example prompt and reference image in the composer, so the typed-prompt capture landed inside the example's text. The script now empties the composer itself (removes attached references, selects-all and deletes the editor text, verifies both) before typing and again afterwards, and ends by reloading the home and proving the composer is empty — it was ("composer restored: empty after reload"), so drafts do not persist for this account. Second run: **14 captured, 0 skipped**, 1.7 MB in `docs/recon/2026-09-12/`, manifest with no query strings, sidebar name masked to "Owner" in every shot (checked on `home-signed-in`).

Observed for the inventory (STORY_004): the + control opens a menu — Add files or photos, Add to project, Skills, Plugins, Environment variables. The Model menu lists MiniMax-H3.0 (default), MiniMax-H3-Max, Hailuo-2.3. Video parameters: Ratio 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16, Resolution 768P / 2K, Duration 5s–15s; default 16:9 · 2K · 5s. At 390px the sidebar collapses to an icon, the composer's bottom bar overflows (parameters control off-screen), and the ShowCase becomes a two-column grid. The raw network log (1,477 events; `recon/out/2026-09-12/network.jsonl`) shows only config and user endpoints under `/v1/api/` for these states — the generation endpoints appear only in part 2. Gate: `pnpm typecheck` and `pnpm test` (23 cases) green; lint/build/e2e do not exist yet (EPIC_002).

**Part 2 (task-submitted, task-generating, task-done, result-download, assets-one-video, task-cancelled) is not started.** It needs the owner to approve N real generations — proposed N = 1 at 768P · 5s (the cheapest parameters) for the submit → generating → done → download → assets chain, N = 2 to add the cancel state. The reference's banner says check-in credits stop covering H3 after 2026-09-15.

## Part 2 log (2026-09-12)

**Attempt 1 — the request failed before any generation started.** With N = 2 approved, `pnpm recon:capture --generate 2` set 16:9 · 768P · 5s, typed a prompt, pressed Send, and landed on the task page (path `/mavis`, titled "Unnamed Session"). Within three seconds the page showed **"Request failed" with a Retry button** and the notice **"Fewer than 1,000 Credits remain"** with Buy Credits and Subscribe. The script's failure detector did not know the phrase "Request failed", so it polled for 16 minutes before it was stopped; nothing was generated and no credits were spent. Fixes: the detector now matches "Request failed" and the credit notice, captures the failed state as `task-request-failed`, presses Retry once, and gives up cleanly if the failure repeats; the second generation is never started after a failed first. The first attempt's frames and page dumps are kept under `recon/out/2026-09-12/*-attempt1` for STORY_004 (the task page layout is visible in them: session title, prompt bubble tagged `@video-creater`, the failed-request row, a right-hand Progress panel, the docked composer).

**Attempt 2 — the provider refused the H3 job for lack of credits.** With the detector fixed, the same submit reached the task page and this time the request went through to the agent, which after ~45 s of processing wrote: *"Hit a billing wall — your H3 generation got rejected at submit. Provider returned HTTP 402: insufficient account credits for MiniMax-H3 video generation; current balance cannot cover this generation (this task needs 400 credits)."* It added that H3.0 and H3-Max bill account credits and never the Token Plan, that billing failures are terminal (no retry), and offered **MiniMax-Hailuo-2.3 at 768P · 6s on the Token Plan** (silent output, 5s is not a valid Hailuo-2.3 duration) as the alternative. The detector missed that wording as well (it looked for "insufficient credits", not "insufficient account credits"), so the run was stopped by hand at ~100 s. Kept: `task-rejected-insufficient-credits@1440.png` (manifest in `manifest-attempt2.json`) — the task page with the agent's message and the **Progress** panel listing the pipeline: validate live submit → draft and review H3 prompt → submit generation task → report → query, download, validate. Fixes: the detector matches the billing wording and stops immediately with that capture; a `--model hailuo-2.3` switch selects Hailuo-2.3 in the composer's Model menu; the duration radio is chosen as the smallest available rather than a hard-coded 5s. No credits were spent by either attempt. **Owner's decision (2026-09-12): run part 2 on Hailuo-2.3 via the Token Plan** (`--generate 2 --model hailuo-2.3`, 768P, shortest duration offered). The model chip in the generating and done states will therefore read Hailuo-2.3 rather than H3, and the result is silent; every other state is the same UI. **Attempts 3–6 (Hailuo-2.3).**

- *Attempt 3* aborted before Send: the composer's Model button reads "Model: MiniMax-H2.3" after choosing "Hailuo-2.3" in the menu, and the check only accepted the menu's spelling. Widened.
- *Attempt 4 — the real job.* Model set, parameters 16:9 · 768P · **6s** (the smallest duration Hailuo-2.3 offers; 5s is H3-only), Send. The thread showed "Merging…" with the composer's Send control turned into a **"Stop generation"** control (role-button div, black square), then "Thinking…", "Improving…", and after 42 s the agent wrote: *"Submitted. Task … is queued for MiniMax-Hailuo-2.3 (silent, 6s, 768P). I'll check back in ~10 minutes and pop the playable MP4 here once it's ready."* It never did within the 20-minute wait; the run timed out, captured the timeout state, the Assets page and the home with Recents, and did not spend the second slot. **But the Assets page already listed the finished file** (`<task id>.mp4`, a tile with a Preview control and a "More actions" menu) — the generation had completed on the backend without the agent posting it. Captured: `task-submitted`, `task-generating-000s/030s/090s/180s/300s/600s`, `task-timeout`, `assets-one-video`, `home-with-recents`.
- *Revisit* (`--revisit`, no generation): the reopened session still had no video (`task-revisited-pending`), but the Assets **preview** opened a modal player — file-name title, download and open-in icons, a native control bar (0:00 / 0:05, play, volume, fullscreen, more) — captured as `assets-video-tile-hover`, `assets-video-preview`, `assets-video-preview-hover`; the MP4 (1,053 KB, `video/mp4`, served from an Alibaba Cloud OSS host) was fetched into `recon/out/` for STORY_004. The tile's actions menu did not open on the first try (click timed out; fixed to hover first, not yet re-run).
- *Attempt 5 — cancel-only (the second slot).* The agent processed for 5 s ("Thought 1 time(s), Viewed 2 file(s)") and the thread showed **"Request failed"** with Retry. The script looked for the stop control 8 s after Send — too late — and then mis-attributed the failure to credits because the pinned "Buy Credits" banner matched the credit pattern (narrowed to the agent's own wording since). Captured as `task-request-failed`.
- *Attempt 6 — cancel-only again, with the check moved to 1.5 s after Send and a Retry on immediate failure.* The thread answered **"No conversation resources are available. Subscribe to continue."** — the account's conversation allowance was exhausted after the day's requests. Captured as `task-no-conversation-resources`. Stopped by hand.

**Outcome.** Every part-2 state is captured except two: **the cancel state** (the control itself is captured and named — "Stop generation" at the Send position while the thread reads Merging/Thinking/Improving — but what the thread shows after pressing it is not) and **the agent posting the result in the thread** (the result is captured via Assets instead). Credits spent: one Hailuo-2.3 job on the Token Plan; no account credits. Three frames of attempt 4 were re-derived from raw frames after a later run overwrote them, with the sidebar name masked in the image. Manifests: `manifest-generate.json` (attempt 4), `manifest-revisit.json`, `manifest-cancel-only.json` (attempts 5–6), `manifest-attempt2.json`.

**Owner's decision (2026-09-12):** asked whether the post-cancel state is critical; answered no — the control's look, position and label are captured, and only the thread's post-cancel content is unknown. Gap accepted; one cancel-only job fills it in whenever the account has conversation resources again, before EPIC_003's cancel story is implemented. **Story Done with that gap recorded.**
