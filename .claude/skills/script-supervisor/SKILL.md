---
name: script-supervisor
description: Runs and watches a round of MiniMax H3 takes on the Spark the way a film set's script supervisor does — sets up the round folder, starts scene 1 first then alternates, checks every shot and join as it lands (black bars, jump cuts, the back scene's glimpse, props and accessories, the set moving), scraps bad takes to Outtakes (NG), posts good takes to the blind rating pages, seals a score and note for each, course-corrects a repeating fault, and writes the comparison when the owner has rated. Use whenever a round is started, running or reviewed: "get scene 1 going", "queue takes", "current status", "I've rated scene N", "pause", "stop", a new round folder under test/.
metadata:
  build: 2026-10-24-1345
  ticket: CHORE_055
---

# Script supervisor

On a film set the script supervisor watches every take, logs it good or NG, catches continuity breaks, and keeps the notes the director and editor work from. This skill is that job for the owner's rounds on the Spark. Scripts are written by `minimax-h3-i2v-amg-scene`; this skill runs them, watches them, and reports.

## Vocabulary

- **Round:** one film's folder, `test/<YY-MM-DD-HHMM-name>/`, with `01` (scene 1 keyframe) and `04` (scene 2 keyframe: almost always 01 with the subject naked).
- **Take:** one 3-shot generation of a scene. **Shot:** 10 s. **Join:** the seam at 10 s and 20 s.
- **NG:** a take scrapped before the owner rates it; it goes to the page's Outtakes, never the grid.
- **Labels:** K = scene 1 (front), B = scene 2 (back); a test variant gets its own letter.

## 1. Set up a round

1. Read the keyframes before anything else. Check the size (1376×768 class; crop a 16:9 image to 1.75 rather than squash). Save `keyframes/scene-1.png` (and `scene-2.png` when 04 arrives).
2. `tools/rounds/new-round.sh test/<round> <name> "<Title>"` — copies the runner (chain.sh with the join check, draw.sh, ext-standalone.sh, extend.py, graph.py, upload.sh, rotate.sh, cancel.sh, addcard.py, addouttake.py, strip.py) and the two rating pages from `tools/rounds/template/`. Fill the page's `__SUB__`/`__INTRO__`, publish both pages with capabilities `{db:{}, user:{}, assets:{}, downloads:true}`, and write the links to `ARTIFACTS.md`.
3. Scripts: write them with `minimax-h3-i2v-amg-scene` (it runs the variety review). Before any take, **check scene 2's script against 04 line by line** — the starting hands and feet, where he sits or stands, and that nothing is described that 04 does not show. Write the check as a table for the owner when anything differs.
4. Start with `setsid nohup ./rotate.sh &`. **Order (owner, 24 Oct 2026):** scene 1 only until it has **4 kept takes**; then scene 2 only (`s2-aligned.flag` + `s2-only.flag`) until it has 4 kept takes; only then autopilot (remove `s2-only.flag`), which alternates. Never alternate before both scenes reach 4. Default target: **4 kept takes per scene** (was 6). `touch STOP` ends after the take in progress.

## 2. Watch

- One Monitor on `run.log` for: a shot-1 `success`, `join … similarity`, `JOIN-JUMP`, `joined`, and every failure word (error, FAILED, Traceback, OOM, Killed). Re-arm it when it expires (30 min); never leave a round unwatched. A background `until` loop watches for a new keyframe file.
- Never `pgrep -f`/`pkill -f` a pattern that appears in your own command line; target pids or `kill -TERM -<pgid>`.
- Never touch the owner's qwen-* containers. Shots run ~22 min alone, ~45 min while Qwen is loaded — say why when they are slow.

## 3. Check every shot as it lands

