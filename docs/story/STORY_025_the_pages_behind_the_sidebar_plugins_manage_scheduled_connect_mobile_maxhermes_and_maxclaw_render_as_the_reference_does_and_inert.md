# STORY_025 — The pages behind the sidebar (Plugins and Manage, Scheduled, Connect mobile, MaxHermes, MaxClaw) render as the reference does, and inert

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) — the fifth and last rebuild story, cut from [inventory.md › What we lack › Sidebar destinations](../recon/2026-09-14/inventory.md)
**Status:** Done (2026-09-14)
**Created:** 2026-09-14

As the owner, I want the sidebar's Plugins, Scheduled and Connect mobile rows, More › MaxHermes and MaxClaw, and the Agents guide's View now to open pages that look like agent.minimax.io's — the plugin marketplace and its Management page, the Schedules page, the Connect mobile form, the two product pages — with every control on them honest about not being ours, so that nothing in the sidebar is a dead end and the whole shell reads as the reference.

## Current state

STORY_019 rendered those five rows inert (a click shows "Not part of MiniMax Local — video generation only") and there are no such pages. The reference navigates to `/plugins`, `/plugins/manage`, `/scheduled`, `/connect-mobile`, `/max-hermes` and `/max-claw` ([inventory.md › Sidebar destinations](../recon/2026-09-14/inventory.md)). This story adds the six routes as static pages of ours whose controls are `Inert` (STORY_019's pattern), and turns the rows into links — the pages carry the honesty now, not the rows. BACKLOG_003 will later let the owner hide them.

## UI Mockup

**Reference captures** ([docs/recon/2026-09-14/](../recon/2026-09-14/)): `page-plugins@1440` / `-dark`, `page-plugins-tab-personal@1440` / `-dark`, `agents-guide-view-now@1440` (Plugins › Manage), `page-scheduled@1440` / `-dark`, `page-connect-mobile@1440` / `-dark`, `page-maxhermes@1440` / `-dark`, `page-maxclaw@1440` / `-dark`; narrow: `narrow-page-plugins@390` / `-dark`, `narrow-page-plugins-tab-personal@390`, `narrow-page-scheduled@390` / `-dark`, `narrow-page-connect-mobile@390` / `-dark`, `narrow-page-maxhermes@390` / `-dark`, `narrow-page-maxclaw@390` / `-dark`. The tokens file has no rows for these pages (they were outside the 2026-09-14 tokens model), so the values below were measured from the captures' pixels this session.

**Measured values this story commits to** (1440 × 900, light; semantic tokens for both themes; the content column is 736 px centred in the main area, x 468–1204, unless said otherwise):

| Page | Value |
| --- | --- |
| Plugins — top bar | a segmented **Market / Personal** control at x 276, y 14, 32 px tall (radius 8, `--bg_grouped_tertiary`, the active segment `--bg_default_primary_elevated` with a hairline); at the right a **Refresh** icon button, **Manage** (secondary, 32 px, a gear icon) and **Create** (primary, 32 px, a + icon) |
| Plugins — Market | category chips at y 110 (**All · Office · Studio · Design & sites · Code · Biz · Sales · Prod · Sci & health · Edu · Other**, 28 px, the active one filled); **Search plugins or skills...** field 736 × 34 at y 142; **Plugins** heading 14 px/600 at y 232; two-column card rows 48 px tall, 63 px apart from y 280: a 32 px icon tile (radius 8, our drawn glyph — see Departures), name 13 px/500, description 12 px tertiary clamped to one line, **Install** 44 × 28 secondary; a **View all 27** row (three 16 px avatars, 12 px text) at y 546; **Skills** heading with a **Filter skills** icon at the right; eight skill rows (a document icon, name 13 px/500, "@MiniMax Code · 10K uses" 12 px tertiary, **Install**) |
| Plugins — Personal | a **Search skills...** field 736 × 34 at y 68; centred at y 180 a plugins glyph and "No matching plugins or skills" 13 px secondary |
| Plugins › Manage | top bar **‹ Plugins** (a link back); heading **Management** 20 px/600 at y 100 (x 468); tabs **Plugins 1 · Skills 10 · Apps 0 · Agents 3** (28 px chips at y 160, Agents active); left column 216 px: "All agents" 12 px tertiary, rows **General** (active, filled), **Coder**, **Verifier** (each with a 16 px agent glyph), **+ Create agent**; right: **Portrait** (a 40 px tile), **Name** (an input reading "General"), **Model** (**Auto ▾**), **System prompt** (a 736 − 216 wide textarea with the captured text), **Save** (secondary) and **Chat with it** (primary) bottom-right |
| Scheduled | heading **Schedules** 26 px/500 at y 77 (x 324, the page padded 64 like Assets); a **Search scheduled tasks** field x 324–1364 × 40 at y 152 with **All ▾** (the status filter) at its right; "No scheduled tasks yet." 13 px tertiary centred at y 278; top bar right: **Create** (primary, a + icon, 115 × 28 at x 1306, y 15) joined to a **More create actions ▾** segment |
| Connect mobile | a left column at x 394 (220 wide): a card **New Bot / Telegram** 61 px (radius 12, `--bg_grouped_tertiary`, a status dot, a plane glyph), **+ Create IM Bot** 13 px under it; the form panel x 626–1305 (680 wide, radius 12, `--bg_grouped_tertiary`, padding 16 × 12): **New Bot** 14 px/600 with "● Telegram Not bound" 12 px tertiary; then hairline-separated sections each with a 13 px/500 title and a 12 px tertiary line — **Connect a bot** / "Enter the Bot Token to finish connecting."; **Connect Telegram** with **Connect** (disabled, 60 × 24) at the right, an **Enter Bot Token** input 32 px and "Get a token from @BotFather on Telegram."; **Choose an Agent** / "Chat with different Agents." with **Default ▾** (an agent glyph); **Working directory** / "Where conversation information is kept by default." with **No project ▾**; **Delete Bot** / "Remove this Bot from the list." with **Delete** (disabled) |
| MaxHermes / MaxClaw | an 800 px column (x 450–1249): the name 22 px/500 in the product's colour (`#f5a623` Hermes, `#e5484d` Claw) at y 126, the line "An Agent That Grows With You." / "Your 24/7 personal assistant." 32 px/400 under it, **Start now** primary 40 px; a banner 800 × 160 at y 255 (radius 12 — see Departures); "Why MaxHermes" / "What you get" 13 px tertiary at y 468; three feature rows (a 16 px glyph + 13 px text) separated by hairlines at y 513, 572, 625; MaxClaw adds "Available on" / "◎ Telegram" 11 px tertiary centred at the bottom; a **?** icon top-right of the bar |
| 390 | Plugins: the bar holds the segmented control and the three buttons as icons, chips scroll, one card column; Manage: the columns stack; Scheduled: the bar reads **Schedules** centred with **Create ▾** at the right, the search under it; Connect mobile: the list then the form, stacked (the reference squeezes them side by side — a departure); MaxHermes / MaxClaw: the same column at 16 px gutters |

```
Plugins (page-plugins@1440)                          Scheduled (page-scheduled@1440)
┌ ▯ [Market|Personal]        ↻ ⚙ Manage  + Create ┐   ┌ ▯                                  [+ Create|▾] ┐
│   All Office Studio Design & sites Code Biz …    │   │ Schedules                                       │
│   [🔍 Search plugins or skills…              ]   │   │ [🔍 Search scheduled tasks             ] [All ▾] │
│   Plugins                                        │   │                                                 │
│   ▣ Excel   Create, edit…  [Install]  ▣ EverMe … │   │             No scheduled tasks yet.             │
│   ▣ Linear  …              [Install]  ▣ Notion … │   └─────────────────────────────────────────────────┘
│   …                                              │
│   ◌◌◌ View all 27                                │   Connect mobile (page-connect-mobile@1440)
│   Skills                                      ⚙  │   ┌ ▯                                                ┐
│   ▤ html-presentation-generator   [Install] …    │   │ ┌ ● ✈ New Bot ┐  ┌ New Bot  ● Telegram Not bound ┐│
└──────────────────────────────────────────────────┘   │ │   Telegram  │  │ Connect a bot                  ││
                                                       │ └─────────────┘  │ Connect Telegram      [Connect]││
MaxHermes (page-maxhermes@1440)                        │ + Create IM Bot  │ [Enter Bot Token              ]││
┌ ▯                                              ? ┐   │                  │ Choose an Agent     [Default ▾]││
│                  MaxHermes                       │   │                  │ Working directory [No project ▾]││
│         An Agent That Grows With You.            │   │                  │ Delete Bot             [Delete]││
│                 [Start now]                      │   │                  └────────────────────────────────┘│
│   ┌──────────── banner 800 × 160 ─────────────┐  │   └──────────────────────────────────────────────────┘
│   └───────────────────────────────────────────┘  │
│   Why MaxHermes                                  │   Plugins › Manage (agents-guide-view-now@1440)
│   ⟳ Self-evolution. Each completion …            │   ┌ ▯ ‹ Plugins                                        ┐
│   ⏱ Always on, zero wait. …                      │   │   Management                                       │
│   ▭ Right where you need it. …                   │   │   [Plugins 1] [Skills 10] [Apps 0] [Agents 3]      │
└──────────────────────────────────────────────────┘   │   All agents        Portrait   Name [General      ] │
                                                       │   ● General         ▣          Model [Auto      ▾] │
                                                       │   ● Coder                      System prompt        │
                                                       │   ● Verifier                   [## Your Role …    ] │
                                                       │   + Create agent                [Save] [Chat with it]│
                                                       └────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] **Six routes exist** — `/plugins`, `/plugins/manage`, `/scheduled`, `/connect-mobile`, `/max-hermes`, `/max-claw` — each rendering the capture's elements per the table, in both themes and at both widths; every control on them that is not navigation between these pages is an `Inert` (STORY_019: `aria-disabled`, the title, the notice on click), and the inputs are read-only with the captured values.
- [x] **The sidebar rows are links:** Plugins, Scheduled and Connect mobile (the capture's casing) in the sidebar and the rail, MaxHermes and MaxClaw under More, and the Agents guide's **View now** → `/plugins/manage`; the active row is filled on each page (`aria-current`); Plugins › Manage's **‹ Plugins** goes back to `/plugins`; the Market / Personal segments switch the Plugins page's content.
- [x] **The top bar carries each page's chrome** (Plugins: the segmented control and the three buttons; Scheduled: Create ▾; MaxHermes / MaxClaw: the ? icon) through `ShellContext.pageActions` at every width; the pages' titles at 390 follow the captures (Schedules centred).
- [x] **Existing behaviour kept:** the rows' notice test becomes a navigation test; everything else in `shell.spec.ts` stays green; the sidebar's folding, the guide card's dismiss and the rail are unchanged.
- [x] Keyboard-reachable; 44 px touch targets at 390.

## Departures from the reference

- **The plugin and skill cards carry our own glyphs and the reference's names and one-line descriptions as plain text**; their logos (Excel, Linear, Notion, PDF, PPT, Obsidian, EverMe, Nowledge Mem) are brand marks we do not lift (CLAUDE.md §3e). The View all row's three avatars are drawn dots.
- **The MaxHermes / MaxClaw banners are plain dark rounded panels with the product name in our type**; the reference's banners are its marketing art and wordmarks.
- **Connect mobile stacks at 390** (the reference squeezes its two columns side by side into a broken layout).
- Everything on these pages is inert: MiniMax Local has no plugins, schedules, bots or products. A later epic ([BACKLOG_003](../backlog/BACKLOG_003_the_parts_of_the_reference_ui_that_minimax_local_does_not_do_can_be_switched_off.md)) lets the owner hide them.

## Technical Notes

- `app/app/{plugins,plugins/manage,scheduled,connect-mobile,max-hermes,max-claw}/page.tsx` → `components/pages/{PluginsPage,ManagePage,ScheduledPage,ConnectMobilePage,ProductPage}.tsx` with `pages.module.css`; the content (plugin names, descriptions, the system prompt) in `lib/reference-pages.ts` so the tests can pin it.
- `lib/route-title.ts`: `topBarFor` gains `{ kind: "page"; title }` for the six paths; `activeRow` gains `plugins`, `scheduled`, `connect-mobile`, `max-hermes`, `max-claw`; `Shell.tsx` renders `pageActions` at every width for `kind: "page"` and the centred title at 390 where the capture has one.
- `Sidebar.tsx`: the five rows become `link(...)`; the rail's three pills too; the guide's View now a `Link`.

## Testing Plan

- **Unit** — `lib/route-title.test.ts`: the six paths' `topBarFor` and `activeRow`; `lib/reference-pages.test.ts`: the content lists have the captured counts (8 plugins, 8 skills, 11 categories, 3 agents, 3 features each).
- **Component** — `components/pages/pages.test.tsx`: each page renders its heading and its inert controls (`aria-disabled`, the notice on click); Plugins' Personal segment shows the empty state; Manage's inputs are read-only with the captured values. `Sidebar.test.tsx`: the five rows are links with the right hrefs and the active state.
- **Integration:** none (no routes with handlers).
- **E2E** — `shell.spec.ts`: the inert-rows test becomes "the rows navigate and the pages are inert" — each row → its URL, `aria-current` on the row, one `Inert` control on the page clicked (`force`) shows the notice and the URL stays; More › MaxHermes at desktop; View now → `/plugins/manage` → ‹ Plugins → `/plugins`. Existing shell, task, assets and composer specs stay green.

## Estimated Complexity

Medium-large — six static pages and their stylesheet; no state beyond the Plugins segment; the risk is the amount of markup to measure.

## Done (2026-09-14)

**Landed:** the six routes (`/plugins`, `/plugins/manage`, `/scheduled`, `/connect-mobile`, `/max-hermes`, `/max-claw`) as `components/pages/*` with `pages.module.css` and the words in `lib/reference-pages.ts`; every control an `Inert` (the notice on click) or a read-only input, the Market / Personal segments and Manage / ‹ Plugins the only live ones; the sidebar rows, the rail pills, More › MaxHermes / MaxClaw and the guide's View now as links with the active state; each page's chrome in the top bar through `ShellContext.pageActions` (`usePageActions`). Found and fixed on the way: **BUG_005** — a stored sidebar preference undid Dark mode on reload (a hydration mismatch dropped `data-theme`); the preferences now come through `useSyncExternalStore` (`lib/shell-prefs-store.ts`) and `shell.spec.ts` reloads dark with More unfolded.

**Side by side** ([STORY_025_side_by_side/](STORY_025_side_by_side/); the same 40/255 rule; the reference's Recents, logos and art count against us):

| Page | 1440 light | 1440 dark | 390 light | 390 dark |
| --- | --- | --- | --- | --- |
| Plugins, Market | 94.8 % | 94.2 % | 91.2 % | 88.5 % |
| Plugins, Personal | 98.3 % | 98.2 % | 98.7 % | 98.6 % |
| Plugins › Manage | 96.2 % | (no dark capture; ours committed as `-ours.png`) | (not captured at 390; ours committed) | — |
| Scheduled | 98.4 % | 98.3 % | 98.7 % | 98.6 % |
| Connect mobile | 97.2 % | 97.3 % | 94.2 % | 94.3 % |
| MaxHermes | 91.2 % | 93.8 % | 83.6 % | 89.8 % |
| MaxClaw | 87.9 % | 87.6 % | 83.2 % | 85.1 % |

**Deltas that remain, and whose they are:** the plugin logos against our tinted initials and the two banners against our plain panels (departures — brand marks and art); the reference's Recents (five titles, a Verifier) against our empty list; the reference's More section rows under our own; the Connect mobile column sits ≈ 40 px higher on the reference; at 390 the reference's Connect mobile is its broken squeeze against our stack (departure). No colour, type or spacing delta remains on the chips, search fields, headings, cards, the Manage editor, the Schedules toolbar or the feature rows.

**Verified this session:** the production build in both themes at 1440 and 390 through the screenshots above; the deployed container's six pages opened after the deploy; the gate green by hand and in the pre-push hook.
