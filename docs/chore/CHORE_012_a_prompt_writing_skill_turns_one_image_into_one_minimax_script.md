# CHORE_012 — A prompt-writing skill turns one image into one MiniMax script

**Status:** Done (2026-09-16 04:48 EDT) — requested by the owner: "can you create the folder underneath agents/skills … include the version of the model as well … make sure our skills follow the agent skill specification"
**Created:** 2026-09-16

## Summary

Add `agents/skills/minimax-single-script/` — an [Agent Skills](https://agentskills.io/specification) skill that an LLM follows to turn one attached reference image (plus a line of notes) into one finished 10-second image-to-video prompt in MiniMax-H3's base format, ready to paste into the composer, where the adapter sends it unchanged. It is the owner's Google Veo prompt (ROLE / TASK / behavioural and structural rules / HOOK–SETUP–CLIMAX template) reworked for what this model needs, as learned on the Spark: the instruction line first, a `[Shot 1]` opening with style and camera in MiniMax's vocabulary, a full scene-anchor paragraph before any action, a prose timeline with no timestamps or labels, a held ending, the two sound fields, no negative lists, and the model, checkpoint and versions it was written against in the frontmatter's `metadata`.

## Why

- The owner has a working Veo skill and wants the same workflow for the local model; the cloud's rewriter (H3-Context-IR) is not in the open release, so the skill is what stands in for it.
- The adapter's own wrapper hard-codes a static camera; a prompt that already starts with MiniMax's instruction line passes through unchanged (STORY_020), so a skill that writes the full format can also write a camera move.
- Skills under `agents/skills/` in the spec's layout are portable to any agent that reads local files (the same layout MiniMax ships its own `h3-prompt-writing` skill in, saved at `docs/references/prompt-guides/h3-prompt-writing_SKILL.md`).

## Changes

- [x] `agents/skills/minimax-single-script/SKILL.md` — frontmatter per the spec (`name` = directory name; `description` says what and when; `compatibility`; `metadata` with the model, checkpoint, text encoder, ComfyUI and adapter versions and the date they were read from the running containers); body under 500 lines: workflow, how MiniMax differs from Veo, behavioural and structural rules, the output template with per-field guidance, a checklist.
- [x] `agents/skills/minimax-single-script/references/base-en.md` — MiniMax's base prompt-writing guide (T2VA / I2VA / FL2VA / L2VA), copied so the skill is self-contained one level deep as the spec asks.
- [x] `agents/skills/minimax-single-script/references/example-i2va.md` — the model card's image-to-video example prompt, the register to match.
- [x] `agents/skills/minimax-single-script/references/anchor-example.md` — a scene-anchor paragraph that held its set (`docs/scripts/scene.txt`, 2026-09-14/15), annotated.
- [x] README → Project Structure lists `agents/`; the prompt paragraph under Running the Model points at the skill.

## Testing

- **Unit / integration / e2e: not applicable** — the change is documentation and a prompt-writing skill; no runtime code, route, or UI changes, so no gate test can exercise it. The gate still runs on push and must stay green.
- **Check performed instead:** the skill directory is validated against the Agent Skills specification (the `skills-ref` reference validator where it can be run from a container; otherwise the frontmatter rules are checked by hand and listed in the Done note), and the metadata's model, checkpoint and versions are read from the running containers on the Spark the day the skill is written, not from the README.
- **Not a test:** whether prompts written with the skill hold a single shot on the model is a manual verification — the owner's next runs, recorded in the skill's `metadata.minimax-verified-on` when he updates it.

## Done note (2026-09-16 04:48 EDT)

- `agents/skills/minimax-single-script/` created: `SKILL.md` (116 lines) with `references/base-en.md`, `references/example-i2va.md` (the model card's 726-word I2VA prompt, decoded from the saved card) and `references/anchor-example.md`.
- **Validated with the reference validator, from a container** (`python:3.12-slim`, `pip install skills-ref` 0.1.1, CLI `agentskills validate`): `Valid skill: /work/skills/minimax-single-script`; `agentskills read-properties` returns the name, description, compatibility and the nine metadata keys.
- **The versions in `metadata` were read from the running containers that morning**, not from the README: ComfyUI `comfyui_version.py` → 0.35.1; `/comfy/models/diffusion_models` → `minimax_h3_fl2va_int8_convrot.safetensors`; `/comfy/models/text_encoders` → `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`; adapter `/health` → 1.4.0.
- README: `agents/` in Project Structure; the prompt paragraph under Running the Model points at the skill.
- Not done, by design: the skill has not yet written a prompt that was generated on the model; the owner's next run is the manual verification, and `minimax-verified-on` is his to update.
- **Renamed 04:53 EDT, before the first push had landed, at the owner's request:** `agents/skills/minimax-single-script/` → `agents/skills/minimax-h3-director-thirst-trap/` (`name: minimax-h3-director-thirst-trap`; the prose above keeps the original path). The genre suffix is the family pattern — `minimax-h3-director-<genre>` — so later directors sit beside this one; the description leads with the genre, since agents match on it. "Director" names the skill's judgment — the one action, the camera, the held ending — and leaves room for a chain skill beside it; MiniMax's own skill is already the "writer" (`h3-prompt-writing`).
- **Exercised on the model the same morning (09:05 EDT):** the skill's first prompt, written from a cove photo, generated four times — two seeds on the original frame, two on an edited frame with a rewritten anchor and middle beat — and all four came out as one shot with `cuts: []`, the set and light unchanged, the beats in the written order, the hold at the end (≈ 50 min per draw; the owner's `test/26-09-16-0500_cove/run.md`, not in git). `minimax-verified-on: 2026-09-16` in the skill's metadata stands.
