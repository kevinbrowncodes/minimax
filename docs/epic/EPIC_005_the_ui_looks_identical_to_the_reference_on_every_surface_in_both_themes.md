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
| 018 | [The reference's dark mode and the surfaces never captured are recorded, from the Spark](../story/STORY_018_the_references_dark_mode_and_the_surfaces_never_captured_are_recorded_from_the_spark.md) — the second capture: every surface a signed-in user sees, both themes, both widths, every menu open, one generation watched to completion | Drafted (2026-09-14), redrafted the same day to the full-surface capture (every sidebar destination, every composer mode, every menu, the settings tabs, hover states, per-scope dark tokens) after the owner's review; needs the owner's sign-in through `recon/login.sh` (CHORE_005) — `recon/run.sh check` read `signed-out` on 2026-09-14 |
| 019 | [The UI has the reference's dark mode, and every control either works or says why not](../story/STORY_019_the_ui_has_the_references_dark_mode_and_every_control_either_works_or_says_why_not.md) — the dark token set and the inert-control notice, the two things the owner named | Drafted (2026-09-14); designed from 018's capture |
| 020+ | One rebuild story per surface group, drafted from 018's inventory diff: the shell (sidebar sections, top bar, user menu), the home (composer, chips, ShowCase), the task page (thread, progress panel, result card), Assets (tabs, chips, tiles, menus, modal), and the pages behind every sidebar item (Search, Plugins, Scheduled, Connect Mobile, Projects, Agent Team, the Work Area) rendered as the reference renders them and inert | To draft after 018 |

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
