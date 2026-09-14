# STORY_018 — The reference's dark mode and the surfaces never captured are recorded, from the Spark

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) (recon-led, looks only)
**Status:** Done (2026-09-14) — the capture is in [docs/recon/2026-09-14/](../recon/2026-09-14/); see the Done note at the bottom
**Created:** 2026-09-14 — the owner noticed the reference has a dark mode we lack and controls of ours that "do nothing", granted new credits, and asked for another look

As the owner, I want a second dated capture of agent.minimax.io — its dark theme, its user menu, **every page behind every sidebar item, every composer mode, every menu and popover**, and every state the 2026-09-12 capture skipped or could not reach — so that STORY_019 (dark mode and honest controls) and every rebuild story after it (020+, one per surface group) is designed from measurements and not from memory, and so that the questions still open from the first capture are closed.

## Current state

[docs/recon/2026-09-12/](../recon/2026-09-12/) captured the light theme only, from the Mac, and only the video generation flow: 33 screenshots at 1440, four at 390. Its inventory lists fourteen controls "seen in passing" with no capture at all (Search, Plugins, Scheduled, Connect Mobile, MaxHermes, MaxClaw, Projects, the Agent Team roster, Skills, Environment variables, the Work Area, the Document / Website / Image Generation modes, Changelog). Known gaps recorded at the time: the Assets tile's ⋯ menu ("click timed out once; fixed, not re-run"), a finished job in the thread (the agent never posted one within 20 minutes), the Work Area panel ("not explored"), the user menu (only "Switch to classic mode in the user menu" is quoted), the collapsed sidebar rail (noted "below ~900 px", never shot), and whether an Extend exists anywhere.

Two tooling facts found on 2026-09-14 while reviewing the epic: the recon profile is gone with the Mac session (CHORE_005 gives the Spark a way to sign in; the login has not yet happened), and `parseCssVariables` in `recon/src/tokens-model.ts` reads custom properties from `:root` / `html` blocks only, first definition wins — so the reference's dark values, if they live in a themed block, are dropped by today's tokens script. `recon/out/` is empty on the Spark, so the 2026-09-12 raw CSS cannot be re-read; the 2026-09-14 run fetches it again.

## UI Mockup

N/A (no UI change) — this story produces captures, tokens and notes; STORY_019 and 020+ consume them.

## Acceptance Criteria

**Where and how**

- [x] `docs/recon/2026-09-14/` exists with a `manifest.json` listing every screenshot, its state, width, theme, path and whether the script or the owner reached it, plus the states that were skipped and why. Files keep the `<state>@<width>.png` convention; dark-theme shots insert `-dark` before the `@` (`home-signed-in-dark@1440.png`); narrow shots keep the `narrow-` prefix. Every surface below is captured at **1440 and 390, in light and in dark** unless the line says otherwise.

**The shell**

- [x] The home with Recents populated (the 2026-09-12 sessions are still there), the sidebar **collapsed** to its icon rail (via the Collapse sidebar button at 1440), the 390 drawer **open**, the **user menu open**, a Recents row's own menu open if a row has one, the promo carousel's second page, and whatever the Changelog icon, the **Download** button and the footer **Download desktop** button open.
- [x] **Every sidebar item's destination**, reached by clicking it as a user would: Search, Plugins, Scheduled, Connect Mobile, MaxHermes, MaxClaw, Add new project, and each Agent Team row (General, Coder, Verifier). Whatever a click opens — a page, a modal, a menu, a new tab, or nothing — is captured as it appears, and the inventory says which (see below). A destination that has its own sub-navigation (tabs, a list with a detail view) is captured on each tab.
- [x] The **user menu's entries** are captured one by one: whatever a **Settings** (or equivalent) entry opens is captured on **every tab** it has; entries that only navigate or sign out are listed, not followed. The "Switch to classic mode" entry is **listed and not followed** (owner, 2026-09-14: classic mode is not supported).

**The home and the composer**

- [x] The 2026-09-12 composer states again (typed, video mode, the Model / Video parameters / agent-model / attach menus open, a ShowCase scene selected) so the two dates can be compared, plus the attach menu's **Skills ›** and **Plugins ›** submenus open, the **Agent Team** switch on, and each of the other mode chips selected — **Document, Website, Image Generation** — and whatever **More** opens.

**The task page**

- [x] Submitted, generating, and — this time — **finished in the thread**, waited for as long as it takes (revisiting the session if the browser has to close, as `task-revisited-pending` did on 2026-09-12): the result card and every control on it, the Progress panel **populated**, the Work Area panel **open**, and the docked composer. Dark theme captured for each.

**Assets**

- [x] Assets with the 2026-09-12 video present, the tile ⋯ menu **open** (its entries listed verbatim in the inventory), the preview modal, and the **From You** and **Star** tabs; the filter chips other than All and Videos are captured once at 1440 light only, if their empty states differ.

