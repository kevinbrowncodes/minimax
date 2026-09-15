# STORY_030 — A task can be archived and comes back from Settings › Archived tasks

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
**Created:** 2026-09-15, from [behaviour.md §1 Archive](../recon/2026-09-15/behaviour.md)

As the owner, I want to archive a task out of Recents and find it again under Settings › Archived tasks — searchable, restorable, deletable — so that Recents shows the work in hand and nothing is lost.

## Current state

The ⋯ › Archive entry and Settings › Archived tasks (a search field, an "All projects" filter, "No archived tasks.") are inert (STORY_021 / 026). History has no archived state; Recents, Search and Assets list every entry.

## UI Mockup

**Reference captures:** `behaviour-recents-archive-01-after-archive-click` (the toast), `…-02-archived`, `…-03-archived-tasks` (the list: a **No project** folder heading, a row with the title, "Sep 15, 2026, 12:11 PM", a trash icon and **Unarchive**; **Delete all** in the head), `…-04-archived-tasks-search`, `…-05-…-no-match`, `…-06-recents-after-restore`; the section's chrome from `settings-archived-tasks@1440` (2026-09-14).

```
Settings › Archived tasks                                              ┌ Delete all ┐ (red, head)
[🔍 Search archived tasks                          ] [All projects ▾]
🗀 No project
┌ 26-09-15-1224 — Paper boat on rain puddle                  🗑  [Unarchive] ┐
│ Sep 15, 2026, 12:11 PM                                                     │
└───────────────────────────────────────────────────────────────────────────┘
(no rows) → "No archived tasks."   (no match) → "No archived tasks match."
toast on Archive: "Task archived. Find it under Archived tasks in Settings."
```

## Acceptance Criteria

- [ ] **Archive:** ⋯ › Archive sends `PATCH /api/history/:id { archived: true }` with no confirmation; the row leaves Recents (and the Pinned section) at once; the toast reads as above; the task page still opens by URL.
- [ ] **Archived tasks:** lists archived entries newest-archived first under a **No project** heading (a heading per project once STORY_031 lands), each with the stamp and title, the archive time as "Sep 15, 2026, 12:11 PM" in local time, **Unarchive** (`{ archived: false }` — the row returns to Recents) and a trash button (delete from history after the same confirm as Recents › Delete); **Delete all** deletes every listed entry after a confirm naming the count; the search filters by title live ("No archived tasks match." when nothing does); **All projects ▾** is inert until STORY_031.
- [ ] Search (the dialog) and the Recents list exclude archived entries; **Assets keeps listing archived videos** (they are files the owner may still want — a departure, below).
- [ ] Both widths (at 390 Settings is the sheet; the list scrolls inside it), both themes; existing e2e green.

## Departures from the reference

- Assets keeps archived videos (the reference hides an archived session's files from the thread, not from the drive either).
- The row shows the creation stamp before the title (CHORE_008).

## Technical Notes

- `lib/history-store.ts`: `archived?: boolean`, `archivedAt?: string`; the PATCH route accepts `archived`; `HistoryStore.removeMany(ids)`.
- `lib/recents.ts`: `activeRecents(entries)` (not archived), `archivedRecents(entries)`; `formatArchivedAt(iso)` in `lib/task-view.ts` style.
- `SettingsDialog.tsx` › `ArchivedSection` becomes real (props from the Shell: entries, onUnarchive, onDelete, onDeleteAll); the Shell passes its recents and refetches.
- `DELETE /api/history?ids=…` or a `POST /api/history/delete { ids }` for Delete all (one request, one write).

## Testing Plan

- **Unit** — `history-store.test.ts` (archive sets `archivedAt`, unarchive clears it, `removeMany`); `recents.test.ts` (active / archived split, the date format).
- **Integration** — `history.test.ts`: archive round-trip; the bulk delete.
- **Component** — `dialogs.test.tsx`: the list, search, Unarchive and trash call their handlers, Delete all confirms with the count; `Sidebar.test.tsx`: Archive calls `onArchive`; archived rows are not rendered.
- **E2E** — `shell.spec.ts`: finish a job → Archive → gone from Recents and Search → Settings › Archived tasks lists it with the date → search finds it → Unarchive → back in Recents; a second job archived and deleted from the list; at 390 through the sheet.

## Estimated Complexity

Medium.
