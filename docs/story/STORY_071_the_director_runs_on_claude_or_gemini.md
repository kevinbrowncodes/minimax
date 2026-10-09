# STORY_071 — The director runs on Claude or Gemini

**Status:** Proposed (drafted 2026-10-09 11:50 EDT for [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md); the owner's ask of 10:40 — "would it be possible to send the requests through claude cli that way I use my claude subscription instead of api" — and his choice of 10:45: rules in code plus the ability to choose between the Claude CLI and the Gemini director; waits for the owner's go, after STORY_070)
**Epic:** [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md) — the fifth and last story, after [STORY_070](STORY_070_my_scripts_become_the_chain.md)
**Estimate:** ≈ 4 h (the CLI in the app image, `lib/claude-cli.ts` with its timeout and JSON parsing, the backend setting and the pill, the converter's model step through the run route, the fake CLI for the gate; unit, integration, e2e; an image rebuild and two hand gates) · **Estimated completion:** the morning of the day after it is started

As the owner, I want to choose whether the director runs on **Gemini (Vertex AI)** or on **Claude through my own subscription** (the Claude Code CLI, no API key), and I want the converter's model step — the paragraph about the photo, the held states, the rewrites of flagged beats — to come from whichever I chose, so that the prompts a round needs come from the UI on the account I prefer, and a refusal or an outage on one leaves me the other.

## Current state (read from the code and the box, 2026-10-09 10:50–11:05 EDT)

- **One backend, Vertex.** `lib/agent-service.ts` › `runDirector`: `readSkill`, `assembleRequest` (system instruction + ordered parts, the photo inline), `tokenFor` from the service-account key, two `generateContent` passes, `checkPromptFormat`; outcomes `prompt | refusal | error(not_configured | unknown_skill | unreachable | quota | bad_reply | timeout | upstream)`. `lib/agent-config.ts` decides *configured* from `VERTEX_PROJECT` and the key file; `AGENT_TIMEOUT_MS` (240 s), `SKILLS_DIR`, the gate's `VERTEX_BASE_URL`/`VERTEX_TOKEN_URL` overrides. `/api/capabilities` › `agent` carries `{ configured, reason, model: { id, label } }`; the Agent chip greys with the reason and the pill names the model (STORY_050). The route (`app/app/api/agent/runs/route.ts`) is multipart `skill`, `referenceImage`, `notes`.
- **The app image** is `node:26-bookworm-slim` with the skills baked in and `/secrets` mounted read-only from `spark/data/secrets/` (`compose.yaml:76–78`); the runtime user is `node`.
- **The Claude Code CLI** is on the Spark's host (`~/.local/bin/claude` 2.1.292): `-p/--print`, `--output-format json`, `--json-schema <schema>` (structured output), `--allowedTools`/`--disallowedTools`, `--model`, `--fallback-model`; `claude setup-token` — "Set up a long-lived authentication token (requires Claude subscription)" — prints a token the CLI reads from `CLAUDE_CODE_OAUTH_TOKEN`. The CLI reads an image when told its path and allowed the Read tool. Nothing of it is in a container; `CLAUDE_CODE_OAUTH_TOKEN` is not set on the host.
- **The gate's fake Vertex** (`tools/stub-generation-server`) answers by script name (`clean`, `chain`, `refusal`, …); there is no fake for a CLI.
- **The converter** (STORY_070) is pure and client-side; its model step is not written yet. The scene paragraph's rules (what it holds, what it never holds) are in the converter skill's `SKILL.md` as the *anchor* instruction.
- **EPIC_010's decision of 2026-09-19** was "nothing adult goes to Google"; the owner's choice of 2026-10-09 (Gemini **or** Claude for the director, from the app) reverses it for the Gemini case — Open question 2 asks him to confirm.

## UI Mockup

**Reference capture:** Agent settings is STORY_051's panel (Flow's chrome); the pill is STORY_050/059's. One row and one label change.

```
Agent settings (after)
│ Director runs on                                                       │
│   ● Gemini          Vertex AI · gemini-3.8-flash · the photo goes to Google   │
│   ○ Claude          your subscription · claude-sonnet-5-5 · the photo goes to Anthropic │
│                     Not set up — run `claude setup-token` on the Spark and put the token in .env   (when the token is absent)
│ Video generation default                                               │
│   Draws   [x1] [x2] [x3] [x4]                                          │

The composer's right-hand pill while the chip is on
   Gemini 3.8 Flash · Vertex AI        →        Claude Sonnet 5.5 · subscription

The chain strip (STORY_070), the director's step
   [Convert]  [Draft the paragraph with Claude]      ← the backend's name on the button
   … after: the paragraph inserted, the held states written, each rewrite in the change list with its reason
```

