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
| 027 | [The behaviour of the kept surfaces is recorded, from the Spark](../story/STORY_027_the_behaviour_of_the_kept_surfaces_is_recorded_from_the_spark.md) — every kept action performed once and undone; the network, the state changes, the screenshots; one text turn | **Done (2026-09-15)** — [docs/recon/2026-09-15/behaviour.md](../recon/2026-09-15/behaviour.md); 1 credit turn; the account left as found |
| 028 | [The last placeholders go: MaxHermes, MaxClaw and the More section; the "Help improve" switch](../story/STORY_028_the_last_placeholders_go_maxhermes_maxclaw_the_more_section_and_the_help_improve_switch.md) — owner, 2026-09-15: cut both product pages (Start now does nothing even on the reference) and the section that held them; cut the consent switch (no local meaning); the Daily check-in card the reference gained is ignored (credits do not exist here). Recon: §5 | Approved (2026-09-15) |
| 029 | [Recents rows can be renamed, pinned and their id copied](../story/STORY_029_recents_rows_can_be_renamed_pinned_and_their_id_copied.md) — Rename as the inline input, `PATCH /api/history/:id { title }`; Pin makes the **Pinned** section above Projects (a `pinned` flag + order in history); Copy conversation ID; the Search dialog and the task title follow a rename. Recon: behaviour.md §1 | Approved (2026-09-15) |
| 030 | [A task can be archived and comes back from Settings › Archived tasks](../story/STORY_030_a_task_can_be_archived_and_comes_back_from_settings_archived_tasks.md) — Archive drops the row from Recents (`archived` + `archivedAt` in history); Archived tasks lists them (grouped by project once 031 lands, else "No project") with Unarchive, a per-row delete, Delete all, live search; Assets keeps or hides archived videos (the story decides). Recon: §1 Archive | Approved (2026-09-15) |
| 031 | [Projects group tasks](../story/STORY_031_projects_group_tasks.md) — Create project; the Projects section's rows ("No tasks" / the count) with the row's ⋯ (New task, Rename, Pin, Delete → confirm); a task started inside a project (the row's New task, + › Add to project); Recents › Move to project; the project's page listing its tasks; the Archived tasks filter by project. Recon: §2 | Approved (2026-09-15) |
| 032 | [Assets get Star, From you and the preview's ⋯](../story/STORY_032_assets_get_star_from_you_and_the_previews_more_menu.md) — Star / Unstar on a video (a flag in history) and the Star tab; **From you** lists the reference images the owner attached (the app keeps them as files with the job, and the Images chip shows them); the preview's ⋯ (Download, Copy, Refresh, Star) with local meanings (Copy = the file's URL; Refresh = a re-generation → a departure or dropped). Recon: §3, §5 | Approved (2026-09-15) |
| 033 | [The Inbox carries the job events](../story/STORY_033_the_inbox_carries_the_job_events.md) — a finished / failed / cancelled job and a flagged shot change become notifications with an unread count on the bell; All / Updates / Messages as the reference draws them; Read all. Ours to define (the reference's was empty). Recon: §5 | Approved (2026-09-15) |
| 034 | [The watermark switch means something locally](../story/STORY_034_the_watermark_switch_decides_whether_downloads_are_watermarked.md) — Settings › General › "Remove an AI-generated watermark" decides whether downloads carry a visible watermark (stamped by the adapter or at download time — the story measures which). Recon: §5 | Approved (2026-09-15) |
| 035 | [Environment variables are a local key / value store](../story/STORY_035_environment_variables_are_a_local_key_value_store.md) — the + › Environment variables dialog (key name / Key value, Add Variables, Save) writes to app data; what reads them: Connect mobile's bot token (039) and any later integration. Recon: §5 | Approved (2026-09-15) |
| 036 | [The text-model decision](../story/STORY_036_the_text_model_for_the_spark_is_chosen_licence_read_memory_measured.md) — BACKLOG_006's first story: candidates (MiniMax M2-line at a quantisation that fits, or a smaller model that fits beside the video model), licence and territory read from each repo, weights on disk and memory measured on the Spark; the owner picks in writing. No UI | Approved (2026-09-15) |
| 037 | [Text chat with the chosen model](../story/STORY_037_the_composers_text_mode_chats_with_the_local_model.md) — the composer's text mode sends a turn: a session per agent (`POST /api/chats` with the model), a streamed reply (SSE) rendered as the reference renders it (Thinking… / the status words, the prose, Processed N s, Copy · time), the title made after the first turn, Stop; chats in Recents and Search; the MiniMax-M3 menu lists the served model(s), Thinking = the reasoning flag. Recon: §6 | Approved (2026-09-15) |
| 038 | [The agents are video-minded local personas](../story/STORY_038_the_agents_are_video_minded_local_personas.md) — owner, 2026-09-15: the reference's General / Coder / Verifier are replaced by video-minded built-ins (proposed: Scriptwriter, Director, Reviewer — the story names them and their prompts), editable in model only; Create agent (name, description, system prompt, model, tools) stored in app data; the row's Chat with it / Pin / Delete; a chat opened with an agent uses its prompt. Recon: §4 | Approved (2026-09-15) |
| 039 | [Connect mobile: a Telegram bot](../story/STORY_039_connect_mobile_is_a_telegram_bot_that_makes_videos.md) — the token from the environment variables; the app polls the bot; a message becomes a video job (text, or a photo as the first frame) and the finished clip is sent back; the bot list, Not bound / bound, Delete. Recon: §5 | Approved (2026-09-15) |
| 040 | [Skills, plugins and apps get a local meaning or stay placeholders](../story/STORY_040_skills_plugins_and_apps_get_their_local_meaning.md) — Manage › Plugins shows the video-creator as our adapter with its enable switch and the Spark's status; Skills as saved prompt recipes usable from + › Skills (BACKLOG_005's rewriter is one); Apps empty. Recon: §4 | Approved (2026-09-15) |

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
