# STORY_021 — The shell matches the reference: folding sections, Recents menus, Inbox, Search and the collapsed rail

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) — the first rebuild story, cut from [inventory.md › What we lack › Shell](../recon/2026-09-14/inventory.md)
**Status:** Done (2026-09-14) — see the Done note at the bottom
**Created:** 2026-09-14

As the owner, I want the frame around every page — the sidebar with its folding sections, the Recents rows with their menu, the footer's Inbox, the collapsed icon rail, the Search and Create project dialogs, the promo card and the rest of Settings — to look and move exactly like agent.minimax.io's in both themes and at both widths, so that the app reads as the reference before I reach any page.

## Current state

STORY_012's shell has the sidebar rows, a Recents list capped at 20 with an unread dot, a top bar and a drawer at 390; STORY_019 added the user menu, Settings › General and the inert notice. Compared with [home-signed-in@1440](../recon/2026-09-14/home-signed-in@1440.png): our More / Projects / Recents are plain labels (theirs fold, More and Projects closed by default); our Recents rows have no read dot, no hover Pin / ⋯ and no row menu, and no Show more; the Agents guide card, the Inbox bell and its popover are missing; Collapse sidebar shrinks ours to nothing (theirs becomes a 52 px icon rail whose logo re-expands it); the narrow drawer's toggle is a hamburger named "Open sidebar" (theirs an "Expand sidebar" icon); Search and Add new project are inert (theirs open dialogs); the promo card is missing; Settings › Account / Usage / Archived tasks are nav entries only.

## UI Mockup

**Reference captures** ([docs/recon/2026-09-14/](../recon/2026-09-14/)): `home-signed-in@1440` / `-dark`, `sidebar-more-expanded@1440`, `sidebar-projects-expanded@1440`, `sidebar-collapsed@1440` / `-dark`, `hover-sidebar-row@1440`, `recents-row-menu-open@1440` / `-dark`, `recents-show-more@1440`, `inbox-open@1440` / `-dark`, `page-search@1440` / `-dark`, `page-add-new-project@1440` / `-dark`, `promo-carousel-page-2@1440`, `settings-account@1440` / `-dark`, `settings-usage@1440` / `-dark`, `settings-archived-tasks@1440` / `-dark`; narrow: `narrow-home-signed-in@390` / `-dark`, `narrow-sidebar-drawer-open@390`, `narrow-recents-row-menu-open@390`, `narrow-inbox-open@390`, `narrow-page-search@390`, `narrow-settings-account@390`, `narrow-settings-usage@390`, `narrow-settings-archived-tasks@390`. Tokens: [tokens.md › Elements](../recon/2026-09-14/tokens.md) (`sidebar-*`, `menu*`, `page-input`, `page-heading@page-search`).

**Measured values this story commits to** (1440; colours are the STORY_019 semantic tokens, both themes):

