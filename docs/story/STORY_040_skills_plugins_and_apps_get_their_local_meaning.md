# STORY_040 — Skills, plugins and apps get their local meaning

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — the last story
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
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

- [ ] **Plugins:** one row, video-creator, described from `GET /api/capabilities` (model, resolution, durations) with the adapter's reachability; the switch (`PATCH /api/settings { videoEnabled }`) hides the Video generation chip and the docked composer's video controls when off (a text-only workstation) and shows them when on; details opens the row's capabilities.
- [ ] **Skills:** `/data/skills.json` of `{ id, name, description, template }`; Create / Edit / Delete on the tab with a search; **Use** (and + › Skills › the skill) inserts the template into the composer with `{{idea}}` replaced by the current text; one built-in, **Short-to-script**, whose template is the base prompt scaffold STORY_020 documents (BACKLOG_005's rewriter becomes a second, model-backed skill later).
- [ ] **Apps:** the empty line above; no create.
- [ ] Both widths, both themes.

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
