# STORY_019 — The UI has the reference's dark mode, and every control either works or says why not

**Epic:** [EPIC_003](../epic/EPIC_003_the_video_generation_screen_is_rebuilt_to_match_the_reference.md)
**Status:** Drafted (2026-09-14) — the UI Mockup's measured half waits for STORY_018's capture; awaiting the owner's approval after that
**Created:** 2026-09-14 (owner: "we don't support dark mode whereas agent.minimax.io does", and "some elements when I click on them seem to do nothing", e.g. the Work Area button)

As the owner, I want the UI to follow the reference's dark theme — by my system preference and by a switch in the user menu, like theirs — and I want every control I can click to either do what it does on the reference or tell me plainly that it is not part of MiniMax Local, so that nothing on the screen is a dead click.

## Current state

The shell (STORY_012) has one theme, light, from the 2026-09-12 tokens. Out-of-MVP controls are rendered inert with `aria-disabled="true"` and a `title="Not part of MiniMax Local"` tooltip (STORY_012's decision); a click does nothing visible, and a tooltip only shows on hover, so on a click the owner sees nothing happen — the "Work Area" icon on the task page is the example he hit.

## UI Mockup

**Reference captures:** [docs/recon/2026-09-14/](../recon/2026-09-14/) once STORY_018 lands — the dark-theme screenshots of every surface and the measured dark tokens; the user menu with the theme control. Until then this section is a sketch of intent and the story is not implementable ([CLAUDE.md §3 item 6](../../CLAUDE.md#3-how-features-are-built-important): a clone story with no capture cited is a guess).

```
dark (sketch; values from the 2026-09-14 tokens)                 the user menu (the reference's control, wording from the capture)
┌ sidebar (dark surface) ─┬ main (near-black) ─────────────┐   ┌ Owner ─────────────────┐
│ ⊕ New task              │  MiniMax makes your work easier │   │ Appearance  ○ Light    │
│ 🔍 Search               │  ┌ composer (dark card) ─────┐  │   │             ● Dark     │
│ …                       │  │ Enter message…            │  │   │             ○ System   │
│ Recents                 │  └───────────────────────────┘  │   │ …                      │
└─────────────────────────┴─────────────────────────────────┘   └────────────────────────┘

an inert control after a click (any theme)
│ [ Work Area ]  → a small notice under the control, 2 s:  "Not part of MiniMax Local — video generation only"
```

## Acceptance Criteria

- [ ] **Theme tokens:** the design tokens gain a dark set, one value per light token, taken from the 2026-09-14 measurement; components use tokens only, so switching the theme changes every surface (sidebar, top bar, composer card and pills, popovers, task thread, Progress panel, result card, Assets tiles and modal, alerts).
- [ ] **Theme choice:** `system` (default, follows `prefers-color-scheme`), `light`, `dark` — exposed where the reference exposes it (the user menu, with its wording) and remembered per browser; no flash of the wrong theme on load.
- [ ] **Every inert control gives feedback on click:** the same notice, near the control, for two seconds, and the control stays keyboard-reachable; the tooltip stays. The list of inert controls and what each does on the reference comes from STORY_018's inventory; any control whose reference behaviour is **in MVP scope** and cheap (STORY_018 decides which, e.g. the Changelog link) is implemented instead of made inert.
- [ ] Narrow (390): the theme applies; the notice fits.

## Departures from the reference

- The notice is ours: the reference has no inert controls, so there is nothing to match; the wording says what we deliberately do not build.
- Anything the reference does with a control that is out of MVP scope stays out (backlog items exist for them).

## Technical Notes

- Tokens live where STORY_012 put them (CSS custom properties on `:root`); the dark set goes under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, so the system default and the explicit choice both work; the choice is read from `localStorage` in an inline script before paint.
- The notice is one component (`InertNotice`) used by the sidebar rows, the top-bar buttons, the composer chips and the model selector; it announces through `role="status"`.

## Testing Plan

- **Unit** — `lib/theme.test.ts` (choice → attribute, storage round trip, system fallback), `components/shell/*.test.tsx` (the user-menu control sets the attribute; an inert control's click shows the notice and it clears after 2 s with fake timers, under `<StrictMode>`).
- **Integration:** not applicable — no route changes.
- **E2E** — `e2e/shell.spec.ts` gains: with `colorScheme: "dark"` the page background is the dark token and the user menu shows Dark selected; choosing Light flips it and survives a reload; clicking Work Area shows the notice and navigates nowhere; both projects. Regression: every existing spec at both widths.

## Estimated Complexity

M
