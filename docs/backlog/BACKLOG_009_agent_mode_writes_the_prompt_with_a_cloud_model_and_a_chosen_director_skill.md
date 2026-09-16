# BACKLOG_009 — Agent mode writes the prompt with a cloud model and a chosen director skill

**Status:** Open (2026-09-16) · **Priority:** High — the owner's next epic; he intends to architect it himself (with Fable) from this item

## Summary

The composer's default mode — the reference's agent chat, kept by STORY_026 with nothing behind it — becomes a **director you talk to**: attach the starting image, pick a director skill from `agents/skills/` (default: the only one, `minimax-h3-director-thirst-trap`), type a line of notes or nothing, Send. The app server sends the skill (`SKILL.md` and its `references/`), the image and the notes to a **Google Gemini Flash** model (the owner's GCP account; he said "Flash 3.8" — the exact model id is read from Google's model list when the story is written), and the finished MiniMax prompt comes back **into the composer as text to read and edit** before Send or Send all. Owner, 2026-09-16: "I wanted to give you access my gcp account and use google flash … to generate the scripts. I was thinking that would be our agent mode … in this agent mode I want to be able to select what skill to select, rn default to the only one we have."

## User impact

Today the scene anchor and the script are written by a person (the owner, or the assistant in a session) — the one step of the pipeline that is not on the box and not repeatable without someone at the keyboard. With this, a new clip from a new photo is: attach, pick the director, Send, read, Send. It also settles BACKLOG_006's blocker for good: a cloud text model needs none of the Spark's 121 GiB, so agent mode can exist beside the video model (no MiniMax text model fits — STORY_036's table).

## Rough scope

1. **A spike first** (its own story, no UI): the three images already used (studio, bathroom, cove) sent to the chosen Flash model with the thirst-trap skill as the system prompt, from a script in the repo, the replies and any refusals recorded verbatim — Gemini's safety filters against this genre are the biggest unknown, and the wording of the skill may need tuning before any UI is built.
2. **The credential**: a Gemini API key (AI Studio) or Vertex AI (project, service account, IAM) — the owner decides; it lives in the app container's environment (a gitignored `.env`, like the adapter URL), never in the repo, and the browser never sees it. The README names the variable.
3. **The server side**: a route that reads a skill directory (`SKILL.md` frontmatter + body + `references/*`), builds the system prompt, sends image + notes, returns the text; refusals and errors as a message the UI shows ("the model declined: …"). The stub gains a scripted reply so the gate never calls Google.
4. **The UI**: in text (agent) mode a skill picker (name + description from each `SKILL.md`, default the first), the image attach, Send → the reply fills the video composer's text (and switches to video mode) for review; or — the epic decides — renders as a turn in the task thread the way the reference renders its agent. Both widths, both themes; a Departures section, since the reference's agent is a conversation and ours is a tool.
5. **Chains**: a second director (one anchor with no pose in it, N scripts in the `[0:00-` convention — the rule from 2026-09-16) so the reply can go to Send all (STORY_044).
6. **Cost**: a line in the README with the per-call cost of the chosen model.

## Dependencies

STORY_044 (Send all, for chains), CHORE_012 (the skill format and the first director), BACKLOG_006 (the surface this wires; its Spark-model route stays a separate option), BACKLOG_005 (this is one way to get the rewriter — a cloud VLM rather than a local one).

## Open questions (for the epic)

- API key or Vertex AI? Which GCP project, and who pays?
- The exact model id, and whether image input at 1376×768 needs downscaling for cost.
- The owner is sending his photos to Google: agreed, and are any images off-limits?
- What happens on a safety refusal — shown as-is, retried with softer wording, or both?
- Always review before Send, or an optional straight-through mode later?
- Chat thread (the reference's look) or fill-the-composer (a tool)?
- Does the skill's `metadata` (model, checkpoint, verified-on) get shown in the picker?
