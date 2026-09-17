# STORY_053 — The chain director writes a whole video, and Send all sends its segments unchanged

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the seventh story. After [STORY_052](STORY_052_agent_instructions_saved_scenes_characters_and_house_rules_the_director_follows_on_every_run.md) (a saved scene is the anchor this director keeps); extends [STORY_044](STORY_044_one_starting_frame_and_any_number_of_scripts_go_out_in_one_send.md) (Send all)
**Status:** Proposed (2026-09-17 03:20 EDT — drafted with 048–055 at the owner's request; from EPIC_009 as revised in aa7092d — a full-format chain reply has no scene block, segment 1 opens with the instruction line, segments 2..N at the marker with no Picture, written for the extension's real 12.25 s, a title rule for full-format rows — and the owner's rule of 2026-09-16 (every segment clean before the first POST; one refusal aborts the whole Send all); nothing built)
**Created:** 2026-09-17

As the owner, I want a second director that writes a whole video from one photo — one continuous story in several ten-second segments, each in the model's full format so the skill and not the adapter decides the camera — and I want Send all to queue those segments unchanged, and never to queue any of them unless every one came back clean; so that a thirty-second video is attach, Send, read, Send all.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **The split** (`lib/chain.ts` › `splitChain`): a segment starts at every line matching `/^\[0?0:00-/`; the text before the first is the scene and `segmentPrompt(scene, script)` sends scene + blank line + script for **every** segment; fewer than two starts → one request. A full-format prompt starts with the I2VA instruction line (`For the target video, …`), then the marker `integrated_multimodal_description:`; the splitter knows neither.
- **What the adapter does with each segment** (`spark/adapter/src/prompt.ts` › `buildPrompt`): a prompt that `isBaseFormatPrompt` — starts with the marker or an instruction line — passes through **unchanged**; otherwise the adapter wraps it (a static camera, an anchor sentence, the two sound fields) and, for a fresh clip with one image, prepends the I2VA instruction line; **an extension gets no instruction line** — its preserved head is not a Picture. So a full-format extension segment must start at the marker and must not mention `<Picture 1>`; a full-format first segment carries the instruction line itself.
- **What an extension really generates** (`lib/extend.ts`, mirrored from the adapter's grid): `extensionLength(10, 39)` = 294 frames = **12.25 s**, of which the first 39 frames (1.6 s) are the source's last frames — so a segment written "for ten seconds" that opens with a new action is wrong twice: the model has 12.25 s to fill, and its first 1.6 s are already the held state the previous segment ended in. Three 10 s segments join to 31.375 s (243 + 255 + 255 frames), which fits the 30 s source cap for the third segment (its source is 20.75 s); a fourth would not until STORY_045.
- **The strip and Send all** (STORY_044): `chainPlan` from the segments and the parameters; the rows' first words; `submitChain` posts in order, each `continueFrom` the previous id, and a refusal mid-way keeps the accepted segments. **The title** of a history row is `titleFor` — STORY_050 gave base-format prompts the *first sentence after the style and camera sentences* rule, which a full-format segment inherits.
- **The format check** (`lib/prompt-format.ts`, STORY_049) knows single-clip prompts; `chain: true` is reserved for this story. **Straight-through** (STORY_051) takes the review path for any text that splits, until here.
- **The skill format** (CHORE_012, `agentskills validate` from a container): a folder with `SKILL.md` and `references/`; `agents/skills/minimax-h3-director-thirst-trap/` is the one folder; STORY_049 lists every folder, STORY_050's menu shows them.

## UI Mockup

**Reference capture:** none — the reference has no chains; the strip is STORY_044's (its sketch, `composer-video-mode@1440` chrome, the continuation tile's type and colours). The chip and its menu are STORY_050's. What is new to see: the menu's second row, and a strip whose rows are full-format segments.

**The chip's menu with two skills:**

```
   ┌────────────────────────────────────────────────┐
   │ Skills                                         │
   │ ○ Thirst trap director                         │
   │   Directs one thirst-trap short from one…      │
   │ ● Chain director                             ✓ │
   │   Directs a whole thirst-trap video from one…  │
   │ ────────────────────────────────────────────── │
   │ ⚙ Manage skills                                │
   └────────────────────────────────────────────────┘
```

**A chain reply in review mode** — the box holds the three segments; the strip reads them; the rows are titled by the title rule; Send reads *Send all*; the line under it sums the segments:

```
│ [01.jpg ×]                                                                                    │
│ ● video-creator ×  ▏For the target video, at 0.00 seconds into the target video, <Picture 1>  │
│                     (from [Shot 1]) is fully referenced.                                      │
│                     integrated_multimodal_description: [Shot 1] Live-action, candid … In the  │
│                     first two seconds the man in the navy trunks …                            │
│                     integrated_multimodal_description: [Shot 1] Live-action, candid … From    │
│                     the held stance the man in the navy trunks …                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3 segments · 10 s each · ≈ 31.4 s in all · overlap 1.6 s                                      │
│  1   10 s   from the image   In the first two seconds the man in the navy trunks shifts…      │
│  2  +10 s   continues 1      From the held stance the man in the navy trunks turns his…       │
│  3  +10 s   continues 2      Still facing the lens, the man in the navy trunks lowers…        │
│ [◎ Agent] [◉ MiniMax-H3 ⌄] [16:9 │ 768P │ 10s] [Overlap 1.6 s ⌄]        MiniMax-M3 ⌄ [Send all] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                     ≈ 3 h 5 min on the Spark
```

**A chain reply with a finding in one segment** — the amber strip names the segment; in review mode Send all stays enabled (*Edit it, or send it as it is.*); in straight-through mode nothing was queued and the strip's first words are *Not sent —*:

```
│ ▲ Segment 2 misses the skill's format: the description is 296 words (350–600). Edit it, or   │
│   send it as it is.                                                                           │
```

**Straight-through, all clean** — no review state: *Thinking…* → the toast *Queued — 3 segments, ≈ 31.4 s* → the last segment's task page, exactly STORY_044's Send all. **A refusal** — STORY_050's alert; no segment exists. **Narrow** — STORY_044's strip at 390 (the words under the number); the menu title *Skills · Chain director*.

## Acceptance Criteria

- [ ] **The second skill**, `agents/skills/minimax-h3-director-thirst-trap-chain/` (`SKILL.md` + `references/` — the base guide and the I2VA example copied in, so the folder is self-contained as the spec asks; a `references/chain-example.md` of one verified three-segment chain in this format once the manual verification has produced one, else the anchor example), validated with `agentskills validate` from a container as CHORE_012 did, metadata as the first skill's plus `minimax-short-name: Chain director`, `minimax-clip-seconds: "10"`, `minimax-segments-default: "3"`. Its rules, in its own words: one continuous story from the photo, N segments (the notes may say how many; the default 3); **one scene anchor, written into every segment's description** — the set, the light, the framing, the person by appearance, **with no pose in it** (the pose changes; the anchor must not fight it); **segment 1** is the thirst-trap director's format exactly (the instruction line first, ten seconds, the hold at the end); **segments 2..N start at the marker** — no instruction line, no `<Picture 1>`, no reference to "the attached image" — and are written for **twelve seconds** whose **first one and a half seconds are the held state the previous segment ended in**, opening from that state without a reset, the camera declared again in the first sentences, the two sound fields on every segment, each ending in a held state; segments separated by one blank line; nothing before, between or after them but the prompts. The **user's notes** may name the count ("four segments"), the outfit outside the crop and a camera preference, as the first skill's do.
- [ ] **The split learns the format** (`lib/chain.ts` › `splitChain`): when the text has **no** `[0:00-` line and **two or more** marker lines (`integrated_multimodal_description:` at a line start), it is a full-format chain — a segment starts at each marker line, any text before the first marker (the instruction line) is **part of segment 1**, and the scene is `""`, so `segmentPrompt` sends every segment **unchanged**. A text with both conventions takes STORY_044's rule (the brackets win — said so, so the behaviour is decided, not accidental). One marker → one request, as today. `lastTimestampSeconds` is `undefined` for these segments, so the strip shows no *ends at* note.
- [ ] **The strip's rows** show each full-format segment's first action words through STORY_050's `describedAction` (the sentence after the style and camera sentences), and the history rows are titled the same way; the plan's arithmetic is unchanged (10 s each at the chosen overlap; the cap from the capabilities).
- [ ] **The format check on a chain** (`checkPromptFormat(text, { chain: true })`): segment 1 under the single-clip rules; segments 2..N under the extension rules — the marker first (`instruction-line-on-extension` if an instruction line or `<Picture 1>` appears: an extension has no picture), the three fields, `[Shot 1]`, 350–600 words, no line breaks in the description, no timestamps; every finding carries its `segment` number and its message starts *Segment N …*. The route runs the chain rules whenever the reply splits under the rule above.
- [ ] **All clean or nothing queued.** In **straight-through** mode (STORY_051's *Never*) a chain reply is posted through `submitChain` **only when every segment has no findings**; one finding on any segment → the review path with the amber strip starting *Not sent —* and **nothing posted**; a refusal → nothing (the alert, the Inbox row). In **review** mode the reply lands in the box with the strip, findings named per segment, and *Send all* is the owner's call as STORY_044 made it. `submitChain`'s own refusal-mid-way behaviour (an adapter 400 on segment 3 after two 202s) is unchanged and stays STORY_044's — the all-clean rule is about the model's reply, before the first POST.
- [ ] **The adapter is untouched**: segment 1 passes through with its instruction line; segments 2..N pass through without one (the adapter adds none to an extension), so the model sees exactly the skill's words. The e2e proves it on the stub's received prompts.
- [ ] **Both widths, both themes**; STORY_044's and STORY_050–052's specs stay green.

## Departures from the reference

- The chain, the strip and Send all are STORY_044's departures; the chain director is ours. The reference has one prompt per generation.
- The camera in a full-format chain is the skill's, not the adapter's: STORY_046's shot-change notice will report a move the skill asked for as *the framing moved … as the prompt asked* (it reads `result.camera` from the prompt) — expected, and the Done note shows one.

## Technical Notes

- `lib/chain.ts`: `FULL_FORMAT_START = /^integrated_multimodal_description:/`; `splitChain` tries the bracket rule first, then the marker rule; `ChainSplit` gains `format: "scripts" | "full"` so the strip and the check can say which. `segmentPrompt` is unchanged (`scene === ""` → the script alone).
- `lib/prompt-format.ts`: `checkPromptFormat` splits with `splitChain` when `chain` is true and applies `checkSegment(text, { extension: k > 0 })` per segment; the findings' `segment` is 1-based.
- `Composer.tsx` › the run's completion (STORY_051's decision function grows a case): `decide(setting, result, split)` → `"queue-chain"` when *Never*, the reply splits and every segment is clean; the queue path calls `submitChain(state, prompts, doFetch)` as `send()` does, with the toast and the navigation to the last id.
- The skill's text is drafted from the thirst-trap director's, with a **Chain rules** section replacing the single-clip framing and the `{{…}}` template repeated for an extension segment (no instruction line, "twelve-second", the opening-from-the-hold sentence). Its `description` says "chains of several scripts" so the first skill's "other genres and chains of several scripts are other directors" line stays true.
- The stub gains `chain` (`fixtures/agent/chain.txt`: segment 1 with the instruction line, segments 2 and 3 at the marker, each clean) and `chain-warn` (segment 2 cut to ≈ 300 words).

## Testing Plan

- **Unit (`pnpm test`)** — `chain.test.ts` (044's, extended): the marker rule on the stub's `chain.txt` (three segments, the first carrying the instruction line, scene `""`, `format: "full"`); on a single full prompt (one request); on a text with both conventions (the bracket rule wins); on the office prompt repeated three times with a blank line between (three segments); `segmentPrompt` sends a full segment unchanged. `prompt-format.test.ts` (049's, extended): a clean chain → no findings; segment 2 with an instruction line → `instruction-line-on-extension` on segment 2; segment 3 short → the finding on segment 3 with *Segment 3* in its message; a chain of scripts (brackets) → the single-clip `timestamps` finding is not raised for scripts (the check is only run on full-format replies — said so). `history-store.test.ts`: `titleFor` on segment 2 of `chain.txt`. `agent-decision.test.ts` (051's): the matrix gains the chain rows (never × all-clean → queue-chain; never × one finding → review; always × chain → review). `agent-request.test.ts`: `readSkill` on the second folder (its metadata keys).
- **Component (`Composer.test.tsx`)** — a chain reply renders the strip with three rows titled by the action sentence and *Send all*; a finding on segment 2 shows the amber strip naming it; with *Never* and all clean `submitChain` is called (three POSTs in order) with no review render; with *Never* and a finding nothing is posted and the strip reads *Not sent —*; the menu lists both skills and choosing the chain director PATCHes `agentSkill`.
- **Integration (`test/integration/agent.test.ts`, extended)** — `chain` → `kind: "prompt"` with `findings: []`; `chain-warn` → one finding with `segment: 2`; the skills list names both folders.
- **E2E (`e2e/agent.spec.ts`, extended, both widths)** — (9) *A chain reply reviewed and sent all*: `/?agentScript=chain&script=done-after-1-poll`, the chip on, the Chain director chosen in the menu, the photo attached, 10 s chosen → Send → the strip reads *3 segments · 10 s each* and the rows' action words → `waitForResponse` on the three `POST /api/jobs` 202s registered before the click → Send all → the toast → the last segment's page → each terminal waited on in turn (STORY_044's `scheduled.spec` pattern) → the stub's received prompts: job 1's starts with *For the target video* and has one upload, jobs 2 and 3 start with *integrated_multimodal_description:* and carry `continueFrom` in order → the last page plays. (10) *Straight-through, all clean*: *Never* set → Send → three 202s with no click → the toast → the last page. (11) *Straight-through, one bad segment*: `?agentScript=chain-warn` under *Never* → *Not sent — Segment 2 …* → `/__stub/jobs` is empty. Regression cover: `scheduled.spec`'s STORY_044 case (a scripts chain, the bracket rule), STORY_050–052's cases, `extend.spec`.
- **Manual verification (the Spark, in the Done note with the date, the model id, the token counts and the job ids):** the office photo through the chain director, the reply read against both rule sets, Send all, ≈ 50 + 67 + 67 min of GPU unattended; the three segments' seams measured as STORY_044 did (`spark/comfyui/seam-check.sh` and `border.sh`), the shot-change notice's voice on each page, the held-state opening of segments 2 and 3 judged on the frame strips; the chain-example reference written from it if it held.

## Estimated Complexity

Medium–Large — a second skill authored and validated (≈ 45 min), the splitter's second rule, the chain rules of the check, the decision's chain case, two fake scripts, three e2e cases (≈ 1 h 30 min): ≈ 2 h 15 min of build and gate (the epic's figure), plus ≈ 3 h of GPU overnight.
