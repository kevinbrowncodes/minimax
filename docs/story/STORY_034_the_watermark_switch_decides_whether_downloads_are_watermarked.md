# STORY_034 — The watermark switch decides whether downloads are watermarked

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §5 Settings](../recon/2026-09-15/behaviour.md): the reference's switch is `update_water_mark_setting { enable_water_mark }`, found on

As the owner, I want Settings › General's "Remove an AI-generated watermark" switch to be real — off means every download carries a visible "AI-generated" mark, on means the clean file — so that clips I share can be marked when I want them to be.

## Current state

The switch is a `PreferenceRow` with an inert `Inert role="switch"` (STORY_019/026). Downloads come from `GET /api/jobs/:id/result?download`, which proxies the adapter's result route (BUG_004 named the file). The adapter has zero runtime dependencies and a plain Node image; its result route serves the mp4 with Range support.

## UI Mockup

**Reference capture:** `settings-general@1440` (2026-09-14), `behaviour-settings-preferences-01..02` (2026-09-15). The row is unchanged; only the switch works.

```
Preferences
  Remove an "AI-generated" watermark                                            (●  ) on = downloads are clean
  When off, downloads will include a visible AI-generated watermark. …          (  ●) off = "AI-generated" bottom-right
```

## Acceptance Criteria

- [x] The switch reads `GET /api/settings` and writes `PATCH /api/settings { removeWatermark: boolean }` (server-wide, in app data; default **true** — clean downloads, as the owner's reference account was found).
- [x] With it off, `GET /api/jobs/:id/result?download` serves a copy of the video with "AI-generated" burned in at the bottom-right (white, 5 % of the height, 2 % margin); playback in the app (no `?download`) is always the clean file; the marked copy is made once per file and cached beside it on the Spark.
  *Corrected 2026-09-15, before implementation (CLAUDE.md §3.8):* "beside it" cannot hold — `spark/comfyui/compose.yaml` mounts ComfyUI's output into the adapter read-only (`/comfy/output:ro`). The cache lives under the adapter's own volume instead: `/comfy/adapter/watermarked/<job id>.mp4` (`WATERMARK_DIR`, next to `jobs.json`), made once per job and reused; it goes when the adapter's data directory goes.
- [x] The adapter's result route gains `?watermark=1`, produced with ffmpeg inside the adapter container (the image gains ffmpeg — a deliberate exception to its zero-dependency rule, written in the adapter's README); the stub honours the flag by serving the same fixture and setting an `x-watermark: 1` header so the app's tests can assert the decision without ffmpeg.
- [x] The Assets preview's Download and the task page's Download behave the same; both themes; existing download e2e green.

## Departures from the reference

- The mark is ours ("AI-generated", plain text); the reference's is its logo.

## Technical Notes

