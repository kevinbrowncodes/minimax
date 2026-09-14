# STORY_019 — The UI has the reference's dark mode, and every control either works or says why not

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md)
**Status:** Done (2026-09-14) — see the Done note at the bottom
**Created:** 2026-09-14 (owner: "we don't support dark mode whereas agent.minimax.io does", and "some elements when I click on them seem to do nothing", e.g. the Work Area button)

As the owner, I want the UI to follow the reference's dark theme — by my system preference and by a switch in the user menu, like theirs — and I want every control I can click to either do what it does on the reference or tell me plainly that it is not part of MiniMax Local, so that nothing on the screen is a dead click.

## Current state

The shell (STORY_012) has one theme, light, from the 2026-09-12 tokens. Out-of-MVP controls are rendered inert with `aria-disabled="true"` and a `title="Not part of MiniMax Local"` tooltip (STORY_012's decision); a click does nothing visible, and a tooltip only shows on hover, so on a click the owner sees nothing happen — the "Work Area" icon on the task page is the example he hit.

## UI Mockup

**Reference captures (2026-09-14, [docs/recon/2026-09-14/](../recon/2026-09-14/)):** `home-signed-in-dark@1440`, `composer-video-mode-dark@1440`, `task-page-dark@1440`, `assets-videos-filter-dark@1440`, `narrow-home-signed-in-dark@390` for the dark surfaces; `user-menu-open@1440` / `-dark` for the menu; `settings-general@1440` / `-dark` and `narrow-settings-general@390` for the control; [tokens.md → Theme switch, Palette (dark), Computed custom properties that differ](../recon/2026-09-14/tokens.md).

**Measured values this story commits to** (light → dark, from `tokens.json › computedVariables`; the element table in tokens.md says which surface uses which):

| Token (the reference's name) | Light | Dark | Where |
| --- | --- | --- | --- |
| `--bg_default_primary_elevated` | `#fff` | `#1c1c1c` | body, sidebar, result card, top-bar Download |
| `--bg_default_tertiary` | `#fff` | `#262626` | composer card, pills, popovers, menus, Settings modal panel |
| `--bg_grouped_tertiary` | `#f5f5f5` | `#262626` | user bubble, preference rows |
| `--bg_grouped_tertiary_elevated` | `#f5f5f5` | `#303030` | active sidebar row, reference tile, the params track |
| `--bg_interaction_tertiary_hover` | `#0a0a0a0a` | `#ffffff0a` | row / chip / button hover |
| `--bg_interaction_secondary_default` | `#0a0a0a0a` | `#ffffff0a` | active filter chip, secondary buttons |
| `--bg_interaction_tertiary_selected` | `#0a0a0a0a` | `#ffffff12` | Settings nav active |
| `--bg_interaction_primary_default` / `_inactive` | `#171717` / `#adadad` | `#fff` / `#949494` | Send, Retry, Subscribe-style buttons |
| `--text_default_primary` / `_secondary` / `_tertiary` | `#171717` / `#666` / `#adadad` | `#ededed` / `#949494` / `#666` | body text, secondary labels, section labels and placeholders |
| `--text_label_primary_default` | `#fff` | `#171717` | text on primary buttons |
| `--icon_default_primary` / `_secondary` / `_tertiary` | as text | as text | icons |
| `--border_default` | `#0a0a0a14` | `#ffffff12` | every 1 px border |
| `--border_accent` / `--text_default_accent` | `#0094fc` | `#0077d9` | the selected Appearance card, switches, focus ring |
| `--text_status_error` / `--bg_status_error` | `#f73646` / `#feedee` | `#e31937` / `#33030a` | Delete, error rows |
| `--utility_overlay` | `#00000040` | `#0000003d` | drawer scrim, dialog backdrop |
| `--bg_status_video_generation` / `--text_status_video_generation` | `#9a55c21a` / `#9a55c2` | same | the video-creator tag, the H3 pill |
| `color-scheme` on the root | `light` | `dark` | native controls, scrollbars, the `<video>` chrome |

Type, spacing, radii and shadows do not change between themes (the composer's shadow is `rgba(10,10,10,0.08) 0 0 10px` in both).

**The control, as the reference has it** (`settings-general@1440`): user chip → user menu (UID row, plan row with Subscribe, Switch to classic, **Settings**, Daily check-in ›, Usage ›, Contact us ›, Learn more ›, Logout) → **Settings** modal, 940 px, left nav General / Account / Usage / Archived tasks, panel titled **General** with × top-right → **Appearance**: three preview cards 210×120 with 12 px radius, the chosen one outlined 2 px in `--border_accent`, labels below with an icon: ☀ **Light mode**, ☾ **Dark mode**, 🖥 **System**; then **Preferences** rows (rendered, inert). At 390 (`narrow-settings-general@390`) the modal is a bottom sheet with the four sections as horizontal tabs and no ×; a tap on the backdrop closes it.

```
1440 dark (from home-signed-in-dark@1440 / settings-general-dark@1440)
┌ sidebar #1c1c1c ────────┬ main #1c1c1c ───────────────────────────────────────────┐
│ ⊕ New task  (#303030)   │           MiniMax makes your work easier  (#ededed)     │
│ 🔍 Search               │   ┌ composer #262626, border #ffffff12 ──────────────┐  │
│ …                       │   │ Enter message… (#666)                            │  │
│ Recents                 │   │ +                             MiniMax-M3 ⌄  (↑)  │  │
│ …                       │   └──────────────────────────────────────────────────┘  │
│ 🙂 Owner   🔔  ⤓        │   [▶ Video generation H3] [Document] [Website] …        │
└─────────────────────────┴─────────────────────────────────────────────────────────┘

user menu (user-menu-open@1440)          Settings › General (settings-general@1440)
┌───────────────────────┐                ┌ Settings ───┬ General ──────────────────── × ┐
│ UID : 000000000000000 │                │ ◎ General   │ Appearance                     │
│ Default   [Subscribe] │                │ ◎ Account   │ ┌──────┐ ┌──────┐ ┌──────┐     │
│ ↶ Switch to classic   │                │ ◎ Usage     │ │ ▭▭   │ │ ▬▬   │ │ ▭▬   │     │
│ ⚙ Settings            │ ─ click ─▶     │ ◎ Archived  │ └──────┘ └──────┘ └──────┘     │
│ 🎁 Daily check-in   › │                │   tasks     │ ☀ Light mode ☾ Dark mode 🖥 System │
│ 📊 Usage            › │                │             │ Preferences                    │
│ ☎ Contact us        › │                │             │ Remove an "AI-generated"… [on] │
│ 📄 Learn more       › │                │             │ Help improve our services [on] │
│ ⇥ Logout              │                └─────────────┴────────────────────────────────┘
└───────────────────────┘

an inert control after a click (any theme, both widths; ours — the reference has no inert controls)
│ [ Work Area ]
│   ┌────────────────────────────────────────────┐
│   │ Not part of MiniMax Local — video generation only │   ← role=status, 2 s, then gone
│   └────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] **Theme tokens:** the design tokens gain a dark set, one value per light token, taken from the 2026-09-14 measurement; components use tokens only, so switching the theme changes every surface (sidebar, top bar, composer card and pills, popovers, task thread, Progress panel, result card, Assets tiles and modal, alerts).
- [x] **Theme choice:** `system` (default, follows `prefers-color-scheme`), `light`, `dark` — exposed where the reference exposes it (the user menu, with its wording) and remembered per browser; no flash of the wrong theme on load.
  > **Corrected 2026-09-14 against STORY_018's capture:** the reference does not put the choice in the user menu; it is **user menu › Settings › General › Appearance**, three cards worded **Light mode / Dark mode / System**. This story renders the user menu with the reference's entries (Settings live, the rest inert with the notice) and the Settings modal's General section with those cards; the modal's other sections are nav entries that show the notice until the shell rebuild story fills them.
- [x] **Every inert control gives feedback on click:** the same notice, near the control, for two seconds, and the control stays keyboard-reachable; the tooltip stays. The list of inert controls and what each does on the reference comes from STORY_018's inventory; any control whose reference behaviour is **in MVP scope** and cheap (STORY_018 decides which, e.g. the Changelog link) is implemented instead of made inert.
- [x] Narrow (390): the theme applies; the notice fits.

## Departures from the reference

- The notice is ours: the reference has no inert controls, so there is nothing to match; the wording says what we deliberately do not build.
- Anything the reference does with a control that is out of MVP scope stays out (backlog items exist for them).
- The user menu's UID row reads `UID : local` — MiniMax Local has no account id (owner, 2026-09-14: no auth anywhere).
- The theme choice is per browser (`localStorage`), where the reference's is on the account; the owner opens the UI from more than one browser, and BACKLOG_003 asks the per-browser vs server-wide question for the switch-off settings too.
- The Settings modal's Account, Usage and Archived tasks sections are nav entries that show the notice; their panels belong to the shell rebuild story (EPIC_005 › 021+).

## Technical Notes

- Tokens live where STORY_012 put them (CSS custom properties on `:root`); the dark set goes under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, so the system default and the explicit choice both work; the choice is read from `localStorage` in an inline script before paint.
- The notice is one component (`InertNotice`) used by the sidebar rows, the top-bar buttons, the composer chips and the model selector; it announces through `role="status"`.

## Testing Plan

- **Unit** — `lib/theme.test.ts` (choice → attribute, storage round trip, system fallback), `components/shell/*.test.tsx` (the user-menu control sets the attribute; an inert control's click shows the notice and it clears after 2 s with fake timers, under `<StrictMode>`).
- **Integration:** not applicable — no route changes.
- **E2E** — `e2e/shell.spec.ts` gains: with `colorScheme: "dark"` the page background is the dark token and the user menu shows Dark selected; choosing Light flips it and survives a reload; clicking Work Area shows the notice and navigates nowhere; both projects. Regression: every existing spec at both widths.

## Estimated Complexity

M

## Done (2026-09-14)

**What landed** (`f311e4e` + the follow-up): the reference's semantic token set (58 names; 56 differ in dark) generated into `globals.css` from `docs/recon/2026-09-14/tokens.json`, with the dark values under `:root[data-theme="dark"]` and under `prefers-color-scheme: dark` for a root with no explicit choice; every stylesheet converted from palette to semantic tokens; `lib/theme.ts` (`system | light | dark`, stored under `minimax-local.theme`) with the boot function the layout inlines before first paint; `UserMenu` (the reference's entries, Settings live) and `SettingsDialog` (General: the three Appearance cards and the two Preferences rows; a bottom sheet at 390); the `Inert` component behind every control we do not implement (sidebar rows, Changelog / Download / Work Area / Download desktop, the composer's +, MiniMax-M3 and mode chips, the Assets tabs, the menu and Settings entries). The Agent Team section and the composer's Agent Team switch — gone from the reference on 2026-09-14 — were removed, not made inert.

**Side by side** ([STORY_019_side_by_side/](STORY_019_side_by_side/), ours | theirs | differing pixels in red; a pixel counts as different when any channel moves by more than 40/255 — antialiasing-tolerant, layout-sensitive; dynamic content is NOT masked, so Recents titles, Assets tiles and thread text count against us):

| Surface (dark) | 1440 | 390 |
| --- | --- | --- |
| Home | 96.2 % identical | 95.3 % |
| User menu open | 97.7 % | 92.5 % |
| Settings › General | 94.1 % | 86.6 % |
| Composer, video mode | 93.8 % | 86.4 % |
| Assets, Videos filter | 91.0 % | 90.8 % |
| Task page | 89.2 % | 83.4 % |

Light at 1440 for the same surfaces: 95.2 / 97.6 / 93.8 / 90.8 / 72.5 / 79.7 % — the Assets and task-page numbers are content (our ten tiles and our thread against their one tile and their agent thread), not theme.

**Deltas that remain, and whose they are:** the sidebar's Inbox bell, the Agents guide card, the folded More / Projects headers and the Recents rows' dots and menu (shell rebuild story); the Showcase row, the promo card and the video-creator tag on its own line (composer rebuild story); the result file card, the Work Area panel with Deliverables and the credits notice (task-page rebuild story); the Assets tile's ⋯ menu and the From you / Star empty states (Assets rebuild story); a ≈ 8 px vertical offset of the heading and composer at 1440 (composer story). None of them is a colour: every measured token above matches the capture in both themes.

**Verified this session:** the deployed container (`docker compose up -d --build app`) opened in dark and light at 1440 and 390 through the same Playwright profile the screenshots came from; the gate (typecheck, lint, 86 unit, integration, build, 52 e2e) green in the pre-push hook.
