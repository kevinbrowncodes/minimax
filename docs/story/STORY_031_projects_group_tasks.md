# STORY_031 — Projects group tasks

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §2](../recon/2026-09-15/behaviour.md)

As the owner, I want projects — created from the sidebar, holding the tasks I start in them or move into them, each with its own page — so that a chain of clips for one film stays together.

## Current state

Projects › Add new project opens the Create project dialog with an inert Create (STORY_021); Recents ⋯ › Move to project and + › Add to project are inert submenus. Nothing in history knows a project.

## UI Mockup

**Reference captures:** `behaviour-project-create-01-dialog`, `…-02-named`, `…-04-projects-section` (the row "Recon test project — No tasks"), `behaviour-project-move-01-recents-move-submenu` (Add new project, then the projects), `…-02-attach-add-to-project-submenu` (No project ✓, Add new project, the projects), `…-04-project-row-hover` (the row's **Project actions** ⋯ and **New task**), `behaviour-project-delete-03-project-menu-right-click` (New task, Rename, Pin, Delete), `…-04-after-delete-click` (Cancel / Delete), `page-add-new-project@1440` (2026-09-14).

```
sidebar                                          project page  /project/:id
┌ Projects                     ⌄ ┐               ┌ My film                                    ┐
│  🗀 My film             ⋯  +   │  hover        │ ○ 26-09-15-1224  Paper boat on rain puddle │
│     ○ 26-09-15-1224            │  (expanded)   │ ○ 26-09-15-1301  Same boat, wider          │
│     ○ 26-09-15-1301            │               │ [+ New task]                               │
│  + Add new project             │               └────────────────────────────────────────────┘
(corrected 2026-09-15 against behaviour-project-create-04 / -delete-04: the row is the name alone; expanded, "No tasks" or its rows)
the row's ⋯ menu: New task · Rename · Pin · ─ · Delete → the "Delete project" dialog:
  ┌ Delete project                                                       ┐
  │ Are you sure you want to delete project "My film"? This action       │
  │ cannot be undone.                                  [Cancel] [Delete] │  (Delete red; ours adds: "Its 3 tasks stay in Recents.")
  └──────────────────────────────────────────────────────────────────────┘
composer + › Add to project ›: ○ No project ✓ · + Add new project · 🗀 My film      (the choice shows as a chip next to the tag: "🗀 My film ×")
Recents ⋯ › Move to project ›: + Add new project · 🗀 My film · ○ No project
```

## Acceptance Criteria

- [x] **Create:** the dialog's Create (`POST /api/projects { name }`, name required) adds a row to the Projects section and closes; the section unfolds if folded. Rename (inline, like Recents) and Delete (confirm; the tasks stay, unassigned) through the row's ⋯; Pin puts the project in the Pinned section (STORY_029's).
- [x] **A task in a project:** the row's **New task** opens the home composer with the project chosen (a removable chip beside the video-creator tag); + › Add to project › picks or clears it; the job is created with `projectId` and the history entry carries it; the row shows the project's name and, expanded (a click on the row), its tasks as rows or "No tasks"; the project's page `/project/:id` lists them with a New task button.
  *Corrected 2026-09-15, before implementation (CLAUDE.md §3.8):* `behaviour-project-create-04-projects-section` and `-delete-03` show the row as the name alone with "No tasks" beneath it once expanded — no "N tasks" count on the row, as first drafted. Delete (the first AC) opens the reference's **Delete project** dialog — "Are you sure you want to delete project "<name>"? This action cannot be undone." with Cancel and a red Delete (`behaviour-project-delete-04-after-delete-click`) — not a bare Cancel / Delete; ours adds one sentence, "Its N tasks stay in Recents.", because here they do (Departures).
- [x] **Move:** Recents ⋯ › Move to project › lists Add new project, the projects and No project; choosing one sends `PATCH /api/history/:id { projectId }` (null clears).
- [x] Settings › Archived tasks groups by project name (STORY_030's "No project" first) and the **All projects ▾** filter narrows to one.
- [x] Both widths (the drawer's Projects header unfolds — ours, unlike the reference's at 390), both themes; existing e2e green.

## Departures from the reference

- The project page has its own route (`/project/:id`); the reference stays on `/mavis`.
- The ⋯ opens the menu on a click (the reference's needed a right-click).
- Deleting a project keeps its tasks (unassigned, still in Recents); the dialog says so in one added sentence. The reference's dialog only says the action cannot be undone (its project held no tasks during recon, so what it does to them is unrecorded).

## Technical Notes

- `lib/project-store.ts` (same shape as the history store; `/data/projects.json`): `{ id, name, createdAt, pinned?, pinnedAt? }`; routes `GET/POST /api/projects`, `PATCH/DELETE /api/projects/:id`.
- `HistoryEntry.projectId?: string`; the PATCH route accepts `projectId: string | null`; `POST /api/jobs` accepts `projectId` (JSON and multipart) and stores it.
- `lib/composer-state.ts`: `projectId` in state, `set-project`; `submit-job` sends it.
- `Sidebar.tsx`: `ProjectRow` (folding, count, ⋯ menu, New task); `app/app/project/[id]/page.tsx` + `components/project/ProjectPage.tsx`; the Pinned section accepts projects (`item_type`).

## Testing Plan

- **Unit** — `project-store.test.ts`; `composer-state.test.ts` (project choice survives mode changes, cleared with No project); `recents.test.ts` (tasks of a project).
- **Integration** — `projects.test.ts`: create / rename / delete; a job created with `projectId` is listed under it; delete leaves the tasks.
- **Component** — `Sidebar.test.tsx` (the row, its menu, the count, the expansion); `Composer.test.tsx` (Add to project submenu, the chip, the field posted); `dialogs.test.tsx` (Create); `ProjectPage.test.tsx`.
- **E2E** — `projects.spec.ts` (new): create a project → New task from its row → send → the row says 1 task, the project page lists it; Move a Recents task into it; Delete the project → the tasks stay in Recents; at 390 through the drawer.

## Estimated Complexity

Large.

## Done (2026-09-15)

**Landed:** `lib/project-store.ts` (the history store's shape at `PROJECTS_FILE` — `/data/projects.json` in the container, a temp file for the gate and e2e) with `GET/POST /api/projects` and `PATCH/DELETE /api/projects/:id` (rename, pin; delete leaves the tasks through `HistoryStore.unassignProject`). `HistoryEntry.projectId` is set by `POST /api/jobs` (JSON and multipart; an unknown project is a 400 before any job exists; the field is stripped from what goes to the model) and by `PATCH /api/history/:id { projectId | null }`. The composer holds `projectId` in its state (`initialComposer(projectId)`, the `project` action; survives mode changes), posts it, and shows it as a removable chip beside the tag; + › Add to project is No project ✓ · Add new project · the projects (real `menuitemradio`s); Add new project asks the Shell through `ProjectsContext.openCreate(onCreated)` and takes the project it makes. The sidebar's `ProjectRow`: the folder and name, a click opens `/project/:id` and expands the row to its tasks (`tasksOf`) or "No tasks", hover **Project actions** ⋯ (New task · Rename inline · Pin / Unpin · Delete) and **New task** (`/?project=`; the home page keys the composer by project so a client-side navigation cannot keep a stale composer — found by the e2e); pinned projects sit in the Pinned section with the tasks, newest pin first. Recents ⋯ › Move to project › is a real submenu (Add new project · the projects · No project, the current one ✓). `CreateProjectDialog` creates (Create inactive until a name, Enter submits, an error line); `DeleteProjectDialog` is the reference's "Delete project" dialog plus our "Its N tasks stay in Recents." `ProjectPage` at `/project/:id` (name, the tasks as stamp + title rows, + New task). Settings › Archived tasks groups by project (No project first) and its filter is a real select (All projects · No project · each project). The task page's docked composer starts in the task's own project, so an Extend lands beside its source. `RecentRow` and `ProjectRow` share `useRowMenu` and `RenameInput` (the rename commits once; an unmount's blur is ignored).

**Tests:** `project-store.test` (create / list / get / patch / remove, atomic writes, `PROJECTS_FILE`), `composer-state.test` (the project action and its survival), `submit-job.test` (projectId in JSON and multipart), `recents.test` (`tasksOf`, `groupByProject`), `route-title.test` (`activeRow` project), `test/integration/projects.test` (the routes incl. 400 / 404 cases; a job with projectId is recorded and the stub never receives the field, JSON and multipart; Move with null and an unknown id; a deleted project's tasks survive unassigned), `dialogs.test` (Create with a handler, the Delete dialog's words and buttons, the grouped archived list and its filter, the filter combobox replacing the inert button), `Sidebar.test` (project rows, expansion, hover actions, the menu's four entries, rename / pin / delete / new task handlers, the pinned project, the Move submenu incl. Add new project's callback), `Composer.test` (the submenu's radios, the chip, the posted field, remove, Add new project's callback, `initialProjectId`), `ProjectPage.test`, `e2e/projects.spec` at desktop and narrow (create → the row; New task → the chip → a job in the project; the row expands and the page lists it; Move from Recents with the toast; Delete through the dialog → both tasks still in Recents, unassigned; every entry removed at the end; prompts carry a per-run tag so a failed earlier attempt cannot collide). Gate by hand: typecheck, lint, unit, integration (20), build + image, e2e 83 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** behaviour-project-create-04 (the row is the name with the folder), -move-04 (⋯ and + on hover), -delete-03 (the four-entry menu; ours opens on a click — Departures), -delete-04 (the dialog's words; ours adds the tasks sentence), -move-01 and -move-02 (the submenus; ours adds No project at the end of Move). The project page is ours (`/project/:id`; the reference stays on `/mavis`).
