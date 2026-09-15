# STORY_031 — Projects group tasks

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
**Created:** 2026-09-15, from [behaviour.md §2](../recon/2026-09-15/behaviour.md)

As the owner, I want projects — created from the sidebar, holding the tasks I start in them or move into them, each with its own page — so that a chain of clips for one film stays together.

## Current state

Projects › Add new project opens the Create project dialog with an inert Create (STORY_021); Recents ⋯ › Move to project and + › Add to project are inert submenus. Nothing in history knows a project.

## UI Mockup

**Reference captures:** `behaviour-project-create-01-dialog`, `…-02-named`, `…-04-projects-section` (the row "Recon test project — No tasks"), `behaviour-project-move-01-recents-move-submenu` (Add new project, then the projects), `…-02-attach-add-to-project-submenu` (No project ✓, Add new project, the projects), `…-04-project-row-hover` (the row's **Project actions** ⋯ and **New task**), `behaviour-project-delete-03-project-menu-right-click` (New task, Rename, Pin, Delete), `…-04-after-delete-click` (Cancel / Delete), `page-add-new-project@1440` (2026-09-14).

```
sidebar                                          project page  /project/:id
┌ Projects                     ⌄ ┐               ┌ My film                                    ┐
│  🗀 My film · 3 tasks   ⋯  +   │  hover        │ ○ 26-09-15-1224  Paper boat on rain puddle │
│     ○ 26-09-15-1224            │  (expanded)   │ ○ 26-09-15-1301  Same boat, wider          │
│     ○ 26-09-15-1301            │               │ [+ New task]                               │
│  + Add new project             │               └────────────────────────────────────────────┘
the row's ⋯ menu: New task · Rename · Pin · ─ · Delete (→ "Delete My film? Its 3 tasks stay in Recents." Cancel / Delete)
composer + › Add to project ›: ○ No project ✓ · + Add new project · 🗀 My film      (the choice shows as a chip next to the tag: "🗀 My film ×")
Recents ⋯ › Move to project ›: + Add new project · 🗀 My film · ○ No project
```

## Acceptance Criteria

- [ ] **Create:** the dialog's Create (`POST /api/projects { name }`, name required) adds a row to the Projects section and closes; the section unfolds if folded. Rename (inline, like Recents) and Delete (confirm; the tasks stay, unassigned) through the row's ⋯; Pin puts the project in the Pinned section (STORY_029's).
- [ ] **A task in a project:** the row's **New task** opens the home composer with the project chosen (a removable chip beside the video-creator tag); + › Add to project › picks or clears it; the job is created with `projectId` and the history entry carries it; the row shows "N tasks" and, expanded, its tasks as rows; the project's page `/project/:id` lists them with a New task button.
- [ ] **Move:** Recents ⋯ › Move to project › lists Add new project, the projects and No project; choosing one sends `PATCH /api/history/:id { projectId }` (null clears).
- [ ] Settings › Archived tasks groups by project name (STORY_030's "No project" first) and the **All projects ▾** filter narrows to one.
- [ ] Both widths (the drawer's Projects header unfolds — ours, unlike the reference's at 390), both themes; existing e2e green.

## Departures from the reference

- The project page has its own route (`/project/:id`); the reference stays on `/mavis`.
- The ⋯ opens the menu on a click (the reference's needed a right-click).

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
