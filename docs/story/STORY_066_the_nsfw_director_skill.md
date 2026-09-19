# STORY_066 — The NSFW director skill

**Status:** Proposed (drafted 2026-09-19 16:30 EDT from [SPIKE_001](../spike/SPIKE_001_the_nsfw_model_spike.md) › Technical Notes › The director and the owner's answer "why can't you use our current skills instead?"; the genre answered 16:50 — *uncensored* / *Uncensored*; waits for the owner's go)
**Epic:** [EPIC_010](../epic/EPIC_010_an_nsfw_model_in_its_own_container.md) — the fourth story, after [STORY_065](STORY_065_the_uncensored_model_in_the_composer.md)
**Estimate:** ≈ 1 h 30 min (the skill folder validated, one metadata key and its meta-line word, the run route's refusal, the chip's greyed entry; unit, component, e2e; two hand gates) · **Estimated completion:** the evening of the day it is started

As the owner, I want a director skill of our own for adult clips — the thirst-trap director's rules with the genre swapped, written so that the assistant runs it on my photo and I paste the prompt — listed on the Skills page like the others and marked as one the cloud director will not run, so that the prompt for an uncensored draw comes from the same place every other prompt does, and nothing adult ever goes to Vertex.

## Current state (read from the code, 2026-09-19 13:20–16:00 EDT)

- **The skills are folders**: `agents/skills/minimax-h3-director-thirst-trap/` and `…-thirst-trap-chain/` (CHORE_012, STORY_053), each `SKILL.md` with frontmatter (`name`, `description`, `compatibility`, `metadata` with `minimax-short-name`, `minimax-clip-seconds`, `minimax-model`, `minimax-checkpoint`, `minimax-text-encoder`, `minimax-comfyui`, `minimax-adapter`, `minimax-verified-on`, `minimax-source-guide`) and `references/` (the base guide, the I2VA example, the anchor example). The thirst-trap skill's `compatibility` says it is "portable to any agent that can read local files and view the attached image; no tools, network access or runtime required", and the assistant ran it by hand in the cove and office rounds (STORY_048 › Current state) — which is how SPIKE_001's prompts are written.
- **The Skills page lists every folder** (`GET /api/agent/skills`, `lib/agent-config.ts` → `SKILLS_DIR`; `pages/SkillsPage.tsx` › Director skills, `pages/DirectorSkills.tsx`) with `skillMetaLine(metadata)` (`lib/agent-skills.ts:17`: model · checkpoint · ComfyUI · adapter · verified, a missing key skipped) and a search across name, short name and description.
- **The Agent chip's menu** (STORY_050, `composer/AgentChip.tsx`) lists the same folders and marks the chosen one; a run goes to `lib/agent-service.ts` → Vertex, which answers a prompt, a refusal (verbatim) or an error (`not_configured`, `unknown_skill`, `unreachable`, `quota`, `bad_reply`, `timeout`, `upstream`).
- **The genre's Task paragraph** is the one part of the skill that says what the clip is for (`SKILL.md` › Task, "The video should leverage the thirst-trap elements already present in the frame while disguising them within a believable, candid real-world action…"); every other rule (the frame inventory, 400–600 words, single-shot / object / persistence rules, HOOK → SETUP → CLIMAX → HOLD, the soundscape, the checklist) is genre-free.

## UI Mockup

**Reference capture:** the Skills page and the chip's menu are STORY_054/059's surfaces (`docs/recon/2026-09-15/behaviour-manage-tabs-03-tab-skills`); this story adds one word to a meta line and one greyed state to a menu entry.

```
Skills › Director skills (after)
   ▣ Thirst trap        MiniMax-H3 (open weights…) · minimax_h3_fl2va_int8_convrot · ComfyUI 0.35.1 · adapter 1.5.0 · verified 2026-09-16
   ▣ Chain director     …
   ▣ Uncensored            MiniMax-H3 (uncensored) · minimax_h3_fl2va_int8_convrot + <the LoRA chain> · ComfyUI 0.35.1 · adapter 1.7.0 · manual · verified <date>
                        Written for the assistant: run it on the photo in a session and paste the prompt; the cloud director will not run it.

The Agent chip's menu (after)
   Skills
   ● Thirst trap
     Chain director
     Uncensored                    (greyed)  manual — run by the assistant, not the cloud
```

Narrow: unchanged layouts (the meta line wraps as today; the greyed entry keeps its 44-px target and its title).

## Acceptance Criteria

- [ ] **The folder `agents/skills/minimax-h3-director-uncensored/`** (the owner's word, 16:50 — Open questions 1) with `SKILL.md` and `references/` (`base-en.md`, the I2VA example, the anchor example — the thirst-trap skill's, unchanged), validated with `agentskills validate` as CHORE_012 and STORY_053 were. Its `SKILL.md` keeps **every rule of the thirst-trap skill verbatim** (the Workflow, Role, Length, the MiniMax-vs-Veo section, the Behavioural and Structural rules, Input, Output, the Checklist, Known behaviour) and replaces **only the Task paragraph** with this genre's: the clip shows the subject fully unclothed, one continuous candid action, the male anatomy described in plain anatomical words and kept in frame through the beats, no second person unless the notes ask for one, the closing beat a held state inside the frame; a **Solo** variant of the Task for the motion brief (SPIKE_001's P2) in the same paragraph. The `description` says what it directs in one sentence.
- [ ] **Its `metadata`** carries `minimax-run-by: assistant` (new key), `minimax-model: MiniMax-H3 (uncensored)`, `minimax-checkpoint` and a new `minimax-loras` listing the chain STORY_064's template carries (name @ strength, comma-separated), `minimax-adapter: 1.7.0` (STORY_064's adapter; STORY_061 shipped 1.6.0), `minimax-verified-on` the date of the manual verification below; the other keys as the thirst-trap skill's.
- [ ] **The Skills page shows it** as any folder, with the word **manual** in the meta line (from `minimax-run-by: assistant`; `skillMetaLine` gains the key with the label *manual* when the value is `assistant`, nothing otherwise) and the second line *Written for the assistant: run it on the photo in a session and paste the prompt; the cloud director will not run it.* under its description; the search finds it by name and short name.
- [ ] **The Agent chip's menu greys it** (`aria-disabled`, the title *manual — run by the assistant, not the cloud*); choosing it is impossible; if a stored preference names it (a folder renamed under a user's feet), the chip falls back to the first runnable skill and says so once.
- [ ] **The run route refuses it**: `POST /api/agent/runs` with this skill answers `400 { code: "manual_skill", message: "<short name> is written for the assistant, not the cloud director — run it in a session and paste the prompt" }` before assembling anything — **no request reaches Vertex** (the fake Vertex's `/__stub/agent/runs` records nothing); `agent-service.ts` gains the `manual_skill` error code.
- [ ] **A manual verification in the Done note:** the assistant runs the skill on the photo the owner names (a consenting adult, SPIKE_001 › Decisions 4) for one at-rest clip; the prompt (not committed) is sent through the UI with the uncensored model (STORY_065) on the NSFW container (STORY_063/064); the job id, seed, minutes, the LoRA lines in the ComfyUI log, and the owner's judgement on the four questions SPIKE_001 uses; the skill's `minimax-verified-on` set to that date. The word counts of the description field for the two briefs (400–600) recorded.

## Departures from the reference

- The reference's agent runs every skill in its cloud; ours marks one skill as manual because the cloud director would refuse it and the owner will not send adult prompts or photos to Google. The wording on the page and in the menu is ours.

## Technical Notes

- **One key decides everything:** `minimax-run-by: assistant` in the frontmatter is read by `lib/agent-skills.ts` (the meta line), `AgentChip.tsx` (the greyed entry) and `agent-service.ts` (the refusal) — three call sites, one predicate `isManualSkill(skill)` in `lib/agent-skills.ts`. A skill without the key is runnable, as today.
- **The Task paragraph is the only prose that differs**; the story's diff between the two `SKILL.md` files should show the frontmatter, the title and the Task, nothing else — a review comment otherwise (the rules are the rules; a drift here is STORY_053's lesson).
- **The chain variant** (an `uncensored-chain` sibling of `…-thirst-trap-chain`) is not in this story; if the owner wants 30 s adult chains it is a story of its own, small, after this one.
- **The assistant's run** is the same as the spike's: read the skill, view the photo, write the prompt per the Output section, count the words, paste. Nothing in the app changes for that path; the skill is a document.
- Not in this story: a local model to run the skill in the product (BACKLOG_006 deferred); the §V.5 safeguards.

