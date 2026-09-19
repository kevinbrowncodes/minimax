# STORY_065 — The uncensored model in the composer

**Status:** Proposed (the tag answered 16:50 — *NSFW*; drafted 2026-09-19 16:25 EDT from [SPIKE_001](../spike/SPIKE_001_the_nsfw_model_spike.md) › Architecture and the owner's answers; waits for the owner's go)
**Epic:** [EPIC_010](../epic/EPIC_010_an_nsfw_model_in_its_own_container.md) — the third story, after [STORY_064](STORY_064_the_adapters_second_upstream.md)
**Estimate:** ≈ 3 h (the model menu's entry and the pill's tag, the tag on four surfaces, the Settings switch and the filter it drives, the not-ready state and Scheduled's line; component tests in StrictMode, integration, e2e at both widths and both themes; two hand gates) · **Estimated completion:** the evening of the day it is started

As the owner, I want to pick *MiniMax-H3 (uncensored)* in the composer's model menu and see, everywhere an entry appears, that it was drawn with it — and a switch in Settings that hides those entries when someone is looking over my shoulder — so that adult generation is one deliberate choice per task, off by default, and never mixed up with the rest.

## Current state (read from the code, 2026-09-19 15:30–16:00 EDT)

- **The model menu exists.** `Composer.tsx:574–590`: the *Model* pill (`aria-label="Model: …"`, disabled while extending with `FIXED_NOTE`, and while the agent runs) opens a `role="menu"` listing `caps.models` as `menuitemradio` entries, dispatching `{ type: "model" }`; `modelLabel(state)` (`composer-state.ts:355`) shows the chosen model's label with `.0` stripped; `initialComposer` and `clear` pick `caps.models[0]` — **so the SFW model is the default by construction** and the uncensored one is a per-task choice that `clear` resets.
- **`model` travels with the job**: `submit-job.ts` sends `state.model`; `HistoryParams.model` (`history-store.ts:18`) is stored per entry; Retry and Retry chain repost `entry.params` (`TaskPage.tsx:203`), so a redraw keeps the model; an extension inherits its source's (the pill is disabled while extending; the adapter refuses a mismatch).
- **Where an entry is shown:** the Recents row (`shell/Sidebar.tsx`, STORY_021/029), the Assets tile (`assets/AssetsPage.tsx`, STORY_015/024), the task page's request line (`task/TaskPage.tsx:342`, "Continues … · N s" — STORY_061 adds "ends where it began"), the inbox row (`shell/InboxPopover.tsx`, STORY_033), the Scheduled rows (`pages/ScheduledPage.tsx`, STORY_041).
- **Settings** is `shell/SettingsDialog.tsx` (STORY_030/034: General › Appearance, the watermark switch, Archived tasks), stored server-side through `lib/settings.ts` / `SettingsContext.tsx`.
- **"Not running" today:** `queue-view.ts:96–97` builds the Scheduled page's line from `/health`'s `adapter` and `comfyui` flags; `submit-job.ts:73–74` keeps the adapter's own 503 reason. With STORY_064, `capabilities.models[].ready` and `reason` say the same per model.
- **The reference** has no such menu entry, tag or switch (its model menu lists cloud models — STORY_026 removed them); this story is a departure by design.

## UI Mockup

**Reference capture:** none for the new pieces — a departure ([§6 rule 8](../../CLAUDE.md), reasoned below). The pill, the menu and the Settings rows follow the existing components' tokens (STORY_022's model chip capture `docs/recon/2026-09-14/` for the pill and menu; STORY_034's switch row for Settings).

```
Desktop — the model menu (open), both models ready
   ┌ ◉ MiniMax-H3 ⌄ ┐  ┌ 16:9 768P 5s ┐
   ├─────────────────────────────┐
   │ ● MiniMax-H3                │
   │   MiniMax-H3 (uncensored)   │
   └─────────────────────────────┘

The uncensored model chosen — the pill carries the tag
   ┌ ◉ MiniMax-H3 (uncensored) · NSFW ⌄ ┐

The uncensored model's container not running — the entry greyed, the reason as its title and under it
   │   MiniMax-H3 (uncensored)   │   (greyed)
   │   Not running — on the Spark, run spark/comfyui/run.sh --nsfw │

A Recents row, an Assets tile, the task page's request line, an inbox row — the same tag
   Recents:   ▸ Studio, 12:04 · NSFW
   Assets:    [ poster ]  Studio, 12:04   NSFW   5 s
   Task page: 5 s · 768P · MiniMax-H3 (uncensored) · NSFW
   Inbox:     NSFW  Studio, 12:04 is done

Settings › General (after Appearance, before Watermark)
   Hide adult results                                    [ off ]
   Entries drawn with the uncensored model are hidden from Recents, Assets, Search, the inbox and Scheduled.
   Their task pages still open by link.

Scheduled — an NSFW job held because its container is down (the line under the Running/Waiting heading)
   The NSFW model is not running — the line waits; on the Spark, run spark/comfyui/run.sh --nsfw.
```

Narrow (iPhone 13): the pill's tag stays (the label may truncate, the tag never); the menu entries are ≥ 44 px; the Settings row wraps its description under the switch; the tags on rows and tiles are the same 18-px chip at both widths.

Dark mode: the tag uses the theme's warning tokens (the same pair the moderated badge uses, STORY_014), never a hard-coded colour.

## Acceptance Criteria

- [ ] **The menu lists what the server offers, with readiness:** every `caps.models` entry renders as today; an entry with `ready: false` is greyed (`aria-disabled`, not clickable), shows its `reason` as the entry's title and as a second line, and the pill keeps the previous choice. With one model in capabilities (an older adapter, the stub's default) nothing changes visibly — asserted by the existing composer tests.
- [ ] **The uncensored model is a per-task choice, off by default:** `initialComposer` and `clear` keep `caps.models[0]` (already so); choosing the uncensored entry sets `state.model`, the pill reads *MiniMax-H3 (uncensored) · NSFW*; the choice is **not** remembered across tasks (no shell-prefs key — a deliberate departure from the params, which are remembered; said in Departures).
- [ ] **The tag on every surface an entry appears:** a `params.model === "minimax-h3-nsfw"` entry shows the *NSFW* chip on the Recents row, the Assets tile, the task page's request line (with the model's label), the inbox row and the Scheduled row; the search dialog's rows too. One component, `components/shell/AdultTag.tsx`, used everywhere; the chip has `aria-label="Adult content"`.
- [ ] **Settings › General › *Hide adult results*** (a switch, off by default, stored with the other settings server-side): when on, entries drawn with the uncensored model are absent from Recents, Assets, Search, the inbox and Scheduled's Done list; a task page opened by its link still renders (with the tag); the composer's menu entry stays (the switch hides results, it does not disable the model); the Assets count and "N videos" lines count only what is shown.
- [ ] **A held NSFW job says why:** with the uncensored model chosen and its `ready: false`, Send is still allowed (the queue holds the request, STORY_041's behaviour for a busy server) and the task page and Scheduled show *The NSFW model is not running — the line waits; on the Spark, run spark/comfyui/run.sh --nsfw* (`queue-view.ts`'s pattern, the reason from capabilities); the runner submits it the moment the model reports ready (the existing tick).
- [ ] **Extensions and retries keep the model** (already so — the AC is that the tests now cover the second model): Extend on an uncensored clip shows the pill disabled with the uncensored label and the tag; Retry and Retry chain repost `model`; the chain (STORY_044) sends the composer's model on every segment.
- [ ] **The task page's request line** reads *5 s · 768P · MiniMax-H3 (uncensored) · NSFW* for an uncensored entry and stays as today for an SFW one (no model named — the SFW default is silent, as the reference's line is).

