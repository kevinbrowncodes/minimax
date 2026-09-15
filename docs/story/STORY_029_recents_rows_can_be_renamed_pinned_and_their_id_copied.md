# STORY_029 — Recents rows can be renamed, pinned and their id copied

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — the second wiring story
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §1](../recon/2026-09-15/behaviour.md)

As the owner, I want a Recents row's Rename, Pin and Copy conversation ID to work — an inline rename that follows into the task title and Search, a Pinned section above Projects that keeps my important clips at hand, and the task id on the clipboard — so that a growing list of generations stays organised.

## Current state

The Recents ⋯ menu (STORY_021) renders Rename, Pin, Copy conversation ID and Move to project inert; the row's hover Pin icon is inert too; Delete is real. History has `title` (patchable: the PATCH route already accepts `title`) and no pin state. CHORE_008 names every row by its creation minute (`26-09-15-1224`) with the prompt-derived title as tooltip and accessible name; the task page's top bar and the Search dialog show the title.

## UI Mockup

**Reference captures:** `behaviour-recents-rename-01-menu`, `…-02-after-rename-click` (the row as an inline input), `…-03-renamed`, `behaviour-recents-pin-01-pinned` (the Pinned section above Projects), `…-02-menu-while-pinned` (Unpin), `behaviour-recents-copy-id-01-after-copy` (a toast), all in [docs/recon/2026-09-15/](../recon/2026-09-15/); the menu's look from `recents-row-menu-open@1440` (2026-09-14).

**Measured values:** the menu is 232 × 204, entries 32 px (Rename, Pin, Copy conversation ID, Move to project ›, separator, Archive, Delete); the inline input sits where the label was (219 × 26 at x 20); the Pinned section is a folding header like Projects, placed between the primary rows and Projects, holding rows drawn like Recents rows; toasts sit top-centre with a Close toast ×.

```
sidebar                                       the row while renaming
┌ …                          ┐                 ○ [Paper boat on rain puddle      ]  (input; Enter commits, Escape cancels)
│ Pinned                   ⌄ │
│  ○ 26-09-15-1224           │   ← pinned rows (menu entry reads Unpin; the hover pin icon is filled)
│ Projects                 ⌄ │
│ Recents                  ⌄ │
│  ○ 26-09-15-1224           │   ← still listed here too, as on the reference
│  ● 26-09-14-2300           │
└────────────────────────────┘
toast (top centre, 2 s):  "Task pinned" · "Task unpinned" · "Conversation ID copied" · "Task renamed"
```

## Acceptance Criteria

