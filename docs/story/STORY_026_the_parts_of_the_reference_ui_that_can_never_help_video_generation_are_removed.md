# STORY_026 — The parts of the reference UI that can never help video generation are removed

**Epic:** none — standalone; what it keeps is the seed of the owner's next epic ([BACKLOG_007](../backlog/BACKLOG_007_the_kept_reference_surfaces_are_wired_for_the_video_workflow.md)); text chat is [BACKLOG_006](../backlog/BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md)
**Status:** Done (2026-09-15; approved by the owner: "Ok please proceed with Story 26!")
**Created:** 2026-09-15 — decided line by line with the owner on 2026-09-15. His rule: *"don't cut things just because you see them as inert right now or not implemented … keep things that will be genuinely helpful to me during the video generation process and that includes the agents as well"* — everything kept will be "fully gone into in depth" in a future epic; delete rather than switch (BACKLOG_003 withdrawn).

As the owner, I want the surfaces of agent.minimax.io that can never matter on my Spark — plans, credits, sign-out, office-document modes, cloud-only model options, marketing buttons — gone from MiniMax Local, while everything that will serve video generation once it is wired (the agents, projects, the inbox, archive, uploads, favourites, the text composer) stays where the reference puts it, so that the workstation shows only what is mine or will be.

## Current state

EPIC_005 (Done 2026-09-14) rebuilt every surface of the reference; the parts we do not implement are rendered exactly as captured and answer a click with STORY_019's notice. This story removes the subset the owner ruled out on 2026-09-15 and leaves the rest inert for the future epic. The recon captures and every story's side-by-side sheets stay in `docs/` as the record.

## What goes

| Surface | Removed |
| --- | --- |
| Sidebar | the **Scheduled** row and `/scheduled`; the **Plugins marketplace** (`/plugins` Market / Personal, categories, plugin and skill cards) — the Plugins row now opens the **Management** page directly (see below); the footer's **Download desktop** icon |
| User menu | Subscribe + the plan row, Switch to classic, Daily check-in, Usage, Contact us, Learn more, Logout — the menu keeps **Settings** as its only entry |
| Settings | the **Account** and **Usage** sections (General › Appearance and Archived tasks stay) |
| Home top bar | the **Changelog** icon and the **Download** (desktop app) button |
| Composer | the **Document / Website / Image Generation / More** mode chips and their Showcase cards (H3 makes no stills — its README: video 4–15 s only); the + menu's **Plugins ›** submenu; the greyed **2K** resolution and **H3-Max / H2.3** models (the parameters and model menu show only what `/api/capabilities` reports) |
| Task page | the **credits notice**; **Like / Dislike**; the footer line "MiniMax Agent is AI and can make mistakes" |
| Assets | the **Websites / Documents / Excel / PPT** chips — the row reads **All · Images · Videos · Audio** |
| Wording | text-mode Send says **"Text chat is not connected to the Spark yet — pick Video generation"** (was "MiniMax Local only generates videos") |

## What stays (inert until the future epic, exactly as captured)

Plugins › **Manage** (Plugins / Skills / Apps / **Agents** tabs, the agent editor) reached from the Plugins row and the Agents guide's View now; **Connect mobile**; **More › MaxHermes / MaxClaw**; **Projects** and the Create project dialog; the **Agents guide** and **promo** cards; the Recents ⋯ menu (**Rename, Pin, Copy conversation ID, Move to project, Archive** — Delete is real); the **Inbox** bell; Settings › **Archived tasks**; the + menu's **Add to project / Skills / Environment variables**; the preview pane's **⋯**; Assets' **From you / Star** tabs, **Star** in the menus, the 390 **Filter** button; the **MiniMax-M3** menu and **Thinking** switch (text chat, BACKLOG_006). And everything real: the theme, the sidebar (collapse / rail / drawer), Recents, Search, the video flow end to end, the task page, Assets.

## UI Mockup

The captures every surface still matches are the ones EPIC_005's stories cite (`docs/recon/2026-09-14/`); this story departs from them only where the table above says. What changes shape:

