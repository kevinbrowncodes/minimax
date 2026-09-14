# STORY_023 — The task page matches the reference: the result card, the preview pane, the Work Area panel and the thread rows

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) — the third rebuild story, cut from [inventory.md › What we lack › Task page](../recon/2026-09-14/inventory.md)
**Status:** Done (2026-09-14)
**Created:** 2026-09-14

As the owner, I want a task page — the thread's rows, the finished result as the reference's file card with its preview pane, the right-hand Work Area panel with Progress and Deliverables that the top-bar button hides, the credits notice and the footer line — to look and move like agent.minimax.io's in both themes and at both widths, so that a job in progress and a finished one read as the reference.

## Current state

STORY_014's task page shows the prompt bubble, a working indicator, the finished video inline with Download / Copy prompt / Extend and a time, failures with Retry, a right-hand "Progress" panel (250 px) and the docked composer. Against [task-page@1440](../recon/2026-09-14/task-page@1440.png): the reference's finished result is a **file card** (icon, name, "MP4", **Open preview**, **More ▾** → Open preview / Download) whose preview opens a **pane** at the right with the `<video>`; its right column is the **Work Area** panel (324 px: **Progress ▾** with "Track progress on longer tasks." when empty, **Deliverables ▾** listing the file) which the top-bar **Work area** button hides and shows; the thread has a **Processed N s ›** row, **Copy / Like / Dislike** and a timestamp under the agent's message, a round **jump** button, a **credits notice** above the docked composer and the disclaimer "MiniMax Agent is AI and can make mistakes" under it; the user bubble is right-aligned with a 16 px radius. Ours has none of these.

## UI Mockup

**Reference captures** ([docs/recon/2026-09-14/](../recon/2026-09-14/)): `task-page@1440` / `-dark`, `task-thread-top@1440`, `task-processed-expanded@1440`, `task-result-card-hover@1440`, `task-result-menu-open@1440` / `-dark`, `task-result-preview-open@1440` / `-dark`, `work-area-closed@1440` / `-dark`, `work-area-deliverable-open@1440`; narrow: `narrow-task-page@390` / `-dark`, `narrow-task-result-menu-open@390`, `narrow-task-result-preview-open@390`; the 2026-09-12 `task-generating-*@1440` and `task-rejected-insufficient-credits@1440` (a populated Progress list). Tokens: [tokens.md › Elements › task](../recon/2026-09-14/tokens.md).

**Measured values this story commits to** (1440 × 900, light; semantic tokens for both themes):

