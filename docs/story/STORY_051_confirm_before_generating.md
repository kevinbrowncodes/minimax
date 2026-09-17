# STORY_051 — Confirm before generating

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the fifth story; the owner's stated end state (photo → prompt → job, no one reading). After [STORY_050](STORY_050_the_agent_chip.md) (review mode, which stays the default)
**Status:** Done (2026-09-17 — approved under the owner's blanket "continue story by story" of 05:20; built 13:15 → 13:25; gate steps 1–4 green by hand, the agent spec 12/12 at both widths, the full e2e after; deployed once the Spark was free; the Done note below)
**Created:** 2026-09-17

As the owner, I want an **Agent settings** panel with *Confirm before generating: Always / Never*, so that with *Never* a run that comes back clean is queued on the Spark at once with the composer's parameters — photo in, video out, nobody at the keyboard — while a refusal or a reply that misses the format is still shown and never queued.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **After STORY_050** a reply lands in the box and the owner presses Send; `send()` in `Composer.tsx` then posts as STORY_013 does (`submitJob(state, doFetch)`: the text, the parameters, the images, the project, the run-at) and navigates to `/task/<id>` (or `/scheduled` for an Edit). The agent's `findings` are shown in the amber strip and never block.
- **Settings** live in `settings.json` (`lib/settings-store.ts`), parsed by `parseSettings` with a default per key, patched by `PATCH /api/settings` (STORY_050 taught the route a per-key type table), read by the client through `SettingsContext` (`useSettings().settings`). The Settings dialog (`SettingsDialog.tsx`, STORY_034) is the modal with a left nav and a panel — `role="dialog"`, `aria-modal`, the close button, the `settings.module.css` chrome.
- **The chip's neighbours**: BACKLOG_009's map § 7 took Flow's two icon buttons beside the chip — *Agent instructions* (≡, STORY_052) and *Settings* (⚙, this story) — visible only while the chip is on.
- **A job's cost in time** is the "≈ N min on the Spark" line (STORY_050's `lib/spark-time.ts`).

## UI Mockup