```
home top bar (1440): nothing at the right any more            sidebar footer: chip + bell (no download icon)
┌ ▯                                                    ┐       ┌ ▣ Owner                      🔔 ┐
                                                                  Owner ⌄ → ┌ ⚙ Settings ┐  (the only entry)

composer, text mode (home): one mode chip                      Video parameters popover: 768P alone, no 2K
┌ Enter message… (use / for commands)          ┐               Model menu: the models the adapter reports (MiniMax-H3)
│ (+)   [🎬 Video generation]   MiniMax-M3 ⌄ (↑)│
└──────────────────────────────────────────────┘
   + menu: Add files or photos · Add to project › · Skills › · Environment variables   (no Plugins ›)

task page: as STORY_023 without the credits notice, the thumbs and the footer line
   ⧉  Sep 12, 15:41        (Copy and the time only)
   ┌ docked composer ┐      (nothing under it)

assets: [From agent] From you  Star      All · Images · Videos · Audio        [🔍 Search …]

Settings: nav General · Archived tasks (no Account, no Usage)

Plugins row → Management (Plugins 1 · Skills 10 · Apps 0 · Agents 3, the editor); no "‹ Plugins" back link, no marketplace
```

## Acceptance Criteria

- [x] **Everything in "What goes" is gone** at 1440 and 390, in both themes: no element carries those names or labels (the e2e sweep below lists them); `/scheduled` answers Next's 404; `/plugins` renders the Management page and `/plugins/manage` redirects to it; the Plugins row and the guide's View now lead there and the row is lit on it.
- [x] **Everything in "What stays" is unchanged** — same markup, same notice, same captures; the video flow, Recents, Search, the theme and the shell behave exactly as before.
- [x] **The composer** offers one mode chip, keeps the + menu without its Plugins › submenu, lists only the capabilities' models and resolutions, and refuses text-mode Send with the new wording; the docked composer is unchanged.
- [x] **Assets** shows the four chips (All · Images · Videos · Audio); Images and Audio show the empty state; the tabs, Star and the 390 Search / Filter buttons are unchanged.
- [x] **The docs follow:** README's Features rows for STORY_022/023/024/025 and the shell say what remains (one line each naming what this story removed); BACKLOG_003 is Withdrawn; BACKLOG_007 lists the kept surfaces; the EPIC_005 stories and side-by-side sheets are untouched.

## Departures from the reference

Every removal above is one, on the owner's decisions of 2026-09-15: the reference shows plans, credits, sign-out, a plugin marketplace, five more generation modes, cloud-only model options and its own marketing buttons; MiniMax Local shows none of them. What the owner kept is still the reference's look, pending its wiring epic.

## Technical Notes

- **Deleted:** `app/app/scheduled/`, `components/pages/ScheduledPage.tsx`; the marketplace half of `PluginsPage.tsx` (the file becomes the Management page or `ManagePage.tsx` is mounted at `/plugins` and `app/app/plugins/manage/page.tsx` redirects); `PLUGIN_CATEGORIES / PLUGINS / SKILLS` in `lib/reference-pages.ts`; `UserMenu.tsx`'s entries (the menu keeps Settings); `SettingsDialog.tsx`'s Account / Usage sections; `Shell.tsx`'s home bar actions; `ComposerMenus.tsx`'s Plugins submenu and `MORE_MODES`; `composer-state.ts`'s `LOOK_ONLY_MODES` and the `enter-mode` action, `REFERENCE_MODELS` / `REFERENCE_RESOLUTIONS` (the menus render the capabilities); `lib/showcase.ts`'s document / website / image cards; `TaskPage.tsx`'s credits notice, thumbs and footer; `ASSET_CHIPS` shrinks and `narrowChipLabel` goes; the Sidebar's Download desktop; the icons nothing uses any more.
- **Kept:** `Inert`, `ShellContext.pageActions`, `shell-prefs` (Projects / More / guide / promo prefs all still in use), `route-title.ts` (`/scheduled` leaves `REFERENCE_PAGES`).
- The `/plugins/manage` → `/plugins` redirect is `next.config` `redirects()` or a `redirect()` in the page; the Management page loses its "‹ Plugins" link.

