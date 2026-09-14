# STORY_022 — The home and composer match the reference: Showcase, the attach menu, the mode chips and the agent-model menu

**Epic:** [EPIC_005](../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) — the second rebuild story, cut from [inventory.md › What we lack › Home](../recon/2026-09-14/inventory.md)
**Status:** In progress (2026-09-14)
**Created:** 2026-09-14

As the owner, I want the home and the composer — the heading's position, the Showcase row under the video composer, the attach menu and its submenus, the Document / Website / Image Generation modes and the More menu, and the MiniMax-M3 menu — to look and move like agent.minimax.io's in both themes and at both widths, so that the first screen reads as the reference.

## Current state

STORY_013's composer has the video mode (tile, tag, model and parameters), STORY_019 made the +, MiniMax-M3 and the other chips inert. Against [composer-video-mode@1440](../recon/2026-09-14/composer-video-mode@1440.png): the heading and composer sit ≈ 30 px lower than the reference's at 900 tall; there is no Showcase row; + opens nothing (theirs a five-entry menu with three submenus); Document / Website / Image Generation do nothing (theirs switch the composer into that mode with a mode pill and that mode's Showcase); More opens nothing (theirs a five-entry menu); MiniMax-M3 opens nothing (theirs a three-model menu with a Thinking switch).

## UI Mockup

**Reference captures** ([docs/recon/2026-09-14/](../recon/2026-09-14/)): `home-signed-in@1440` / `-dark`, `composer-video-mode@1440` / `-dark`, `scene-selected@1440`, `composer-typed@1440`, `attach-menu-open@1440` / `-dark`, `attach-add-to-project-submenu-open@1440`, `attach-skills-submenu-open@1440`, `attach-plugins-submenu-open@1440`, `mode-document@1440` / `-dark`, `mode-website@1440`, `mode-image-generation@1440`, `mode-more-open@1440` / `-dark`, `agent-model-menu-open@1440` / `-dark`, `hover-mode-chip@1440`; narrow: `narrow-composer-video-mode@390` / `-dark`, `narrow-attach-menu-open@390`, `narrow-agent-model-menu-open@390`, `narrow-mode-document@390`, `narrow-scene-selected@390`. Tokens: [tokens.md › Elements](../recon/2026-09-14/tokens.md) (`composer*`, `mode-chip*`, `reference-tile`, `showcase-*`, `menu*`).

**Measured values this story commits to** (1440 × 900, light; colours are the semantic tokens):

| Element | Value |
| --- | --- |
| Heading | 32 px/400, top at y 231 (175 px under the top bar); the composer card's top at 302; the chips row at 461 |
| Composer card, video mode | 736 × ≈ 228: the reference tile 90×90 at 16,12 (radius 12, `--bg_grouped_tertiary_elevated`, "+ Reference" 12 px `--text_default_tertiary`); the editor row at y 116 (52 px min, 16 px/26) starting with the `video-creator` tag; the bottom bar at y 185: + (30×30), Model (142×32), Video parameters (145×32), MiniMax-M3 (122×30), Send (30×30) |
| Showcase (video mode) | title "Showcase" 14 px/500 at 494,577 with a 28×28 dismiss × at the right; four cards 169×128 (radius 12) at 12 px gaps, caption 12 px/400 centred below (16 px line), a 32×32 **Preview example** button top-right of the card on hover; at 390 a two-column grid (175×155) |
| Scene selected | the example's prompt is typed into the editor after the tag, its parameters set, a **Clear selected scene** × (28×28) at the Showcase title's right (the reference also loads the example's image as Reference image 1 — ours has none) |
| Attach menu | 190 px wide at the + button's left edge, 8 px below; entries 32 px, 14 px: **Add files or photos**, **Add to project ›**, — **Skills ›**, **Plugins ›**, **Environment variables**; submenus 8 px to the right of the entry: Add to project (270 px: **No project** ✓, **Add new project**), Skills (190 px: the installed skills, then **Manage skills**, **Add skill**), Plugins (190 px: **video-creator**, **Add plugins**) |
| Mode chips | 32 px, 14 px, 1 px `--border_default`, radius 8; hover `--bg_interaction_tertiary_hover`; Video generation carries the H3 pill; **More** opens a 181 px menu (radius 12, entries 36 px): Spreadsheet, AI PPT, Research Report, Education, Scheduled Tasks |
| A mode chosen (Document / Website / Image Generation) | the chips row hides; a **mode pill** (icon + label, 32 px, transparent, 14 px) sits in the bottom bar after +; a click on it leaves the mode; that mode's Showcase row (four cards) shows under the composer |
| MiniMax-M3 menu | 218 px, 8 px under the button, right-aligned; entries 31 px pitch: **MiniMax-M3** ✓, **MiniMax-M2.7**, **MiniMax-M2.7 HighSpeed**; a separator; a **Thinking** row with a switch (on) |

```
video mode (composer-video-mode@1440)                          + menu (attach-skills-submenu-open@1440)
┌ composer ───────────────────────────────────────────┐        ┌ 📎 Add files or photos ┐
│ ┌──────┐                                            │        │ ⇥ Add to project     › │ ┌ (skills…)        ┐
│ │  +   │                                            │        │ ──────────────────────│ │ ────────────────  │
│ │ Ref. │                                            │        │ ▤ Skills             › │ │ ⚙ Manage skills   │
│ └──────┘                                            │        │ ▦ Plugins            › │ │ + Add skill       │
│ ▶ video-creator  Enter message…                     │        │ 🔑 Environment varia… │ └───────────────────┘
│ +  ◎ MiniMax-H3 ⌄   ▭ 16:9 2K 5s     MiniMax-M3 ⌄ (↑)│        └────────────────────────┘
└─────────────────────────────────────────────────────┘
Showcase                                              ×        MiniMax-M3 menu            More menu
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   ┌ ✓ MiniMax-M3        ┐   ┌ Spreadsheet     ┐
│  card  │ │  card  │ │  card  │ │  card  │ ← 169×128          │   MiniMax-M2.7      │   │ AI PPT          │
└────────┘ └────────┘ └────────┘ └────────┘                   │   MiniMax-M2.7 High…│   │ Research Report │
 caption…   caption…   caption…   caption…                     │ ─────────────────── │   │ Education       │
                                                               │ Thinking       [on] │   │ Scheduled Tasks │
Document mode (mode-document@1440): chips hidden;              └─────────────────────┘   └─────────────────┘
bottom bar: +  📄 Document              MiniMax-M3 ⌄ (↑) ; Showcase of four document cards below.
```

## Acceptance Criteria

- [ ] **Position:** at 1440 × 900 the heading's top is at 231 ± 2 and the composer card's top at 302 ± 2 (light and dark).
- [ ] **Showcase, video mode:** a "Showcase" row with four cards (our own four example scenes — prompt, ratio, resolution, duration — and our own drawn thumbnails, captions of our own); a card click types the prompt after the tag and sets the parameters; **Clear selected scene** appears and empties the composer; **Preview example** shows the notice; the × hides the row for the session; two columns at 390.
- [ ] **Attach menu:** + opens the five-entry menu; **Add files or photos** opens the reference-image chooser in video mode (the same input STORY_013 uses) and shows the notice in the other modes; Add to project ›, Skills ›, Plugins › open their submenus on hover or click, every submenu entry inert; Environment variables inert; Escape and a click outside close it.
- [ ] **Modes:** Document, Website and Image Generation switch the composer into that mode — chips hidden, the mode pill in the bottom bar, that mode's Showcase (four drawn cards, captions of our own, a card click shows the notice); the pill leaves the mode; Send in those modes shows the notice ("video generation only") instead of submitting. **More** opens its five-entry menu, every entry inert.
- [ ] **MiniMax-M3 menu:** opens as captured, the three models and the Thinking switch inert; Escape / outside closes it.
- [ ] Both themes, both widths, keyboard-reachable, 44 px touch targets at 390; every existing composer and task e2e stays green.

## Departures from the reference

- The Showcase's scenes, thumbnails and captions are ours (theirs are their content); a scene loads a prompt and parameters but no reference image.
- The Skills submenu lists no skills (none exist locally) — only Manage skills and Add skill, inert; Plugins lists video-creator and Add plugins, inert.
- Document / Website / Image Generation and the More menu's modes are looks only: sending in them shows the notice.
- Thinking, the agent models and Environment variables are inert.

## Technical Notes

- `lib/showcase.ts`: the four video scenes (prompt, params) and the four placeholder cards per other mode — pure data with a test that every scene's parameters are ones the composer accepts.
- `lib/composer-state.ts`: `mode` gains `"document" | "website" | "image"`; `canSend` is false in them; a `scene` action types a prompt and sets parameters; `clear-scene` empties.
- `Composer.tsx`: `AttachMenu`, `ModeMenu`, `AgentModelMenu`, `Showcase` sub-components; the mode pill; the home's padding from `home.module.css`.

## Testing Plan

- **Unit** — `lib/composer-state.test.ts` gains the new modes, `scene` / `clear-scene`, and `canSend` false in the three modes; `lib/showcase.test.ts` (four scenes, parameters valid, four cards per mode).
- **Component** — `Composer.test.tsx` gains: the attach menu and its submenus (entries inert, Add files or photos opens the input in video mode), the More menu, the agent-model menu, a mode chip → pill + Showcase → pill leaves, a Showcase card → prompt and parameters in the composer → Clear selected scene empties.
- **Integration:** none — no route changes.
- **E2E** — `composer.spec.ts` gains: the heading and card positions at 1440; a Showcase card fills the prompt and Send submits it (stub `done-after-1-poll`) with the scene's parameters reaching the server; Document mode shows the pill and its Showcase and Send shows the notice; the + menu's Add files or photos opens the file chooser. Regression: every existing composer / task / extend spec.

## Estimated Complexity

M
