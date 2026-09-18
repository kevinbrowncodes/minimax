# STORY_059 — Plugins becomes Skills, and the plugin's traces go

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — a thirteenth story, the owner's (2026-09-18 13:12 EDT: "I am also debating whether we should get rid of plugins too, since we just do video generation"; his pick with the multiple-choice tool: *Plugins becomes Skills*, as two stories after [STORY_058](STORY_058_new_task_opens_in_video_mode.md)); a departure from the reference, after [STORY_025](STORY_025_the_pages_behind_the_sidebar_plugins_and_manage_scheduled_connect_mobile_maxhermes_maxclaw_render_as_the_reference_does_and_inert.md), [STORY_040](STORY_040_the_plugins_page_is_real_and_the_video_creator_switch_makes_a_text_only_workstation.md) and [STORY_054](STORY_054_the_skills_tab.md)
**Status:** Approved (2026-09-18 13:45 EDT — "lets proceed with story 59"; drafted 13:15 before any code; built after STORY_058 lands)
**Created:** 2026-09-18

As the owner, I want the sidebar's *Plugins* to be *Skills* — one page with my director skills and my templates and nothing else — and every trace of the plugin idea gone with it: the `● video-creator` tag in the composer, the `@video-creator` in front of a task's prompt, and the *MiniMax-M3* pill that names a cloud model I do not run; so that the only management page is the one that manages something, and nothing on the screen speaks of plugins or models that are not here.

## Current state (read from the code, 2026-09-18 13:40 EDT)

- **`/plugins`** (`app/app/plugins/page.tsx` → `ManagePage.tsx`, STORY_025/040): the reference's Management page with four counted tabs — **Plugins** (one row, *video-creator*, its Details from `GET /api/capabilities` and the switch `PATCH /api/settings { videoEnabled }` that hides the video composer: STORY_040's "text-only workstation"), **Skills** (STORY_054: the Director skills section with the meta lines and Use, the Templates section with Create / Edit / Delete / Use), **Apps** (*No apps — MiniMax Local has no app store*), **Agents** (STORY_025's inert reference editor: General / Coder / Verifier, a system prompt). `?tab=` opens a tab, `?create=1` the Create template form.
- **The sidebar** (`Sidebar.tsx`): the *Plugins* row (a pill in the rail, a link in the full sidebar) → `/plugins`; the guide card *You can now find Agents in Plugins* › *View now* → `/plugins?tab=Agents`, dismissable (`prefs.guideDismissed`).
- **Who links there:** the chip's menu *Manage skills* and `+ › Skills › Manage skills` / *Add template* (`/plugins?tab=Skills`, `&create=1`); the Skills tab's note links the README.
- **`videoEnabled`** (`lib/settings.ts`, the route, `Composer.tsx › video = state.mode === "video" && videoEnabled`, `ManagePage`'s switch): with STORY_058 the home opens in video mode, and off it shows the *Video generation is off* placeholder — a setting whose only effect is to disable the app.
- **`/plugins/manage`** (STORY_025's reference page for the marketplace's Manage) — a second page under the same route.
- **The plugin's traces elsewhere:** the `● video-creator` tag at the head of the composer's line (STORY_013; its × goes in STORY_058), the `@video-creator` mention before the prompt in a task's user bubble (`TaskPage.tsx`, STORY_014), and the **`MiniMax-M3 ⌄` pill** on the right of the composer bar (`ComposerMenus.tsx › AgentModelMenu`, STORY_022: the reference's cloud agent models and a Thinking switch, all inert) — which STORY_050 turns into the director's model (*Gemini 3.8 Flash*) while the Agent chip is on.

## UI Mockup

**Reference capture:** `page-plugins@1440` and `behaviour-manage-tabs-03-tab-skills@1440` (2026-09-14/15) — the page ours keeps only the Skills tab of, and the sidebar rows of `home-signed-in@1440`. **A deliberate departure** (below).

**Before — the sidebar and the page today:**

```
   ┌ sidebar ─────────────┐   ┌ Management ───────────────────────────────────────────┐
   │ ⊕ New task           │   │ [Plugins 1] [Skills 3] [Apps 0] [Agents 3]   🔍 Search │
   │ 🔍 Search            │   │ ▣ video-creator  … · 768P · 4–15 s · ● reachable  [on] │
   │ ⊞ Plugins            │   │   Details ›                                            │
   │ ◷ Scheduled          │   └────────────────────────────────────────────────────────┘
   │ ▤ Assets             │
   │ …                    │
   │ ┌──────────────────┐ │
   │ │ You can now find │ │
   │ │ Agents in Plugins│ │
   │ │ View now         │ │
   │ └──────────────────┘ │
   └──────────────────────┘
```

**After — the row reads Skills, the page is the two sections, no tabs, no guide card:**

```
   ┌ sidebar ─────────────┐   ┌ Skills ───────────────────────────────────────────────┐
   │ ⊕ New task           │   │                                          🔍 Search skills │
   │ 🔍 Search            │   │ Director skills                    the agent follows one │
   │ ◇ Skills             │   │ ◇ Thirst trap   Folder   Directs one thirst-trap…  [Use] │
   │ ◷ Scheduled          │   │   MiniMax-H3 … · adapter 1.4.0 · verified 2026-09-16      │
   │ ▤ Assets             │   │ ◇ Chain director  Folder  Directs a whole…         [Use] │
   │ …                    │   │   MiniMax-H3 … · adapter 1.5.0 · verified 2026-09-17      │
   │                      │   │ A skill is a folder under agents/skills/ — …             │
   │                      │   │ Templates                    snippets that fill the composer │
   │                      │   │ [+ Create template]                                      │
   │                      │   │ ◇ Short-to-script  Built-in   Expands a one-line idea…   │
   │                      │   │                                    [Use] [Edit] [Delete] │
   └──────────────────────┘   └──────────────────────────────────────────────────────────┘
```

The rail's pill carries the skill glyph (`IconSkill`) in place of the plugins glyph. **Narrow:** the same page at 390 (STORY_054's stacking). **Both themes.**

