# EPIC_005 — The UI looks identical to the reference on every surface, in both themes

**Status:** Open (2026-09-14) — the owner's decision after reviewing the MVP: "it should look identical to agent.minimax.io, with the exception being we are using our local Spark MiniMax and not a cloud one"; looks first, behaviours later
**Started:** 2026-09-14

## Goal

A signed-in user of MiniMax Local and a signed-in user of agent.minimax.io see the same thing: the same surfaces, the same layout, type, colour, spacing, motion and states, in light and in dark, at desktop and narrow widths — with two deliberate differences: the videos are generated on the Spark, and anything MiniMax Local does not do is rendered exactly as the reference renders it but answers a click with a plain notice instead of doing it.

**Pixels only.** Behaviours beyond the video generation flow (chat, plugins, projects, scheduled tasks, the agent team, the work area, settings that change anything) are **not** built in this epic; they get an epic of their own once the look is settled, and only those the owner wants locally.

## Why looks first

EPIC_001–003 captured and rebuilt the video generation flow alone, by the MVP rule; the owner now wants the whole app to read as the reference. The first capture (2026-09-12) was of the light theme and one flow; the reference has a dark theme and a dozen surfaces we never measured. A clone story without a capture is a guess ([CLAUDE.md → §3 item 6](../../CLAUDE.md#3-how-features-are-built-important)), so this epic is recon-led: every rebuild story cites a 2026-09-14-or-later capture.

## What "identical" means here (the acceptance bar)

- Every rebuild story ends with a **side-by-side** of ours and theirs at 1440 and 390, in both themes, and a **pixel-difference number per surface** from a deterministic comparison (same viewport, fonts settled, dynamic content masked), with the tolerance the story sets and a **list of the deltas that remain** (fonts we cannot license, credit and billing banners, content that is theirs). The comparison is a review aid the Done note carries, not a gate step ([CLAUDE.md → §6b](../../CLAUDE.md#6b-e2e-test-conventions)).
- The reference changes; every capture is dated and every story says which capture it matched. "Identical" is to a dated snapshot, and the epic says so.
- Out-of-scope controls look exactly like the reference's and, on click, show the same short notice ("Not part of MiniMax Local") near the control — no dead clicks, no pretending.

## Stories (in implementation order)

Recon first, then one rebuild story per surface, each drafted after the capture it cites exists. Numbers continue the global sequence.

| # | Story | Status |
| --- | --- | --- |
| 018 | [The reference's dark mode and the surfaces never captured are recorded, from the Spark](../story/STORY_018_the_references_dark_mode_and_the_surfaces_never_captured_are_recorded_from_the_spark.md) — the second capture: every surface a signed-in user sees, both themes, both widths, every menu open; the finished thread came from the 2026-09-12 job, which had completed on its own | **Done (2026-09-14)** — 204 captures, tokens for both themes, inventory with the "What we lack" list; 0 generations spent, 1 still approved |
| 019 | [The UI has the reference's dark mode, and every control either works or says why not](../story/STORY_019_the_ui_has_the_references_dark_mode_and_every_control_either_works_or_says_why_not.md) — the dark token set and the inert-control notice, the two things the owner named | **Done (2026-09-14)** — dark by system preference or by Settings › General › Appearance; every inert control answers a click with the notice; dark surfaces 89–98 % pixel-identical at 1440 |
| 021 | [The shell matches the reference: folding sections, Recents menus, Inbox, Search and the collapsed rail](../story/STORY_021_the_shell_matches_the_reference_folding_sections_recents_menus_inbox_search_and_the_collapsed_rail.md) | **Done (2026-09-14)** — 90–98 % pixel-identical on every shell surface, both themes, both widths |
| 022 | [The home and composer match the reference: Showcase, the attach menu, the mode chips and the agent-model menu](../story/STORY_022_the_home_and_composer_match_the_reference_showcase_attach_menu_mode_chips_and_the_agent_model_menu.md) | **Done (2026-09-14)** — 84–97 % pixel-identical at 1440 in both themes; the remaining pixels are the Showcase's content |
| 023 | [The task page matches the reference: the result card, the preview pane, the Work Area panel and the thread rows](../story/STORY_023_the_task_page_matches_the_reference_result_card_preview_pane_work_area_panel_and_thread_rows.md) | **Done (2026-09-14)** — 94–95 % pixel-identical at 1440 in both themes on the resting states; the remaining pixels are the reference's prompt, prose, Recents and video |
| 024+ | The remaining rebuild stories, cut from 018's "What we lack": Assets (From you / Star tabs, chip empty states, the tile ⋯ menu), and the pages behind the sidebar (Plugins and Manage, Scheduled, Connect mobile, MaxHermes, MaxClaw) rendered as the reference renders them and inert | To draft after 023 |

## Recon budget

Generations on the reference cost the owner credits; the owner granted new credits on 2026-09-14. This epic plans **two** (one at 768P and the shortest duration watched to completion for the finished thread; one held in reserve for a state the first does not reach) and asks before a third. Counts are written in each capture's notes.

## Not in this epic

- Any behaviour beyond video generation (a later epic, if the owner wants it locally).
- Their fonts where the licence does not allow them (the tokens file names the substitute, as in EPIC_001).
- Their billing, credits, plans and account surfaces beyond their look.
- Extending or subject references (STORY_017, BACKLOG_002) — the model side is EPIC_004's line.
- **Classic mode** (the user menu's "Switch to classic mode") — owner, 2026-09-14: not supported; the entry is captured as a line in the inventory and never followed.
- **Any signed-out, sign-in or auth surface** — owner, 2026-09-14: a one-man operation, so MiniMax Local has no auth anywhere; the reference is only ever captured signed in.
- **Switching the unused parts off** — the owner wants, after this epic, a way to hide the surfaces he will not use locally rather than show them inert: [BACKLOG_003](../backlog/BACKLOG_003_the_parts_of_the_reference_ui_that_minimax_local_does_not_do_can_be_switched_off.md), a later epic.

## Working rules carried over

- Recon is read-only and polite; the owner logs in; nothing from `recon/out/` or `recon/.profile/` is ever committed ([CLAUDE.md → §3e, §4b](../../CLAUDE.md#3e-how-recon-is-recorded)).
- Fidelity is the acceptance bar for every story here; departures are written, with the reason, under **Departures from the reference** ([CLAUDE.md → §6 rule 8](../../CLAUDE.md#6-key-rules)).
- The gate stays model-free; visual comparison never gates a push.
