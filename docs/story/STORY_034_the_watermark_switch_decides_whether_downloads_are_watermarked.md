# STORY_034 — The watermark switch decides whether downloads are watermarked

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
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

- [ ] The switch reads `GET /api/settings` and writes `PATCH /api/settings { removeWatermark: boolean }` (server-wide, in app data; default **true** — clean downloads, as the owner's reference account was found).
- [ ] With it off, `GET /api/jobs/:id/result?download` serves a copy of the video with "AI-generated" burned in at the bottom-right (white, 5 % of the height, 2 % margin); playback in the app (no `?download`) is always the clean file; the marked copy is made once per file and cached beside it on the Spark.
- [ ] The adapter's result route gains `?watermark=1`, produced with ffmpeg inside the adapter container (the image gains ffmpeg — a deliberate exception to its zero-dependency rule, written in the adapter's README); the stub honours the flag by serving the same fixture and setting an `x-watermark: 1` header so the app's tests can assert the decision without ffmpeg.
- [ ] The Assets preview's Download and the task page's Download behave the same; both themes; existing download e2e green.

## Departures from the reference

- The mark is ours ("AI-generated", plain text); the reference's is its logo.

## Technical Notes

- `lib/settings-store.ts` (`/data/settings.json`), routes `GET/PATCH /api/settings`; `SettingsDialog.tsx` reads through props from the Shell.
- `app/app/api/jobs/[id]/result/route.ts` forwards `?watermark=1` to the adapter when `download && !removeWatermark`.
- `spark/adapter`: `ffmpeg -i in.mp4 -vf "drawtext=text='AI-generated':fontcolor=white@0.85:fontsize=h*0.05:x=w-tw-w*0.02:y=h-th-h*0.02" -c:a copy out.mp4` cached as `<file>.watermarked.mp4`; the Dockerfile adds `ffmpeg` (Debian package); `test/fake-comfy.ts` unchanged; a unit test for the cache path and the command line; the adapter's README says why ffmpeg is there.
- **Coordination:** the adapter is restarted only when `curl localhost:4020/health` shows no open jobs (BUG_002); the other session is told first.

## Testing Plan

- **Unit** — `settings-store.test.ts`; adapter `watermark.test.ts` (command, cache naming).
- **Integration** — `settings.test.ts` (round-trip, validation); `jobs.test.ts`: with `removeWatermark: false` the download request carries the flag and the stub answers `x-watermark: 1`; with true it does not.
- **Component** — `dialogs.test.tsx`: the switch reflects the setting and PATCHes.
- **E2E** — `task.spec.ts`: toggle the switch off → Download → the response carries `x-watermark: 1`; toggle on → it does not.
- **Manual verification (model side):** one real download on the Spark with the switch off — the mark is visible bottom-right, audio intact; recorded in the Done note with the date.

## Estimated Complexity

Medium (the adapter half).
