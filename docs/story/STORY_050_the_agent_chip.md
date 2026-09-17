# STORY_050 — The Agent chip

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the fourth story; the first the owner can use. After [STORY_049](STORY_049_the_director_on_the_server.md) (the route and the fake this UI is built on)
**Status:** Done (2026-09-17 — approved under the owner's blanket "continue story by story" of 05:20; the photo as attached, no downscaling, his answer of 12:25; built 12:25 → 12:55; gate steps 1–4 green by hand, the agent spec 8/8 at both widths, the full e2e after; deployed and verified live; the Done note below)
**Created:** 2026-09-17

As the owner, I want an **Agent** chip on the video composer that, when on, sends my photo and a line of notes to the director skill I picked and brings the finished prompt back into the box for me to read and edit — Send again and it is a job — and, when the director declines or the run fails, tells me so where the prompt would have been and in the Inbox, with nothing queued; so that a new clip from a new photo is attach, Send, read, Send.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **The bar** (`components/composer/Composer.tsx` › `styles.bar`): the `+` button (`attach-button@1440`: 32 × 32, radius 10, `rgb(102,102,102)`) with the `AttachMenu`; in video mode the model pill (`model-button@1440`: 139 × 32, radius 8, white) and the parameters pill (`params-button@1440`: 141 × 32); at the right the inert `MiniMax-M3 ⌄` (`agent-model-button@1440`: 118 × 32, radius 10, `rgb(23,23,23)`, opening `AgentModelMenu` — three cloud rows and a Thinking switch, all `Inert`; at 390 a "Select model" bottom sheet), *Run at…* (STORY_041, home only, not in extend mode) and Send (32 px round, black; grey `rgb(173,173,173)` while `canSend` is false) which the task page swaps for *Stop generation* through the `stop` prop while a job runs. **The reference's own agent toggle sits exactly where the chip goes**: `agent-team-switch@1440` — 531,386, 115 × 32, 14 px/400, blue `rgb(0,148,252)`, radius 10, right after `+` with a 4 px gap (STORY_013 cloned it inert; it is not in `Composer.tsx` today).
- **`canSend`** (`lib/composer-state.ts` line 243): text non-empty, not submitting, capabilities known. In agent mode the notes may be empty and the photo is the input — a new branch.
- **The reducer** knows nothing of an agent: `ComposerState` has mode, text, images, capabilities, the parameters, extend, overlap, error, submitting, project, run-at, queue id. Images are refused in extend mode (`add-images` → the error "An extension takes no reference images"); *Run at…* is hidden there.
- **Errors** render under the card in `styles.error` (`role="alert"`, the ⓘ glyph); the cut notice (STORY_020) has the amber strip; a toast comes from `useShell().notify`.
- **The Inbox** (`components/shell/InboxPopover.tsx`, `lib/inbox.ts`): tabs All / Updates / Messages; every event is a history projection with a `taskId`, read when the browser's Read-all stamp (`prefs.inboxReadAt`) is later or the task was opened; Messages "= chats (STORY_037), none yet". The Shell loads recents once and on the bell's open (`onInboxOpen={loadRecents}`); a row's `onOpen` pushes `/task/<id>`.
- **Settings** (`lib/settings.ts`, `PATCH /api/settings`): two booleans; the route refuses any other key or type.
- **The routes** are STORY_049's: `GET /api/agent/skills`, `POST /api/agent/runs` (`kind: "prompt" | "refusal"`, the errors), `GET/PATCH /api/agent/runs`, `/api/capabilities` › `agent: { configured, reason? }` (047).
- **The e2e lane** forwards `?script=` from the page URL to the jobs route (`lib/submit-job.ts`); the agent run needs its own parameter so one page can script both.

## UI Mockup

**Reference capture:** `composer-video-mode@1440` and `-dark` (2026-09-14) for the bar the chip joins; `home-signed-in@1440` for the Agent Team switch's slot, size and on-colour (the values above); `agent-model-menu-open@1440` / `narrow-agent-model-menu-open@390` for the right-hand pill's menu and sheet (218 px, right-aligned; the sheet with its × at 390); `model-menu-open@1440` for the chip's own menu (268 px, radius 12, 14 px/400 rows 20 px tall at a 12 px inset). Tokens (`docs/recon/2026-09-12/tokens.md`): text `rgb(23,23,23)`, muted `rgb(102,102,102)`, faint `rgb(173,173,173)`, the blue `rgb(0,148,252)`, the card's radius 20 (16 at 390), motion 0.15 s `cubic-bezier(0.4,0,0.2,1)`. Google Flow's chip, panel words and *Thinking…* are BACKLOG_009's map § 7 (the owner's screenshots, 2026-09-16); the ASCII below is the map's Option D revised, redrawn for every state.

**Agent off** — today's composer plus the dim chip (4 px after `+`, 32 px tall, radius 10, muted text, the glyph a small director's-chair mark):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [+ Reference]                                                                                 │
│ ● video-creator ×  ▏Enter message... (use / for commands)                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+] [◎ Agent] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 5s]              MiniMax-M3 ⌄ [Run at…] [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Agent on, no photo yet** — the chip filled (blue text, `rgba(0,148,252,0.10)` fill) naming the skill; the two icons of 051 / 052 are **not** in this story (they appear when those land); the right-hand pill reads the agent's model; Send disabled with the hint:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [+ Reference]                                                                                 │
│ ● video-creator ×  ▏Enter message... (use / for commands)                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+] [◉ Agent · Thirst trap ⌄] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 5s]  Gemini Flash ⌄ [Run at…] [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
  ⓘ Attach the photo the director starts from.
         │ the chip's menu (268 px, the model menu's chrome):
         ▼
   ┌────────────────────────────────────────────────┐
   │ Skills                                         │
   │ ● Thirst trap director                       ✓ │
   │   Directs one thirst-trap short from one…      │  ← description, muted, one line, ellipsis
   │ ○ Chain director                    (STORY_053)│
   │ ────────────────────────────────────────────── │
   │ ⚙ Manage skills                                │  → /plugins?tab=Skills
   └────────────────────────────────────────────────┘
