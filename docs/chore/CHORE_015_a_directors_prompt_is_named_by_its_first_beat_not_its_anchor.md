# CHORE_015 — A director's prompt is named by its first beat, not its anchor

**Status:** Proposed (2026-09-17 19:55 EDT) — found by [STORY_053](../story/STORY_053_the_chain_director.md)'s first real chain reply on the deployed app
**Created:** 2026-09-17

## Summary

`lib/prompt-format.ts › describedAction` — the rule STORY_050 gave base-format prompts (the history title) and STORY_053 gave the strip's rows — takes *the first sentence after the style and camera sentences*. In the director skills' format that sentence is the **scene anchor's** first sentence, so the strip's three rows of the 2026-09-17 chain all read *A handsome young man in his early twenties with short cropped dark brown hair, neat dark eyebrows, and a clean-shaven jawline occupies the…*, and every Gemini-written clip in Recents is titled *A fit young man in his early twenties with short…*. The rows and titles should read the segment's **first beat** — the sentence that opens the action: *In the first two seconds, the young man in the white dress shirt holds his reclined position…*, *For the first moment the young man in the white dress shirt holds his braced posture leaning forward…* — which is what tells segment 2 from segment 3, and one clip from another.

## Why

- A chain's strip exists so the owner can read which beat each segment carries before Send all; three identical rows say nothing.
- Recents and the Scheduled page name a job by `titleFor`; with the same photo drawn several times (STORY_055's x1–x4) the anchor's opening is the same for all of them.
- The skills' own openers are fixed phrases (`In the first two seconds` for a clip's HOOK, `For the first moment` for a chain's FROM_THE_HOLD; `Through the middle` and `In the final seconds` follow), so the beat can be found without guessing.

## Changes

- [ ] `describedAction`: prefer the first sentence that starts with one of the skills' beat openers (`In the first`, `For the first moment`, `At the start`, `Through the middle`, `In the final`); fall back to today's rule (the first sentence after the style and camera sentences) when none is present — a pasted prompt in the format without those phrases keeps its title.
- [ ] `titleFor` (history) and `chainPlan`'s rows inherit it with no change of their own; STORY_050's and STORY_053's ACs say *the sentence after the style and camera sentences* — this chore refines that rule and is referenced from both stories' Done notes.
- [ ] The e2e assertions that read the title of a director's job (`agent.spec`, if any name it) updated; the trial log's row words become the beats.

## Testing

- **Unit (`prompt-format.test.ts`, `history-store.test.ts`, `chain.test.ts`)**: on the office reply the title is the HOOK sentence; on the stub's `chain.txt` segments 2 and 3 give their *For the first moment…* sentences; a full-format prompt with no opener keeps the old rule; a bracketed script keeps `firstTimestampedLine`.
- **Component (`ChainDirector.test.tsx`)**: the three rows differ and each starts with a beat opener.
- **Integration**: none — no route changes.
- **E2E**: the existing agent cases stay green (they assert what the rows do not contain); no new case — the row's words are a pure function covered at unit level.