## Testing Plan

- **Unit (app):** `agent-skills.test.ts` — `isManualSkill`, `skillMetaLine` with the key (*manual*) and without; `agent-service.test.ts` — a manual skill → `manual_skill` before `assembleRequest` is called (a spy on the fake Vertex client shows no call); `skills.test.ts` — the listing carries the key.
- **Component (jsdom, StrictMode):** `SkillsPage.test.tsx` — the row with *manual* and the second line; the search finds it; `AgentChip.test.tsx` — the greyed entry with the title, a click that does nothing, the fallback when the stored preference names it.
- **Integration (`app/test/integration/agent.test.ts`):** `POST /api/agent/runs` with the manual skill → 400 `manual_skill` and the fake Vertex's `/__stub/agent/runs` empty; with the thirst-trap skill → today's path (unchanged).
- **E2E (`app/e2e/skills.spec.ts`, `agent.spec.ts`; both widths):** the Skills page lists three director skills, the new one with *manual* in its meta line and the second line; the Agent chip's menu shows it greyed with the title and the choice stays on the first skill; the existing agent run case (the fake Vertex answering a prompt) stays green as the unchanged half.
- **Manual verification** (not a gate): the Done note's row above — the assistant's run, the draw, the owner's judgement.

## Estimated Complexity

Small — a folder, one metadata key read in three places, one error code; the care is in keeping the skill's rules verbatim and in the manual verification on the box.

## Open questions (for the owner, by the multiple-choice tool, before implementation)

1. **The genre's name** (the folder is `minimax-h3-director-uncensored`, the short name is what the page and the menu show): *nude* / *adult* / *uncensored* / his own word? Recommended: *nude* for the folder and *Nude* as the short name — it names the content, not the model. **Answered 2026-09-19 16:50 (by the tool): *uncensored*, shown as *Uncensored* — the folder is `minimax-h3-director-uncensored`; every `<genre>` below reads so.**
2. **The chain variant** now or later? Recommended: later, its own small story once the single-clip skill has drawn once.