## Acceptance Criteria

- [ ] **`/skills` is the page**: the heading *Skills*, the search, the Director skills and Templates sections exactly as STORY_054 built them, no tabs, no counts; `/skills?create=1` opens the Create template form. `/plugins`, `/plugins?tab=…` and `/plugins/manage` redirect to `/skills` (the links people may have kept keep working); the chip's *Manage skills* and `+ › Skills › Manage skills` / *Add template* go to `/skills` and `/skills?create=1`.
- [ ] **The sidebar row reads Skills** with the skill glyph, in the rail and in the full sidebar, current on `/skills`; the *You can now find Agents in Plugins* guide card and its preference are removed.
- [ ] **The Plugins, Apps and Agents tabs are removed** with their code (`reference-pages.ts › MANAGE_TABS`, `AGENTS`, `AGENT_SYSTEM_PROMPT`, the Agents editor's markup, `/plugins/manage`); the *video-creator* row and its switch go with them.
- [ ] **`videoEnabled` is retired**: dropped from `Settings`, the parser (an old `settings.json` with the key is read without it), the PATCH route (the key answers 400 like any unknown one) and the composer's gate; STORY_058's *Video generation is off* placeholder goes with it — the home has one state.
- [ ] **The plugin's traces go**: the composer's `● video-creator` tag (the line starts at the box), the task page's `@video-creator` (the bubble starts at the prompt), and the `MiniMax-M3` pill and its inert menu (`AGENT_MODELS`, the Thinking switch) — the right-hand pill shows **only while the Agent chip is on**, naming the director's model as STORY_050 built it.
- [ ] **Both widths, both themes**; the specs that named the tabs, the switch, the guide card, the tag, the mention or the pill are updated and say so.

## Departures from the reference

- The reference's Management page (Plugins · Skills · Apps · Agents) and its sidebar row are the marketplace of a cloud agent; ours has one model and no marketplace (STORY_026 removed it), so the page becomes the one tab that manages something here — the skills the director follows and the owner's templates — under that name. The Agents guide card advertised a tab that never did anything on ours.
- The `video-creator` chip in a message and the `@video-creator` mention are the reference's way of saying "this message goes to that plugin"; with one plugin and nowhere else to go they say nothing, so they go (the owner, 2026-09-18). The `MiniMax-M3` pill names the reference's cloud agent; ours shows the director's model only while a director is on.

## Technical Notes

- `app/app/skills/page.tsx` renders `SkillsPage` (the Skills tab's block of `ManagePage.tsx`, lifted into `components/pages/SkillsPage.tsx`; `ManagePage.tsx` is deleted with the other tabs); `app/app/plugins/page.tsx` and `plugins/manage/page.tsx` become `redirect("/skills")` (Next's `redirect`, keeping `?create=1`).
- `Sidebar.tsx`: the row; the guide card and `guideDismissed` removed (`lib/sidebar-prefs.ts` or wherever it lives — read first).
- `lib/settings.ts`: `videoEnabled` removed from `Settings`, `DEFAULT_SETTINGS`, `SETTING_KEYS`, `SETTING_TYPES`, the parser; the route's per-key table follows; `Composer.tsx › video = state.mode === "video"`.
- `lib/reference-pages.ts`: `MANAGE_TABS`, `AGENTS`, `AGENT_SYSTEM_PROMPT` removed if nothing else reads them (check Search and the Shell first).
- `Composer.tsx`: the tag's markup and `styles.tag`; the right-hand pill rendered only when `agentOn && agentModel`; `ComposerMenus.tsx › AgentModelMenu` loses `AGENT_MODELS` and the Thinking switch (STORY_050's one-row menu stays). `TaskPage.tsx`: the `mention` span and its class.

## Testing Plan

- **Unit (`settings-store.test.ts`)** — the defaults without `videoEnabled`; an old file with the key parsed without it; `reference-pages.test` (if any) loses the tabs.
- **Component (`pages.test.tsx` → `SkillsPage.test.tsx`, `Sidebar` tests in `shell` tests, `Composer.test`, `AgentChip.test`, `TaskPage.test`)** — the page's two sections, the search, the create form from the prop; the sidebar row's label, glyph and current state; no guide card; no tag; the pill absent with the chip off and *Gemini 3.8 Flash* with it on; the bubble without the mention.
- **Integration (`test/integration/settings.test.ts`)** — `PATCH { videoEnabled }` → 400 *videoEnabled is not a setting*; GET without the key.
- **E2E (`manage.spec.ts` → `skills.spec.ts`, `shell.spec.ts`, both widths)** — `/skills` with the two sections and the create form from `?create=1`; `/plugins?tab=Skills&create=1` redirecting to `/skills?create=1`; the sidebar row *Skills* current there; the guide card absent; `+ › Skills › Manage skills` landing on `/skills`. STORY_040's plugin-switch case removed and said so; STORY_054's case moved to the new page. Regression cover: `agent.spec`'s STORY_054 case, `shell.spec`'s sidebar cases.
- **Manual verification:** the deployed sidebar and page at 1440 and 390, both themes — screenshots beside `page-plugins@1440` for the Done note. No GPU.

## Estimated Complexity

Medium — a page lifted and a page deleted, three redirects, a sidebar row, a setting retired across four files, the specs renamed: plus the three traces: ≈ 1 h 45 min of build and gate.