| Check | How | Action |
|---|---|---|
| Black bars | `cropdetect` on the shot | any bars → NG |
| Join jump | chain.sh scores each join (SSIM, last frame vs 0.35 s in) and cancels below **0.45** (calibrated: every owner-called cut 0.18–0.41, every ship ≥ 0.48) | auto-cancel → NG card; I also look at both joins and through each shot, and scrap any jump the number missed |
| Anatomy (every nude shot: the swing, the squat, the grab, the front pinup) | full-size crop at 4 fps through each of those beats | judge anatomy alone, never erect vs flaccid: the head of the penis, the scrotum and the taint must look real, the glimpse must read circular, not a vertical slit. **Anything clearly unrealistic → NG to Outtakes** (owner, 26 Oct 2026: hunk scene 2 Takes 1, 2 and 6 stopped for this and I'd scored them 4–5); a faint crease alone is not NG |
| Accessories and continuity | zoom on every accessory (headband, each wrist, neck, waist, garment) at the start, at each join and at the end | **nothing may be lost or move** (owner, 20 Oct 2026): a lost or swapped item in shot 1 → cancel to NG; later → my score −3 and tell the owner which item and when; every anchor names each item with its side as staying on |
| Beats follow the script | 4 fps through each beat's seconds in `scenes/scene-N/shot-M.txt`: did every scripted beat visibly happen? | **a beat that doesn't draw → NG to Outtakes** (owner, 25 Oct 2026); the same miss 3 takes in a row → rewrite the beat (section 5) |
| Skin blemishes | crop the chest, abs and back at the start, each join and the end; zoom every keyframe at setup | **any new dark dot, mole or spot → NG to Outtakes** and tell the owner where and when (owner, 23 Oct 2026); a mark already in a keyframe is reported before the first take |
| Expression | crop his face at 2 fps through every shot as it lands (shot 1 first) | **creepy → cancel** (`cancel.sh <seed> "<why>"`) to NG with the seconds in the note (owner, 24 Oct 2026): a toothy grin or leer held into the lens for 3 s or more; a later shot that turns creepy is cancelled too (the take cannot ship). A wide-eyed or brows-up stare without the grin is **flagged, not cancelled** (take 2 below had it and the owner rated it 4); unclear → let it run and flag it on the card. The hunk round's takes 1 and 3 (owner 2, "awkward and creepy") held a wide-eyed grin into the lens ~6 s; take 2 (owner 4) had the same wide eyes but kept the mouth closed until ~6.5 s |
| Set moves with a prop | does the backdrop/wall shift when he touches the prop? | log it; it is a fault the owner docks |
| Framing | did the camera push in or pull back? did any part of him (face, head, feet in a full shot) leave the frame? | a face out of frame costs the most points; a written pull-back (allowed only to keep him in frame) is tracked per round, and if more than half the round's takes are scrapped at a join because of it, the round goes back to a locked camera |

An NG card is the shots drawn so far, uploaded as an asset and added with `addouttake.py page-2/index.html "NG n" <blob> <seed> "<why with the score>"`, then the page republished.

**Open test — a longer hand-over (owner, 19 Oct 2026):** the next round that needs a framing change in shot 1 (a pull-back, a stand-and-step) runs 3 takes with `OVERLAP=56` (2.3 s; the adapter accepts only 22, 39 or 56 — 72 was refused on 20 Oct 2026) against its normal takes (39, 1.6 s); compare their join scores and the owner's ratings, write the result to `test/FINDINGS.md`, and make 56 the default only if it holds more joins at the same quality and time.

## 4. Post and score each finished take

1. Upload the joined video as an asset to its page, `addcard.py page-N/index.html "Take n" <blob>`, republish.
2. Build a 1 fps sheet (8×4) and look at it; zoom where needed.
3. **Seal** a score and a note in `assistant-ratings.csv` before seeing the owner's. Score what members notice: anatomy (a wrong mark, a dot, a closed or missing hole caps at 2), his face (a creepy stare, grin or leer caps at 2; a calm face with the look landing at the end is the target), jump cuts (a cut), black bars, frozen holds, heavy breathing. A lost accessory or a slightly wide frame is minor. A smooth camera move is not a fault. A face that leaves the frame risks face drift (the owner scored two such takes 2, 20 Oct 2026): score it as a likely fault, not minor framing.
4. One short message: what landed, what to look at, the count toward the target.

## 5. Course-correct (autopilot)

When the **same issue shows up 3 takes in a row** (a creepy face: **2** in a row, because each one costs a take; look first at the expression words and how long the script holds his eyes on the lens), stop patching and **work out the best way to resolve it** before changing anything (owner, 19 Oct 2026):

1. **Find the cause, not the symptom.** Read `test/FINDINGS.md` and the memory for the same fault in earlier rounds; compare this round with one where the same thing worked (the scripts side by side, the graphs, the keyframe); measure it where a number exists (join similarity, crop detect, frame timing). The rome jumps looked like a script problem and were a framing change inside shot 1 — found only by measuring every round's joins.
2. **Weigh the fixes.** List the options (rewrite the beat, move it to another shot, change the keyframe, a runner setting, a skill rule), what each costs in takes, and what the evidence says for each.
3. **Test before committing to one** when the cause is unclear: a small A/B (2–3 takes) of the likeliest fix against the current script.
4. **Apply the best fix:** a beat rewrite within the skill's rules I make myself — keep the old version in a dated folder, log it in `run.md`, tell the owner the cause, the fix and the evidence. Anything bigger (a skill rule, a keyframe, the stack) I bring to him as a choice with my recommendation. If the next takes score worse, roll back. Never change on my own: the keyframe, the stack or strengths, nudity or anatomy wording, the skill's rules. A request from the owner pre-empts autopilot at once; resume after.

## 6. When the owner has rated

Read his scores from the page's database. Answer in this order, always:

1. A table: **Take | Your rating | Mine | My note** — his column is the score number only; my note is the sealed note.
2. **My favourite take** and why it sells (eye contact, size in frame, the payoff).
3. **A brief analysis:** where we agreed, where we split, and what changes.

Then write his scores to `ratings-N.csv`, a row in `test/FINDINGS.md` (hit rate and any new finding with counts), and a memory note for the review.

## 7. Stop and report

On "pause" or "stop": `touch STOP`, kill the runner's process group, clear and interrupt the ComfyUI queue, confirm the GPU is idle. Status answers give: what is running and its ETA, what is waiting on the owner, the count per scene, and the page links.