| Element | Value |
| --- | --- |
| Sidebar | 260 px wide, `--bg_default_primary_elevated`, 1 px `--border_default` right; rows 243×34, 14 px/400, line-height 20, padding 0 10 0 8, radius 8, gap 8; active row `--bg_grouped_tertiary_elevated`; hover `--bg_interaction_tertiary_hover` |
| Section header (More / Projects / Recents) | a button 243×32, 13 px/400 `--text_default_tertiary`, padding 8 8 6 8; `aria-expanded`; a chevron only on hover; More and Projects **closed by default**, Recents open; state remembered per browser |
| Recents row | 243×30, 14 px/400; leading 6 px dot: `--text_status_error` filled when unread, a 1 px `--border_heavy`-outlined hollow dot when read; title ellipsised; on hover two 30×30 icon buttons at the right: **Pin** and **More** (⋯); at most 6 rows, then **Show more** (⋯ icon, `--text_default_tertiary`) which reveals the rest in place |
| Recents row menu | 237 px, padding 4, radius 12, `--bg_default_tertiary`, 1 px `--border_default`; entries 38 px: Rename, Pin, Copy conversation ID, Move to project ›, — separator —, Archive, **Delete** (`--text_label_danger_secondary_default`) |
| Agents guide card | below Recents, 243 px, radius 12, `--bg_grouped_tertiary`; text "You can now find Agents in Plugins", link **View now** (`--text_default_accent`), dismiss × top-right; under it a 60 px illustration strip (our own drawing) |
| Footer | user chip left; **Inbox** 32×32 icon button (tooltip "Inbox") and **Download desktop** 32×32 at the right, gap 8 |
| Inbox popover | anchored above the footer, 476×578 at 1440 (`narrow`: full width), radius 16, `--bg_default_tertiary`, 1 px border; head: tabs **All / Updates / Messages** (14 px, active underlined `--text_default_primary`, others `--text_default_secondary`) and **Read all** at the right (`--text_default_tertiary`); body: "No messages yet" centred, 13 px `--text_default_tertiary` |
| Collapsed rail | 52 px wide; the logo (28×28 at 12,12) is the **Expand sidebar** button; rows become 34×34 icon pills at x 8; active pill `--bg_grouped_tertiary_elevated`; the avatar alone in the footer; the main area re-centres |
| Narrow drawer | the page shows a 30×30 **Expand sidebar** icon at 16,14 (the collapse glyph, not a hamburger); the drawer is the 260 px sidebar over a scrim; the sidebar's own Collapse sidebar icon closes it |
| Top bar | unchanged (Changelog 32×32, Download 116×32 at 1440) |
| Search dialog | 680×420 centred, radius 16, `--bg_default_tertiary`; head 56 px: a borderless input with the placeholder **Search tasks** (16 px) and a 32×32 **Close**; body: group label **Previous 7 days** (13 px `--text_default_tertiary`) / **Older**, rows 644×44 (14 px, hover `--bg_interaction_tertiary_hover`) that open the task; typing filters the rows live; backdrop `--utility_scrim` |
| Create project dialog | 448 px, radius 16; **Create project** h2 20 px/500 with a 32×32 Close; a 36 px input (radius 8, 1 px border, placeholder **Final Essay**); **Create** primary 79×36 at the right |
| Promo card | fixed bottom-right, 202×290 at 1440 (24 px from the edges), radius 16, `--bg_default_tertiary`, 1 px border; illustration 186×110 radius 12; title 16 px/500; body 13 px `--text_default_secondary`; page 2 has a primary **Download desktop** 186×36; two 6 px dot buttons named "1" and "2" under the card; a 24×24 close (**关闭** on the reference; ours is labelled "Close"); the card is gone for the browser once closed; not shown at 390 (it covered the lower half there — a departure) |
| Settings › Account | avatar 64 (**Edit avatar**), name row (**Edit nickname** pencil), a `--bg_grouped_tertiary` row **Password** / "You can update your password to better secure your account." with **Manage**; bottom: **Delete account** (danger secondary, left), **Cancel** / **Save** (right, Save inactive) |
| Settings › Usage | **Your plan** card: Token Plan / "No Token Plan subscribed" / **Subscribe**; Credits / "0 + 400" / **Recharge**, **Manage ▾**; **Credits** ⓘ card: "When enabled, credits (including gifted credits) will be applied to chat usage." with a switch; **Invoice** card: "Please request invoices through the MiniMax Open Platform." with **Request ↗** |
| Settings › Archived tasks | a **Search archived tasks** input (534×40, radius 10, leading search icon) and an **All projects ▾** filter; an empty list |

```
home, 1440 light (home-signed-in@1440)                 collapsed (sidebar-collapsed@1440)
┌ ▣               ▯ ┐                                  ┌ ▣ ┐
│ ⊕ New task        │ ← active pill                    │ ⊕ │ ← active pill 34×34
│ 🔍 Search         │                                  │ 🔍│
│ ▦ Plugins         │                                  │ ▦ │
│ ◷ Scheduled       │                                  │ ◷ │
│ ▭ Assets          │                                  │ ▭ │
│ ▯ Connect mobile  │                                  │ ▯ │
│ More           ⌄  │ ← folded (header only)           │   │
│ Projects       ⌄  │ ← folded                         │   │
│ Recents        ⌃  │                                  │   │
│ ● Title one …     │ ← unread dot                     │   │
│ ○ Title two …  📌⋯ │ ← hovered: Pin + ⋯               │   │
│ ⋯ Show more       │                                  │   │
│ ┌───────────────┐ │                                  │   │
│ │ You can now   ×│ │  Agents guide card              │   │
│ │ find Agents in │ │                                  │   │
│ │ Plugins        │ │                                  │   │
│ │ View now       │ │                                  │   │
│ └───────────────┘ │                                  │   │
│ 🙂 Owner    🔔  ⤓  │                                  │ 🙂│
└───────────────────┘                                  └───┘

Recents row menu (recents-row-menu-open@1440)     Inbox (inbox-open@1440)          Search (page-search@1440)
┌ ✎ Rename ─────────────┐                        ┌ All  Updates  Messages  Read all ┐   ┌ Search tasks ─────────── × ┐
│ 📌 Pin                 │                        │                                   │   │ Previous 7 days            │
│ ⧉ Copy conversation ID │                        │                                   │   │ Title one                  │
│ ⇥ Move to project    › │                        │        No messages yet            │   │ Title two                  │
│ ─────────────────────  │                        │                                   │   │ Older                      │
│ ▤ Archive              │                        │                                   │   │ Title three                │
│ 🗑 Delete   (red)       │                        └───────────────────────────────────┘   └────────────────────────────┘
└────────────────────────┘

390 (narrow-home-signed-in@390): a ▯ "Expand sidebar" icon at 16,14; the drawer is the same sidebar over a scrim; the Inbox popover and the dialogs are full-width sheets; no promo card (departure).
```