**Reference capture:** none for the panel — agent.minimax.io has no agent settings; Flow's panel is the model (the map § 7: *Confirm before generating* · **Always** "Agent will ask for confirmation before generating media" / **Never** "Agent will generate media and spend credits automatically" · **Save**). Ours is drawn in the Settings dialog's chrome (`settings-general@1440` from STORY_034's capture; the modal, the panel title 16 px/500, the row label 14 px/400 `rgb(23,23,23)`, the helper 13 px `rgb(102,102,102)`, the radio 16 px), anchored at the right of the viewport as a panel rather than centred, 420 px wide; at 390 a full-width sheet with a ← in the head.

**The chip with its two icons** (the ≡ is STORY_052's; drawn here so the row is designed once):

```
│ [+] [◉ Agent · Thirst trap ⌄] [≡] [⚙] [◉ MiniMax-H3 ⌄] [16:9 │ 768P │ 5s]   Gemini Flash ⌄ [Run at…] [↑] │
                                     └─ Agent settings (this story)   ≡ Agent instructions (STORY_052)
```

**The panel** (from ⚙; Escape or × closes; Save writes and closes; nothing is written before Save):

```
                                                    ┌ Agent settings ──────────────────────── × ┐
                                                    │                                           │
                                                    │ Confirm before generating                 │
                                                    │ ◉ Always                                  │
                                                    │   Agent will ask for confirmation before  │
                                                    │   generating media.                       │
                                                    │ ○ Never                                   │
                                                    │   Agent will generate media and use the   │
                                                    │   Spark automatically.                    │
                                                    │                                           │
                                                    │ Video generation default                  │
                                                    │ Draws   x1                    (STORY_055) │
                                                    │ Model   Gemini Flash · Vertex AI          │
                                                    │                                           │
                                                    │                                    [Save] │
                                                    └───────────────────────────────────────────┘
```

**Never, a clean reply** — no review state at all: *Thinking…* → the toast *Queued — the director's prompt* → the task page reading Queued, as a Send does; the composer is left as after a Send (empty, the chip off). **Never, a reply with findings** — the review state of STORY_050 with a different sentence on the amber strip: *Not sent — the reply misses the skill's format: …. Edit it and Send.* **Never, a refusal or an error** — exactly STORY_050's alert; nothing queued. **Always** — STORY_050 unchanged.

**Narrow (iPhone 13)**: the ⚙ keeps 44 px; the panel is a sheet from the bottom, full width, the head *← Agent settings*.

## Acceptance Criteria

- [x] **The setting**: `agentConfirm: "always" | "never"` in `lib/settings.ts` (default `"always"`), parsed with the defaults rule (garbage → the default), patched through `PATCH /api/settings` (a value outside the two refused with 400 and the field), read by the composer through `SettingsContext`.
- [x] **The panel**: a ⚙ icon button (32 px, `aria-label="Agent settings"`) right after the chip while it is on; it opens the **Agent settings** panel (`role="dialog"`, labelled, focus trapped, Escape closes) with the radio group *Confirm before generating* — *Always* and *Never* with Flow's helper sentences, ours ending "use the Spark automatically" — a *Video generation default* section showing *Draws x1* as a read-only row until STORY_055 and *Model* from `/api/capabilities` › `agent.model.label` with " · Vertex AI", and **Save** (writes the setting, closes, a toast *Saved*); Cancel/× discards. The panel is 420 px anchored right at desktop, a full-width bottom sheet at 390 with ← in the head.
- [x] **Straight-through**: with *Never*, a reply of `kind: "prompt"` and **no findings** is posted to `POST /api/jobs` at once by `send()`'s ordinary path (the prompt as the text, the photo as the reference image, the composer's ratio, resolution, duration, model, project and run-at, `?script=` forwarded) with no review state rendered in between — the box never shows the prompt; on the 202 the toast reads *Queued — the director's prompt* (with the position when the queue gives one) and the composer navigates to the task page as a Send does; the write starts before the composer's own state is cleared (§ 4c: send first, paint second).
- [x] **Never queues a bad reply**: with *Never*, a reply **with findings** takes STORY_050's review path with the strip's first words *Not sent —* and nothing posted; a refusal or an error is STORY_050's alert and Inbox row; a Stop is a Stop. In every case `/api/jobs` is not called.
- [x] **A chain reply** (STORY_053) is out of this story's straight-through: until 053 lands, *Never* with a text that splits into segments takes the review path with the strip (said so in 053, which adds the all-clean rule).
- [x] **Both widths, both themes**; STORY_050's `agent.spec` cases stay green with the default *Always*.

**AC corrections made during implementation, as § 3 item 8 asks (2026-09-17):**

- **A refusal's alert in straight-through mode** is STORY_050's alert unchanged, as the AC says; the *findings* strip's wording in this mode is *Not sent — the reply misses the skill's format: …. Edit it and Send.* (the AC's "Not sent —" prefix, with the verb the situation needs).
- **The panel** is the Settings dialog's chrome anchored right (420 px; a full-width sheet with ← at narrow widths) rendered by the composer beside the Environment variables dialog, not by the Shell — the ⚙ lives in the composer.
- **The decision** is `lib/agent-decision.ts` › `decide(setting, result)` → `queue | review | review-not-sent | alert | stopped`, one table with one test, as the Testing Plan asked; a chain under *Never* is `review-not-sent` until STORY_053's all-clean rule.
- **The PATCH route's per-key table** grew to take an enum (`agentConfirm`) beside booleans and a string; the message names the allowed values.

## Departures from the reference

- The panel and the setting are ours in Flow's words (BACKLOG_009's map § 7); agent.minimax.io has nothing of the kind. Flow's *Always* did not pause in the owner's test; ours must, and does — a job is ≈ 50 min of GPU.
- Straight-through skips the box: the reference's composer always shows what is sent. The toast and the task page (whose prompt block shows the text, STORY_014) are where the owner reads it afterwards.

## Technical Notes

- `components/composer/AgentSettingsPanel.tsx` (new file) on the Settings dialog's chrome (`settings.module.css` reused; a `panel` variant anchored right; the sheet at 390 via the existing narrow rule); the ⚙ in `AgentChip.tsx`'s row.
- `Composer.tsx` › the run's completion: `agentConfirm === "never" && findings.length === 0` → `dispatch({ type: "agent-reply", … })` is skipped and `submitJob(stateWith(prompt), doFetch)` is called directly with a segment override `{ prompt, images: state.images }` (STORY_044's `SegmentRequest` already carries a prompt and images), then the toast and `router.push`; otherwise the review path with `notice.tone = "warn"` and the *Not sent —* prefix when the setting is *Never*.
- `lib/settings.ts` › `SETTING_TYPES` (from STORY_050's table) gains `agentConfirm: ["always", "never"]`.
- The e2e lane's `?agentScript=` and `?script=` both apply on one page: the agent's fake script and the job's stub script.

## Testing Plan

- **Unit (`pnpm test`)** — `settings.test.ts`: `agentConfirm` parsed, defaulted, garbage → `always`. `composer-state.test.ts`: nothing new in the reducer (the decision is in the component) — said so. A pure `lib/agent-decision.ts` › `decide(setting, result)` → `"queue" | "review" | "alert"` unit-tested over the matrix (always/never × prompt-clean/prompt-findings/refusal/error) so the rule is one function with one test, not a branch in JSX.
- **Component (`Composer.test.tsx`, `AgentSettingsPanel.test.tsx`)** — the ⚙ present only with the chip on; the panel's radios reflect the setting; Save PATCHes `{ agentConfirm }` and closes; Cancel does not; with *Never* a clean reply calls `/api/jobs` once with the prompt and the image and navigates, and the box never rendered the prompt; with *Never* and findings the strip reads *Not sent —* and `/api/jobs` is not called; with *Never* and a refusal the alert shows and nothing is posted; with *Always* the STORY_050 path.
- **Integration** — `settings.test.ts`: `PATCH { agentConfirm: "never" }` stored; `"sometimes"` → 400 with the field.
- **E2E (`e2e/agent.spec.ts`, extended, both widths)** — (5) *Never + clean*: open the panel from ⚙, choose Never, Save → attach, Send → `waitForResponse` on `POST /api/jobs` 202 registered before the click, and on the terminal status → the toast → the task page → the result plays; the box never showed the prompt (assert the textarea's value stayed the notes until navigation). (6) *Never + warn*: the strip's *Not sent —*, `/__stub/jobs` empty. (7) *Never + refusal*: the alert, `/__stub/jobs` empty, one Inbox row. The panel is reset to Always in `afterEach` through `PATCH /api/settings` so (1)–(4) stay green. Regression cover: STORY_050's cases (1)–(4) under Always; `composer.spec`, `scheduled.spec`.
- **Manual verification (the Spark, in the Done note with the date):** *Never* set through the deployed UI, the office photo attached, Send — the toast, the task page queued with no review step, the job's draw (≈ 50 min GPU; the prompt read on the task page afterwards against the checklist), the setting put back to *Always*.

## Estimated Complexity

Small-to-Medium — a setting, a panel on existing chrome, one decision function and one branch in the run's completion, three e2e cases: ≈ 1 h 15 min of build and gate (the epic's figure), plus ≈ 50 min of GPU.

## Done note (2026-09-17)

**Built** (13:15 → 13:25 EDT): `lib/settings.ts` (`agentConfirm`, `AGENT_CONFIRM`, `SETTING_TYPES` with an enum entry) and the PATCH route, `lib/agent-decision.ts` (`decide`), `components/composer/AgentSettingsPanel.tsx` (new file: the panel on `settings.module.css`'s chrome — the two radios with Flow's sentences, the Video generation default rows, Save / Cancel / × / Escape; the form remounted on open so nothing is written before Save), the ⚙ beside the chip, `Composer.tsx` › the run's completion through `decide()` — straight through: `submitJob` with the prompt, the photo and the skill's clip length **before** the composer's own state is cleared, the toast *Queued — the director's prompt* (with the position), the task page; the review path with the *Not sent —* wording when the setting is *Never*; `composer-state.ts` › `agent-reply` takes `notSent`. Tests: `agent-decision.test.ts` (2, the whole matrix), `settings-store.test.ts` (the enum parsed and defaulted), `AgentSettingsPanel.test.tsx` (5: the ⚙ and the panel, Save / Cancel / Escape, Never + clean posted at once with the prompt, the photo and 10 s and the box never showing it, Never + findings not sent, Never + a refusal not sent, Never + a chain reviewed, Always unchanged), `test/integration/settings.test.ts` (the enum's PATCH and its 400), `e2e/agent.spec.ts` (+2 at both widths: Never + clean → the panel saved → a 202 with no click → the task page → the result playing; Never + warn → *Not sent* and no job, then Never + refusal → the alert and no job; the setting reset to Always around every spec).

**Two things the full suite caught that the spec alone did not (§ 6b's unfinished-state class):** `agent.spec`'s refusal cases left a run in the store and `shell.spec`, next in line, counted it in the Inbox — the runs are now cleared with the history in the shared `clearHistory` fixture and after every agent spec; and the first agent case asserted *Thinking…* and *Stop* after a Send whose fake answers at once — a transient that lost the race under load; the `slow` case owns those assertions now.

**Gate.** Steps 1–4 by hand at 13:30 (unit incl. the seven new cases, integration 47), the agent spec 12/12 at both widths, then the full build + e2e; the hook re-runs all six on the push.

**Verified live (2026-09-17, after the Spark finished STORY_050's draw — the app is never restarted mid-job):** the deployed composer — ⚙ → the panel with *Always* checked and *Gemini 3.8 Flash · Vertex AI* → *Never* → Save → *Saved*; the office photo, Send → *Thinking…* → **no review step: the toast and the task page of the new job**, its prompt block reading the director's prompt; the setting put back to *Always*. The draw's outcome is the addendum below.