```

**Photo attached, notes typed, Send** → running: the box keeps the notes, read-only; a status line in the reference's muted meta type (14 px / 22 px, `rgb(102,102,102)`) above the bar; Send is the square Stop; the chip, the pills and *Run at…* disabled:

```
│ [01.jpg ×]                                                                                    │
│ ● video-creator ×  ▏blue trunks under the crop, keep the camera still                         │
│ Thinking…                                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+] [◉ Agent · Thirst trap ⌄] [◉ MiniMax-H3 ⌄] [16:9 │ 768P │ 5s]     Gemini Flash ⌄ [Run at…] [■] │
```

**The reply** — the prompt fills the box, the chip turns **off**, the image stays, the parameters stay, the caret at the top; the line under Send; the notes are gone (they were the question):

```
│ [01.jpg ×]                                                                                    │
│ ● video-creator ×  ▏For the target video, at 0.00 seconds into the target video, <Picture 1>  │
│                     (from [Shot 1]) is fully referenced.                                      │
│                                                                                               │
│                     integrated_multimodal_description: [Shot 1] Live-action, candid …         │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+] [◎ Agent] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 10s]             MiniMax-M3 ⌄ [Run at…] [↑] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                          ≈ 50 min on the Spark
```

**The reply with findings** — the same, plus the amber strip of STORY_020's cut notice above the bar, listing them; Send stays enabled (review mode never blocks):

```
│ ▲ The reply misses the skill's format: no overall_soundscape field; the description is 312     │
│   words (the skill asks for 350–600). Edit it, or send it as it is.                            │
```

**A refusal** — nothing in the box changes (the notes stay), the chip stays on, the alert strip under the card carries the model's words; the Inbox bell gains one unread:

```
│ ● video-creator ×  ▏blue trunks under the crop, keep the camera still                         │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+] [◉ Agent · Thirst trap ⌄] … Gemini Flash ⌄ [Run at…] [↑]                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
  ⓘ The director declined: "I can't help with content that…"        ← verbatim, no rewording
