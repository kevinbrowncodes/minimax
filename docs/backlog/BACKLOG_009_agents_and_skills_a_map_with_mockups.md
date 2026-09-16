# BACKLOG_009 — Agents and skills: what the words mean today, and three ways the UI could put them together

**Companion to** [BACKLOG_009](BACKLOG_009_agent_mode_writes_the_prompt_with_a_cloud_model_and_a_chosen_director_skill.md). Written 2026-09-16 for the owner, before the epic is drafted, because "skill" and "agent" each mean two things in this repo right now and the epic has to pick one meaning per word. Nothing here is built.

## 1. The one question

When agent mode exists, **what does the pill at the right of the composer's bar pick, and what does Management › Skills list?** Everything else (the Vertex call, the review step, the straight-through switch, the refusal rule, chains) is decided in BACKLOG_009 and does not change with the answer.

## 2. Four things that are called "skill" or "agent" today

| Where | What it is | Example |
| --- | --- | --- |
| **MiniMax's release** | An *Agent Skill*: a folder with `SKILL.md` (frontmatter + instructions) and `references/`, in the open [Agent Skills](https://agentskills.io/specification) format, for an LLM to follow when it writes H3 prompts | `h3-prompt-writing` (saved as `docs/references/prompt-guides/h3-prompt-writing_SKILL.md`) |
| **agent.minimax.io — the Skills tab** (recon 2026-09-15, `behaviour-manage-tabs-03-tab-skills`) | Ten skill rows its agent follows, e.g. `deep-research` marked **Built-in**, each with a description; a Search field; `+ › Skills › Manage skills` opens it | `deep-research` |
| **agent.minimax.io — the Agents tab** (`behaviour.md` § Agents 3) | "All agents": **General**, **Coder**, **Verifier**, each a persona with a **Portrait**, a **Name** and a **system prompt** in an editor; **Create agent** | `General` — "You are a general-purpose agent…" |
| **This repo — `agents/skills/`** (CHORE_012) | Our Agent Skills: the same format as MiniMax's, validated by the same tool; today one, a *director* that turns one photo into one prompt | `minimax-h3-director-thirst-trap` |
| **This app — Management › Skills and `+ › Skills`** (STORY_040) | Text snippets with an `{{idea}}` slot that drop into the composer; one built-in, **Short-to-script**. STORY_040 gave the reference's Skills tab this local meaning because there was no agent to follow real skills | `Short-to-script` |
| **This app — Management › Agents** (STORY_025) | The reference's tab cloned inert: General / Coder / Verifier, Create agent, the editor with Portrait, Name and the system prompt, all read-only | — |
| **This app — the bar's pill** (STORY_026) | The reference's agent-model menu: **MiniMax-M3 ⌄** listing M3 / M2.7 / M2.7 HighSpeed and a Thinking switch, inert; BACKLOG_006 was to wire it to a text model on the Spark, deferred because none fits | — |

**So MiniMax's use of "skill" is the same as ours** — a `SKILL.md` folder an LLM follows — and the reference's Skills tab is that kind too. The odd one out is our app's snippet meaning, which was a stand-in.

**The reference's model in one sentence:** *an agent is a persona (name, portrait, system prompt) that uses skills (instructions for a task).* Our vision fits it exactly: our agent is the Flash-backed **Director** (persona: "turn this photo into a MiniMax prompt"); our skills are the folders (the thirst-trap director today, the chain director next). Nothing in the reference's model is incompatible with the vision; only the snippet meaning of "skill" is.

## 3. Before — what the four surfaces show today

