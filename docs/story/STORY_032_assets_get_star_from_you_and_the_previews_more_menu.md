# STORY_032 — Assets get Star, From you and the preview's ⋯

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §3 and §5](../recon/2026-09-15/behaviour.md)

As the owner, I want to star the clips worth extending and find them under Star, to see the reference images I attached under From you / Images, and a preview ⋯ that does things — so that Assets is where I pick the next clip's starting point.

## Current state

Assets (STORY_024/026) has real tiles, search, Locate in task, Send to new task and Delete; **Star** in the tile and preview menus, the **From you** and **Star** tabs, the **Images / Audio** chips and the preview's **⋯** are inert / empty. The jobs route forwards reference images to the adapter and keeps nothing.

## UI Mockup

**Reference captures:** `behaviour-assets-star-01-starred`, `…-02-star-tab`, `…-03-menu-while-starred` (Unstar), `behaviour-assets-upload-02-from-you` (empty), `behaviour-preview-more-03-preview-more-menu` (Download, Copy, Refresh, Star), plus `assets-*@1440` (2026-09-14).

```
Assets  [From agent] From you  Star      All · Images · Videos · Audio        [🔍 …]
From you › Images: the reference images, one tile each (poster = the image, name = the file name, ⋯ → Locate in task · Delete)
Star: starred videos only; the tile ⋯ reads Unstar
preview ⋯ (top right of the preview): Download · Copy link · Star/Unstar         (Refresh dropped — departure)
```

## Acceptance Criteria

- [x] **Star:** the tile ⋯ and the preview ⋯ toggle **Star / Unstar** (`PATCH /api/history/:id { starred }`); the **Star** tab lists starred videos; a toast says "Starred" / "Unstarred".
  *Corrected 2026-09-15, before implementation (CLAUDE.md §3.8):* `behaviour-assets-star-01-starred` shows the tile unchanged after Star — no badge — and a green "Starred" toast; the signals are the toast, the Star tab and the ⋯ reading Unstar. The badge first drafted here is dropped. Also, `behaviour-preview-more-03` places the "preview ⋯" on the **task page's preview pane** (its Download ▾ opens Download · Copy · Refresh · Star), so the third AC applies to that pane's menu as well as to the Assets preview modal's ⋯ (whose Star becomes real too).
- [x] **From you:** the reference images attached to a job are kept as files with the job; **From you** lists them (and the **Images** chip filters to them, on both tabs) as tiles named by the original file name, previewable (an image in the preview), with Locate in task and Delete (deletes the file only); **Audio** stays empty with the shared empty state.
- [x] **The preview ⋯:** Download (as today), **Copy link** (the result URL on the clipboard, a toast), Star / Unstar; Refresh is not offered.
- [x] Both widths (the 390 Filter button shows the tabs as today), both themes; `assets.spec.ts` / `extend.spec.ts` green.

## Departures from the reference

- No Refresh (the reference's meaning is unclear and a re-generation is Retry / Extend here).
- Uploads appear as soon as the job is created (the reference waits for the message).

## Technical Notes

- `POST /api/jobs` (multipart) writes each reference image to `${APP_DATA}/uploads/<jobId>/<n>-<original name>` before forwarding; `HistoryEntry.referenceFiles?: { name: string; file: string; size: number }[]`; `GET /api/history/:id/reference/:n` serves it; `DELETE …/reference/:n` removes the file and the entry.
- `HistoryEntry.starred?: boolean`; `lib/assets-filter.ts` gains the tab and the `Images` chip semantics; `AssetsPage.tsx` renders image tiles (`AssetMenu` variants).
- `APP_DATA` = the directory of `HISTORY_FILE` (already `/data` in the container).

## Testing Plan

- **Unit** — `assets-filter.test.ts` (Star tab, From you, Images); `history-store.test.ts` (starred, referenceFiles).
- **Integration** — `jobs.test.ts`: a multipart job stores the files and the entry lists them; `GET /reference/:n` serves the bytes; the delete.
- **Component** — `AssetsPage.test.tsx`: Star / Unstar, the Star tab, From you tiles, the preview ⋯ entries.
- **E2E** — `assets.spec.ts`: image-to-video job → From you lists the fixture image and Images filters to it; Star a video → the Star tab; the preview ⋯ Copy link.

## Estimated Complexity

Medium.

## Done (2026-09-15)

**Landed:** `HistoryEntry.starred` (a boolean through `PATCH /api/history/:id`) and `HistoryEntry.referenceFiles` — the reference images a multipart job carried, written by `POST /api/jobs` after the model accepted the job to `uploads/<job>/<n>-<name>` beside the history file (`lib/uploads.ts`; `/data/uploads` in the container), served inline with their type and name by `GET /api/history/:id/reference/:n`, removed one at a time by its `DELETE` (the task stays) and all together when the entry is forgotten (single or Delete all). `lib/assets-filter.ts` gained the item model (`assetItems`: From agent = the videos, Images = the reference images on From agent and From you, From you = the images, Star = the starred videos, Audio empty; the search matches the task's title, its file name and an image's name). The Assets page renders image tiles (the image as its poster, no play glyph, an image in the preview), a real **Star / Unstar** on the tile and preview menus with the reference's "Starred" toast, and **Copy link** in the preview's ⋯ (the result URL, "Link copied"). The task page's preview pane splits Download into the link and a ▾ that opens the captured menu — Download · Copy link · Star / Unstar (no Refresh, Departures) — with the same PATCH and toast.

**Tests:** `assets-filter.test` (the Star tab, From you, the Images chip on both tabs and not on Star, Audio, the image-name search, `referenceUrl`), `history-store.test` (starred / referenceFiles patch), `uploads.test` (the files under uploads/<job>, the numbering, safe names, removal), `test/integration/uploads.test` (two images kept with their sizes and types, served as image/png inline, one deleted and its slot gone, a 404 after, the directory gone with the entry; a JSON job keeps nothing), `test/integration/history.test` (starred 200 / 400), `AssetsPage.test` (Star → PATCH → the Star tab → Unstar → empty; the From you tiles, the image preview, the two-entry menu, Delete of the file only, no videos under From you; Copy link; the preview menu's six entries), `TaskPage.test` (the pane's ▾ menu: three entries, Star → PATCH → Unstar, Copy link, Escape), `e2e/assets.spec` "Star through the tile ⋯ → the Star tab and Unstar; From you lists the reference image, previews it and deletes the file only" and "the preview's Copy link…" plus `e2e/task.spec` "the preview pane's Download ▾ offers Copy link and Star", all at desktop and narrow (at 390 through the preview's ⋯, as STORY_024 has it). Gate by hand: typecheck, lint, unit, integration (22), build + image, e2e 88 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** behaviour-assets-star-01 (the green "Starred" toast, the tile unchanged) and -03 (Unstar in the ⋯) — ours matches; behaviour-preview-more-03 (Download ▾ → a 170-wide menu) — ours has the same three real entries and no Refresh; behaviour-assets-upload-02 (From you empty on the reference until a message is sent) — ours lists the image as soon as the job exists (Departures). The star has no badge on either side.
