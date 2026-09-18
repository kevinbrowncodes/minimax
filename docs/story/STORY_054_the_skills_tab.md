# STORY_054 — The Skills tab

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the eighth story; the tidy-up once the chip's menu lists the folders. After [STORY_053](STORY_053_the_chain_director.md) (two folders to list)
**Status:** Done (2026-09-17 20:10 EDT — built and gated while STORY_053's chain drew on the Spark; deployed once the chain finished — never mid-job; the screenshots are in the Done note. Proposed 03:20 EDT — drafted with 048–055 at the owner's request; from EPIC_009 as revised in aa7092d and the owner's answers of 00:50 — the `{{idea}}` snippets stay, under a **Templates** section; the skill's metadata shows on the Skills tab only)
**Created:** 2026-09-17

As the owner, I want Management › Skills to list the director skills the agent follows — the folders under `agents/skills/`, with what each was verified against — and `+ › Skills` to pick the one the agent uses, so that those two surfaces mean on MiniMax Local what they mean on agent.minimax.io; and I want my `{{idea}}` snippets kept, as **Templates**, so nothing STORY_040 gave me is lost.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **Management › Skills** (`components/pages/ManagePage.tsx`, STORY_040; `behaviour-manage-tabs-03-tab-skills@1440`): a search field, **Create skill** (a form: name, description, the template with `{{idea}}`), rows of glyph · name · *Built-in* badge · one description line · **Use** (→ `/?skill=<id>`, the template into the composer) · Edit · Delete; the tab's count is the snippet count; one built-in, *Short-to-script* (`lib/skills.ts`), the rest in `skills.json` (`lib/skill-store.ts`, `GET/POST /api/skills`, `…/[id]`). `?tab=Skills&create=1` opens the form (from `+ › Skills › Add skill`).
- **`+ › Skills`** (`components/composer/ComposerMenus.tsx` › `AttachMenu`; `attach-skills-submenu-open@1440`): the snippets as `menuitem`s (a click drops the template into the box), a separator, *Manage skills* and *Add skill*.
- **The director skills** are STORY_049's `GET /api/agent/skills` (`{ id, name, description, metadata }` per folder); the chip's menu (STORY_050) lists them as name + description and saves the choice as `agentSkill` in the settings store; STORY_053 added the second folder. Nothing lists a skill's `metadata` anywhere yet (the owner: the tab, not the menu).
- **Management › Agents** (STORY_025, `behaviour-manage-agents-01`): the reference's inert editor; untouched by this epic (EPIC_009 › Not in this epic: personas).
- **The reference's own Skills tab** lists the skills its agent follows, each with a description and a *Built-in* badge, with a Search field — the meaning STORY_040 borrowed for snippets because no agent existed then.

## UI Mockup

