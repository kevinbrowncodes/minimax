# STORY_030 — A task can be archived and comes back from Settings › Archived tasks

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
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
toast on Archive (corrected 2026-09-15 against behaviour-recents-archive-01, ℹ at the left, × at the right):
  ⓘ  Undo  or view archived tasks in  Settings                                 ×
     ^^^^ link: unarchives             ^^^^^^^^ link: opens Settings › Archived tasks
```

## Acceptance Criteria

- [x] **Archive:** ⋯ › Archive sends `PATCH /api/history/:id { archived: true }` with no confirmation; the row leaves Recents (and the Pinned section) at once; the toast reads as above; the task page still opens by URL.
  *Corrected 2026-09-15, before implementation (CLAUDE.md §3.8):* the capture `behaviour-recents-archive-01-after-archive-click` shows the reference's toast is **"Undo or view archived tasks in Settings"** — an ℹ icon, **Undo** (a link that unarchives) and **Settings** (a link that opens Settings › Archived tasks) — not "Task archived. Find it under Archived tasks in Settings." as first drafted from the behaviour.md paraphrase. The story implements the captured wording and both links.
- [x] **Archived tasks:** lists archived entries newest-archived first under a **No project** heading (a heading per project once STORY_031 lands), each with the stamp and title, the archive time as "Sep 15, 2026, 12:11 PM" in local time, **Unarchive** (`{ archived: false }` — the row returns to Recents) and a trash button (delete from history after the same confirm as Recents › Delete); **Delete all** deletes every listed entry after a confirm naming the count; the search filters by title live ("No archived tasks match." when nothing does); **All projects ▾** is inert until STORY_031.
- [x] Search (the dialog) and the Recents list exclude archived entries; **Assets keeps listing archived videos** (they are files the owner may still want — a departure, below).
- [x] Both widths (at 390 Settings is the sheet; the list scrolls inside it), both themes; existing e2e green.

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

## Done (2026-09-15)

**Landed:** `HistoryEntry` carries `archived` / `archivedAt`; `PATCH /api/history/:id` takes a boolean `archived` (stamping and clearing `archivedAt`, the same path as `pinned`); `DELETE /api/history?ids=a,b` forgets every listed entry in one write (`HistoryStore.removeMany`; an empty list is a 400). `activeRecents` keeps archived rows out of Recents, the Pinned section and the Search dialog; `archivedRecents` orders Settings › Archived tasks newest archive first; `formatArchivedAt` writes "Sep 15, 2026, 12:11 PM". The ⋯ › Archive is real (no confirm); the Shell answers with the captured toast — an ℹ, **Undo** (unarchives) and **Settings** (opens the dialog on Archived tasks through `SettingsDialog.initialSection`) as links — for six seconds. `ArchivedSection` lists the rows under the **No project** folder heading (stamp — title, the archive time, a trash that runs the Recents › Delete confirm, **Unarchive**), filters live ("No archived tasks match."), says "No archived tasks." when empty, and carries **Delete all** beside the panel title (in the toolbar at 390, where the head is hidden) — one confirm naming the count, one DELETE, the task page left if it was among them. The **All projects ▾** filter stays inert for STORY_031. Assets is untouched and keeps listing archived videos (Departures). The Toast gained tones on the way: the STORY_029 confirmations are now the reference's green check pill (behaviour-recents-pin-01-pinned), the archive toast the neutral ℹ pill — a fidelity fix to STORY_029's neutral toast, done here because the tone is this story's second variant.

**Tests:** `history-store.test` (archive / unarchive patch, `removeMany` count and one write), `recents.test` (`activeRecents`, `archivedRecents`, `formatArchivedAt` incl. midnight and 1 PM), `Toast.test` (tones, the links act, the duration option), `Sidebar.test` (Archive calls its handler with no confirm; an archived row is in neither Recents nor Pinned; all archived reads as "No task history."), `dialogs.test` (Archived tasks opens on `initialSection`, the rows' text incl. the date, Unarchive / trash / Delete all call their handlers, the live search and its no-match line, the empty state without Delete all; Search does not list an archived task), `test/integration/history.test` (`archived` boolean 200 / `"yes"` 400, the list still carries it, unarchive clears the stamp; `DELETE ?ids=` 400 on empty, `{ removed: 2 }`, the survivor listed), `e2e/shell.spec` "Archive takes a task out of Recents and Search into Settings › Archived tasks…" at desktop and narrow (two finished jobs; Archive → PATCH ok, the toast's wording, the row gone, the other still there; the task still opens by URL; Search finds the other only; Settings › Archived tasks shows one row with a date, the search misses then hits, Unarchive → PATCH ok → "No archived tasks." → the row is back; the second job's toast Undo restores it; its Settings link lands on Archived tasks; Delete all → confirm → DELETE ok → the store has lost it and kept the first). Gate by hand: typecheck, lint, unit, integration, build + image, e2e 81 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** behaviour-recents-archive-01 (the toast — ours has the same words, links and ×; the ℹ is our icon) and -03 (the list — the same head with Delete all, the folder heading, the row with trash and Unarchive on the grey ground). Deltas: the row leads with the creation stamp (CHORE_008); the archive toast's six seconds are our choice (the reference's timing was not measured); the ℹ and the folder glyphs are ours.