**Hover and focus**

- [x] For the sidebar row, the mode chip, the primary button, the Send button, the Assets tile and the user chip: the hover state is **measured** (computed background, colour, border, shadow under `hover()`) in `tokens.md`, and the sidebar row and mode chip hover are also screenshotted at 1440 in both themes. Keyboard focus rings are measured for the same set.

**Tokens**

- [x] `tokens.md` / `tokens.json` gain the **dark theme**: every custom property the stylesheets define in a themed scope, kept **beside** the light value (never overwriting it), and every measured element's computed colours re-read with the theme switched (backgrounds, surfaces, borders, text, the active row, the composer card, the pills, the popovers, the alert, the progress panel, the Assets tiles and modal). The notes say **how the reference chooses its theme** — a user-menu setting, the system preference, or both — with the control's exact wording and what attribute or class the switch sets on the document.
- [x] Every newly captured surface gets its type, spacing, radii and colours measured with the same `measure()` pass the 2026-09-12 elements had, so a 020+ story can cite values, not just screenshots.

**Inventory and interactions**

- [x] `inventory.md` is the **full component tree of every surface captured**, in the 2026-09-12 format, and for every control we render inert today (the fourteen "seen in passing" plus the agent-model selector, the Agent Team switch, Add attachment's entries and the Work Area) it says **what a click does on the reference** — navigates where, opens what, or nothing — with the capture that shows it. It ends with a **"What we lack" section**: every element in the tree that MiniMax Local does not render at all, grouped by the surface groups the epic names, so the 020+ stories can be cut from it.
- [x] `interactions.md` gains what a **finished** job's thread shows: the result card, its controls (download, and whether anything like extend, regenerate or edit exists), and how the file also appears in Assets.

**Budget and hygiene**

- [ ] Generations on the reference: **one** (a 768P clip at the shortest duration, watched to completion so the finished thread is captured); the count is written in the notes. The owner said credits were granted (2026-09-14); ask before a second.
- [x] Not captured, by the owner's decision on 2026-09-14: **classic mode** (one line in the inventory naming the switch, nothing followed) and **any signed-out or sign-in surface** (a one-man operation; MiniMax Local has no auth). Billing, credits and plan surfaces are captured only where they appear inside a surface above (the low-credits notice, a Subscribe button), never navigated into.
- [x] Nothing from the raw output (HAR, DOM, CSS, the owner's content, cookies) is committed; `git status --short` shows no `recon/.profile` or `recon/out`.

## Departures from the reference

None — this is a capture.

## Technical Notes

- **Sign-in:** `recon/login.sh` (CHORE_005) — the owner opens `chrome://inspect/#devices` on the Mac, adds `192.168.1.33:9222`, presses **inspect** on the agent.minimax.io target and signs in with GitHub inside that window; the script closes the browser and the port once the session reads signed in. `recon/run.sh check` must print `session: signed-in` before anything else runs; that also closes CHORE_005's last box.
- **Capture (`recon/src/capture.ts`):** the run is one persistent context, as today. It gains (1) a `setTheme(page, "light" | "dark")` helper that switches through the user menu once the control's wording is known, falling back to `page.emulateMedia({ colorScheme })` if the reference follows only the system preference — the notes record which; (2) a theme loop around the existing wide and narrow passes, so every state is shot four times; (3) page-visit steps for each sidebar item and user-menu entry that capture whatever appears (`waitForURL` for a navigation, a `role=dialog` or `role=menu` locator for an overlay, and a "nothing changed" note when neither) and go back home; (4) menu steps for the submenus, the ⋯ tile menu and the Recents row menu; (5) `hover()` steps for the six hover targets. Steps stay `step()`-wrapped so a control that is not there is a manifest `skipped` line, not a crash. The finished thread reuses `generate.ts` with `APPROVED_GENERATIONS` reset to the 2026-09-14 count (1) and the poll bound raised from 20 minutes to as long as the owner allows, revisiting the session by its Recents row when the bound is hit.
- **Tokens (`recon/src/tokens.ts`, `tokens-model.ts`):** `parseCssVariables` returns variables **per selector scope** (`:root`, and any block whose selector names a theme — `[data-theme=…]`, `.dark`, `html.dark`, or a `prefers-color-scheme: dark` media block) so both themes come out of the stylesheets in one read; the `Tokens` shape gains a `dark` sibling for `cssVariables` and for each measurement's colour fields, and `renderTokensMarkdown` prints light and dark side by side. New `measure()` groups cover each captured page and the hover/focus set. The 1440-only breakpoint observation is unchanged.
- **Interactions (`recon/src/interactions.ts`):** the reducer gains the finished-thread payload (the message that carries the result) and the Assets listing that follows; nothing else changes.
- **Unit tests** beside the code as before (`capture-plan.test.ts`, `tokens-model.test.ts`, `interactions-model.test.ts`).

## Testing Plan

- **Unit** — `recon/src/capture-plan.test.ts`: `screenshotFile` with a theme yields `<state>-dark@<width>.png` and refuses a theme in the state name; the plan for the four passes (2 widths × 2 themes) lists every state once per pass with no duplicate file names. `recon/src/tokens-model.test.ts`: `parseCssVariables` on a stylesheet with a `:root` block and a `[data-theme=dark]` block returns both scopes with the same names and different values; a dark reading is stored beside the light one without overwriting it; `renderTokensMarkdown` prints a row with both. `recon/src/interactions-model.test.ts`: the finished-thread payload reduces to the result card's fields. **Integration / e2e: not applicable** — recon produces documents, not product behaviour; the gate's e2e never touches the reference. The recon package's tests run in the gate as they do today.
- **Manual:** the captures are opened and checked against the live site the same day (CLAUDE.md §3 item 8: live state is re-opened, not recalled); the notes carry the date and the generation count.

## Estimated Complexity

L — the capture list roughly triples (≈ 50 states × 2 widths × 2 themes) and the tokens script needs the per-scope variable read; the generation wait is wall-clock, not effort.

## Done (2026-09-14)

**What is in [docs/recon/2026-09-14/](../recon/2026-09-14/):** 204 screenshots across the four passes (1440 light 62, 1440 dark 55, 390 dark 44, 390 light 43), `manifest.json` (every file with its state, width, theme, path, how it was reached, the outcome of all 49 clicks, and the 22 states that could not be reached with the reason for each), [inventory.md](../recon/2026-09-14/inventory.md) (the full tree of every surface, the click table for every control we render inert, the narrow differences, and the "What we lack" list the 020+ stories are cut from), [tokens.md](../recon/2026-09-14/tokens.md) / `tokens.json` (both themes: 450 light and 261 dark custom properties from the stylesheets, the 208 computed root properties that differ between the themes, the palette per theme, hover and focus states, the sidebar pages, Settings, the task page; 236 elements measured), [interactions.md](../recon/2026-09-14/interactions.md) (how the finished result reaches the thread) and the generated [endpoints.md](../recon/2026-09-14/endpoints.md). Raw dumps, the network log and the stylesheets stayed in `recon/out/2026-09-14/` (gitignored).

**The theme.** Settings › General › Appearance: **Light mode / Dark mode / System** (preview cards; the chosen one outlined in the accent blue). Choosing one sets `class="light|dark"` and `style="color-scheme: …"` on the document element; the dark values live under `.dark` and `html[data-prefers-color-scheme=dark]` in the stylesheets — the per-scope parser (`parseThemedCssVariables`) reads them, and the live computed read cross-checks them. Body background light `rgb(255, 255, 255)`, dark `rgb(28, 28, 28)`; `--bg_default_primary` `#fff` → `#171717`, `--text_default_primary` `#171717` → `#ededed`. The setting is on the account; every run put it back to Light mode (verified in the manifest, `theme.restored`).

**Generations spent: 0 of the 1 approved.** The 2026-09-12 "Paper boat on rain puddle" job had finished on its own after that day's 20-minute bound, so the finished thread, the result card and its preview and menu were captured from it in both themes and both widths, and the finished-thread network shape came from reopening it. The AC's box is left open on purpose: nothing was watched to completion today. The credit stays approved for a state a later story finds missing (a live generating → done transition in dark).

**The reference moved between 2026-09-12 and 2026-09-14** (all in the inventory): More and Projects fold by default; the Agent Team section and the composer's Agent Team switch are gone (agents live under Plugins › Manage); an Inbox bell and an "Agents are in Plugins" card appeared; the model menu's entries are renamed; ShowCase became Showcase.

**Not reachable, with the reason in the manifest:** at 390 the More / Projects sections cannot be unfolded (a header tap closes the drawer; the two marketing pages were captured by their paths), there is no Work Area panel, no More chip, no From you / Star tabs, and the tile's ⋯ does not appear on hover; the Agents guide card and the promo carousel disappeared for the account once followed / dismissed, so their later-pass captures are missing.

**Tooling landed for the run** (`recon/src/`): `theme.ts` (the switch through Settings, the sheet and dialog closes, the restore), the four-pass `capture.ts` with `--theme`, `--width`, `--only`, `--restore-to`, a merging manifest and a per-state control dump, the per-scope variable parser and the dark/hover/focus/pages/Settings/task-page measurements in `tokens.ts`, the result-payload reducer in `interactions-model.ts`; unit tests beside each (`capture-plan`, `tokens-model`, `interactions-model`). The recon package's tests now run in the gate's unit step (root `package.json` `test` filter) — the Testing Plan's line assumed they already did; they did not.

**Manual check:** the captures were opened and compared with the live site the same day (this session, through the same signed-in profile); the theme, the folded sections, the missing Agent Team and the finished thread were each confirmed on the reference itself.
