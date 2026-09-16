# BACKLOG_009 — Agents and skills: what the words mean today, and four ways the UI could put them together

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

## 4. After — the four options

### Option A — the reference's model: the pill picks the **agent**, Skills are the folders

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

### Option D — Flow's Agent chip in MiniMax's chrome *(recommended, 2026-09-16 13:15 — the owner's steer after seeing Google Flow)*

Google Flow's composer (screenshot by the owner, 2026-09-16): `+`, then an **Agent** chip that toggles agent mode on the same box, then the parameters pill (`Video · 720p · 8s · x1`) and Send — agent is a *modifier on the composer*, not another page. The reference's composer already has chips in that left slot (its mode chips; STORY_026 kept *Video generation H3*) and a tag row (*video-creator*, the project chip), so an Agent chip beside `+` is the same kind of element — a Departure of the kind already made for Run at… and Send all, small enough to keep or drop at the next re-clone. The right-hand pill keeps its *reference* meaning, the agent's **model**: `Gemini Flash ⌄` (Vertex) now, a Spark text model beside it if BACKLOG_006 ever lands — so a future re-clone lands on it unchanged.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [01.jpg ×]                                                                                    │
│ ● video-creator   ▏What do you want to create?  (notes for the agent — or nothing)            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+]  [◎ Agent · Thirst trap ⌄]  [MiniMax-H3 ⌄]  [16:9 │ 768P │ 5s]     Gemini Flash ⌄  [Run at…]  [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
        │ off: the chip reads "Agent" (grey) and the composer is exactly today's
        ▼ on: the chip is filled and names the skill; its menu picks the skill
   ┌──────────────────────────────────┐
   │ Skills                           │
   │ ● Thirst trap director   H3    ✓ │
   │ ○ Chain director        (next)   │
   │ ──────────────────────────────── │
   │ ⚙ Manage skills                  │
   └──────────────────────────────────┘
narrow (390): the chip keeps its glyph and "Agent"; the skill name moves into the menu's title
```

- **Agent chip off** → nothing about the composer changes (the review-mode composer after an agent reply is this state, with the prompt in the box).
- **Agent chip on** → attach the photo, type notes or nothing, Send: the app sends the skill + references + image + notes to the model named on the pill; the reply fills the box for review (or goes straight to a job with the Setting); a refusal or a failed format check shows where the prompt would be and nothing is queued.
- **The skill** is picked on the chip's menu (the folders under `agents/skills/`, from each `SKILL.md`; *Manage skills* opens Management › Skills, which lists the same folders with their metadata — the reference's meaning of that tab).
- **The model** is picked on the pill, as in the reference; with one model it reads `Gemini Flash` and the menu has one row (the Thinking switch goes).
- **Management › Agents** stays the reference's inert tab until personas are wanted; **the snippets** (Short-to-script, Loop) become a "Templates" section of the Skills tab or are retired — the owner's call.

**Decided 2026-09-16 13:25 (owner): Option D, on the condition that it is non-destructive to the reference's UI — add on top, reuse what agent.minimax.io has, remove nothing, so that a future re-clone stays cheap.** Checked surface by surface: the Agent chip is an addition in a slot the reference already uses for chips; the right-hand pill keeps its reference meaning (the agent's model) with the model we actually run in place of the three cloud rows we cannot (STORY_026's rule); `+ › Skills` and Management › Skills return to their reference meaning (skills the agent follows); Management › Agents and every other surface are untouched. The only thing that changes is our own STORY_040 snippet stand-in.

## 5. Recommendation

**Option D** — Flow's chip in MiniMax's chrome. It does what A does (one meaning per word; the model on the pill, as the reference has it; the folders on the Skills tab) and adds the visible **Agent** button the owner wants where Flow puts it, while every reference surface keeps its reference meaning — so the next re-clone of agent.minimax.io has one small chip to keep or drop and nothing to untangle. A's reasons carry over:

1. It is the reference's own model and MiniMax's own vocabulary — no Departure to justify, and the recon already shows what each surface looks like.
2. One meaning per word: an *agent* does the work (Director; later Critic; later a Spark text model), a *skill* says how (the folders). The repo layout `agents/skills/` already says this.
3. Room for the next two things the owner has mentioned without a redesign: the multi-script director (a second skill row) and straight-through mode (a checkbox on the agent, or the Settings switch he chose — either fits).
4. The Agents editor the reference gave us is exactly the place to show what the agent is made of — model, skill, system prompt — without inventing a page.

What it costs over B: the Skills tab changes meaning (one story), and the snippets need a home or a retirement (the owner's call; Short-to-script is superseded by the director skill anyway).

**If the owner prefers A, B or C**, nothing in BACKLOG_009 breaks — the epic just names the folders "agents" in the UI and leaves the Skills tab alone; the spec, the validator and the folder layout are unaffected either way.

## 6. Settled regardless of the option

- The repo layout stays `agents/skills/<name>/SKILL.md` — the spec's layout, MiniMax's layout, validated by `agentskills validate`.
- Send all accepts full-format segments (each starts with `integrated_multimodal_description:`) and sends each unchanged, so the skill decides the camera (owner, 2026-09-16).
- A format check runs before any straight-through send; a bad reply is a shown failure, not a queued job.
- Every segment's prompt must come back clean before the first job is created; one refusal aborts the whole Send all.

## 7. Google Flow's agent mode, item by item (2026-09-16 13:40)

Read from the owner's Flow project through Claude in Chrome (labels quoted verbatim by it; one image generation was spent to see what a run produces). Each item judged by the same test — does it add on top of MiniMax's UI, or change something of theirs — and by the vision (photo → prompt → job, with the owner in control).

| Flow | Verdict | Ours |
| --- | --- | --- |
| **Agent** chip, highlighted when on | Take | Option D's chip |
| Agent on: the parameters pill is replaced by two icon buttons, **Agent instructions** and **Settings** | Take the icons, keep our pill | Two icon buttons appear beside the chip when it is on; the video parameters pill (16:9 · 768P · 5s) stays — the agent's prompt goes into a job with those parameters and Send all reads them |
| **Agent instructions** panel: **+ Add instruction** → rows of {toggle "Toggle instruction active" (on by default), "Instruction title", "Delete instruction", **+ Reference** (an image from the project's assets: "Select reference image", search, All / Images / Characters / Avatars, "Upload media"), "Create a guideline for your agent"}; **Done** | **Take — decided** | Persistent guidelines sent after the skill on every run while toggled on. A guideline with a reference image is the **saved scene** (the set's photo + its scene paragraph) or a **character** the owner asked for on 2026-09-16 — reusable with no LLM. A right-hand panel opened from the chip's icon; ours; stored server-side like Skills (STORY_040's store pattern); MiniMax's surfaces untouched |
| **Agent settings › Confirm before generating**: **Always** ("Agent will ask for confirmation before generating media") / **Never** ("Agent will generate media and spend credits automatically"); **Save** | **Take, in Flow's place and words — decided** (replaces the Settings-dialog switch decided earlier) | The review-vs-straight-through choice lives in an **Agent settings** panel opened from the chip's Settings icon: *Always* = the prompt comes back into the box for review; *Never* = straight to a job ("…use the Spark automatically"). Note: Flow's *Always* did not pause in the test; ours must — a job is 50 min of GPU |
| Agent settings › **Image generation default** (ratio, x1–x4, model) | Leave | No image generation in scope |
| Agent settings › **Video generation default**: ratio, **x1 / x2 / x3 / x4**, model | Take the count, **as a later story in this epic — decided** | Draws per prompt with fresh seeds — each draw a job, the queue runs them in turn (what the owner did by hand on 2026-09-16, two draws of the cove prompt). Ratio and model are the existing pill |
| Placeholder "What do you want to create?"; an **Expand** button | Leave | The reference's placeholder stays |
| Send → live status in the box ("Thinking…", "Defining Visual Goals"), Send becomes **Stop** | Take | The composer already turns Send into Stop while a job runs; an agent run shows its status in the box and Stop aborts the Gemini call |
| A finished run produces media directly (two images for x2), no prompt to review | Take as the straight-through mode only | Review is the default (decided) |
| Results labelled prompt · date · model · ratio, with download / re-run / delete | Have it | The task page and Assets (re-run = Retry) |
| "Generating will use 0 credits" under the pill | Take the idea | "≈ N min on the Spark" under Send — the chain strip already knows the lengths |

**Decided by the owner (13:45):** Confirm before generating lives in the Agent settings panel as Flow has it (not the Settings dialog); Agent instructions are guidelines + an optional reference image, toggleable, and double as saved scenes and characters; draws per prompt (x1–x4) is a later story in the epic.

### Option D, revised with Flow's two icons

```
Agent on:
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [01.jpg ×]                                                                                        │
│ ● video-creator   ▏What do you want to create?                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+]  [◎ Agent · Thirst trap ⌄] [≡] [⚙]  [MiniMax-H3 ⌄] [16:9 │ 768P │ 5s]   Gemini Flash ⌄ [Run at…] [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                  │    └─ Agent settings (right-hand panel): Confirm before generating ● Always ○ Never;
                                  │       Video default: x1 x2 x3 x4 (later); Save
                                  └─ Agent instructions (right-hand panel): + Add instruction → [on] Title · + Reference · guideline · 🗑 ; Done
                                     e.g. [on] "Studio · sequin curtain" · [01.jpg] · "A fit young man… the camera on a tripod."
                                          [off] "Bathroom · blue wall"  · [01.jpeg] · "A fit young man in his mid-twenties…"
Agent off: the chip dim, the two icons gone, everything else as today.
```
