# STORY_012 — The app shell matches the reference: sidebar, top bar and design tokens

**Epic:** [EPIC_003](../epic/EPIC_003_the_video_generation_screen_is_rebuilt_to_match_the_reference.md)
**Status:** Ready (drafted 2026-09-12)
**Created:** 2026-09-12

As the owner, I want the app to open onto the same shell as agent.minimax.io — the 260 px sidebar with its sections, the top bar, the system font and the measured colours, radii and spacing — so that every later surface sits inside a frame that already matches the reference at desktop and at phone width.

## Current state

The app renders STORY_007's placeholder page. No layout, no tokens, no history to list under Recents (STORY_014 adds the store; this story renders the empty state and the list shape).

## UI Mockup

**Reference captures (2026-09-12, 1440 wide unless noted):** `home-signed-in@1440.png` (shell, empty Recents), `home-with-recents@1440.png` (populated Recents with an unread dot), `narrow-home@390.png` (sidebar hidden, collapse icon top-left), `task-submitted@1440.png` (top bar on a task page: session title left, Work Area icon right). Measured in [tokens.md](../recon/2026-09-12/tokens.md) › sidebar, palette, type scale:

| Value | Committed |
| --- | --- |
| Font | `ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif` (the reference's stack; no substitute needed) |
| Sidebar | 260 px, `#fff`, 1 px right border `rgba(10,10,10,0.08)`; rows 34 px, 14 px/20 px, icon + label; active row fill `rgb(245,245,245)`, radius 8 px; section labels 13 px `rgb(102,102,102)`; hover/active transition 0.15 s `cubic-bezier(0.4,0,0.2,1)`; collapse animation 0.27 s |
| Text | primary `rgb(23,23,23)` (`--gray_1000`), secondary `rgb(102,102,102)`, tertiary `rgb(173,173,173)`; body 13 px/19.5 px |
| Top bar | 56 px tall over the main area; on home a document icon and a **Download** secondary button (1 px border `rgba(10,10,10,0.08)`, radius 8 px, 14 px/500) top-right; on a task page the session title (14 px) left and a **Work Area** icon button right |
| Breakpoints | sidebar expanded ≥ 900 px; hidden below (a top-left toggle opens it as a drawer over the content); tokens.md › breakpoints |
| Footer | user chip (avatar 24 px + "Owner" 13 px) and a **Download desktop** icon, bottom-left |

**ASCII (what the captures do not show — the drawer open at 390, which the reference has but we did not capture open):**

```
390 wide, drawer open                          390 wide, drawer closed (= narrow-home@390)
┌───────────────────────┬────────┐             ┌────────────────────────────────┐
│ ▣ New task            │░░░░░░░░│             │ ▢                   📄 Download │
│ 🔍 Search   (inert)   │░ scrim ░│             │                                 │
│ … same rows as 1440   │░░░░░░░░│             │  MiniMax makes your work easier │
│ Recents               │░░░░░░░░│             │  ┌──────────────────────────┐   │
│   Paper boat …     •  │░░░░░░░░│             │  │ composer (STORY_013)     │   │
│ Agent Team            │░░░░░░░░│             │  └──────────────────────────┘   │
│ ◉ Owner            ⤓  │░░░░░░░░│             └────────────────────────────────┘
└───────────────────────┴────────┘
```

## Acceptance Criteria

- [ ] `app/app/globals.css` defines the tokens from [tokens.md](../recon/2026-09-12/tokens.md) as CSS custom properties with the reference's own names where it has them (`--gray_0 … --gray_1000`, `--blue_400`, `--violet_500`, `--opacity_black_1_8`, `--radius_8/12/16/20`, `--spacing_*`, `--line_height_*`) and the body font stack above; nothing in the app uses a colour, radius or font that is not a token.
- [ ] `app/components/shell/` renders the sidebar exactly as captured: logo mark, collapse button, primary rows **New task**, **Search**, **Plugins**, **Scheduled**, **Assets**, **Connect Mobile**; sections **More** (MaxHermes, MaxClaw), **Projects** (Add new project), **Recents**, **Agent Team** (General, Coder, Verifier); footer chip **Owner** and the download icon. **New task** (`/`), **Assets** (`/assets`) and Recents entries navigate; every other row is rendered but inert (`aria-disabled="true"`, no navigation, a tooltip "Not part of MiniMax Local") — see Departures.
- [ ] Recents lists history entries (from STORY_014's `GET /api/history`, newest first, up to 20) with the title and a red 6 px dot when the job finished and has not been opened since; the empty state reads "No task history." with the reference's second line omitted (Departures).
- [ ] The active row follows the route (`/` → New task, `/assets` → Assets, `/task/:id` → that Recents entry).
- [ ] Top bar: home shows the document icon and the **Download** button (both inert); a task page shows the entry's title and the Work Area icon (inert); Assets shows nothing in the bar (the page has its own title).
- [ ] At widths below 900 px the sidebar is hidden and a toggle at the top-left opens it as a drawer over a scrim (0.27 s, the reference's easing); `Escape` and the scrim close it. Touch targets on the narrow project are ≥ 44 px.
- [ ] The placeholder page from STORY_007 is replaced by the shell around an empty main area with the heading "MiniMax makes your work easier" (32 px/400 at 1440, 24 px/400 at 390); the composer comes in STORY_013.
- [ ] `page.tsx` no longer shows the configured host; the startup config check stays.

## Departures from the reference

- Out-of-MVP rows (Search, Plugins, Scheduled, Connect Mobile, More, Projects, Agent Team, Download, Work Area, Download desktop) are rendered inert for fidelity of the frame; each is a backlog candidate ([inventory.md → Not part of the MVP](../recon/2026-09-12/inventory.md)).
- The promo carousel card, the announcement modal and the low-credits notice are omitted: billing and desktop-app promotion have no meaning locally.
- The Recents empty state drops "Switch to classic mode in the user menu…": there is no classic mode.
- The user chip reads "Owner" with a generic avatar; there is no account.

## Technical Notes

- Plain CSS Modules per component, tokens in `globals.css`; no UI library, no Tailwind — the token names stay the reference's so a delta review reads one-to-one.
- Icons: inline SVG drawn by us at 16 px (never lifted from the reference bundle); shapes approximate the captured glyphs.
- The sidebar's collapsed state on desktop (the reference's collapse button) is kept as a boolean in the shell; below 900 px it becomes the drawer. Width is read with a `matchMedia` hook that also works under jsdom.
- Recents needs `GET /api/history`; until STORY_014 lands, the component takes the list as a prop and the shell passes `[]`.

## Testing Plan

- **Unit** — `components/shell/Sidebar.test.tsx` (jsdom + RTL): renders every captured row in order; inert rows have `aria-disabled` and no `href`; the active row matches the current path prop; the unread dot appears only for entries with `finishedAt` newer than `openedAt`. `lib/route-title.test.ts`: `/`, `/assets`, `/task/:id` → the top-bar title rule.
- **Integration** — N/A: no route or store changes in this story (STORY_014 tests the history routes).
- **E2E** — `e2e/shell.spec.ts`: (desktop) the sidebar shows New task active on `/`, clicking Assets navigates and makes it active, inert rows do not navigate (URL unchanged after click); (narrow) the sidebar is hidden, the toggle opens the drawer (after `settled()`), Escape closes it, and the toggle is ≥ 44 px. Regression cover: `smoke.spec.ts` is updated for the new heading and keeps covering the capabilities round trip.
- **Visual aid (not a gate):** a screenshot at 1440 next to `home-signed-in@1440.png` in the Done note, with the measured deltas.

## Estimated Complexity

M