Narrow (iPhone 13): the radio rows wrap their descriptions; targets ≥ 44 px.

## Acceptance Criteria

- [ ] **The setting**: `agentBackend: "vertex" | "claude"` (default `vertex`) in `lib/settings.ts` with the defaults rule and the PATCH route's type table; the Agent settings panel's *Director runs on* radio group saves it with the rest; each entry shows its model id and where the photo goes; an entry whose backend is not configured is greyed with the reason (Vertex's today's reason; Claude's *Not set up — run `claude setup-token` on the Spark and put the token in .env*).
- [ ] **Capabilities say which backend is live.** `/api/capabilities` › `agent` gains `backend: "vertex" | "claude"` and `backends: { vertex: { configured, reason?, model }, claude: { configured, reason?, model } }`; `configured` is true for the chosen one only when its own prerequisites hold; the chip greys with the chosen backend's reason; the pill reads *<model label> · Vertex AI* or *<model label> · subscription*.
- [ ] **The Claude backend is the CLI in the app image.** `app/Dockerfile`'s runner stage installs `@anthropic-ai/claude-code` **pinned by version** (a chore bumps it); `lib/claude-cli.ts` › `runClaude(request, { bin, token, model, timeoutMs, signal })` spawns `claude -p --output-format json --json-schema <schema> --model <id> --allowedTools Read --disallowedTools <everything else> <prompt>` with `CLAUDE_CODE_OAUTH_TOKEN` in the child's environment only, the photo written to a per-run directory under `/tmp` the prompt names and removed after the run, a timeout from `AGENT_TIMEOUT_MS`, the caller's signal killing the child; the result parsed from the CLI's JSON (`result`, `is_error`, `subtype`) into the same `RunOutcome` kinds — a refusal verbatim, a non-zero exit or a non-JSON answer `upstream`, a missing binary or token `not_configured`, the timeout `timeout`. **Nothing logs the token, the prompt or the environment**; the child's stderr is captured and shown only in the error message's first line.
- [ ] **One director, two backends.** `runDirector` takes the backend from the setting (an explicit `backend` in `RunInput` wins — the converter's call names it) and routes the assembled request to `vertex.ts`'s `generateContent` or to `runClaude`; the two-pass expansion stays on Vertex; on Claude one pass with the word range in the instruction (its structured output is parsed, not expanded); the skill, the photo, the notes, the instructions and the format check are the same code. The e2e lane never reaches either provider: the fake Vertex as today and **a fake `claude` binary** (a Node script in `tools/stub-generation-server/bin/`, selected by `CLAUDE_CLI_BIN`, answering by `x-stub-script`'s equivalent — a `--stub-script` it reads from the prompt's first line) answering `prompt`, `refusal`, `error`, `timeout`.
- [ ] **The converter's model step.** `POST /api/agent/runs` accepts `mode: "convert"` with `scripts` (the composer's text) beside the photo: the server converts (STORY_070's function), asks the backend — with the converter skill's anchor instruction — for **the scene paragraph** (when the pasted text has none, or when the owner presses *Draft the paragraph*), **the held-state clause** of each script's last beat, and **a rewrite of each flagged beat** (one each, with a one-line reason), as structured JSON (`{ anchor, heldStates[], rewrites[] }` — `--json-schema` on Claude, the response schema on Vertex); merges them into the converted text; runs `checkPromptFormat`; answers `{ kind: "prompt", prompt, findings, changes }` where `changes` lists every rewrite with its reason for the strip's change list (STORY_070's OK). A refusal comes back verbatim and the strip keeps the rules-only conversion with the message under it — **the round is never blocked by a refusal**.
- [ ] **The data note is on the screen**: the setting's rows say where the photo goes; the first run on a backend after the setting changes shows a one-line notice on the strip (*the photo and the scripts are sent to <provider>*), dismissed once per backend (a shell-prefs key).
- [ ] **A manual verification in the Done note:** on the Spark, `claude setup-token` run by the owner (the token pasted into `.env` by him, never into the chat), the app rebuilt; Agent settings shows Claude configured; one converter run on each backend with the same photo and scripts (an SFW pair first — the boat briefs round's — then the owner's choice): the paragraph, the held states and the rewrites recorded with the backend, the model id, the seconds taken and whether either refused; one whole video drawn from a Claude-converted chain on the uncensored model, its job ids and minutes.

## Departures from the reference

- The reference's agent runs on its own cloud; ours offers two providers because the owner has a subscription on one and a project on the other, and because either may refuse or be down. The data notice is ours: the owner said on 2026-09-19 that nothing adult should go to Google, and reversing that for Gemini is his decision to confirm (Open question 2).

## Technical Notes

- **Why the CLI and not the API:** the owner's ask — his subscription, not a metered key. The CLI's `-p` mode with `--output-format json` is a documented non-interactive path; `setup-token` is the subscription's long-lived credential. The token is a secret like the Civitai one: `.env` only (CLAUDE.md § 4b), never the env store (Settings › Environment variables is for non-secrets).
- **Containers first:** the CLI lives in the app image, not on the host path; the image pins the package version; the host's own `claude` is not used (its login is interactive and its config dir is the owner's).
- **Structured output on both:** Vertex's `responseSchema` in `generationConfig` and the CLI's `--json-schema` give the same `{ anchor, heldStates, rewrites }` shape; `lib/convert-schema.ts` holds it once.
- **The model id on Claude:** Open question 1 — the owner's call before it becomes a constant (`CLAUDE_MODEL` in `.env` overrides either way).
- **Provider policy:** either provider may decline an adult request; the outcome is the existing `refusal` kind, verbatim, and STORY_070's rules-only path stands — the owner pastes his own paragraph as every round did.
- **Timeouts:** the CLI is killed at `AGENT_TIMEOUT_MS`; the per-run temp directory is removed in `finally`.
- Not in this story: running a skill locally on the Spark's GPU (BACKLOG_006); the §V.5 safeguards; a per-run backend switch on the chip (Open question 3).

## Testing Plan

- **Unit (app):** `claude-cli.test.ts` (new) — the spawn arguments (the binary, `-p`, the format, the schema, the model, the allowed tools, the prompt's path line), the token in the child's env and absent from any log line (a spy on `console`), the JSON parsed into each outcome kind (a fake child process per case: a result, an `is_error`, non-JSON, exit 1, a hang → timeout, the signal → killed), the temp directory removed after each; `settings.test.ts` — `agentBackend` parsed and refused; `agent-config.test.ts` — the Claude backend's `configured` from the binary and the token (`CLAUDE_CLI_BIN`, `CLAUDE_CODE_OAUTH_TOKEN` presence only); `agent-service.test.ts` — the backend routing (a fake Vertex client and a fake CLI runner; the right one called), the convert mode's merge of `{ anchor, heldStates, rewrites }` into STORY_070's output and the `changes` list, a refusal keeping the rules-only text.
- **Component (jsdom, StrictMode):** `AgentSettingsPanel.test.tsx` — the radio group, the greyed row with its reason, save; `ConvertPanel.test.tsx` (extended) — the backend's name on the button, the notice once, a refusal shown under the rules-only result.
- **Integration (`app/test/integration/agent.test.ts`):** `POST /api/agent/runs` with `mode: "convert"` on the Vertex backend (the fake Vertex answering the JSON) → the merged prompt and `changes`; the same on the Claude backend with `CLAUDE_CLI_BIN` pointing at the fake binary → the same shape; the fake's `refusal` → `{ kind: "refusal" }`; a missing token → 503 `not_configured` with the setup sentence; `PATCH /api/settings { agentBackend: "claude" }` persists.
- **E2E (`app/e2e/agent.spec.ts`, `composer.spec.ts`; both widths):** Agent settings → choose Claude (the Playwright server sets `CLAUDE_CLI_BIN` to the fake and a dummy token) → the pill reads *… · subscription* → paste the fixture scripts without a scene → *Draft the paragraph with Claude* → the fake's `prompt` script → the converted chain with the paragraph and the change list → Send all → the stub's three requests in the format; the `refusal` script → the notice and the rules-only text still sendable; switch back to Gemini → the existing chain-director case stays green (the unchanged half). **Build-time note:** `CLAUDE_CLI_BIN` and the dummy token are set in `playwright.config.ts › webServer.env` (CLAUDE.md § 6b).
- **Manual verification** (not a gate): the Done note's row above.

## Estimated Complexity

Large — an image change, a child-process wrapper with secrets handling, a second backend through one service, a fake for the gate, a setting with a panel row, and the converter's merge; each piece is small, the number of pieces is the cost.

## Open questions (for the owner, by the multiple-choice tool, before implementation)

1. **Which Claude model for the director?** Recommended: `claude-sonnet-5-5` (fast, light on the subscription's limits, enough for a paragraph and rewrites). Alternatives: `claude-opus-5-5`; `claude-fable-5-1`. `CLAUDE_MODEL` in `.env` overrides whichever is pinned.
2. **Confirm the data path:** choosing Gemini sends the photo and scripts to Google, reversing the 2026-09-19 decision; choosing Claude sends them to Anthropic. Recommended: both allowed, the notice on screen, the default Vertex (configured today).
3. **Where the choice lives:** a setting (recommended — the round's backend rarely changes) or a per-run switch on the chip's menu as well.