## Acceptance Criteria

- [x] **Folding sections:** More, Projects and Recents are header buttons with `aria-expanded`; More and Projects start closed, Recents open; a click folds or unfolds with the reference's 0.15 s ease; the state is remembered per browser; at 390 the headers fold and unfold inside the drawer (the reference cannot — a departure in our favour, recorded).
- [x] **Recents rows:** a filled red dot for an unread finished job, a hollow dot once opened; hover (or focus) shows Pin and ⋯; ⋯ opens the row menu with the reference's seven entries; **Delete** removes the job from history (the same action as Assets › Delete from history, with the same confirmation, and the page leaves the task if it is open); Rename, Pin, Copy conversation ID, Move to project, Archive show the notice; Escape and a click outside close the menu. Six rows show; **Show more** reveals the rest.
- [x] **Agents guide card** under Recents with View now (notice) and a dismiss × that hides it for the browser.
- [x] **Inbox:** the footer bell opens the popover (tabs and Read all inert, "No messages yet"); Escape / outside closes it.
- [x] **Collapsed rail** at ≥ 900: Collapse sidebar leaves a 52 px rail of icon pills and the avatar; the logo (**Expand sidebar**) restores the 260 px sidebar; the choice is remembered per browser; the main column re-centres both ways.
- [x] **Narrow:** the page's toggle is a 30×30 icon named **Expand sidebar** at the top-left (touch target padded to 44); the scrim closes the drawer; navigation closes it too (departure: the reference leaves it open over the page).
- [x] **Search dialog** from the Search row: typing filters the history by title live, rows grouped Previous 7 days / Older, a row opens the task; Escape, Close and the backdrop close it; the row is no longer inert.
- [x] **Create project dialog** from Add new project: rendered as captured; Create shows the notice; Escape / Close / backdrop close it.
- [x] **Promo card** on the home at ≥ 900: two pages with dots, close hides it for the browser; the Download desktop button on page 2 and the whole card are inert with the notice.
- [x] **Settings › Account, Usage, Archived tasks** render as captured with every control inert (the notice); the nav switches sections; General keeps STORY_019's Appearance.
- [x] Both themes, both widths; every new control keyboard-reachable; touch targets ≥ 44 px at 390.

## Departures from the reference