| Element | Value |
| --- | --- |
| Thread column | 736 px at x 338 (the page's left 260 + 78 gutter); with the panel open the main area is 1180 − 324 |
| User bubble | right-aligned, max 537 px, padding 11 16, radius 16, `--bg_grouped_tertiary`, 16 px/26; a **View all** link (14 px, tertiary) when clamped to ≈ 10 lines |
| Processed row | "Processed N s ›" 14 px/400 `--text_default_tertiary`, padding 4 0, 28 px; a chevron; a click unfolds the step list (our Progress steps) under it |
| Agent message | 16 px/26 `--text_default_primary`; below it the file card, then **Copy · Like · Dislike** 26×26 icon buttons (radius 8, `--icon_default_tertiary`, hover `--bg_interaction_tertiary_hover`) and the time "Sep 12, 15:41" 13 px tertiary |
| Result file card | 736 × 79, padding 16, radius 12, 1 px `--border_default`, `--bg_default_primary_elevated`; a 40×40 play tile (radius 8, `--bg_grouped_tertiary_elevated`, `--icon_default_secondary`); name 16 px/26, "MP4" 12 px secondary; right: **Open preview** 139×30 (eye icon, 14 px, hover `--bg_interaction_tertiary_hover`) and **More ▾** 32×32 |
| Result card menu | 180 px, entries 36 px: **Open preview**, **Download** |
| Preview pane | 590 px at the right, full height, 1 px `--border_default` left, `--bg_default_primary_elevated`; head 56 px: eye icon, **Preview** (14 px secondary), a 1 px divider, the file name (14 px primary), then **Download ▾** (114×30 secondary), **More** 32×32, **Close** 32×32; the `<video>` 556 wide, centred vertically, native controls; the Work Area panel is hidden while the pane is open |
| Jump button | 36×36 round, `--bg_default_primary_elevated`, 1 px border, centred under the thread, 48 px above the notice; ↑ "Click to jump to start of answer, double-click to jump to top" while at the bottom, ↓ "Click to jump to bottom" otherwise |
| Credits notice | 768 × 50, padding 8 16, radius 16, 1 px border, `--bg_default_primary_elevated`; ⓘ 16 px; "Fewer than 1,000 Credits remain." 13 px; **Buy Credits** 105×32 secondary, **Subscribe** 93×32 primary, **Dismiss usage notice** 32×32 |
| Docked composer | 768 px, radius 14, padding 12; the disclaimer under it: "MiniMax Agent is AI and can make mistakes", 10 px/14 `--text_default_tertiary`, centred |
| Work Area panel | 324 px incl. padding 24 24 32, at the right; **Progress ▾** header 28 px (13 px/500, padding 0 6, a chevron at the right; folds); hint "Track progress on longer tasks." 12 px secondary when there are no steps, else the numbered step list; **Deliverables ▾** header; file rows 262×30, radius 10, padding-left 6, a document icon, the name 13 px; a click opens the preview |
| Top bar | the **Work area** icon button hides / shows the panel (open by default; the choice lasts the session) |
| 390 | no panel, no Work area button; the card wraps: the name row, then **Open preview** (full width) **and More ▾** on a second row (`narrow-task-result-menu-open@390` — *corrected during implementation: the draft said there was no More ▾; the capture has it*); the preview covers the page (see Departures — *the draft said "a sheet"; `narrow-task-result-preview-open@390` shows the reference squeezing the thread to ≈ 150 px beside a 238 px pane*); the credits notice puts ⓘ, the text and × on the first row and the buttons right-aligned under them |

```
task page, finished (task-page@1440)
┌ top bar: Title of the job                                                       ▯ ┐
│ thread 736 ───────────────────────────────────────┐ ┌ Work Area 324 ─────────────┐ │
│                        ┌ @video-creator prompt … ┐│ │ Progress                 ⌄ │ │
│                        │ (right-aligned bubble)  ││ │ Track progress on longer   │ │
│                        └─────────────────────────┘│ │ tasks. / 1 ✓ … 2 ✓ … 3 ● … │ │
│ Processed 20s ›                                   │ │ Deliverables             ⌄ │ │
│ Done — <the result line>                          │ │ 🗎 <file>.mp4               │ │
│ ┌ ▶ <file>.mp4               [👁 Open preview] ⌄ ┐│ └────────────────────────────┘ │
│ │   MP4                                         ││                                 │
│ └────────────────────────────────────────────────┘│                                 │
│ ⧉ 👍 👎  Sep 12, 15:41              (↑)           │                                 │
│ ┌ ⓘ Fewer than 1,000 Credits remain. [Buy Credits] [Subscribe] × ┐               │
│ ┌ docked composer ──────────────────────────────┐ │                                 │
│ │ Enter message…                 MiniMax-M3 ⌄ (↑)│ │                                 │
│ └────────────────────────────────────────────────┘│                                 │
│         MiniMax Agent is AI and can make mistakes │                                 │
└───────────────────────────────────────────────────┴─────────────────────────────────┘

preview open (task-result-preview-open@1440): thread narrows to ≈ 520 px; at the right a 590 px pane:
┌ 👁 Preview │ <file>.mp4                  [⤓ Download ⌄] ⋯ × ┐
│                                                            │
│              ┌──────── <video> 556 wide ────────┐          │
│              └──────────────────────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] **Finished result as the file card:** name, "MP4", **Open preview**, **More ▾** (Open preview / Download — Download saves the file as today); the card replaces the inline player. The preview pane opens on Open preview, on a Deliverables row, and **automatically when the job finishes while the page is open** (departure, so a watched job still ends in a playing video); it holds the `<video>` playable from the result URL; Close, Escape and the Work area button (which brings the panel back) close it. *Corrected during implementation: the pane covers the top bar's right 590 px at 1440, exactly as `task-result-preview-open@1440` shows it covering the reference's — so the Work area button cannot be clicked while the pane is open; the toggle still does that when reached by keyboard, and Close / Escape are the ways the capture offers.*
- [x] **Work Area panel:** open by default at ≥ 900 with Progress (folding; the hint when there are no steps, else the steps and the progress bar as today) and Deliverables (the file once done); the top-bar Work area button hides and shows it and is no longer inert; hidden at 390.
- [x] **Thread rows:** the right-aligned bubble with the 16 px radius; the Processed row with the elapsed seconds that unfolds the steps; the agent's line ("Done — …" summary for a finished job, the working / failed / cancelled lines as today); Copy (copies the prompt, as today), Like and Dislike (inert) and the time; the jump button once the thread overflows; the credits notice (Buy Credits and Subscribe inert, × dismisses for the session); the disclaimer.
- [x] **Existing behaviour kept:** Extend (STORY_016) stays reachable from the card's More menu; Retry, Stop, the indicator, polling and history are unchanged; every existing task, extend and assets e2e stays green (with the Download step moved to the card's menu).
- [x] Both themes, both widths, keyboard-reachable, 44 px touch targets at 390.

## Departures from the reference

- The preview pane opens by itself when a job finishes on the page (theirs only on a click) — a watched job still ends in a playing video.
- The agent's line is our one-line summary of the result; there is no agent prose, Schedules pill, or scheduled-task card.
- The credits notice is rendered as captured with inert buttons — MiniMax Local has no credits.
- The disclaimer takes the reference's sentence.
- At 390 the preview pane covers the page (Close / Escape return to the thread) instead of the reference's squeeze — `narrow-task-result-preview-open@390` shows its thread crushed to ≈ 150 px beside a 238 px pane, which is a layout nobody designed.
- The docked composer keeps STORY_013/014's content (the Reference tile, the MiniMax-H3 and parameter pills: it is in video mode from the start); the reference's docked composer on this page is the plain 128 px one. Its frame (768 wide, radius 14, padding 12, the 20 px glow) is the capture's.
- Progress lists our four steps for every job (the reference's "Track progress on longer tasks." hint appears only when a task has no steps, which ours never lacks).

## Technical Notes

- `components/shell/ShellContext.tsx`: `workAreaOpen` + `toggleWorkArea` provided by the Shell (the top-bar button) and read by the task page; the Shell also hides the button at 390.
- `lib/task-view.ts`: `processedSeconds(entry, job)`, `formatDoneAt(date)` ("Sep 12, 15:41"), `resultLine(job)`.
- `TaskPage.tsx`: `ResultCard`, `PreviewPane`, `WorkAreaPanel`, `CreditsNotice`, `JumpButton` sub-components; `task.module.css` re-measured.

## Testing Plan

- **Unit** — `lib/task-view.test.ts` (seconds, the timestamp format, the result line).
- **Component** — `TaskPage.test.tsx` gains: the card renders once done and the pane auto-opens with the video; More → Download link and Extend; Copy copies; the Processed row unfolds the steps; the credits notice dismisses; the Work Area panel lists the deliverable and hides when the context says so.
- **Integration:** none.
- **E2E** — `task.spec.ts`: the done flow expects the pane's video (auto-open); reopening from Recents shows the card, Open preview plays; Download through More ▾; the Work area button hides the panel and Close restores it (desktop); `extend.spec.ts` reaches Extend through the menu. `shell.spec.ts`'s Work Area notice test becomes a toggle test.

## Estimated Complexity

L

## Done (2026-09-14)

**Landed:** the finished result as the file card (play tile, name, "MP4", **Open preview**, **More ▾** → Open preview / Download / Extend) with the preview pane (590 px at the right at 1440, the page at 390; opens on Open preview, on a Deliverables row and by itself when the job finishes on the page; Close and Escape close it); the Work Area panel (a 276 px card 12 px from the right edge, Progress ▾ and Deliverables ▾ folding, hidden while the pane is open and at 390) toggled by the top bar's real Work area button (`ShellContext`, the choice lasting the session); the Processed N s › row unfolding the steps; the agent's "Done — …" line; Copy / Like (inert) / Dislike (inert) and the "Sep 12, 15:41" time; the jump button; the credits notice (inert buttons, × dismisses); the disclaimer; the 768 px docked composer whose popovers now open upward; the thread scrolling in its own column under a fixed docked stack. CHORE_009's mount of STORY_020's `CutNotice` rides along (above the card; its Retry re-posts without a seed; e2e `done-with-cut`).

**Side by side** ([STORY_023_side_by_side/](STORY_023_side_by_side/); ours from the production build against the stub — the reference's prompt, agent prose, Recents and video are its content and count against us in every row; the same 40/255 rule as STORY_019–022):

| Surface | 1440 light | 1440 dark | 390 light | 390 dark |
| --- | --- | --- | --- | --- |
| Task page, finished | 94.8 % | 94.7 % | 90.0 % | 90.2 % |
| Processed row unfolded | 94.4 % | 94.4 % | 88.2 % | 88.3 % |
| Result card, hover | 94.7 % | 94.7 % | 90.1 % | 90.3 % |
| Result menu open | 94.8 % | 94.8 % | 90.0 % | 90.1 % |
| Preview pane open | 84.1 % | 84.1 % | 77.0 % | 80.7 % |
| Work area closed | 95.0 % | 95.1 % | — | — |
| Deliverable opened | 84.1 % | 84.1 % | — | — |

**Deltas that remain, and whose they are:** the reference's long prompt bubble (295 px tall, with View all) against our one-line prompt — its content; its agent prose against our "Done —" line (departure); its video against the stub's colour bars in the pane (content — every preview row's number is mostly that); its Recents (five titles, a Verifier) against our one; our docked composer's Reference tile and pills (departure, STORY_013/014's composer); our Progress list where it shows the hint (departure); at 390 the preview covers the page (departure). No colour, type, radius or spacing delta remains on the card, the panel, the notice, the rows or the pane's head.

**Verified this session:** the production build in both themes at 1440 and 390 through the screenshots above; the deployed container reopened at the LAN address after the deploy; the gate green (typecheck, lint, unit, integration, build + image, e2e) by hand on the working tree and in the pre-push hook.
