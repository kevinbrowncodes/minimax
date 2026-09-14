# EPIC_001 — The reference's video generation flow is captured as a spec we can build from

**Status:** Done (2026-09-12) — one recorded gap: the post-cancel thread state (STORY_002)
**Started:** 2026-09-12

## Goal

Before a single screen of our own is built, `docs/recon/` holds everything a clone story needs to cite: dated screenshots of every state of agent.minimax.io's video generation flow, measured design tokens, a component inventory, and notes on what the flow does on the network. After this epic, a story can say "match capture X" and mean something checkable.

## Why this is first

The owner's plan is UI first, model second. The UI is a clone, and a clone without a captured reference is a guess ([CLAUDE.md → §3 item 6](../../CLAUDE.md#3-how-features-are-built-important)). The capture also settles the tech-stack question: the reference is a Next.js App Router app (observed 2026-09-12), which is the working assumption for our own stack.

## Scope

**In:** the video generation surface only — the composer in video mode, reference-image attachment, the option controls, submit, every job state (queued, generating, done, failed, moderated, cancelled), playback, download, and the history/gallery of generations. Both the wide layout and whatever narrow layout the reference has.

**Out:** every other surface of agent.minimax.io. If a screenshot of one costs nothing extra during a capture run, it gets one line in the inventory; otherwise nothing. Out-of-MVP surfaces the owner asks about become backlog items ([CLAUDE.md → §3c](../../CLAUDE.md#3c-how-backlog-is-tracked)).

## Stories (in implementation order)

| # | Story | Status |
| --- | --- | --- |
| 001 | [The owner signs in to the reference once and every recon run reuses that session](../story/STORY_001_the_owner_signs_in_to_the_reference_once_and_every_recon_run_reuses_that_session.md) | Done |
| 002 | [Every state of the video generation flow is captured as dated screenshots](../story/STORY_002_every_state_of_the_video_generation_flow_is_captured_as_dated_screenshots.md) | Done (gap: post-cancel thread state, owner accepted) |
| 003 | [The reference's design tokens are measured, not eyeballed](../story/STORY_003_the_references_design_tokens_are_measured_not_eyeballed.md) | Done |
| 004 | [The component inventory and interaction notes say what the flow does on the network](../story/STORY_004_the_component_inventory_and_interaction_notes_say_what_the_flow_does_on_the_network.md) | Done |

## Constraints

- **Credits.** Generations on the reference cost the owner credits (through 2026-09-15 check-in credits work for H3; after that, paid only — per the reference's own announcement). STORY_002 states how many real generations it needs and the owner approves the number before the run.
- **No credentials through the assistant.** The owner signs in once in a browser the scripts control; the scripts never see a password, a 2FA code, or a cookie value ([CLAUDE.md → §4b](../../CLAUDE.md#4b-recon-with-playwright)).
- **Recreate, don't lift.** Captures are for measuring. Their bundles, brand marks, sample videos and the generated videos themselves stay in the gitignored output directory ([CLAUDE.md → §3e](../../CLAUDE.md#3e-how-recon-is-recorded)).
- **Read-only and polite.** Browse at a human pace, only the owner's own account, only endpoints a normal session calls.

## What was observed before any story (2026-09-12, logged out, 1440×900)

- The app is a **Next.js App Router** build served from a CDN under a versioned path (`prod-web-va-0.1.178` that day). Body text uses the system sans-serif stack; the page also loads **Outfit** and **Source Serif** (both SIL Open Font License) and the KaTeX fonts. Background is white.
- Layout: a left sidebar (New task, Plugins, Connect Mobile, More: MaxHermes, MaxClaw; bottom: Download desktop, See Plan and pricing, Sign in) and a centred composer with mode chips: Agent Team, MiniMax-M3, **Video generation H3**, Document, Website, Image Generation, More. Top right: Download, Sign in.
- **Video generation is a mode of the home composer**, not a separate route, at least when logged out. Whether it becomes a route once signed in is STORY_002's first question.
- A first-visit **announcement modal** ("H3 takes the stage") sits over the page and swallows clicks until closed. Every script dismisses it before reading anything.
- The app's own API is under `/v1/api/` on the same origin (a `config/web/common_config` call was seen on load). Third-party analytics pixels are numerous and are filtered out of interaction notes.

## Definition of done

Every story above is Done, `docs/recon/` contains the four artefact kinds named in [CLAUDE.md → §3e](../../CLAUDE.md#3e-how-recon-is-recorded), each dated, and a reader with no access to the reference can describe the video generation flow from the captures alone.

## Open questions

1. ~~What does the signed-in home look like — does the video chip route somewhere, and what replaces the "Sign in" control?~~ **Answered 2026-09-12:** the chip stays on `/` and swaps the composer into video mode; nothing replaces the control — it is simply absent, and the sidebar gains Search, Scheduled, Assets, Projects, Recents, Agent Team and a user chip. See STORY_002's Current state.
2. ~~How many real generations does a full state capture need?~~ **Approved 2026-09-12: N = 2 at 768P · 5s** (main chain plus a submitted-then-cancelled job). The owner offered to add credits if more are needed; ask before spending beyond two.
