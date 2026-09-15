# BACKLOG_007 — The kept reference surfaces are wired for the video workflow

**Status:** Open — worked through by [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) (2026-09-15): every row below is either delivered (struck through, with its story) or carries the owner's decision; the item stays open for the two deferred rows (CLAUDE.md §3c: a partial delivery never archives the item) · **Priority:** High — the owner's next epic after STORY_026: "we will be fully going into depth on everything we do keep in a future epic … keep things that will be genuinely helpful to me during the video generation process and that includes the agents as well"

## Summary

STORY_026 removes the reference surfaces that can never matter locally and keeps, inert, the ones that will. This item lists the kept surfaces so the epic that wires them can be drafted from it, one story per surface, each starting from the reference capture and STORY_019's inert rendering.

## The kept surfaces (as of STORY_026)

| Surface | What wiring would mean (the owner decides per story) |
| --- | --- |
| Plugins › **Manage › Agents** (General / Coder / Verifier, Create agent, the editor: portrait, name, model, system prompt) and the composer's **MiniMax-M3** menu + Thinking | **Deferred (owner, 2026-09-15)** — STORY_036 (the text model), STORY_037 (chat) and STORY_038 (the personas): no MiniMax text model fits the Spark and MiniMax-H3 cannot chat; the agents editor stays read-only. ~~The Skills / Plugins / Apps tabs as our local tools (the video-creator)~~ — STORY_040 |
| ~~**Projects** (+ Create project, Recents › Move to project, Settings › Archived tasks' project filter, + › Add to project)~~ | ~~grouping tasks~~ — STORY_031 (a tag in history with its own page; not a directory on disk) |
| ~~Recents ⋯ **Rename / Pin / Copy conversation ID / Archive** and Settings › **Archived tasks**~~ | ~~rename a task; pin to the top; copy its id; archive out of Recents and restore~~ — STORY_029, STORY_030 |
| ~~**Inbox** bell (All / Updates / Messages)~~ | ~~"your video is ready" and "the shot changed" as notifications; Read all~~ — STORY_033 (Messages waits for the deferred chat) |
| ~~Assets **From you** / **Star** tabs, **Images** chip, Star in the menus~~ | ~~uploads (references) as assets; favourites~~ — STORY_032. **Audio** stays the shared empty state (no audio uploads exist) |
| ~~The preview pane's **⋯**~~ | ~~star from the preview~~, Copy link — STORY_032 (Download ▾: Download · Copy link · Star); rename stays on the Recents row |
| ~~+ › **Skills** / **Environment variables**~~ | ~~local skills~~ — STORY_040 (prompt recipes); ~~environment variables~~ — STORY_035 (a key / value store on the Spark; per-task settings such as seed / steps were not asked for) |
| **Connect mobile** | **Withdrawn (owner, 2026-09-15)** — STORY_039: "I do not want that story"; nothing was built. The page itself is STORY_025's inert rendering |
| ~~**More › MaxHermes / MaxClaw**~~ | removed with the More section — STORY_028 (owner, 2026-09-15) |
| The **Agents guide** and **promo** cards | the guide's View now lands on the Agents tab (STORY_040); the cards' content follows the deferred agents |

## Dependencies

STORY_026 landed; BACKLOG_006 for anything that needs a text model; EPIC_004's memory arithmetic for anything served beside the video model.

## Open questions

Order of the stories; which need a text model first; whether "Projects" is a folder on the Spark's disk or a tag in history.