- [x] **Rename:** the ⋯ › Rename turns the row's label into an input holding the current **title**; Enter (or blur) commits `PATCH /api/history/:id { title }`, Escape cancels; the tooltip, the accessible name, the task page's top bar and the Search dialog show the new title at once; the visible label stays the creation stamp (CHORE_008 — the owner's rule). An empty title is refused (the input stays).
- [x] **Pin:** ⋯ › Pin (or the row's hover pin icon) sends `PATCH /api/history/:id { pinned: true }`; a **Pinned** section appears above Projects listing pinned rows newest-pinned first, folding like the others (its fold is remembered in the shell prefs); the row stays in Recents; the menu entry reads **Unpin** while pinned and the hover icon is filled; Unpin removes it from the section (the section disappears when empty). A toast says "Task pinned" / "Task unpinned".
- [x] **Copy conversation ID:** copies the task id to the clipboard and toasts "Conversation ID copied"; when the clipboard is unavailable the toast says so.
- [x] Both widths, both themes; the drawer at 390 keeps working with the section; every existing shell / task / assets e2e stays green.

## Departures from the reference

- The row's visible label stays the creation stamp (CHORE_008); Rename edits the title behind it.
- The id copied is our job id (a UUID), not a 15-digit number.

## Technical Notes

- `lib/history-store.ts`: `pinned?: boolean`, `pinnedAt?: string` on `HistoryEntry`; `HistoryPatch` gains them; the PATCH route accepts `pinned` (boolean) and sets / clears `pinnedAt`.
- `lib/route-title.ts` `RecentEntry` gains `pinned`, `pinnedAt`; `lib/recents.ts` gains `pinnedRecents(entries)` (newest `pinnedAt` first).
- `lib/shell-prefs.ts`: `Section` gains `"pinned"` (default unfolded); old stored values parse.
- `components/shell/Toast.tsx` (+ `useToast` in `ShellContext`): one `role="status"` toast at the top, 2 s, a Close ×; the Inert notice is untouched.
- `Sidebar.tsx`: `RecentRow` gains the inline rename (`renaming` state, an input), `onRename`, `onPin`, `onCopyId`; the Pinned section; the hover pin icon becomes a button.
- `Shell.tsx`: the handlers (PATCH, refetch recents, toast).

## Testing Plan

- **Unit** — `lib/history-store.test.ts`: pin sets / clears `pinnedAt`; `lib/recents.test.ts`: `pinnedRecents` order; `lib/shell-prefs.test.ts`: the pinned fold and old values.
- **Integration** — `test/integration/history.test.ts` (or the existing history integration file): `PATCH { pinned: true }` persists and lists; `{ pinned: "x" }` is a 400.
- **Component** — `Sidebar.test.tsx`: Rename shows the input with the title, Enter calls `onRename` with the new value, Escape cancels, empty is refused; Pin calls `onPin`; the Pinned section renders pinned rows and Unpin; `Toast.test.tsx`: shows and clears after 2 s under StrictMode with fake timers.
- **E2E** — `shell.spec.ts`: finish a job, Rename it through the ⋯ → the task title in the top bar and the Search dialog show the new title, the row label is still the stamp; Pin → the Pinned section lists it above Projects, Unpin removes it; Copy conversation ID → the clipboard (stubbed as in task.spec) holds the id; at 390 through the drawer.

## Estimated Complexity

Medium.

## Done (2026-09-15)

**Landed:** `HistoryEntry` carries `pinned` / `pinnedAt`; `PATCH /api/history/:id` takes a boolean `pinned` (stamping and clearing `pinnedAt`), trims a `title` and refuses a blank one. `pinnedRecents` orders the **Pinned** section (newest pin first) above Projects, whose fold is a `Section` in the shell prefs (`folded.pinned`, open by default; old stored values still parse). `RecentRow` renders Rename as an inline input holding the title — Enter / blur commit, Escape cancels, blank stays — the hover pin as a real `aria-pressed` button (filled and always shown while pinned), and the menu's Pin / Unpin and Copy conversation ID; Move to project and Archive keep the notice until STORY_031 / STORY_030. `Shell.tsx` PATCHes, refetches the list and toasts through a new `Toast` (`role="status"`, 2 s, Close ×) owned by `ShellContext` (`toast` / `notify` / `clearToast`). Copy uses `navigator.clipboard` and says "Clipboard unavailable — the ID is …" when there is none. The task's top bar title carries `data-testid="topbar-title"` for the spec.

**Tests:** `history-store.test` (patch sets / clears pinnedAt), `recents.test` (`pinnedRecents`), `shell-prefs.test` (the pinned fold, defaults, old values), `Toast.test` (StrictMode + fake timers: 2 s, ×, a new message restarts the clock), `Sidebar.test` (rename input flow, Pin / Unpin / Copy handlers, the Pinned section above Projects with both copies of the row, folded hides its rows), `test/integration/history.test` (title trimmed, blank 400, `pinned` boolean 200 / `"x"` 400, unpin clears pinnedAt, the list carries the title), `e2e/shell.spec` "a Recents row is renamed inline, pinned into the Pinned section, and its id copied" at desktop and narrow (rename → PATCH ok, toast, top bar title, label still the stamp, toast gone by itself; hover pin → the section above Projects, two copies of the row, the store says pinned; Copy → the stubbed clipboard holds the id; Unpin → the section is gone). Gate by hand: typecheck, lint, unit, integration, build + image, e2e 79 passed / 9 skipped, and again in the pre-push hook.

**Side by side:** behaviour-recents-rename-02 (the input in the row) and behaviour-recents-pin-01-pinned (the Pinned section, the toast top-centre) — ours matches the placement and wording; deltas: the visible label is the creation stamp (CHORE_008, a departure by the owner's rule), the id is a UUID, and the toast has our own border and shadow tokens rather than the reference's unmeasured ones.
