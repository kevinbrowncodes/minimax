# STORY_080 — Longer video context

**Status:** Implemented (2026-10-20) — manual verification (the rome context test) pending
**Epic:** none (a contract change on both sides; serves the rounds of EPIC_011)

As the owner, I want each extension shot to be drawn from the previous shot's last **3.75 seconds** instead of 1.6, so that it sees his whole last move and the hold after it, and stops inventing or dropping small details — freckles, chest hair, a bangle — when he moves.

## Current state (read 2026-10-20)

- The adapter accepts an overlap of **22, 39 or 56 frames** (0.9 / 1.6 / 2.3 s) and refuses anything else: `spark/adapter/src/grid.ts:11` (`OVERLAP_OPTIONS`), enforced at `spark/adapter/src/mapping.ts:131`. The default is 39 (`grid.ts:12`). The same table is mirrored in `tools/stub-generation-server/src/extension.ts:9` and `app/lib/extend.ts:10`, and published in `docs/contracts/job-api.md:94` (contract v1.5).
- The round runner (`tools/rounds/template/ext-standalone.sh`, `extend.py`) defaults to 39 and passes `--overlap` through to the adapter's `buildGraph`; a 72-frame request on 2026-10-20 was refused ("overlap 72 is not one of 22/39/56").
- The composer lists the options as buttons (`app/components/composer/Composer.tsx:523`, labels from `overlapSeconds`) with 1.6 s selected by default.
- The model's ceiling is 362 frames per generation (`grid.ts`, `MAX_FRAMES`); overlaps live on the 17k + 5 grid. At 90 frames a 10 s standalone shot is 90 + 255 = 345 frames, inside the ceiling.

**Why now:** the rome film lost a left-wrist bangle on screen about 1 s after the 20 s join and moved it to the other wrist in the next scene; the owner sees freckles and chest hair appear from nowhere in the same way. Community practice on LTX (H3's architecture) recommends at least 73 frames of context and says the model forgets what is outside its window ([Kijai](https://huggingface.co/Kijai/LTXV2_comfy/discussions/36), [RuneXX](https://huggingface.co/RuneXX/LTX-2.3-Workflows/discussions/131)); an H3 node pack offers 39/90/141/192 ([seitanism](https://github.com/seitanism/ComfyUI-H3-Motion-Context-MultiRef)). A beat is about 2 s, so 1.6 s shows the next shot only the closing hold; 3.75 s shows the last move as well.

## UI Mockup

No reference capture: the Overlap group is our own control (STORY_017), not a surface of agent.minimax.io.

```
Overlap (what the new clip starts from)
 ( 0.9 s )  ( 1.6 s )  ( 2.3 s )  [ 3.8 s ]      ← new option, selected by default
continuation tile:  "carries its last 3.8 s into the new clip"
```

The label is `overlapSeconds(90)` = "3.8" (one decimal, the existing formatter). Narrow layout: the group already wraps; a fourth button wraps the same way.

## Acceptance Criteria

- [x] **90 frames is a valid overlap everywhere:** `OVERLAP_OPTIONS` becomes `[22, 39, 56, 90]` in the adapter, the stub and the app mirror; a job with `overlapFrames: 90` is accepted by both servers and the adapter's graph carries 90 frames: 27 latent frames and 150 audio ticks by the existing `latentFrames` / `audioTicks` (the 22 → 39 → 56 rows step by 5 latent frames per 17; audio ticks are frames ÷ 24 × 40, rounded).
- [x] **90 is the default** (`DEFAULT_OVERLAP = 90`) in the adapter, the stub and the app; the composer selects 3.8 s by default; the round runner's `OVERLAP` defaults to 90.
- [x] **The longest step at 90 is what the model allows:** `maxAddedSeconds(90)` is computed by the existing `extensionLength` rule (no hand-written number), and a request beyond it is refused with `400 validation` as today.
- [x] **A short source still extends** (added during implementation, 2026-10-20 — the first draft did not read the servers' refusal of an overlap longer than the source): when the source is shorter than the overlap asked for, both servers carry the longest offered overlap that fits it and report it in `request.overlap`, refusing only when none fits. The stub's 2 s fixture is 56 frames, so every e2e extension depended on this; real takes start at 4 s (107 frames).
- [x] **The composer only sends an overlap the server offers:** when capabilities arrive, the composer's overlap is kept if offered, else the server's default (an older server without 90 gets 39, never a refused request).
- [x] **The contract says so:** `docs/contracts/job-api.md` moves to v1.6 with the new option and default, and states that the most an extension can add depends on the overlap.
- [x] **Nothing else changes:** the other three options, the join (overlap cut at the join, CHORE_006 cross-fade), the end-anchor option and fresh jobs are unchanged.

## Technical Notes

- Five constants and their tests: `spark/adapter/src/grid.ts`, `tools/stub-generation-server/src/extension.ts`, `app/lib/extend.ts`; the capability objects read them, so `capabilities.ts` and the stub's `server.ts` need no edit.
- Deploy is the adapter container only (`minimax-adapter`); ComfyUI and the model are untouched. Check `nvidia-smi` and the queue first (no take running).
- Cost (estimate from this round's timings, to be replaced by the first measured take): an extension shot ~30 → ~38 min; a 3-shot take ~82 → ~98 min; peak memory ~94 → ~99 GB of 128 (tight while the owner's Qwen containers are loaded).

## Testing Plan

- **Unit — adapter** (`spark/adapter/src/mapping.test.ts`): extend the arithmetic rows to 90 (latent frames, audio ticks, `maxAddedSeconds`, every step on the 17k + 5 grid via the existing loop over `OVERLAP_OPTIONS`); `buildGraph` with `overlapFrames: 90` cuts and protects 90 frames and joins from frame 90; `DEFAULT_OVERLAP` is 90. `capabilities.test.ts`: the published options and default.
- **Unit — stub and app mirrors** (`tools/stub-generation-server/src/extension.test.ts`, `app/lib/extend.test.ts`): the same table, so the composer never promises what the adapter refuses; `overlapSeconds(90)` is "3.8". `composer-state.test.ts` / `submit-job.test.ts`: the default sent is 90.
- **Integration — app** (`app/test/integration/jobs.test.ts`): the capabilities relayed with `[22, 39, 56, 90]` and default 90; a job with 90 accepted and echoed in `request.overlap`.
- **E2E** (`e2e/extend.spec.ts`): the existing extend scenarios with "3.8 s" checked by default and `received.request.overlapFrames === 90`; picking "1.6 s" still sends 39. Regression cover: `task.spec.ts`, `composer.spec.ts`, `assets.spec.ts` stay green.
- **Manual verification (not a gate):** the next round runs at 90. Record per take the extension minutes and peak memory, the join scores, and every accessory, freckle or chest-hair change at the joins and through each shot, against the 39-frame takes in `test/FINDINGS.md`. The Done note records model, checkpoint, seeds and date.

## Estimated Complexity

Small — five constants, their tests, one contract paragraph, one adapter redeploy; about an hour plus the gate.
