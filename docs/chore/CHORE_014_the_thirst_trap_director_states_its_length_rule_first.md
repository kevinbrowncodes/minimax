# CHORE_014 — The thirst-trap director states its length rule first

**Status:** Done (2026-09-17 10:35 EDT) — filed from [STORY_048](../story/STORY_048_the_gemini_spike.md), which found every Gemini reply under the skill's word range
**Created:** 2026-09-17

## Summary

`agents/skills/minimax-h3-director-thirst-trap/SKILL.md` v1.0 → v1.1: a **Length** section right after the Task ("400–600 words. Not fewer." — count before output, expand the anchor first, then the beats), the range said the same way in rule 1, the Output and the Checklist, and two metadata keys STORY_050 reads: `minimax-short-name: Thirst trap` (the chip's label) and `minimax-clip-seconds: "10"` (the Duration the reply sets).

## Why

- The spike's first six replies on `gemini-3.8-flash` were 184–246 words in the description against the skill's 350–600, with thin scene anchors (≈ 90 words against 150–250) — the thing STORY_020 measured as what lets the set drift. The assistant, following the same skill, wrote 400–600; the model needed the rule where it reads first.
- The two keys let the app label the chip and set the clip length from the skill instead of hard-coding them.

## Changes

- [x] The Length section; rule 1, the Output line and the Checklist item say 400–600 (counted); one blank line between the fields.
- [x] `metadata.version` 1.1; `minimax-short-name`; `minimax-clip-seconds`.
- [x] Validated from a container as CHORE_012 did (`python:3.12-slim`, `skills-ref` 0.1.1): `Valid skill`; `read-properties` shows the twelve metadata keys.

## Testing

- **Unit:** `app/lib/agent-request.test.ts` reads the committed folder and asserts the two new keys and the version's shape. **Integration / e2e: not applicable** — a prompt-writing skill has no route or UI; the gate runs on push.
- **The check that mattered:** three re-runs on v1.1 (STORY_048 runs 9–11) — 226–251 words. **The rule did not move the model**: Gemini 3.8 Flash writes ≈ 250-word descriptions however the length is asked for (a demand in the user turn: 279–282). What did work is a second pass asking it to expand its own draft (491 and 418 words), which STORY_049 adopts. The v1.1 wording stays: it is right for a reader that follows it (the assistant does), the richer anchor (≈ 140 words, up from ≈ 90) is worth keeping, and the two keys are needed.
