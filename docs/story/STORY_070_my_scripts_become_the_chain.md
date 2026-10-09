# STORY_070 — My scripts become the chain

**Status:** Proposed (drafted 2026-10-09 11:40 EDT for [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md); supersedes [STORY_066](STORY_066_the_nsfw_director_skill.md) — the owner chose a converter that runs in the app over a skill run by hand; waits for the owner's go, after STORY_069)
**Epic:** [EPIC_011](../epic/EPIC_011_the_test_rounds_run_from_the_ui.md) — the fourth story, after [STORY_069](STORY_069_several_whole_videos_from_one_send.md)
**Estimate:** ≈ 3 h (`lib/script-convert.ts` with its rule table, the strip's Convert button, flags and change list, the skill folder that documents the rules; a unit-heavy lane, one e2e; two hand gates) · **Estimated completion:** the afternoon of the day it is started

As the owner, I want to paste my scene paragraph and three bracketed scripts, press **Convert**, and get the chain in the model's format the way the test rounds' prompts were written — the paragraph about the photo, each script's three beats as prose, a held state at the end of each segment, a "holds where he stopped" opener on segments 2 and 3, my sound line as the soundscape — with every rule the rounds taught us checked, and every change the converter makes listed for my OK, so that a round starts from the UI with prompts the chat would have written.

## Current state (read from the code, 2026-10-09 10:50 EDT)

- **The composer already recognises my scripts.** `lib/chain.ts` › `splitChain` cuts the text at every line beginning `[0:00-` and keeps the text before the first as the *scene*, prefixed to every segment (`Composer.tsx:378`, `segmentPrompt`); `format: "scripts"` names this shape. The chain strip (STORY_044) shows the segments and Send all posts them. **The adapter then wraps each plain segment** in the model's format (`spark/adapter/src/prompt.ts`, STORY_020: the instruction line, the marker, the brackets turned into time words) and **passes a prompt that already begins with the format unchanged** (`prompt.ts:15, 70`, STORY_053).
- **What the rounds sent instead** (every prompt since 2026-09-24 was written by hand in the chat, e.g. `test/26-10-09-1600-home/prompts/S1–S3.txt`): segment 1 = the instruction line, then one paragraph of a style sentence, the static-camera sentence naming `<Picture 1>` and a *ten-second* duration, the scene paragraph (appearance, clothing state, set, light, framing — nothing that changes), then the three beats as *In the first seconds … Through the middle of the clip … In the final seconds …*, ending *he holds there, <the last beat's state>, as the clip ends*; then `overall_soundscape:` from my sound line and `non_diegetic_music: None.` Segments 2 and 3 = no instruction line, a *twelve-second* duration, "already in frame at the start", and the opener *For the first moment <the subject> holds where he stopped, <the previous held state>, then moves.* The format checker (`lib/prompt-format.ts` › `checkPromptFormat`, 350–600 words per description) is what the chain director's output must pass; the rounds' prompts pass it.
- **The rules** are memory files today, learned one round at a time: `no-changes-in-script-2` (a prop, clothing or pose that changes in script 2 snaps back at ~20.5 s because the middle segment ends on its first frame, STORY_061), `towel-gone-after-script-1` (a prop the model fumbles is dropped in script 1 and never named again), `back-scripts-shallow-bends-only` (back scripts keep their bends shallow for now), `no-genital-wording-of-mine` (the converter adds no anatomy wording; the owner's words only), `anchor-holds-only-what-never-changes`, `studio-sound-is-only-his-movements` (the studio sentence when the owner wants it; lately he kept his own sound lines). Each has its verbs and nouns written in the memory; the converter's rule table carries them, this ticket does not repeat them.
- **The skills** are folders under `agents/skills/` (`SKILL.md` + `references/`), listed on the Skills page (`lib/agent-skills.ts`), baked into the app image (`app/Dockerfile:29–31`). STORY_066 drafted a third folder for a manual adult director; it is superseded here.

## UI Mockup

**Reference capture:** none — the reference has no scripts-to-prompt step; this is ours ([§6 rule 8](../../CLAUDE.md), reasoned below). The strip follows STORY_044's chain strip (`docs/recon/2026-09-14/`); the flags use the moderated badge's warning tokens (STORY_014).

```
The chain strip with my scripts pasted (before Convert)
┌ 3 scripts · 10 s + 10 s + 10 s = 31.4 s                           [Convert] ┐
│ [scene] 148 words   [01] script 1   [02] script 2   [03] script 3           │
└────────────────────────────────────────────────────────────────────────────┘

After Convert — the text is now the full-format chain; the strip lists what changed
┌ 3 segments · 10 s + 10 s + 10 s = 31.4 s · converted            [Undo]      ┐
│ [01] 412 words   [02] 438 words   [03] 431 words                             │
│ Changes (3) — tick the ones you accept, or edit the text                     │
│  ✓ Sound: your line kept; "No voices, speech, …" expanded to the full list   │
│  ✓ Framing: "his whole body from head to feet inside the frame" dropped —    │
│    the paragraph's framing rules                                             │
│  ⚠ Script 2 changes state: "pulls off his sunglasses" — the middle segment   │
│    ends on its first frame, so this snaps back at ~20 s. Move it to script 1 │
│    or 3 (rule: no changes in script 2)                                       │
└────────────────────────────────────────────────────────────────────────────┘

No scene paragraph pasted
┌ 3 scripts · … · Convert needs a paragraph describing the photo before the   ┐
│   first script (appearance, clothing, set, light, framing — nothing that    │
│   changes). Paste one, or let the director draft it (STORY_071).            │
```

Narrow (iPhone 13): the change list is a full-width block under the strip; each flag ≥ 44 px; the text itself is edited in the composer as today.

Dark mode: the warning tone from the theme's tokens, never a hard-coded colour.

## Acceptance Criteria

- [ ] **Convert exists only for my shape.** The strip shows **Convert** when `splitChain(text).format === "scripts"` and the scripts number 2 or more (one script is a single clip — not converted); it is absent for a full-format chain and for a plain prompt. Nothing else about Send all changes: a text I never convert goes out as today through the adapter's wrapper (asserted by the existing `composer.spec.ts` Send all case).
- [ ] **The conversion is a pure function**, `lib/script-convert.ts` › `convertScripts(text, options)` → `{ text, segments, changes, flags }`: segment 1 gets the instruction line (`I2VA_INSTRUCTION`), the marker, a style sentence, the static-camera sentence with `<Picture 1>` and *ten-second*, the scene paragraph, the three beats as prose (each bracket stripped, its text kept **verbatim** apart from the leading pronoun becoming the subject phrase the scene paragraph names, the three beats introduced by *In the first seconds*, *Through the middle of the clip*, *In the final seconds*), a held-state clause built from the last beat's final clause, the soundscape field from the script's sound line (its negative list expanded to the full one the rounds used), `non_diegetic_music: None.`; segments 2 … N get no instruction line, *twelve-second*, "already in frame at the start", and the opener *For the first moment <subject> holds where he stopped, <previous held state>, then moves.* Every converted segment passes `checkPromptFormat` with `chain: true` (the word counts are a finding, as for the director's reply, never a refusal).
- [ ] **Nothing is lost.** Any line of a script the converter cannot place (a fourth beat, a line without a bracket, a camera line it does not recognise) is kept verbatim at the end of that segment's description and flagged *kept as written: …*; the owner's words are never dropped silently.
- [ ] **The rules run as checks**, each a row in a rule table (`RULES` in `script-convert.ts`: id, the memory file it comes from, the pattern, the message, the fix if the converter can make one): (1) a change of state in script 2 — a prop set down or picked up, clothing removed or pulled, the last beat's hands/pose unlike the first's — → a **warning** naming the beat and the rule, no automatic fix; (2) a prop dropped in script 1 and named in a later script → a warning; (3) a back script whose beat matches the shallow-bend rule's list → a warning; (4) the framing line *his whole body from head to feet inside the frame* → dropped and listed as a change (the paragraph's framing rules); (5) the sound line → kept and listed; with the *studio sound* option on, replaced by the studio sentence and listed; (6) the converter adds no anatomy wording of its own — asserted by a test that diffs the converted text's vocabulary against the input plus the converter's fixed phrases. The patterns and word lists live in the rule table and its tests, not in this ticket.
- [ ] **The change list is the owner's OK.** Every change (a drop, a replacement, an expansion) and every flag is listed on the strip; **Undo** restores the pasted text (kept in component state until the next Convert); the converted text is editable in the composer as any text; Send all sends what is in the composer.
- [ ] **The scene paragraph is required.** With no text before the first `[0:00-` line, Convert is disabled with the sentence in the mockup (and the pointer to STORY_071 once it exists); the paragraph is passed through verbatim — the converter does not write about the photo.
- [ ] **The skill folder `agents/skills/minimax-h3-script-converter/`** documents the same rules for a reader (`SKILL.md`: the shape of the input, the output per segment, the rule table in prose with the memory file each came from, the *anchor* instruction STORY_071 will send to the director — what the paragraph holds and what it never holds; `references/base-en.md` as the other skills'), validated with `agentskills validate` as CHORE_012 was; its `metadata` says `minimax-run-by: app` and `minimax-short-name: Script converter`; the Skills page lists it with that word in its meta line (`skillMetaLine` gains the key); the Agent chip's menu does not offer it (it is not a director; the chip lists folders whose `minimax-run-by` is absent or `cloud`).
- [ ] **A manual verification in the Done note:** the owner's scene paragraph and three scripts from one real round (not committed) converted in the UI; the converted segments diffed against the hand-written prompts of that round (`test/<round>/prompts/`) — the differences listed (the held-state clauses and openers are the expected ones); the chain sent on the uncensored model (STORY_065) with Draws ×1 and the whole video's job ids and minutes recorded.

## Departures from the reference

- The reference has no scripts, no chain and no converter; ours exists because the owner writes bracketed scripts and the rounds proved the format the model wants. The rules are the owner's decisions of 2026-10-03 to 10-09, written down one round at a time.

## Technical Notes

- **The converter is deterministic and client-side** (`lib/script-convert.ts`, pure, imported by the strip); the model step (the paragraph from the photo, the held states written more precisely, flagged beats rewritten) is STORY_071's and goes through the server route. Without it, the held-state clause is mechanical — the last beat's final clause after its last comma, or *exactly as the last beat leaves him* when the beat has no comma — honest and editable; STORY_071 replaces it with a written one when the owner asks the director.
- **The subject phrase** comes from the scene paragraph's first noun phrase ("A young man in his mid-twenties …" → *the young man*; the paragraph's clothing clause, when present, becomes *the young man in the <clothing>*), the pattern the rounds used; a paragraph the converter cannot read gives *he* and a flag.
- **Beats stay the owner's words.** The converter only strips the bracket, swaps the leading pronoun, joins the sentence into the paragraph and adds the three time phrases; no synonym, no addition. A rule's "fix" is a listed replacement the owner ticks, never silent.
- **The rule table is the one place the rules live in code**, keyed by the memory file's name so a changed rule is one row and one memory edit the same session (EPIC_011 › Rules).
- **The chain strip** already knows the segments (STORY_044) and the draws line (STORY_069); Convert, Undo and the change list are one component, `components/composer/ConvertPanel.tsx`.
- Not in this story: the director's paragraph (071); a per-script preview video; the rating page.

## Testing Plan

- **Unit (`app/lib/script-convert.test.ts`, new):** the fixtures are SFW stand-ins in the shape of the owner's scripts (a man in swim briefs at a boat's rail, three beats each, the camera lines, a sound line — nothing from a round is committed): (1) the three segments' structure — the instruction line only on segment 1, the durations, the openers on 2 and 3, the held-state clause, the soundscape and music fields; (2) every beat's words present verbatim in its segment (a diff test); (3) `checkPromptFormat(…, { chain: true })` passes on the output; (4) each rule fires on a fixture written to trip it and stays silent on one that does not — the state-change rule on a script 2 that removes an item and on one whose last beat's hands differ from its first beat's; the prop rule on a prop named after script 1; the shallow-bend rule on its list; the framing drop; the sound expansion and the studio option; (5) the vocabulary test: the output's words ⊆ input words ∪ the converter's fixed phrases; (6) nothing lost: an unplaceable line is kept and flagged; (7) no scene → `{ error: "scene" }`; one script → not a chain. **`agent-skills.test.ts`**: the new `minimax-run-by: app` key in the meta line; the chip's filter.
- **Component (jsdom, StrictMode) — `ConvertPanel.test.tsx`:** Convert present for scripts and absent for a full chain; Convert → the composer's text replaced, the change list rendered with its flags, Undo restores; the disabled state without a scene.
- **Integration:** none new — the route is unchanged (the converted text is a full-format chain the jobs route already accepts; STORY_044/053's tests cover it).
- **E2E (`app/e2e/composer.spec.ts`, extended; both widths):** paste the fixture scene and three scripts → the strip shows Convert and *3 scripts* → Convert → the strip shows *converted* and the change list with its flag → Send all against the stub with `done-after-1-poll` → the stub's three received requests each begin with the format (`integrated_multimodal_description:` present, the first with the instruction line) and the last carries `endAnchor: "none"`; every job terminal before the spec returns. **Unchanged halves:** `composer.spec.ts`'s existing Send all of raw scripts (no Convert) stays green; `agent.spec.ts`'s chain director flow stays green; `skills.spec.ts` lists three folders.
- **Manual verification** (not a gate): the Done note's row above.

## Estimated Complexity

Medium-to-Large — the converter is ~200 lines of string work with a rule table, and its unit lane is where the time goes; the UI is one panel on an existing strip.

## Open questions (for the owner, by the multiple-choice tool, before implementation)

1. **Flags block or warn?** Recommended: warn — Send all stays enabled with a flag showing (the owner decides; the rounds sometimes kept a flagged beat deliberately, 2026-10-05). Alternative: a flag disables Send all until ticked.
2. **The studio sound option's default**: off (keep my sound lines — the pavilion, boat and home rounds) or on (the studio sentence — the dark rounds)? Recommended: off, remembered in the shell prefs.