## Departures from the reference

- The reference has no uncensored model, no *NSFW* tag and no hide switch; ours adds them because the Spark serves a second model and the owner wants adult entries marked everywhere and hideable in one place (his answers of 2026-09-19: one list, a badge and a hide filter).
- The model choice is per task and resets on *New task*, unlike the params, which persist: an adult draw should be chosen every time, never inherited by the next task.

## Technical Notes

- **The tag is one component** and the hide filter is one predicate, `lib/adult.ts`: `isAdult(entry)` (`params.model === "minimax-h3-nsfw"`) and `visibleEntries(entries, settings)`; every list that renders entries calls it (Recents, Assets, Search, inbox, Scheduled) — five call sites, one test each. The model id is a constant in `lib/job-api.ts` beside the capabilities type, not a string repeated in components.
- **`capabilities.models[].ready`** is read through the existing `Capabilities` type (`job-api.ts:76`) with `ready?: boolean; reason?: string` (optional, so the stub's older shape and an older adapter still parse); `composer-state.ts`'s reducer refuses `{ type: "model" }` for a not-ready id (the menu never dispatches it, the reducer guards anyway).
- **The queue's held-line text** comes from the model's `reason` when the job's model is not ready, else today's texts; `queue-view.ts` gains the per-model case.
- **Settings** gains `hideAdult: boolean` in `lib/settings.ts` (the store's parser refuses anything but a boolean — STORY_040's pattern for unknown keys stays: 400).
- **StrictMode:** the Settings switch and the menu are decide-once state, no timers; the held job's polling is STORY_041's existing effect (already guarded).
- Not in this story: the skill (066); a separate adult history (rejected); the agent chip's behaviour with the uncensored model (the chip writes prompts, it does not choose models; 066 says which skills are manual).

## Testing Plan

- **Unit (app):** `composer-state.test.ts` — the `model` action for the uncensored id, the guard for a not-ready id, `clear` resetting to the first model, `modelLabel` for the new label; `adult.test.ts` — `isAdult`, `visibleEntries` with the switch on and off; `queue-view.test.ts` — the held line for a not-ready model with its reason; `settings.test.ts` — `hideAdult` parsed and refused when not a boolean; `submit-job.test.ts` — `model` sent as chosen.
- **Component (jsdom, StrictMode):** `Composer.test.tsx` — the menu with two ready models (both entries, the choice, the pill's tag), with the second not ready (greyed, the reason, the pill unchanged), with one model (unchanged); `Sidebar.test.tsx`, `AssetsPage.test.tsx`, `TaskPage.test.tsx`, `InboxPopover.test.tsx`, `ScheduledPage.test.tsx` — the tag on an uncensored entry and its absence on an SFW one; each list with `hideAdult` on hides the entry; `SettingsDialog` (in `dialogs.test.tsx`) — the switch row, its save.
- **Integration (`app/test/integration/jobs.test.ts`, `settings.test.ts`):** `POST /api/jobs` with the uncensored model reaches the stub with it (STORY_064's assertion, kept); `PATCH /api/settings { hideAdult: true }` persists and `false` clears; a non-boolean is 400.
- **E2E (`app/e2e/composer.spec.ts`, `task.spec.ts`, `assets.spec.ts`, `scheduled.spec.ts`; both widths — `devices["iPhone 13"]` for narrow; both themes for the tag):** (1) the stub's capabilities with both models ready: open the menu → two entries; choose the uncensored one → the pill reads the label with *NSFW*; send with `done-after-1-poll` → the stub's `received.request.model` is `minimax-h3-nsfw`; the task page's request line carries the label and the tag; the Recents row and the Assets tile carry the tag; **New task** → the pill is back to *MiniMax-H3*. (2) `POST /__stub/models` marking the uncensored model down → the entry greyed with the reason; a job already chosen for it sent → held, the task page's line names the NSFW container; `POST /__stub/models` ready → the job goes (the runner's tick) and lands `done`. (3) Settings › General › *Hide adult results* on → the uncensored entry gone from Recents, Assets and the inbox; its task page opens by URL with the tag; off → back. Every spec ends with the stub's jobs terminal (`stub.reset` in `beforeEach`). **Unchanged halves** covered by the existing `composer.spec.ts` (one model: the menu as today), `extend.spec.ts` (the pill disabled while extending), `task.spec.ts` (Retry reposts params).
- **Manual verification** (not a gate): on the Spark with STORY_064 deployed — the menu against the real adapter with the NSFW container down (greyed, the reason) and up (ready); one uncensored draw from the UI, its entry tagged in Recents, Assets and the task page; the switch hiding it; the date and the job id in the Done note.

## Estimated Complexity

Large in surface (five lists, a dialog, a menu, both widths, both themes), small in logic (one predicate, one boolean, one label); the e2e is where the time goes.

## Open questions (for the owner, by the multiple-choice tool, before implementation)

1. **The tag's text:** *NSFW*, *NSFW* or *Adult*? Recommended: *NSFW* (short, unambiguous, the same in both languages the reference ships). **Answered 2026-09-19 16:50 (by the tool): *NSFW*** — every *NSFW* in this story became *NSFW* at 16:55; the chip stays 18 px and the `aria-label` stays "Adult content".
2. **Search:** should the hide switch also hide adult entries from the search dialog? Recommended: yes (the mockup assumes it).