The composer's bar (video mode, desktop; the pill is inert):

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [+]  [◎ MiniMax-H3 ⌄]  [▭ 16:9 │ 768P │ ◷ 5s]                MiniMax-M3 ⌄  [Run at…]  [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                                               │
                                                               ▼  (opens, inert)
                                                    ┌────────────────────────┐
                                                    │ MiniMax-M3           ✓ │
                                                    │ MiniMax-M2.7           │
                                                    │ MiniMax-M2.7 HighSpeed │
                                                    │ ───────────────────── │
                                                    │ Thinking          (○) │
                                                    └────────────────────────┘
```

`+ › Skills` (the snippets):

```
┌ + ──────────────────┐   ┌ Skills ─────────────────────────────┐
│ Add files or photos │   │ Short-to-script   Built-in           │
│ Add to project    › │   │ Loop                                 │
│ Environment vars    │   │ ──────────────────────────────────── │
│ Skills            › │ ▶ │ ⚙ Manage skills                      │
└─────────────────────┘   │ ⊕ Add skill                          │
                          └──────────────────────────────────────┘
```

Management › Skills (the snippets) and Management › Agents (the reference's, inert):

```
┌ Plugins 1 │ Skills 2 │ Apps 0 │ Agents 3 ┐        ┌ Agents ───────────────────────────────────────────┐
│ 🔍 Search skills                          │        │ All agents          │ Portrait  Name              │
│ ◇ Short-to-script  Built-in   Use · Edit  │        │ ● General           │ [◎]       [General        ] │
│   Expands a one-line idea into the base…  │        │   Coder             │                             │
│ ◇ Loop                         Use · Edit │        │   Verifier          │ System prompt               │
│   Seamless loops…                         │        │ + Create agent      │ ## Your Role                │
│ [Create skill]                            │        │                     │ You are a general-purpose…  │
└───────────────────────────────────────────┘        └─────────────────────┴─────────────────────────────┘
```

## 4. After — the three options

### Option A — the reference's model: the pill picks the **agent**, Skills are the folders *(recommended)*

The pill becomes the agent picker; Management › Skills lists `agents/skills/`; `+ › Skills` picks which skill the agent uses; Management › Agents shows the Director as a real row.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [+]  [◎ MiniMax-H3 ⌄]  [▭ 16:9 │ 768P │ ◷ 5s]                  Director ⌄  [Run at…]  [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                                                  │
                                                                  ▼
                                                     ┌────────────────────────────┐
                                                     │ Agents                     │
                                                     │ ◎ Director  Gemini Flash ✓ │   ← one today; a Critic later
                                                     │ ────────────────────────── │
                                                     │ Skill: Thirst trap       › │   ← the skill the agent uses
                                                     │ ⚙ Manage agents            │
                                                     └────────────────────────────┘

+ › Skills                                     Management › Skills (the folders, from each SKILL.md)
┌ Skills ────────────────────────────────┐    ┌ Plugins 1 │ Skills 1 │ Apps 0 │ Agents 1 ┐
│ ● Thirst trap director   MiniMax-H3    │    │ 🔍 Search skills                                              │
│   Directs one thirst-trap short from   │    │ ◇ minimax-h3-director-thirst-trap                             │
│   one photo…  · verified 2026-09-16    │    │   Directs one thirst-trap short from one attached photo…      │
│ ○ Chain director          (next)       │    │   MiniMax-H3 · int8_convrot · ComfyUI 0.35.1 · verified 09-16 │
│ ──────────────────────────────────── │    │ ◇ minimax-h3-director-thirst-trap-chain          (next epic)  │
│ ⚙ Manage skills                        │    │                                                               │
└────────────────────────────────────────┘    │ Skills are folders under agents/skills/ — add one by adding   │
                                              │ a folder; nothing to create here.                             │
                                              └───────────────────────────────────────────────────────────────┘

Management › Agents (the reference's editor, now real for one row)
┌ Agents ─────────────────────────────────────────────────────────────────────────────────┐
│ All agents          │ Portrait   Name                   Model                            │
│ ● Director          │ [◎]        [Director           ]  [Gemini Flash · Vertex AI    ⌄] │
│ + Create agent      │                                                                    │
│   (later)           │ Skill      [Thirst trap director                               ⌄] │
│                     │ ☐ Sends the prompt straight to a job (no review)   ← or in Settings │
│                     │ System prompt (read-only — the skill's SKILL.md)                   │
│                     │ # MiniMax H3 director — thirst trap …                              │
└─────────────────────┴────────────────────────────────────────────────────────────────────┘
```

What goes: the M3 / M2.7 / HighSpeed rows and the Thinking switch (BACKLOG_006 can bring a Spark text model back as a second agent later). What changes meaning: the Skills tab (folders instead of snippets); Short-to-script and Loop either become the *chain* skill's job or stay as a small "Templates" section. What stays: Create skill's place is taken by "add a folder"; Create agent stays inert until a second agent exists.

### Option B — the owner's first framing: the pill lists the **folders** as agents

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [+]  [◎ MiniMax-H3 ⌄]  [▭ 16:9 │ 768P │ ◷ 5s]       Agent · Thirst trap ⌄  [Run at…]  [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                           ┌──────────────────────────────────────┐
                                           │ Agents                               │
                                           │ ● Thirst trap director   MiniMax-H3 ✓│
                                           │ ○ Chain director              (next) │
                                           │ ──────────────────────────────────── │
                                           │ ⚙ Manage agents                      │
                                           └──────────────────────────────────────┘
Management › Skills: unchanged (the snippets).  Management › Agents: unchanged (inert), or lists the folders.
```

Simplest to build. The costs: the folders are called "agents" in the UI but live in `agents/skills/` and are Agent *Skills* by the spec; "skill" keeps two meanings (a folder in the repo, a snippet in the app); when a second *kind* of agent arrives (a Critic that reviews a clip; a Spark text model), the menu has no place for it except as another "agent" beside the directors, mixing what-it-does with who-does-it.

### Option C — one menu, agents with their skills nested

```
                                           ┌──────────────────────────────────────┐
                                           │ Agents                               │
                                           │ ◎ Director · Gemini Flash          ✓ │
                                           │     ● Thirst trap director           │
                                           │     ○ Chain director          (next) │
                                           │ ──────────────────────────────────── │
                                           │ ⚙ Manage agents                      │
                                           └──────────────────────────────────────┘
Management › Skills and Agents as in Option A.
```

The compact form of A: one pill, one menu, the skill nested under the agent. Slightly denser at 390.

## 5. Recommendation

**Option A** (or C, which is A with a denser menu). Reasons:

1. It is the reference's own model and MiniMax's own vocabulary — no Departure to justify, and the recon already shows what each surface looks like.
2. One meaning per word: an *agent* does the work (Director; later Critic; later a Spark text model), a *skill* says how (the folders). The repo layout `agents/skills/` already says this.
3. Room for the next two things the owner has mentioned without a redesign: the multi-script director (a second skill row) and straight-through mode (a checkbox on the agent, or the Settings switch he chose — either fits).
4. The Agents editor the reference gave us is exactly the place to show what the agent is made of — model, skill, system prompt — without inventing a page.

What it costs over B: the Skills tab changes meaning (one story), and the snippets need a home or a retirement (the owner's call; Short-to-script is superseded by the director skill anyway).

**If the owner prefers B**, nothing in BACKLOG_009 breaks — the epic just names the folders "agents" in the UI and leaves the Skills tab alone; the spec, the validator and the folder layout are unaffected either way.

## 6. Settled regardless of the option

- The repo layout stays `agents/skills/<name>/SKILL.md` — the spec's layout, MiniMax's layout, validated by `agentskills validate`.
- Send all accepts full-format segments (each starts with `integrated_multimodal_description:`) and sends each unchanged, so the skill decides the camera (owner, 2026-09-16).
- A format check runs before any straight-through send; a bad reply is a shown failure, not a queued job.
- Every segment's prompt must come back clean before the first job is created; one refusal aborts the whole Send all.
