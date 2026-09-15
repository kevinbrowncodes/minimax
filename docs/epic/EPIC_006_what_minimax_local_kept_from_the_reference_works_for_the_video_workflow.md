# EPIC_006 — What MiniMax Local kept from the reference works for the video workflow

**Status:** Open (2026-09-15) — the owner, after STORY_026: "next story is taking a deeper dive on all the remaining items I want to make sure everything that is left has all its functionality"; every surface STORY_026 kept inert will be wired, one story per surface, from a behaviour recon of the reference
**Started:** 2026-09-15

## Goal

STORY_026 left the reference's agents, projects, archive, favourites, uploads, inbox, skills, bot page, product pages and text composer in place, inert. This epic makes each of them do something real on the Spark — the reference's behaviour where it fits a local video workstation, our own where the reference's depends on MiniMax's cloud — so nothing left in the UI answers "Not part of MiniMax Local". [BACKLOG_007](../backlog/BACKLOG_007_the_kept_reference_surfaces_are_wired_for_the_video_workflow.md) is the list; [BACKLOG_006](../backlog/BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md) is the text model the agents need.

## Why a recon first

The 2026-09-14 capture recorded how every kept surface **looks** and clicked none of its entries (the inventory says so); its network notes cover the video flow only. Wiring from that would be guessing (CLAUDE.md §3 item 8). STORY_027 performs each kept action once on the owner's account — reversibly, with his approval of 2026-09-15 — and records what changes, what the reference sends, and what a text turn looks like. The stories after it are cut from that record.

## Stories (in implementation order)

| # | Story | Status |
| --- | --- | --- |
| 027 | [The behaviour of the kept surfaces is recorded, from the Spark](../story/STORY_027_the_behaviour_of_the_kept_surfaces_is_recorded_from_the_spark.md) — every kept action performed once and undone; the network, the state changes, the screenshots; one text turn | In progress (2026-09-15) |
| 028+ | To draft after 027, from BACKLOG_007 and the recon: Recents (rename, pin, copy id, archive + Archived tasks), Projects, Assets (uploads, Star), the Inbox, the agents and text chat (BACKLOG_006), skills / environment variables, Connect mobile, the product pages | To draft |

## Recon budget

Reversible changes on the owner's account (approved 2026-09-15): a rename (undone), a pin (undone), an archive (undone), a star (undone), one test project and one test agent (deleted), one uploaded image (deleted). Credits: the owner's daily budget; the plan is one text turn, a second only if the first cannot be recorded; the count goes in the recon notes.

## Not in this epic

- Anything STORY_026 removed (it stays removed).
- MiniMax's cloud-only capabilities behind a kept surface (a plugin marketplace, credits) — a story either finds a local meaning or records why the surface stays a placeholder.
- Switching surfaces off (BACKLOG_003, withdrawn).

## Working rules carried over

- Recon is read-only where it can be and undoes what it must change; the owner logs in; nothing from `recon/out/` or `recon/.profile/` is committed ([CLAUDE.md → §3e, §4b](../../CLAUDE.md#3e-how-recon-is-recorded)).
- Every wiring story cites the recon step it implements and lists its departures.
- The gate stays model-free.