- The drawer closes on navigation at 390 (theirs stays open over the page) and the More / Projects headers fold there (theirs close the drawer) — both are the reference's defects, kept out.
- No promo card at 390 (it covers the lower half of the reference's screen).
- The promo card's illustrations are our own drawings; its two headlines are kept.
- The Recents menu's Rename / Pin / Move / Archive and the Inbox's tabs are inert (no conversations, projects or messages exist locally); Delete is ours.
- Settings › Account / Usage / Archived tasks carry the reference's copy (plan names, "0 + 400") as static text — there is no account to read them from.
- The Inbox popover at 390 is a full-width sheet; the reference's is the 476 px desktop popover overflowing the viewport.
- The 390 drawer scrim is invisible like the reference's, but the Settings backdrop dims the page like the reference's — both as captured.

## Technical Notes

- Sidebar state (`collapsed`, folded sections, the guide card and promo dismissals) lives in `lib/shell-prefs.ts` (pure reducer + a `localStorage` adapter like `lib/theme.ts`); the Shell reads it after mount.
- `lib/recents.ts`: `groupByAge(entries, now)` → Previous 7 days / Older; `searchRecents(entries, query)`; `visibleRecents(entries, showMore)` (6 then all).
- Components: `Sidebar` gains `SectionHeader`, `RecentRow` (+ `RecentMenu`), `AgentsGuideCard`; new `InboxPopover`, `SearchDialog`, `CreateProjectDialog`, `PromoCard`; `SettingsDialog` gains the three sections. Delete calls the existing history delete route (STORY_015).
- The rail: `.shellCollapsed` sets the grid column to 52 px and the sidebar renders its rail variant (icons only, no labels, no sections).

## Testing Plan

- **Unit** — `lib/shell-prefs.test.ts` (defaults: More/Projects closed, Recents open, not collapsed; toggles; storage round trip; unreadable storage → defaults), `lib/recents.test.ts` (7-day grouping around the clock, search is case-insensitive over titles, six-then-all).
- **Component (jsdom)** — `Sidebar.test.tsx` (headers fold/unfold with `aria-expanded`; six rows then Show more; the row menu's entries; Delete calls the handler; rail variant renders icons only), `InboxPopover.test.tsx`, `SearchDialog.test.tsx` (filtering, grouping, a row navigates), `PromoCard.test.tsx` (pages, dots, close), `SettingsDialog.test.tsx` (the three sections switch, all inert).
- **Integration:** none — Delete reuses STORY_015's route and its tests.
- **E2E** — `shell.spec.ts` gains: Collapse sidebar → rail is 52 px and Expand sidebar restores 260 (desktop); More is closed, click unfolds, reload keeps it; Search finds a seeded job by title and opens it; the Recents ⋯ Delete removes the job (with `history` fixture); the Inbox popover opens and closes; narrow: the toggle is named Expand sidebar and ≥ 44 px. Regression: every existing spec at both widths (the shell is under all of them).

## Estimated Complexity

L

## Done (2026-09-14)

**Landed** (`906056f` + the follow-up): folding More / Projects / Recents headers (state in `lib/shell-prefs.ts`, per browser); Recents rows with the read / unread dot, hover Pin + ⋯, the reference's seven-entry row menu (Delete forgets the job through STORY_015's route and leaves its page; the rest show the notice), six rows then Show more; the Agents guide card; the footer's Inbox popover; the 52 px rail with the logo as Expand sidebar; the 390 toggle renamed and re-drawn as the reference's Expand sidebar icon; the Search tasks dialog (live title filter, Previous 7 days / Older, rows open the task); the Create project dialog; the promo carousel (≥ 900, our drawings); Settings › Account, Usage and Archived tasks as captured. Every new control is keyboard-reachable; touch targets are 44 px at 390.

**Side by side** ([STORY_021_side_by_side/](STORY_021_side_by_side/); ours | theirs | differing pixels; the same 40/255 per-channel rule as STORY_019, content unmasked, ours shot at a plain 390 viewport like the captures):

| Surface | 1440 light | 1440 dark | 390 light | 390 dark |
| --- | --- | --- | --- | --- |
| Home | 95.1 % | 95.5 % | 95.9 % | 96.0 % |
| Collapsed rail | 96.4 % | 96.6 % | — | — |
| More unfolded | 95.0 % | 95.4 % | — | — |
| Recents row menu | 94.9 % | 95.3 % | 93.6 % | 93.7 % |
| Inbox | 95.0 % | 95.7 % | 95.3 % | 95.4 % |
| User menu | 96.0 % | 96.4 % | 92.9 % | 93.0 % |
| Search dialog | 96.0 % | 96.5 % | 94.8 % | 94.4 % |
| Create project | 93.1 % | 95.0 % | — | — |
| Promo page 2 | 95.4 % | 95.9 % | — | — |
| Settings › General | 93.2 % | 94.1 % | 90.6 % | 91.2 % |
| Settings › Account | 95.1 % | 95.9 % | 94.4 % | 95.0 % |
| Settings › Usage | 94.4 % | 95.2 % | 93.5 % | 94.1 % |
| Settings › Archived tasks | 95.7 % | 96.1 % | 97.1 % | 97.7 % |

**Deltas that remain, and whose they are:** our Recents titles and count (content); the Showcase row, the promo card's illustration and the composer's tag placement (composer story 022); the icon glyphs are our approximations of theirs (all stories); the guide card's illustration (ours). Two reference behaviours were found during the comparison and matched: the drawer scrim at 390 is invisible, the Settings backdrop is not.

**Found on the way:** the four `user-menu-open` captures in `docs/recon/2026-09-14/` showed the account UID unmasked (the id sits in its own text node); the mask now zeroes any standalone 12+ digit run and the four were re-shot. The earlier versions remain in git history (`b4fbffe`…`ea72d4b`).

**Verified this session:** the deployed container in both themes at 1440 and 390 through the screenshots above; the gate green in the pre-push hook.
