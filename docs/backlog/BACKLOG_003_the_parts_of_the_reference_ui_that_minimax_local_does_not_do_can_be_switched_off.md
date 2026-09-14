# BACKLOG_003 — The parts of the reference UI that MiniMax Local does not do can be switched off

**Status:** Open (2026-09-14) · **Priority:** Low until EPIC_005 closes — raised by the owner while reviewing EPIC_005: "in another epic we will do another pass to make sure everything is wired up correctly to use MiniMax locally on our Spark … I would like the option somewhere to be able to turn certain aspects off, but we can get on that part once we are done copying the UI"

## Summary

EPIC_005 makes MiniMax Local look identical to agent.minimax.io on every surface, with the surfaces we do not implement rendered exactly as the reference renders them and answering a click with a notice (STORY_019). Once the look is settled, the owner wants a later pass that (a) checks every surface that *is* wired to the Spark works end to end, and (b) gives him a way to **turn off the parts of the reference UI he will not use locally** — so a sidebar section, a mode chip, a top-bar button or a whole page can be hidden rather than shown inert.

## User impact

The clone stays faithful for anyone who wants the reference's look, while the owner's day-to-day workstation shows only the video generation flow (and whatever else he switches on), with no inert controls to click past.

## Rough scope

- A list of switchable **aspects** (candidates, from the 2026-09-12 inventory: Search, Plugins, Scheduled, Connect Mobile, the More section, Projects, the Agent Team section, the Work Area, the Document / Website / Image Generation / More mode chips, the agent-model selector, the Agent Team switch, the promo carousel, the Changelog and Download buttons, the low-credits notice).
- Where the switch lives — an owner-facing settings surface (the reference's user menu / settings modal, once EPIC_005 has captured it), or server configuration (`.env`), or both with the env as the default.
- What "off" means: hidden entirely (the layout closes up as if the element never existed) — not greyed, not inert; the on state is exactly STORY_019's rendering.
- Every switch has a unit test for its reducer and an e2e that renders both states at 1440 and 390.

## Dependencies

- EPIC_005 closed: the surfaces have to exist before they can be switched off, and their names come from STORY_018's inventory.
- STORY_019's inert-control notice is the on state.

## Open questions

- Per browser (`localStorage`, like the theme choice) or server-wide (`.env`, so every browser on the LAN sees the same)? The owner opens the UI from more than one browser.
- Does turning an aspect off also remove its route (e.g. `/plugins` answers 404) or only its entry points?
- Does the reference itself have any "hide this" preference in its settings that we should mirror instead of inventing a surface? STORY_018's user-menu and settings capture answers this.