- `lib/settings-store.ts` (`/data/settings.json`), routes `GET/PATCH /api/settings`; `SettingsDialog.tsx` reads through props from the Shell.
- `app/app/api/jobs/[id]/result/route.ts` forwards `?watermark=1` to the adapter when `download && !removeWatermark`.
- `spark/adapter`: `ffmpeg -i in.mp4 -vf "drawtext=text='AI-generated':fontcolor=white@0.85:fontsize=h*0.05:x=w-tw-w*0.02:y=h-th-h*0.02" -c:a copy out.mp4` cached as `<WATERMARK_DIR>/<job id>.mp4` (corrected 2026-09-15: the output mount is read-only, see the AC); the Dockerfile adds `ffmpeg` (Debian package); `test/fake-comfy.ts` unchanged; a unit test for the cache path and the command line (the ffmpeg call is injectable, so the adapter's tests never need the binary); the note on why ffmpeg is there goes in `spark/README.md` (the adapter has no README of its own).
- **Coordination:** the adapter is restarted only when `curl localhost:4020/health` shows no open jobs (BUG_002); the other session is told first.

## Testing Plan

- **Unit** — `settings-store.test.ts`; adapter `watermark.test.ts` (command, cache naming).
- **Integration** — `settings.test.ts` (round-trip, validation); `jobs.test.ts`: with `removeWatermark: false` the download request carries the flag and the stub answers `x-watermark: 1`; with true it does not.
- **Component** — `dialogs.test.tsx`: the switch reflects the setting and PATCHes.
- **E2E** — `task.spec.ts`: toggle the switch off → Download → the response carries `x-watermark: 1`; toggle on → it does not.
- **Manual verification (model side):** one real download on the Spark with the switch off — the mark is visible bottom-right, audio intact; recorded in the Done note with the date.

## Estimated Complexity

Medium (the adapter half).

## Done (2026-09-15)

**Landed:** `lib/settings.ts` (the pure shape, `removeWatermark`, default on) + `lib/settings-store.ts` (`settings.json` beside the history file, atomic writes) behind `GET/PATCH /api/settings` (a boolean or a 400). `GET /api/jobs/:id/result?download` asks the adapter for `?watermark=1` when the switch is off; playback never does; `x-watermark` passes through the relay. Settings › General's row is a real `role="switch"` (the accent track and knob-right on, the grey track and knob-left off), fed by the Shell (read once and on every open; the change is painted at once and reverted with a toast if the PATCH fails). The stub serves the same fixture with `x-watermark: 1`. The adapter (now **1.4.0**): `src/watermark.ts` — the ffmpeg argv (`drawtext` "AI-generated", white 85 %, 5 % of the height, 2 % in from the bottom-right, audio copied, faststart) and a `WatermarkCache` that makes one copy per job under `WATERMARK_DIR` (`/comfy/adapter/watermarked`, the adapter's own volume — the output mount is read-only, see the corrected AC), shares an in-flight run, never runs twice, and leaves no `.part` behind on failure; the result route serves that file through the same Range-capable `sendFile` with `x-watermark: 1`, or 500 `watermark_failed`. The Dockerfile adds Debian's ffmpeg with `fonts-dejavu-core` — the image's one runtime dependency, written up in `spark/README.md` and the README's adapter row.

**Tests:** `settings-store.test` (default, the file beside history, round trip, garbage), `test/integration/settings.test` (GET / PATCH incl. 400s; a download with the switch off carries `x-watermark: 1`, playback and a clean setting do not, Ranges keep it), `dialogs.test` (the switch reflects the setting, asks for the flipped value, keeps the notice without a handler), adapter `watermark.test` (the argv and cache path; one run for concurrent requests, reuse after, nothing left behind on failure, a retry after) and `server.test` (the marked copy with its own length and ranges and the header, the runner called once, the clean file untouched; 500 `watermark_failed` with the clean result still served), `e2e/task.spec` "Settings › General's watermark switch decides whether a download is marked" at desktop and narrow (default clean → off → PATCH ok → `x-watermark: 1` on the download, none on playback → on again → clean; through the drawer at 390). Gate by hand: typecheck, lint, unit (app, stub, adapter), integration (24), build + image, e2e 93 passed / 9 skipped; and again in the pre-push hook.

**Manual verification (the Spark, 2026-09-15):** the peer session was told before and after; `openJobs` was 0 at the restart; the adapter came back as 1.4.0 with ComfyUI reachable, `ffmpeg 5.1.9-0+deb12u1` and six DejaVu faces in the image. `GET /jobs/0dd0454c-…/result?watermark=1` on a finished job (`minimax-h3`, 16:9 768P, 10 s image-to-video with one reference, made 2026-09-15 05:31 UTC by the Spark's H3 stack — the adapter's health lists the fl2va and ref2va checkpoints; the job record carries no checkpoint name) answered in 0.78 s with a 1,983,651-byte h264 + aac mp4 of the same 10.125 s, cached at `spark/data/adapter/watermarked/0dd0454c-….mp4`; a frame at 2 s shows "AI-generated" in white at the bottom-right at the intended size and margin; the second request came from the cache in 10 ms.

**Side by side:** settings-general@1440 — the row is unchanged; the switch's on state is the capture's accent track. The mark itself is ours (plain text; the reference's is its logo — Departures).
