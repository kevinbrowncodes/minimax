# STORY_018 — The reference's dark mode and the surfaces never captured are recorded, from the Spark

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) (recon-led, looks only)
**Status:** Drafted (2026-09-14) — awaiting the owner's sign-in through `recon/login.sh` (CHORE_005) and approval
**Created:** 2026-09-14 — the owner noticed the reference has a dark mode we lack and controls of ours that "do nothing", granted new credits, and asked for another look

As the owner, I want a second dated capture of agent.minimax.io — its dark theme, its user menu, and every surface the 2026-09-12 capture skipped or could not reach — so that STORY_019 (dark mode and honest controls) is designed from measurements and not from memory, and so that the questions still open from the first capture are closed.

## Current state

[docs/recon/2026-09-12/](../recon/2026-09-12/) captured the light theme only, from the Mac. Known gaps, all recorded at the time: the Assets tile's ⋯ menu ("click timed out once; fixed, not re-run"), a finished job in the thread (the agent never posted one within 20 minutes), the Work Area panel ("opens a side workspace (not explored; out of MVP)"), the user menu (only "Switch to classic mode in the user menu" is quoted), and whether an Extend exists anywhere. Since then the recon profile is gone with the Mac session; CHORE_005 gives the Spark a way to sign in.

## UI Mockup

N/A (no UI change) — this story produces captures, tokens and notes; STORY_019 consumes them.

## Acceptance Criteria

- [ ] `docs/recon/2026-09-14/` exists with dated screenshots at 1440 and 390 of: the home, the composer in video mode with the parameters open, a task page (queued, generating, and — this time — **finished in the thread**, waited for as long as it takes), Assets with the tile ⋯ menu **open**, the preview modal, the user menu **open**, and the Work Area panel **open** — each in **light and in dark**.
- [ ] `tokens.md` / `tokens.json` gain the **dark theme**: every colour token measured again with the theme switched (backgrounds, surfaces, borders, text, the active row, the composer card, the pills, the popovers, the alert and the progress panel), and how the theme is chosen (a user-menu setting, a system preference, or both) with the control's exact wording.
- [ ] `inventory.md` gains, for every control we render inert (Search, Plugins, Scheduled, Connect Mobile, MaxHermes, MaxClaw, Projects, Agent Team, Skills, Environment variables, the Work Area, the Document / Website / Image Generation modes, Changelog, the agent-model selector, Add attachment's entries), **what a click does on the reference**: navigates where, opens what, or does nothing — one line each, with a screenshot where it opens something.
- [ ] `interactions.md` gains what a **finished** job's thread shows: the result card, its controls (download, and whether anything like extend, regenerate or edit exists), and how the file also appears in Assets.
- [ ] The Assets ⋯ menu's entries are listed verbatim.
- [ ] Generations on the reference: **one** (a 768P clip at the shortest duration, watched to completion so the finished thread is captured); the count is written in the notes. The owner said credits were granted (2026-09-14); ask before a second.
- [ ] Nothing from the raw output (HAR, DOM, the owner's content, cookies) is committed; `git status --short` shows no `recon/.profile` or `recon/out`.

## Departures from the reference

None — this is a capture.

## Technical Notes

- Sign-in: `recon/login.sh` (CHORE_005) — the owner opens `chrome://inspect/#devices` on the Mac, adds `192.168.1.33:9222`, presses **inspect** on the agent.minimax.io target and signs in with GitHub inside that window; the script closes the browser and the port once the session reads signed in. `recon/run.sh check` must print `session: signed-in` before anything else runs.
- Capture: `recon/run.sh capture` with the existing plan, extended with a `--theme dark` pass (switch the theme through the user menu, re-run the state list) and the new states (user menu open, Work Area open, Assets menu open, finished thread). `recon/run.sh tokens 2026-09-14` measures both themes; `recon/run.sh interactions 2026-09-14` reduces the logs.
- The capture plan and the tokens script are code in `recon/src/` and get unit tests like their predecessors (`capture-plan.test.ts`, `tokens-model.test.ts`).

## Testing Plan

- **Unit** — `recon/src/capture-plan.test.ts`: the dark pass produces the same state names with a `-dark` suffix and the four new states at both widths; `recon/src/tokens-model.test.ts`: a dark reading is stored beside the light one without overwriting it. **Integration / e2e: not applicable** — recon produces documents, not product behaviour; the gate's e2e never touches the reference.
- **Manual:** the captures are opened and checked against the live site the same day (CLAUDE.md §3 item 8: live state is re-opened, not recalled); the notes carry the date.

## Estimated Complexity

M
