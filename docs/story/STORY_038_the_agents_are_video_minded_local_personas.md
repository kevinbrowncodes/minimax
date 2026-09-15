# STORY_038 — The agents are video-minded local personas

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — after STORY_037
**Status:** Deferred (2026-09-15 — the model the personas run on (STORY_036) is deferred; the owner: "if that's not possible then we can defer this one"). The story is unchanged and waits for a text model on the Spark
**Created:** 2026-09-15, from [behaviour.md §4](../recon/2026-09-15/behaviour.md)

As the owner, I want Plugins › Manage › Agents to hold personas that help me make videos — a Scriptwriter that turns an idea into the model's prompt format, a Director for shots and camera, a Reviewer that checks a clip against its script — editable, creatable, each one a chat away, so that the text model works for the video workflow.

## Current state

The Management page's Agents tab shows General / Coder / Verifier and a read-only editor, all inert (STORY_025/026). The reference (2026-09-15): built-in agents editable in model only; a custom agent (`POST agent`) editable in display_name, description, system_prompt, model, tool_capabilities, skill_selectors, plugin_names; the row's menu Chat with it / Pin / Delete; Delete confirms.

## UI Mockup

**Reference captures:** `behaviour-manage-tabs-05-tab-agents`, `behaviour-manage-agents-01..03`, `behaviour-manage-create-agent-01..08` (2026-09-15); `agents-guide-view-now@1440` (2026-09-14).

```
Management   [Plugins 1] [Skills n] [Apps 0] [Agents 3]
All agents                    Portrait  ▣        Name *  [Scriptwriter            ]
 ▣ Scriptwriter   (built-in)  Model            [the served model ▾]
 ▣ Director                   System prompt    [You turn a short idea into MiniMax H3's prompt format… ]  (read-only for built-ins)
 ▣ Reviewer                                                          [Save] [Chat with it]
 + Create agent               row ⋯: Chat with it · Pin · Delete (custom only) → Cancel / Delete
```

## Acceptance Criteria

- [ ] **Built-ins** (in `lib/agents.ts`, with their prompts): **Scriptwriter** (turns an idea and a first-frame description into the base prompt format STORY_020 documents — the `[Shot 1]` block, soundscape, music fields), **Director** (shot list, camera moves, duration and ratio suggestions per the model's limits), **Reviewer** (given the script and the clip's description / cuts, says what to retry); editable in model only; description shown.
- [ ] **Custom agents:** Create agent → an empty editor (Name required, description, system prompt, model); Save writes `/data/agents.json` through `POST/PATCH /api/agents`; the row's ⋯: Chat with it, Pin (the Pinned section), Delete (confirm).
- [ ] **Chat with it** opens a new chat (STORY_037) whose system prompt is the agent's and whose bar shows the agent's name; the agent's avatar marks its Recents rows (the reference's roster avatars).
- [ ] The Agents guide card's View now still lands on the Agents tab; both widths, both themes.

## Departures from the reference

- General / Coder / Verifier are replaced (the owner's decision); tools, skills and plugins per agent are not offered (nothing local to attach yet).

## Technical Notes

- `lib/agents.ts` (built-ins + prompts), `lib/agent-store.ts` (`/data/agents.json`), routes `/api/agents`, `/api/agents/:id`; `ManagePage.tsx`'s Agents tab becomes real; `POST /api/chats { agentId }` (STORY_037) picks the prompt.

## Testing Plan

- **Unit** — `agents.test.ts` (the three built-ins have prompts that mention the format's pieces), `agent-store.test.ts`.
- **Integration** — `agents.test.ts` (create / edit / delete; a built-in refuses prompt edits with a 400); `chats.test.ts`: a chat created with an agent sends its prompt as the system message (the stub echoes it).
- **Component** — `pages.test.tsx`: the editor, Create agent, the ⋯ menu, Delete's confirm.
- **E2E** — `agents.spec.ts` (new): create an agent, Chat with it → the chat page names it and the stub's echo shows the prompt reached the model; delete it.

## Estimated Complexity

Medium.