**Reference capture:** `behaviour-manage-tabs-03-tab-skills@1440` (2026-09-15: the tab — Search, rows of glyph · name · *Built-in* · a description line — the row's type 14 px/400 `rgb(23,23,23)`, the line 13 px `rgb(102,102,102)`), `attach-skills-submenu-open@1440` / `narrow-attach-skills-submenu-open@390` and `behaviour-attach-skills-01/02` (2026-09-15: the submenu, *Manage skills*, *Add skill*). Ours keeps every element and adds a second section.

**The Skills tab:**

```
┌ Plugins 1 │ Skills 4 │ Apps 0 │ Agents 3 ┐
│ 🔍 Search skills                                                                              │
│                                                                                               │
│ Director skills                                                          the agent follows one │
│ ◇ Thirst trap director   Folder                                                       [Use]  │
│   Directs one thirst-trap short from one attached photo — a candid, believable 10-second…     │
│   MiniMax-H3 · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.4.0 · verified 2026-09-16 │
│ ◇ Chain director         Folder                                                       [Use]  │
│   Directs a whole thirst-trap video from one photo as several ten-second segments…            │
│   MiniMax-H3 · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.5.0 · verified 2026-09-18 │
│   A skill is a folder under agents/skills/ — add one by adding a folder and rebuilding the app.│
│                                                                                               │
│ Templates                                                     snippets that fill the composer │
│ [+ Create template]                                                                           │
│ ◇ Short-to-script  Built-in                                            [Use] [Edit] [Delete]  │
│   Expands a one-line idea into the base prompt format the model expects…                      │
│ ◇ Loop                                                                 [Use] [Edit] [Delete]  │
│   Seamless loops…                                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Use** on a director row → the home composer in video mode with the chip **on** and that skill chosen (`/?agent=<id>`; the e2e lane's script query is `?agentScript=`, STORY_050's, so the two never collide). **Use** on a template → today's `/?skill=<id>`. The search filters both sections; a section with no match hides its heading; no match at all → *No matching results*. **A folder whose `SKILL.md` failed to parse** does not appear (STORY_049 logs it) — the note under the list says how to add one.

**`+ › Skills`:**

```
┌ Skills ─────────────────────────────────────────┐
│ ● Thirst trap director                        ✓ │   ← menuitemradio: picks the agent's skill and turns the chip on
│ ○ Chain director                                │
│ ─────────────────────────────────────────────── │
│ Templates                                     › │   ← the snippets as today (a click drops the template in)
│ ─────────────────────────────────────────────── │
│ ⚙ Manage skills                                 │   → /plugins?tab=Skills
│ ⊕ Add template                                  │   → /plugins?tab=Skills&create=1
└─────────────────────────────────────────────────┘
```

**Narrow (iPhone 13)** — the tab's rows stack the meta line under the description and the buttons under the row (STORY_040's narrow rule); the submenu's *Templates ›* opens as a third level at 390 exactly as *Skills ›* does today. **Both themes.**

## Acceptance Criteria

- [x] **Director skills section** on Management › Skills, above the snippets: one row per entry of `GET /api/agent/skills` — the glyph, the short name (`metadata["minimax-short-name"]` or the name), a *Folder* badge in the *Built-in* badge's chrome, the description on one line (ellipsis, the full text in `title`), and a **meta line** from the metadata: model · checkpoint · ComfyUI · adapter · *verified* date (the keys `minimax-model`, `minimax-checkpoint`, `minimax-comfyui`, `minimax-adapter`, `minimax-verified-on`; a missing key is skipped); **Use** (`aria-label="Use <name>"`) navigates to `/?agent=<id>`, and the composer enters video mode with the chip on and `agentSkill` set (PATCHed) — no Edit, no Delete (a folder is edited in git). The note *A skill is a folder under `agents/skills/` — add one by adding a folder and rebuilding the app* under the section links the README's Agent mode section. The tab's count is directors + templates.
- [x] **Templates section** below: STORY_040's snippets exactly as they are — the button reads **Create template**, the form's labels say *template* (`aria-label="Create template"` / `"Edit template"`), the rows keep *Built-in*, Use, Edit, Delete; `?tab=Skills&create=1` opens the form; the routes and the store are unchanged (`/api/skills` keeps its name — the type is still `Skill` in `lib/skills.ts`; a rename is not worth the churn, said so).
- [x] **`+ › Skills`** lists the director skills as `menuitemradio` rows (the chosen one checked — `agentSkill`, or the first by id), a separator, a **Templates ›** submenu holding today's snippet items (a click inserts the template, as today), a separator, *Manage skills* and **Add template**; picking a director sets `agentSkill` (PATCH) and turns the chip on; in text mode or extend mode the director rows are disabled with the chip's own reason in `title`.
- [x] **The search** filters both sections by name and description; the empty line when nothing matches either.
- [x] **Both widths, both themes**; Management › Agents untouched; STORY_040's `manage.spec` updated to the Templates wording and said which cases changed.

## Departures from the reference

- The reference's Skills tab has one list; ours has two sections because the snippets are ours (STORY_040's departure, kept by the owner's decision). The *Folder* badge and the meta line are ours — the reference shows *Built-in* and a description.
- The reference's `+ › Skills` toggles which skills its agent may use; ours picks the one director the agent follows (one at a time is the epic's model) and adds the *Templates ›* level.

## Technical Notes

- `ManagePage.tsx`: the Skills tab renders `<DirectorSkills>` (new file, `components/pages/DirectorSkills.tsx`) above the existing snippet block; the snippet block's strings change to *template*; `counts.Skills = directors.length + skills.length`; the meta line is a pure `skillMetaLine(metadata)` in `lib/agent-skills.ts` (new, shared with the chip's menu title at 390).
- `ComposerMenus.tsx` › `AttachMenu` gains `directors`, `agentSkillId`, `onPickDirector`, and moves the snippet items under a `Templates` entry (the `entry()` helper already nests one level; a second level reuses it).
- `app/page.tsx`: `?agent=<id>` → `initialAgentSkill`; the composer dispatches `agent-skill` + `agent-toggle` on mount when given one and the skill exists. `lib/submit-job.ts` › `submitAgentRun` already reads `?agentScript=` (STORY_050).
- No new routes; no store change.

## Testing Plan

- **Unit (`pnpm test`)** — `agent-skills.test.ts` (new): `skillMetaLine` with all five keys, with some missing, with none; `searchSkills` unchanged (said so). `composer-state.test.ts`: the mount dispatches for `initialAgentSkill` with an existing and a missing id.
- **Component (`ManagePage.test.tsx`, `ComposerMenus.test.tsx`, `Composer.test.tsx`)** — the tab shows both sections with the two directors' meta lines and the *Folder* badge, no Edit/Delete on them, Use pushes `/?agent=<id>`; the templates section keeps Create/Edit/Delete/Use with the new labels and the create form from `?create=1`; the count; the search across both; `+ › Skills` lists the directors checked by `agentSkill`, picking one PATCHes and turns the chip on, *Templates ›* holds the snippets and a click inserts; disabled rows in text and extend mode.
- **Integration** — none new: no route changes (`/api/skills` and `/api/agent/skills` are covered by STORY_040's and 049's lanes). Said so.
- **E2E (`e2e/manage.spec.ts`, updated; `e2e/agent.spec.ts`, extended; both widths)** — `manage.spec`'s STORY_040 case is updated: *Create skill* → *Create template*, the created row found under `+ › Skills › Templates`, Use fills the composer — the assertions otherwise unchanged (said which). New: (12) the Skills tab lists *Thirst trap director* and *Chain director* with their meta lines and the *Folder* badge → Use on the chain director → the home composer with the chip on reading *Agent · Chain director* → `+ › Skills` shows it checked → picking *Thirst trap director* there changes the chip. STORY_050–053's cases stay green.
- **Manual verification (the Spark, in the Done note with the date):** the deployed tab screenshotted at 1440 (light, dark) and at the iPhone 13 descriptor beside `behaviour-manage-tabs-03-tab-skills@1440` for the Done note's side-by-side; the two folders' meta lines read against their `SKILL.md`. No Google, no GPU.

## Estimated Complexity

Small-to-Medium — a section, a badge, a meta line, a submenu level and the wording of STORY_040's surface: ≈ 1 h of build and gate (the epic's figure); no GPU.

## Corrections found while building (2026-09-17)

1. **The meta line reads the metadata's own words.** The mockup abbreviated the model to *MiniMax-H3*; the skills' `minimax-model` is *MiniMax-H3 (open weights, Comfy-Org quantized)*, so the line is longer than sketched (and truncates with an ellipsis on one line, the full text in the row). The chain director's `minimax-verified-on` still reads *draft — not yet generated on the model (STORY_053 verifies)* until STORY_053's addendum stamps it.
2. **The search's "chain" matches both directors** — the thirst-trap director's description mentions *chains of several scripts are other directors* — so the e2e searches by the short name; the search itself runs over the short name, the folder name and the description, as the AC says.
3. **`/?agent=` and BUG_011's effect.** STORY_053 found that the saved `agentSkill` was never read back on load and added an effect that applies the setting when it arrives; that effect would have overridden `/?agent=<id>` with the old setting for a moment. The composer pins the URL's skill until the setting it writes at mount has landed, then follows the setting as before. Covered in `Composer.test`.
4. **The Use trial of the AC ("the composer enters video mode with the chip on") starts in the reducer's init**, not in an effect, so the first paint already shows the chip on — no flicker; the skill is chosen when the list arrives (`chosen: initialAgentSkill ?? settings.agentSkill ?? …`); a missing folder id falls back to the setting's, then the first.
5. **The tab's count in the e2e is relative** (directors + the stored templates), not the mockup's *4* — the e2e must never assert a fixed count against data it did not create (CLAUDE.md §6b).
6. **The component cases live in `pages.test.tsx` and `Composer.test.tsx`** (the plan named `ManagePage.test.tsx` / `ComposerMenus.test.tsx`, which do not exist — the page's tests are in `pages.test.tsx`).
7. **The form's field labels** became *Template name / Template description / Template text* (the plan only named the form's own label) and the validation line *A template needs a name and its text*; `manage.spec`'s STORY_040 case changed exactly those strings and the one extra click on *Templates ›*; nothing else in it moved.

## Done note (2026-09-17)

**Built** (19:50 → 20:10 EDT, while the Spark drew STORY_053's chain): `lib/agent-skills.ts` (`skillMetaLine`, `searchDirectors`), `components/pages/DirectorSkills.tsx` (the section: glyph · short name · *Folder* · the description on one line · the meta line · Use → `/?agent=<id>`; the note under the list linking the README's Agent mode section; *No director skills* when the image has no folder), `ManagePage.tsx` (the two sections, the count directors + templates, the search over both with a section hiding when it has no match and *No matching results* when neither has, the Templates wording — *Create template*, *Edit template*, *Template name / description / text*), `ComposerMenus.tsx` (the directors as `menuitemradio` rows checked by `agentSkill` — greyed with the chip's reason in text or extend mode — then *Templates ›* as a second level, *Manage skills*, *Add template*; `.itemDisabled`), `Composer.tsx` (`initialAgentSkill`: video mode and the chip on from the first paint, the setting written at mount, the URL's skill pinned until that write lands; the menu's pick dispatches the skill and the toggle and writes the setting), `app/page.tsx` (`?agent=`), README (the Management row and the Agent mode status). Unit: `agent-skills.test` 3. Component: `pages.test` +1 (the director rows, the badge, the meta lines, no Edit/Delete, Use, the sections' order, the search over both, no folders) and the STORY_040 case reworded; `Composer.test` +2 (the radio rows disabled in text mode with the reason and picking one in video mode; `/?agent=` with an existing and a missing id) and two reworded (the Templates level; the menu's items). Integration: none — no route changed. E2E: `manage.spec`'s STORY_040 case reworded (the four strings and the Templates click), `agent.spec` +1 at both widths — the tab's two rows with their meta lines and the badge, no Edit/Delete, the count, Use → `/?agent=…` with the setting written and the chip on *Chain director*, `+ › Skills` with the chain director checked and *Templates ›* / *Add template* present, picking Thirst trap writing the setting and renaming the chip, the search hiding an empty section and the empty line.

**Gate.** Steps 1–5 by hand and the agent + manage specs at both widths (24/24); the full six by hand before the push (the hook runs them again). **Deployed** after the Spark's chain finished (the app is never restarted mid-job) — the side-by-side and the narrow view are the addendum below.

**Addendum — verified on the deployed app (2026-09-17 22:49 EDT, after STORY_053's chain had finished; `app/e2e-trial/skills-tab.spec.ts`, the screenshots `spark/data/smoke/skills-tab-light-1440-*`, `skills-tab-dark-1440-*`, `skills-menu-light-1440-*`, `skills-tab-narrow-390-*`, `skills-use-narrow-390-*` of 2026-09-18T02-49-50):** the tab's count *Skills 3* (two folders + the built-in template); the two rows *Thirst trap · Folder* and *Chain director · Folder* with their descriptions on one line and the meta lines read from the image's own `SKILL.md` files — *MiniMax-H3 (open weights, Comfy-Org quantized) · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.4.0 · verified 2026-09-16* and *… adapter 1.5.0 · verified 2026-09-17* (the chain director's stamp from STORY_053's draw); Use on the chain director → `/?agent=…`, the setting written, the chip on *Agent · Chain director*; `+ › Skills` with the chain director checked; the same in dark; at 390 the rows stack with Use under them (44 px) and the note wraps. **One correction from the screenshots:** the meta line was on one line with an ellipsis, so at 1440 it cut off before *verified …* — the part worth reading; it now wraps (`.skillMeta`: `overflow-wrap: anywhere`, no `nowrap`), redeployed and re-shot the same minute. Beside `behaviour-manage-tabs-03-tab-skills@1440`: the same head (the four counted tabs, the search at the right), the same row anatomy (the glyph in its 40 px frame, 14 px name, 13 px grey line, the badge in the *Built-in* chrome); ours adds the two section headings with their right-hand notes, the meta line and the Use buttons — the Departures as written.