```

**An error** (`ⓘ The agent could not be reached: …` / `ⓘ The agent's reply was not a prompt: "I can't see an image…"` / `ⓘ The agent took longer than 90 s`) — the same shape, an Inbox notice too. **Stop** — `ⓘ Stopped — nothing was sent.`, the notes kept, **no** Inbox notice (the owner's own act). **Not configured** (`agent.configured` false) — the chip greyed at 40 % with `title` = the reason ("VERTEX_MODEL is not set — …"); a click does nothing. **Extend mode** — the chip greyed with `title` "Agent needs a photo — it directs from the first frame" (the source's last frame is a later candidate). **Text mode** — no chip.

**The right-hand pill while the chip is on** — `Gemini Flash ⌄`, the reference's chrome; its menu one row, checked, no Thinking switch; at 390 the same "Select model" sheet with the one row:

```
   ┌──────────────────────┐
   │ ● Gemini Flash     ✓ │   (the label from the pinned id; the id in the row's title)
   └──────────────────────┘
```

**Narrow (iPhone 13)** — the chip keeps its glyph and *Agent* (no skill name); the menu's title reads "Skills · Thirst trap"; the status line and the strips are full width; every target ≥ 44 px on the touch branch:

```
│ [+] [◉ Agent] [◉ H3 ⌄] [16:9 │ 768P │ 5s]           Gemini Flash ⌄ [↑] │
```

**The Inbox row** (Messages tab, and All): `● The director declined  ·  26-09-17-0312 Thirst trap — "blue trunks under the crop…"  ·  03:12`; opening it → `/?agentRun=<id>`: the composer in video mode with the chip on, the notes back in the box, the alert with the words, the row now read.

## Acceptance Criteria

