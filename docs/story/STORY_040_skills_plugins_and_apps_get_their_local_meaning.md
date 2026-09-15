# STORY_040 — Skills, plugins and apps get their local meaning

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — the last story
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §4 and §5](../recon/2026-09-15/behaviour.md)

As the owner, I want Management's Plugins tab to show what actually runs (the video-creator = the Spark's adapter, with its status), the Skills tab and + › Skills to hold prompt recipes I can drop into the composer, and Apps to say plainly that there are none, so that nothing on the Management page is a placeholder.

## Current state

Management's Plugins / Skills / Apps tabs are the reference's counts and content, inert (STORY_025/026); + › Skills shows "No skills installed" with inert Manage skills / Add skill.

## UI Mockup

**Reference captures:** `behaviour-manage-tabs-02-tab-plugins` (video-creator with details and an enable switch), `…-03-tab-skills` (ten skills, Search skills), `…-04-tab-apps` ("No matching results"), `behaviour-attach-skills-01..02` (2026-09-15).

```
[Plugins 1]  video-creator — MiniMax-H3 on the Spark through the adapter · 768P · 4–15 s · ● reachable     (●) enabled
[Skills n]   Short-to-script   "Expands a one-line idea into the base prompt format"        [Use] [Edit] [Delete]
             + Create skill (name, description, template with {{idea}})                     [🔍 Search skills]
[Apps 0]     "No apps — MiniMax Local has no app store."
+ › Skills ›  Short-to-script · Manage skills (→ the Skills tab) · Add skill (→ Create skill)
```

## Acceptance Criteria

- [x] **Plugins:** one row, video-creator, described from `GET /api/capabilities` (model, resolution, durations) with the adapter's reachability; the switch (`PATCH /api/settings { videoEnabled }`) hides the Video generation chip and the docked composer's video controls when off (a text-only workstation) and shows them when on; details opens the row's capabilities.
- [x] **Skills:** `/data/skills.json` of `{ id, name, description, template }`; Create / Edit / Delete on the tab with a search; **Use** (and + › Skills › the skill) inserts the template into the composer with `{{idea}}` replaced by the current text; one built-in, **Short-to-script**, whose template is the base prompt scaffold STORY_020 documents (BACKLOG_005's rewriter becomes a second, model-backed skill later).
- [x] **Apps:** the empty line above; no create.
- [x] Both widths, both themes.

## Departures from the reference

- No marketplace, no install; skills are text templates, not code.

## Technical Notes

- `lib/skill-store.ts`, routes `/api/skills`; `ManagePage.tsx` tabs become real; `ComposerMenus.tsx` › Skills lists them and inserts; `settings-store` gains `videoEnabled`.

## Testing Plan

- **Unit** — `skill-store.test.ts`, `skills.test.ts` (template substitution).
- **Integration** — `skills.test.ts` (CRUD), `settings.test.ts` (`videoEnabled`).
- **Component** — `pages.test.tsx` (the three tabs), `Composer.test.tsx` (Use inserts; the chip hidden when video is off).
- **E2E** — `manage.spec.ts` (new): create a skill → + › Skills lists it → Use fills the composer; the plugin switch off hides Video generation, on restores it.

## Estimated Complexity

Medium.

## Done (2026-09-15)

**Landed:** Management's tabs are real (Plugins first, as the reference opens it from the Plugins row; the Agents tab keeps STORY_025's read-only editor — STORY_038 deferred; the guide's View now lands on `?tab=Agents`). **Plugins:** the one row, video-creator, described from `GET /api/capabilities` (the model's label, resolutions, the duration range, "● reachable" / "○ not reachable"), a Details disclosure with the capabilities, and a switch bound to the new server-wide setting `videoEnabled` (`lib/settings.ts`, `PATCH /api/settings`); off, the composer is a text-only workstation — no Video generation chip, no Showcase, no video controls even on the docked composer — through a `SettingsContext` the Shell provides (the watermark switch now goes through the same `update`). **Skills:** `lib/skills.ts` (the `Skill` shape, `applySkill` with the `{{idea}}` slot, the search, one built-in **Short-to-script** whose template is the STORY_020 base prompt scaffold) and `lib/skill-store.ts` (`skills.json` beside the history file; the built-in cannot be edited or deleted) behind `GET/POST /api/skills` and `PATCH/DELETE /api/skills/:id`; the tab lists them with the Built-in badge, searches, creates and edits through an inline form (a name and a template required), deletes after a confirm, and **Use** opens the home composer with the template (`/?skill=`; the composer is keyed by it); + › Skills lists them — a skill drops its template in with the typed idea in the slot — and Manage skills / Add skill open the tab (`?tab=Skills`, `&create=1`). A submenu entry now opens on click rather than toggling (a tap at 390 closed what the hover had opened — found by the e2e). **Apps:** "No apps — MiniMax Local has no app store."

**Tests:** `skills.test` (the built-in's template, `applySkill`, validation, search), `skill-store.test` (the built-in first, create / update / remove, protection, garbage), `settings-store.test` and `test/integration/settings.test` (`videoEnabled`), `test/integration/skills.test` (the routes incl. 400 / 404 and the built-in refused), `pages.test` (Plugins first with live counts; the row from the capabilities with Details and the switch calling `update`; not reachable; the Skills tab's list, protection, search, Create → POST, Edit → PATCH, Delete → confirm + DELETE, Use → the composer; the Apps line; the Create form on request; the STORY_025 assertions on the Agents tab), `Composer.test` (the Skills submenu lists the stored skills; a skill fills the idea; Manage / Add open the tab; `initialText`; the plugin off hides the Modes group and the docked video parameters), `Sidebar.test` (View now → `?tab=Agents`), `e2e/manage.spec` at desktop and narrow (the row's words from the stub's capabilities, Details, the switch off → no Video generation → on again; a skill created on the tab, listed under + › Skills, used with the typed idea, and Use from the tab landing on the home composer; the skill removed and the built-in refused at the end) plus the STORY_025 / 026 / 028 shell tests adjusted. Gate by hand: typecheck, lint, unit, integration (26), build + image, e2e 97 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** behaviour-manage-tabs-02 (the plugin row: glyph · name · one line · the switch) — ours; -03 (the skills rows: glyph · name · Built-in · one line) — ours with Use / Edit / Delete in place of the reference's switch (Departures: skills are templates, not code, and there is no marketplace); -04 ("No matching results") — ours says there are no apps and why.
