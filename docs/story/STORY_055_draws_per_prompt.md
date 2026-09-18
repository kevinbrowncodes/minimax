# STORY_055 — Draws per prompt

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the ninth and last story ("draws per prompt as a later story", the owner, 2026-09-16 13:45). After [STORY_054](STORY_054_the_skills_tab.md)
**Status:** Done (2026-09-17 20:40 EDT — built and gated while STORY_053's chain drew on the Spark; deployed once the chain finished; the x2 draw on the Spark is the addendum. Proposed 03:20 EDT — drafted with 048–054 at the owner's request; from EPIC_009 as revised in aa7092d)
**Created:** 2026-09-17

As the owner, I want *Draws x1 / x2 / x3 / x4* under Agent settings › Video generation default, so that one prompt — the director's or my own — is queued as that many jobs with fresh seeds, one after another, the way I queued two draws of the cove prompt and three of the office prompt by hand on 2026-09-16; the best draw is the video, the others are what the model also had in it.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **Seeds are the adapter's.** `POST /api/jobs` carries no seed from the composer; `spark/adapter/src/server.ts` line 464 draws one per job when the request has none (`request.seed ?? Math.floor(Math.random() * 2 ** 32)`) and logs it; the task page's **Retry** (STORY_020 / CHORE_009) re-posts the same request without a seed for the same reason — "generates this again with a new seed" (`CutNotice.tsx`, `TaskPage.test.tsx` line 176 proves the body has no `seed`). So N identical requests are N draws; nothing new is needed on the server.
- **Sequenced posting exists**: `lib/submit-job.ts` › `submitChain` posts one request after another, each after the previous 202, and reports a refusal mid-way with the accepted ids; STORY_041's queue holds whatever the Spark cannot take at once, in order (`Queued — 2nd in line`); the composer's toast and navigation follow the first or the last id (STORY_044 opens the last segment's page).
- **The Agent settings panel** (STORY_051) shows *Video generation default › Draws x1* as a read-only row waiting for this story; `lib/settings.ts` takes a per-key type table (STORY_050: booleans, a string, 051's enum).
- **The "≈ N min on the Spark" line** (STORY_050's `lib/spark-time.ts`) knows one job's minutes.
- **Titles** come from the prompt (`history-store.ts` › `titleFor`), so two draws of one prompt share a title — as a Retry and its original do today.

## UI Mockup

**Reference capture:** none — agent.minimax.io generates one video per request; Flow's *Video generation default › x1 x2 x3 x4* is the model (BACKLOG_009's map § 7). Ours in STORY_051's panel chrome; the segmented control is the parameters popover's radio track (`radio-duration@1440`: 36 × 24, 12 px/500, the selected one white on `rgb(23,23,23)`).

**The panel row, live:**

```
                                                    │ Video generation default                  │
                                                    │ Draws   [x1] [x2] [x3] [x4]               │
                                                    │         Each draw is a job with its own   │
                                                    │         seed, queued one after another.   │
                                                    │ Model   Gemini Flash · Vertex AI          │
```

**The composer with x2 set** — Send shows the count so nothing is silent; the line under it multiplies:

```
│ [+] [◎ Agent] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 10s]             MiniMax-M3 ⌄ [Run at…] [×2 ↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                     ≈ 2 × 50 min on the Spark
```

Send → the toast *Queued — 2 draws* → **the first draw's task page** (it runs first; Scheduled lists the second *Waiting — 2nd in line*). **A chain with draws > 1** — the strip's summary ends *· draws apply to single clips; the chain is sent once* and Send all sends one chain. **Straight-through with draws** — the director's clean reply becomes N jobs with no click. **A refusal mid-way** (draw 2 refused by the adapter) — the first stays in the line; the alert names it (*Draw 2 was not sent: …*), the composer keeps the prompt so Send again sends the missing draws (the count adjusted by the owner, not guessed). **Narrow** — the ×2 sits inside the 44 px Send target; the panel row wraps the four segments.

## Acceptance Criteria

- [x] **The setting**: `agentDraws: 1 | 2 | 3 | 4` (default 1) in `lib/settings.ts`, parsed with the defaults rule, patched through `PATCH /api/settings` (anything else → 400 with the field); the panel's *Draws* row is the four-segment radio group with the helper sentence, saved by **Save** with the rest.
- [x] **Every single-clip Send in video mode honours it** — a hand-typed prompt, a director's reply after review, and a straight-through reply alike (the owner's own draws were hand prompts; if he wants it agent-only the setting moves, one line — the decision is written here so it is a choice, not a miss): `lib/submit-job.ts` › `submitDraws(state, count, fetch)` posts the same request `count` times **one after another, each after the previous 202** (the first with the run-at and, for an Edit, `replaces`; the rest as new requests — an Edit replaces one entry, the other draws join the line behind it), **never with a seed**, returning the ids or the refusal with the index. The toast reads *Queued — N draws* (with the first's position when the queue gives one); the composer opens the **first** draw's task page. A count of 1 is today's single `submitJob` — no behaviour change.
- [x] **Chains are sent once**: a text that splits (STORY_044 / 053) ignores the draw count; the strip's summary says so when the count is above 1; a straight-through chain (053) likewise.
- [x] **Send shows the count** — `×N` beside the arrow when N > 1 (`aria-label="Send message, 2 draws"`), and the "≈ … on the Spark" line reads *≈ N × M min*; with N = 1 nothing changes.
- [x] **A refusal mid-way** leaves the accepted draws in the line, shows *Draw k was not sent: <message>* and keeps the prompt, the image and the parameters in the composer (no extend-mode switch — the draws are independent).
- [x] **Different seeds is the adapter's rule, not the app's** — the request carries no `seed` (asserted in the unit and e2e lanes); the adapter's own test of line 464 covers the draw. The Done note records the two seeds from the adapter's log on the manual verification.
- [x] **Both widths, both themes**; STORY_041/043/044/050–053's specs stay green with the default x1.

## Departures from the reference

- The reference has no draw count; Flow's control is the model. The ×N on Send and the multiplied minutes line are ours so the cost of a Send is never hidden.
- Draws share a title in Recents, as a Retry and its original do — a *draw k of N* suffix is a later candidate if the owner asks (the title is derived from the prompt today).

## Technical Notes

- `lib/submit-job.ts` › `submitDraws` reuses `submitJob` with a `SegmentRequest` per draw (`{ prompt: state.text, images: state.images, notBefore }`, the first also `replaces`); `Composer.tsx` › `send()` branches on `settings.agentDraws > 1 && chain === undefined` before the single path; STORY_051's decision function returns `"queue"` with the count.
- `lib/settings.ts` › `SETTING_TYPES.agentDraws = [1, 2, 3, 4]`; the PATCH route accepts a number for it.
- `lib/spark-time.ts` › the line's text takes the count; `AgentSettingsPanel.tsx` › the row becomes live.
- The stub needs nothing new: N requests are N jobs (`?script=` applies to each).

## Testing Plan

- **Unit (`pnpm test`)** — `settings.test.ts`: `agentDraws` parsed, defaulted, `5` and `"2"` → the default. `submit-job.test.ts`: `submitDraws` posts N times in order with the same prompt, images and parameters, no `seed`, `replaces` only on the first, `notBefore` on every draw (they wait together), stops at a refusal and reports the index and the sent ids; N = 1 posts once. `spark-time.test.ts`: the multiplied line. `agent-decision.test.ts`: the count carried on `"queue"`.
- **Component (`Composer.test.tsx`, `AgentSettingsPanel.test.tsx`)** — Send reads ×2 and the line *≈ 2 × …* with the setting at 2; Send posts twice and navigates to the first id; a chain with the setting at 2 posts the chain once and the strip says so; a refusal on the second draw shows *Draw 2 was not sent* and keeps the prompt; the panel's radio group saves the count.
- **Integration** — `settings.test.ts`: `PATCH { agentDraws: 3 }` stored; `0`, `5`, `"2"` → 400. Said so: no other route changes.
- **E2E (`e2e/agent.spec.ts`, extended, both widths)** — (13) *Two draws of one prompt*: Agent settings → x2 → Save → a hand prompt at 5 s, `?script=done-after-1-poll` → `waitForResponse` on two `POST /api/jobs` 202s registered before the click → Send (reads ×2) → the toast *Queued — 2 draws* → the first draw's task page → `/scheduled` lists one Running and one Waiting → both terminals waited on → the stub's two received requests have the same prompt and no `seed`. (14) *Straight-through with x2*: *Never* + `?agentScript=clean` → two 202s with no click. The setting is reset to x1 (and *Always*) in `afterEach`. Regression cover: `scheduled.spec` (STORY_041/043/044 with x1), STORY_050–053's cases.
- **Manual verification (the Spark, in the Done note with the date, the model id and the job ids):** x2 through the deployed UI on the office director prompt — two jobs queued, the first running and the second waiting, both draws finished (≈ 2 × 50 min GPU, the second overnight if the evening is short), the two seeds read from the adapter's log and recorded, the better draw named.

## Estimated Complexity

Small — a setting, a sequenced post on an existing helper, a label and a line, two e2e cases: ≈ 1 h of build and gate (the epic's figure), plus ≈ 50 min of GPU for the second draw.

## Corrections found while building (2026-09-17)

1. **`decide` is unchanged.** The plan had STORY_051's decision function return `"queue"` with the count; the count is a setting the composer already holds, so `decide` keeps its two arguments and the composer reads `settings.agentDraws` on the queue path — `submitDraws(state, draws, fetch, result.prompt)` takes the director's prompt as an argument so the box is never written. `agent-decision.test` gains nothing.
2. **The e2e's "one Running and one Waiting" is the Spark's, not the stub's.** The stub takes any number of jobs at once (it answers busy only when scripted), so two draws against it run side by side with no place in the line and no Waiting row; the toast reads *Queued — 2 draws* with no ordinal. The Spark's adapter holds one job at a time, so the second draw waits there — the manual verification's observation, in the addendum.
3. **The stub draws a seed the way the adapter does** (`request.seed ?? Math.floor(Math.random() * 2 ** 32)`, recorded on the received request), so the e2e cannot read "no seed" off the stub's record: it asserts two draws got two different seeds; the unit lane asserts the request body has no `seed` field, which is the AC's claim.
4. **An extension with draws above 1 is N extensions of the same source** — the AC says every single-clip Send, and an extension is a single request; `submitDraws` carries `continueFrom` on every draw (the request builder then ignores the images, as today). A decision, written here so it is a choice: the owner's own extensions were one at a time; if he wants extend mode exempt, it is one condition.
5. **The e2e polls each draw through `GET /api/jobs/:id`**, not the history file — that route is what records a terminal status (BUG_009); the STORY_053 chain helper was changed the same way.
6. **The panel's radio track** is a `radiogroup` of `<label>`s with a full-size invisible `<input type="radio">` (aria-label `x1`…`x4`) so a click, a tap or Playwright lands on the input itself — the first cut hid the input at 1 px and the e2e could not click it.
7. **The component cases live in `Draws.test.tsx`** (new: ×2 and the multiplied line, two posts and the first's page, x1 unchanged, a chain sent once with the strip's note, a refusal on draw 2) and `AgentSettingsPanel.test.tsx` (the track saved with Confirm; *Never* × x2 → two posts of the director's prompt).

## Done note (2026-09-17)

**Built** (20:15 → 20:40 EDT, while the Spark drew STORY_053's chain): `lib/settings.ts` (`agentDraws: 1 | 2 | 3 | 4`, `AGENT_DRAWS`, `isAgentDraws`, the parser's default), the PATCH route (a number from the list, else 400 naming the field), `lib/submit-job.ts › submitDraws` (N posts one after another, the first with `replaces`, every draw with the run-at and, in extend mode, the source; the refusal with its index), `lib/spark-time.ts` (*≈ N × M min*), `AgentSettingsPanel.tsx` (the Draws track in the parameters popover's radio chrome, the helper sentence, saved with Confirm), `ChainStrip.tsx` (the summary's note above x1), `Composer.tsx` (`submitDraws` on the single path and on the straight-through path, *Queued — N draws*, the first draw's page, *Draw k was not sent: …* with the composer kept as it was, ×N on Send with `aria-label="Send message, N draws"`, the line multiplied for a single clip only), README (a row, the status). Unit: `settings-store.test` (+5 parse cases, a write), `submit-job.test` +3 (N posts alike with no seed and `replaces` only on the first; x1 and the prompt argument; extend mode and a refusal), `spark-time.test` +3. Component: `Draws.test` 4, `AgentSettingsPanel.test` (+1 and the Save case extended). Integration: `settings.test` (`agentDraws: 3` stored; 0, 5, "2" → 400 with the field and *agentDraws must be one of 1, 2, 3, 4*). E2E `agent.spec` +2 at both widths: (13) x2 saved through the panel, the chip off, a base-format hand prompt — Send reads ×2, the line *≈ 2 × N min*, two 202s, the toast, the first draw's page, both done, neither an extension, one title, the same prompt with one upload each and two different seeds; (14) *Never* × x2 → two 202s of the director's prompt with no click, 10 s each, two seeds. The `afterEach` resets `agentDraws` to 1.

**Gate.** Steps 1–5 by hand and the agent spec's STORY_053–055 cases at both widths (12/12); the full six by hand before the push (the hook runs them again). **Deployed** after the Spark's chain finished — never mid-job; the x2 manual verification is the addendum below.
