# BACKLOG_007 — The kept reference surfaces are wired for the video workflow

**Status:** Open (2026-09-15) · **Priority:** High — the owner's next epic after STORY_026: "we will be fully going into depth on everything we do keep in a future epic … keep things that will be genuinely helpful to me during the video generation process and that includes the agents as well"

## Summary

STORY_026 removes the reference surfaces that can never matter locally and keeps, inert, the ones that will. This item lists the kept surfaces so the epic that wires them can be drafted from it, one story per surface, each starting from the reference capture and STORY_019's inert rendering.

## The kept surfaces (as of STORY_026)

| Surface | What wiring would mean (the owner decides per story) |
| --- | --- |
| Plugins › **Manage › Agents** (General / Coder / Verifier, Create agent, the editor: portrait, name, model, system prompt) and the composer's **MiniMax-M3** menu + Thinking | agents as local personas over a text model ([BACKLOG_006](BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md)); the Skills / Plugins / Apps tabs as our local tools (the video-creator) |
| **Projects** (+ Create project, Recents › Move to project, Settings › Archived tasks' project filter, + › Add to project) | grouping tasks; a project as a working directory for references and outputs |
| Recents ⋯ **Rename / Pin / Copy conversation ID / Archive** and Settings › **Archived tasks** | rename a task; pin to the top; copy its id; archive out of Recents and restore |
| **Inbox** bell (All / Updates / Messages) | "your video is ready" and "the shot changed" as notifications; Read all |
| Assets **From you** / **Star** tabs, **Images / Audio** chips, Star in the menus | uploads (references, first frames, audio for Ref2VA) as assets; favourites; picking a starred clip to extend |
| The preview pane's **⋯** | rename / star / send to new task from the preview |
| + › **Skills** / **Environment variables** | local skills for the agent; env-vars as per-task settings (seed, steps) |
| **Connect mobile** | a Telegram bot that submits prompts and returns clips |
| **More › MaxHermes / MaxClaw** | placeholders — the owner said keep; what they become is his call |
| The **Agents guide** and **promo** cards | their content once the above exist |

## Dependencies

STORY_026 landed; BACKLOG_006 for anything that needs a text model; EPIC_004's memory arithmetic for anything served beside the video model.

## Open questions

Order of the stories; which need a text model first; whether "Projects" is a folder on the Spark's disk or a tag in history.