## Testing Plan

- **Unit** — `lib/composer-state.test.ts`: models / resolutions come from capabilities, no look-only modes; `lib/assets-filter.test.ts`: the four chips, Images / Audio empty; `lib/route-title.test.ts`: `/scheduled` is `other`, `/plugins` still lights Plugins; `lib/showcase.test.ts`: video cards only; `lib/reference-pages.test.ts`: the Manage content only.
- **Component** — changed: `UserMenu.test.tsx` (Settings only), `dialogs.test.tsx` (Settings: General + Archived), `Composer.test.tsx` (one chip, no Plugins submenu, the wording, capabilities-driven menus), `TaskPage.test.tsx` (no credits / thumbs / footer), `AssetsPage.test.tsx` (four chips), `pages.test.tsx` (no Scheduled, Manage at the Plugins row), `Sidebar.test.tsx` (no Scheduled row, no Download desktop); **new** `components/removed.test.tsx`: renders the home, a done task, Assets and Settings under the Shell and asserts none of the removed names is present (the list from "What goes"), while the kept inert controls still carry the notice.
- **Integration:** none.
- **E2E** — `shell.spec.ts`: the Scheduled row case goes; `/scheduled` → 404; Plugins → Management; the user menu shows Settings only and Dark mode still flips and survives a reload (BUG_005's case); a sweep at both widths over `/`, `/assets`, `/plugins`, a finished task asserting the removed labels are absent. `composer.spec.ts`: the Document-mode test goes; one chip; text-mode Send's new wording; the parameters show 768P only. `task.spec.ts` / `extend.spec.ts`: the credits and thumbs steps go; everything else stays green. `assets.spec.ts`: the chip test uses Images; tabs unchanged.

## Estimated Complexity

Medium — deletion across every surface plus the capabilities-driven menus; the risk is a layout that closes up wrong (the composer's bottom bar, the sidebar footer) and an e2e that still names a removed control.

## Done (2026-09-15)

**Landed** in one commit: every row of "What goes" removed — `/scheduled` and its page; the marketplace half of Plugins (the Plugins row and the guide's View now open the Management page at `/plugins`, `/plugins/manage` redirects there); the user menu trimmed to Settings; Settings to General + Archived tasks; the home bar's Changelog / Download and the footer's Download desktop; the Document / Website / Image Generation / More chips with their cards and the + menu's Plugins submenu; the parameters and model menu now render `/api/capabilities` (no greyed 2K / H3-Max / H2.3 — `REFERENCE_MODELS` / `REFERENCE_RESOLUTIONS` / `REFERENCE_RATIOS` are gone); the credits notice, Like / Dislike and the footer line; the four office-document chips. Text-mode Send says "Text chat is not connected to the Spark yet — pick Video generation". Everything in "What stays" is untouched. Withdrawn: BACKLOG_003. Written: BACKLOG_006 (text chat), BACKLOG_007 (the kept surfaces, for the wiring epic).

**Guards:** `components/removed.test.tsx` renders the home (with the user menu open), a finished task and Assets under the Shell and asserts none of the removed names is present; `shell.spec.ts` sweeps `/` and `/assets` at both widths for the same, checks `/scheduled` is 404 and `/plugins/manage` redirects; `composer.spec.ts` pins the single chip, the four + entries, the 768P-only resolution row and the one-model menu; `task.spec.ts` the absence of Like / Dislike, the notice and the line.

**After** ([STORY_026_after/](STORY_026_after/), the production build against the stub, both themes, both widths): the home with its one chip and empty top bar, the video composer with its parameters and + menu, the user menu and Settings, Assets with the four chips, the Plugins row's Management page, a finished task without the notice, thumbs or footer line. The reference captures these depart from are EPIC_005's; no side-by-side was made — the departure is the point.

**Verified this session:** the gate green on the working tree by hand (typecheck, lint, 147 unit, integration, build + image, 79 e2e) and in the pre-push hook; the deployed container's `/`, `/assets`, `/plugins`, `/scheduled` (404) and `/plugins/manage` (→ `/plugins`) after the deploy.
