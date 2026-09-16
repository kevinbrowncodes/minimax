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

## Decided by the owner (2026-09-16, 12:45 EDT)

- **Credential: Vertex AI on GCP** (a project, a service account, IAM) — not an AI Studio key. The project id and region come from the owner when the story is written; the service-account file lives outside the repo and is mounted into the app container, never in git.
- **The reply goes into the composer for review first; later a Setting switches agent mode to straight-through** (photo → prompt → job with no review). Both modes exist; review is the default.
- **The spike stays first, but expect few refusals** ("Flash 3.8 rarely refuses"). What matters is the refusal path: the model's refusal is captured and shown to the owner verbatim where the prompt would have been, **and it runs before any job exists — every segment's prompt must come back clean before the first POST; one refusal aborts the whole Send all and nothing is queued**, in review mode and in straight-through mode alike, so a refused script can never let a dependent segment run.
- **The photos go to Google** — all of them.
- **How the skill is sent** (there is no Gemini equivalent of the Agent Skills spec; a skill is text): `SKILL.md`'s body as the system instruction, `references/*.md` as text parts of the same request, the image as an image part, the owner's notes as the user turn; the skill + references held in Vertex context caching since they do not change between calls. The spike verifies this against the current Vertex docs.

- **The pill and the Skills tab — under discussion:** the three ways agents and skills can map onto the UI, with before/after mockups and a recommendation, are in [BACKLOG_009_agents_and_skills_a_map_with_mockups.md](BACKLOG_009_agents_and_skills_a_map_with_mockups.md); the owner decides there. His first framing, kept for the record:
- **The picker is the reference's MiniMax-M3 pill, repurposed** (the right end of the bar, left of Run at… and Send): it reads `Agent · <the selected agent's short name> ⌄`, opens a menu titled **Agents** with one row per folder under `agents/skills/` (name + description from `SKILL.md`, the selected one checked) and a *Manage agents* row to the Plugins page; visible in agent mode; in video mode the pill stays the reference's inert one until BACKLOG_006 decides. "Agent" is the word (the owner's, the folder's, and a future agent need not be a director); "director" stays in the thirst-trap skill's description.
- **Straight-through is a Settings switch, default off** ("Agent mode sends the prompt straight to a job"); no per-send override for now.
- **Send all accepts full-format segments** (each starts with `integrated_multimodal_description:`; the splitter recognises that line as well as `[0:00-` and sends each unchanged) so the skill decides the camera — a small follow-up to STORY_044 inside the epic. **A format check runs before any straight-through send** (the instruction line first, the three fields, a word count in range, no timestamps in a single-clip prompt); a bad reply is a shown failure, never a queued job.
- **The multi-script director is in this epic**, after the single-clip path works: photo → one anchor with no pose in it + N scripts in the `[0:00-` convention → Send all (STORY_044); a second folder under `agents/skills/` (`minimax-h3-director-thirst-trap-chain` or the family's next name).
- **The model id is taken from Vertex's model list at spike time** — the spike lists the Gemini Flash models available on the owner's project and region and the story pins the newest Flash.

## Open questions (for the epic)

- Whether image input at 1376×768 needs downscaling for cost.
- Whether the skill's `metadata` (model, checkpoint, verified-on) is shown in the Agents menu.
- The GCP project id, region and the service account's roles (the owner supplies them when the spike is written).