- [x] **The chip.** In video mode (home and the docked composer), 4 px after `+`: a toggle button (`aria-pressed`), 32 px tall, radius 10, 14 px/400; off: the glyph and *Agent* in `rgb(102,102,102)`; on: *Agent · <skill>* with a ⌄, blue text on the 10 % blue fill, the transition 0.15 s. The skill's short name is `metadata["minimax-short-name"]` when the skill has one, else its `name`; a CHORE inside this story adds `minimax-short-name: Thirst trap` and `minimax-clip-seconds: "10"` (the length its prompts are written for) to the thirst-trap skill's metadata (validated as CHORE_012 did). Clicking the chip toggles it; clicking its ⌄ half opens the **Skills** menu (the model menu's chrome, 268 px): one `menuitemradio` per skill from `GET /api/agent/skills` — the name, the description in one muted line — the chosen one checked; *Manage skills* → `/plugins?tab=Skills`. The choice is saved as `agentSkill` in the settings store (`PATCH /api/settings`, which learns to take a string for this key) and read on mount; the default is the first skill by id. Hidden in text mode; **disabled in extend mode** with the reason in `title` and `aria-disabled`; **disabled when `/api/capabilities` › `agent.configured` is false** with the reason as `title` (a click does nothing; no menu).
- [x] **Send with the chip on** needs a photo, not text: `canSend` is true with one image attached (the notes may be empty); without one the hint *Attach the photo the director starts from* shows under the box and Send is disabled. The photo is the first reference image; a second image attached is refused while the chip is on ("The director takes one photo", the images slot capped at one) and re-allowed when it is off. Enter sends as today.
- [x] **The run.** Send posts `POST /api/agent/runs` (multipart: the skill id, the image, the notes; `?agentScript=<name>` on the page URL forwarded as `?script=` so the e2e lane picks the fake's script — the jobs route's `?script=` is untouched) with an `AbortController`; while it runs the box is read-only with the notes in it, the status line reads *Thinking…* (Flow's word), Send is the square **Stop** (`aria-label="Stop the agent"`), and the chip, the pills, *Run at…* and the attach tiles are disabled. Stop aborts the request and shows *Stopped — nothing was sent.* with the notes kept. The effect that owns the request is StrictMode-safe (the controller in a ref; aborted on unmount).
- [x] **The reply.** `kind: "prompt"` → the box's text becomes the prompt, **the chip turns off**, the image, the ratio and the resolution stay, **the duration becomes the skill's declared clip length** (`metadata["minimax-clip-seconds"]`, 10 for the thirst-trap director — a ten-second prompt must not go out as the composer's default 5 s job; clamped by the capabilities, and left alone when the skill declares none), the textarea takes focus with the caret at the start; with `findings` the amber strip (STORY_020's cut notice's chrome) lists each message in one sentence and ends *Edit it, or send it as it is.* — Send stays enabled. From here Send is exactly today's Send (STORY_013's request with the image; STORY_041's run-at; STORY_044's chain if the text splits). If STORY_048 found downscaling worth it, the composer scales the photo to that width on a canvas before posting to the agent — the job still gets the original.
- [x] **A run without a job.** `kind: "refusal"` → the alert *The director declined: "<the words verbatim>"*; an error → the alert with the route's message (*The agent could not be reached: …*, *The agent's reply was not a prompt: "…"*, *The agent took longer than 90 s*, *Google's quota: …*); the chip stays on, the notes and the photo stay; **nothing is posted to `/api/jobs`** and nothing appears in Recents, Scheduled or Assets. The Shell loads `GET /api/agent/runs` beside recents (on mount and on the bell's open) and `eventsFor` merges them as events — `kind: "agent-refused" | "agent-failed"`, `tab: "Messages"` (the tab's first content), text *The director declined* / *The agent run failed*, the stamp and title from the run's time, skill short name and the notes' first 48 characters (or *(no notes)*), unread until Read all or opened. Opening the row pushes `/?agentRun=<id>`: the composer enters video mode with the chip on, the notes in the box and the alert with the words, and the row is stamped opened (`PATCH /api/agent/runs/:id`). A Stop makes no row.
- [x] **The right-hand pill** reads the agent's model while the chip is on — the label derived from the pinned id (`agentModelLabel("gemini-…-flash") → "Gemini … Flash"`, the id in the row's `title`); its menu is one checked row and no Thinking switch (STORY_026's rule: no controls we cannot run); at 390 the "Select model" sheet with the one row. With the chip off the pill is the reference's inert `MiniMax-M3 ⌄` as today. `/api/capabilities` › `agent` gains `model: { id, label }` (047's shape, extended).
- [x] **"≈ N min on the Spark"** under Send whenever the box holds a base-format prompt (the description marker present) in video mode: `lib/spark-time.ts` › `estimateMinutes({ seconds, fromImage, extension })` from the README's measured table (5 s text-to-video 17 min; 10 s from an image 50 min; +10 s extension 67 min; linear between, the constants dated 2026-09-15 in the source); for a chain the strip's segments summed (*≈ 3 h 5 min*). Never shown for a hand-typed prompt without the marker; never a promise (the word is ≈).
- [x] **A base-format prompt gets a readable title.** `history-store.ts` › `titleFor`: a prompt with no timestamped line whose text holds the description marker is titled by the **first sentence of its description after the style and camera sentences** (the `[Shot 1]` label dropped; sentences beginning *Live-action* or *The camera* skipped), cut at the same 48-character boundary — so a director's prompt reads "In the first two seconds the man in the navy…" in Recents rather than "For the target video, at 0.00 seconds into the t…". Hand-typed prompts without the marker keep today's rule; STORY_053's chain segments inherit this one.
- [x] **Both widths, both themes** (the chip's on-colour is the same blue in dark; the fill 16 % there); the narrow chip and menu title as sketched; touch targets ≥ 44 px on the touch branch.
- [x] **Departures from the reference** written below and cited; the composer, extend, scheduled, task and shell e2e specs stay green.

**AC corrections made during implementation, as § 3 item 8 asks (2026-09-17):**

- **The error wording** "The agent took longer than 90 s": the timeout is 240 s since STORY_049; the alert shows the route's own message.
- **The CHORE for the skill's metadata keys** was done in STORY_048 (CHORE_014: `minimax-short-name`, `minimax-clip-seconds`); nothing to add here.
- **The photo goes as attached** — the owner's decision of 12:25 after STORY_048's measurement; no canvas resize.
- **The Inbox row's title** uses a `skillName` the run store now keeps beside the skill's id (the e2e caught the folder id showing where the short name belonged; reopening the run still selects by id).
- **The Shell learns of a run without a job** through a `minimax:agent-runs` window event the composer fires, so the bell's count updates without opening it — the AC's "on mount and on the bell's open" alone would have left the badge stale until then.
- **`DELETE /api/agent/runs`** added (the e2e lane's reset between specs; a Clear in the Inbox later if wanted).

## Departures from the reference

- **The Agent chip** is an addition in the slot where the reference keeps its Agent Team switch (`home-signed-in@1440`); ours toggles a director, theirs an agent team; size, radius, type and on-colour are theirs. The reference has no notes-to-prompt step: its agent is a conversation (BACKLOG_006 keeps that surface for text mode).
- **The right-hand pill's rows**: the reference lists three cloud models and a Thinking switch; ours lists the one model we run (STORY_026's rule) — the pill's meaning (the agent's model) is unchanged.
- **The status line, the amber findings strip, the "≈ N min" line and the Messages-tab notices** are ours (Flow's words where the map took them); nothing of the reference is removed.
- **Stop makes no Inbox notice** — EPIC_009's story row listed it; corrected here (the owner's own act is not news) and said so.

## Technical Notes

- `lib/composer-state.ts`: `agent: { on: boolean; skillId?: string; running: boolean; notice?: { tone: "alert" | "warn"; message: string } }` with actions `agent-toggle`, `agent-skill`, `agent-start`, `agent-reply { prompt, findings }`, `agent-declined { message }`, `agent-failed { message }`, `agent-stopped`; `canSend` gains the branch; `add-images` caps at one while on; `extend-from` forces `on: false`; `leave-video-mode` too. `agentModelLabel(id)` beside `modelLabel`.
- `components/composer/AgentChip.tsx` (new file — new UI in new files) with the menu; `AgentModelMenu` takes an optional `model` and renders the one-row form; the status line and the findings strip in `composer.module.css`; `lib/spark-time.ts` (new, pure); `lib/inbox.ts` › `eventsFor(entries, runs = [])` and the two kinds; `Shell.tsx` loads and passes the runs; `app/page.tsx` reads `?agentRun=` and passes `initialAgentRun` to the composer (the notes and the message from `GET /api/agent/runs`).
- `lib/submit-job.ts` gains `submitAgentRun(state, fetch, signal)` (multipart; `?agentScript=` → `?script=`), returning the route's union.
- `lib/settings.ts`: `agentSkill?: string`; the PATCH route's validation grows a per-key type table (booleans today, this string, 051's enum, 055's number).
- `lib/composer-state.ts` › `agent-reply` takes `clipSeconds?` and clamps it through `clampDuration`; the skill's metadata comes with the skills list.
- `history-store.ts` › `titleFor` gains the base-format branch (a small `describedAction(prompt)` in `lib/prompt-format.ts`, shared with 053's strip rows).
- The chip's glyph and the Stop square are inline SVG as the bar's other icons are.

## Testing Plan

- **Unit (`pnpm test`)** — `composer-state.test.ts`: every agent action; `canSend` with the chip on and no image / one image / empty notes; the one-image cap on and off; extend and leave-video turn it off; `agentModelLabel`. `spark-time.test.ts` (new): the three measured points, a value between, a chain sum. `inbox.test.ts`: two runs merge as Messages events newest first, read by the stamp or `openedAt`, `tabFilter` puts them under Messages and All, no `taskId`. `settings.test.ts`: `agentSkill` parsed and defaulted. `history-store.test.ts`: `titleFor` on the stub's `clean.txt` (the first action sentence), on a prompt whose description starts with the action (no style sentence), on a timestamped script (STORY_044's rule still wins), on plain prose (unchanged).
- **Component (`Composer.test.tsx`, `InboxPopover.test.tsx`, `Shell.test.tsx`)** — the chip absent in text mode, present in video mode, disabled in extend mode with the title, disabled with the reason when `agent.configured` is false; the menu lists the skills from a fake fetch and checks the saved one, choosing one PATCHes settings; Send disabled without a photo and the hint shown; a run: the fake fetch resolves after fake timers → *Thinking…*, Stop, the pills disabled → the reply in the box, the chip off, focus at the start, the "≈ 50 min" line; findings → the amber strip's sentence; a refusal → the alert verbatim, the notes kept, no `/api/jobs` call; Stop → the abort signal fired, *Stopped*, no run row fetched; **the run effect rendered inside `<StrictMode>` with fake timers** (§ 6b: the double mount must not fire two requests or abort the live one); the Inbox row for a run and its open callback.
- **Integration** — `settings.test.ts` (035's lane): `PATCH { agentSkill: "…" }` stored and returned, a non-string refused. `agent.test.ts` (049's) already proves the routes.
- **E2E (`e2e/agent.spec.ts`, new, at desktop and iPhone 13, both themes for the chip's states)** — fixture: the stub reset, the page at `/?agentScript=clean&script=done-after-1-poll`. (1) *A reply reviewed then sent*: the chip on → the Skills menu shows *Thirst trap director* checked → attach `fixture-reference.png` → type notes → `waitForResponse` on `POST /api/agent/runs` registered before the click → Send → *Thinking…* and Stop visible → the response → the box starts with "For the target video" → the chip is off → the *≈ … min on the Spark* line → `waitForResponse` on the terminal status registered → Send → 202 → the task page → the result plays (`video.ts`'s readiness) → the fake's `/__stub/agent/runs` record shows the image's sha256 and the notes; the stub's job `received` shows the prompt. (2) *A refusal*: `?agentScript=refusal` → Send → the alert with the fake's words → `/__stub/jobs` is empty → the bell shows one unread → the Inbox's Messages tab lists *The director declined* → opening it lands on the composer with the notes and the chip on → the row is read. (3) *Stop*: `?agentScript=slow` → Send → Stop within the 8 s → *Stopped* → no job, no Inbox row. (4) *Findings*: `?agentScript=warn` → the amber strip names the two findings → Send is enabled → 202 (review never blocks). The not-configured chip is proven at the component level only (the e2e server is configured for the fake; a second server is not worth a state a unit test shows) — said so. Regression cover for the unchanged halves: `composer.spec` (a plain prompt, one request, no chip on), `extend.spec` (the chip disabled), `scheduled.spec` (run-at and chains untouched), `shell.spec` (the Inbox's Updates rows).
- **Manual verification (the Spark, in the Done note with the date, the model id, the finish reason and the token counts):** one real run from the office photo through the deployed UI (Agent on, notes "keep the camera still"), the reply read against the skill's checklist, then Send → the job's draw (≈ 50 min GPU, the seed and job id recorded, held or not).

## Estimated Complexity

Large — a new composer state with a request lifecycle, a chip with a menu, the model pill's second form, two strips and a line, the Inbox's first Messages rows and their round trip, a settings key, at both widths and both themes with a four-case e2e: ≈ 3 h of build and gate (EPIC_009's table said 2 h; STORY_046 — smaller — took 2 h 15 min, so the table is corrected to 3 h with this draft), plus ≈ 50 min of GPU for the draw.

## Done note (2026-09-17)

**Built** (12:25 → 12:55 EDT): `lib/composer-state.ts` (`AgentState`, nine actions — skills, toggle, skill, start, reply, declined, failed, stopped, notes — `canSend`'s agent branch, the one-photo cap, the chip forced off by extend and by leaving video mode, `agentSkillLabel`, `skillClipSeconds`), `lib/submit-job.ts` › `submitAgentRun` (multipart, `?agentScript=` → `?script=`, an abort is "stopped"), `lib/spark-time.ts` (the README's three measured points, dated), `lib/inbox.ts` (`AgentRunEvent`, `eventsFor(entries, runs)`, the two kinds under Messages, the title cut at a word), `lib/history-store.ts` › `titleFor`'s base-format branch through `describedAction`, `lib/settings.ts` (`agentSkill`, `SETTING_TYPES`) and the PATCH route's per-key table, `lib/agent-config.ts` › `agentFlag` with `model: { id, label }` and `agentModelLabel`, `components/composer/AgentChip.tsx` (new file: the chip, its ⌄, the Skills menu), `ComposerMenus.tsx` › `AgentModelMenu`'s one-row form, `Composer.tsx` (the skills fetch, the run with its controller in a ref and aborted on unmount, Thinking… and Stop, the reply with the caret at the start, the findings strip, the alert, the hint, the ≈ line, the disabled states, `initialAgentRun`), `composer.module.css`, `Shell.tsx` (the runs loaded with the recents, the `minimax:agent-runs` reload, a run's row → `/?agentRun=` with the PATCH), `Sidebar.tsx` (the merge), `app/page.tsx` (`?agentRun=`), the runs route's DELETE, the store's `skillName`. Tests: `composer-state.test.ts` (+5), `spark-time.test.ts` (3), `inbox.test.ts` (+1), `history-store.test.ts` (+1), `agent-config.test.ts`, `AgentChip.test.tsx` (7 — the states, the menu and the setting, **a run inside `<StrictMode>` with fake timers making exactly one request**, findings, a refusal telling the Shell, an error, Stop with the signal aborted, the two disabled reasons, a reopened run and the ≈ line's rule), `capabilities.test.ts` (the model field), `agent.test.ts` (the DELETE), `e2e/agent.spec.ts` (4 cases at both widths: the reply reviewed then sent to a playable result with the fake's record of the two passes checked; a refusal with no job and one Messages row that reopens the composer with its `openedAt` stamped; Stop with the fake's `aborted` and no row; findings that never block).

**Gate.** Steps 1–4 by hand at 12:50 (unit incl. the seven new component cases, integration 46), the agent spec alone 8/8 at both widths, then the full build + e2e; the hook re-runs all six on the push.

**Departures from the reference** — as written above; the chip sits where the reference keeps its Agent Team switch (`home-signed-in@1440`), its size, radius, type and on-colour theirs; the status line, the strips, the ≈ line and the Messages rows are ours.

**Seen on the deployed app and fixed before the commit:** after the reply the box showed its last line — setting the value scrolls a textarea to its end and a caret at the start does not scroll it back; `scrollTop = 0` added.

**Verified live (2026-09-17 13:02 EDT, the app rebuilt from this tree, `openJobs: 0`, driven through the real UI by `app/e2e-trial/agent-chip.spec.ts` — not in the gate — with the screenshots in `spark/data/smoke/agent-chip-*`):** the deployed composer at 1440 — the chip off and muted; on, *Agent · Thirst trap* with the Skills menu listing the two folders and the pill reading *Gemini 3.8 Flash*; the office photo attached, "keep the camera still", Send → *Thinking…* and Stop → **the real director (`gemini-3.8-flash`, global) answered in 15 s, two passes, no findings** → the reply in the box with the chip off, the second reference tile back, the pill back to *MiniMax-M3*, the parameters at **10 s**, "≈ 50 min on the Spark" under Send → Send → **job `20ac5d43` accepted at +16 s** and running on the Spark (MiniMax-H3 `int8_convrot`, ComfyUI 0.35.1, adapter 1.5.0). The draw's outcome is the addendum below.
