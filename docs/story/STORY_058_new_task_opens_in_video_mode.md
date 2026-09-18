# STORY_058 — New task opens in video mode, plain

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — a twelfth story, the owner's while the epic's verification ran (2026-09-18 13:05 EDT: "in order to use video generation when I click new task I need to click the Video generation button — we should get rid of it and just make it the default state"; 13:20: "we don't need the showcase either"; 13:20, from a list of leftovers: the promo carousel goes, the placeholder tells the truth, the heading becomes "MiniMax" — "I prefer simplicity and minimalism"); a departure from the reference, after [STORY_026](STORY_026_the_parts_of_the_reference_ui_that_can_never_help_video_generation_are_removed.md) (which left this one chip) and [STORY_040](STORY_040_the_plugins_page_is_real_and_the_video_creator_switch_makes_a_text_only_workstation.md) (the plugin's switch)
**Status:** Done (2026-09-18 13:55 EDT — built and gated; deployed with STORY_057 once the Spark's draw had finished, never mid-job; the screenshots are the addendum. Approved 13:25 "Yes please proceed with story 58"; drafted 13:10 before any code, revised with the Showcase, the promo card, the heading and the placeholder on the owner's words)
**Created:** 2026-09-18

As the owner, I want New task to open straight in video mode — the photo tile, the video-creator tag, the parameters, the Agent chip — with nothing under the card, no advertisement in the corner, a heading that just says *MiniMax* and a placeholder that says what to do, so that I never click *Video generation* first and never look past things that are not mine, because on MiniMax Local there is nothing else a new task can be and my prompts come from my photos and the director, not from a gallery.

## Current state (read from the code, 2026-09-18 13:05 EDT)

- **The composer starts in text mode** (`lib/composer-state.ts › initialComposer`: `mode: "text"`); the one chip under the card, **Video generation · H3** (`Composer.tsx`, the `chips` row STORY_026 left after removing Document / Website / Image Generation / More), dispatches `enter-video-mode`. The docked composer (a task page) and an Edit of a waiting request (`/?queue=`) already start in video mode; STORY_054's `/?agent=` too.
- **Text mode can do nothing:** Send answers *Text chat is not connected to the Spark yet — pick Video generation* (STORY_026; BACKLOG_006 would wire a text model). The Showcase is shown only in video mode; the + menu's director rows are greyed in text mode (STORY_054) with that very reason.
- **Leaving video mode:** the × on the *video-creator* tag (`leave-video-mode`: the images, the extension and the chip's state cleared, back to text mode). It is the reference's chrome (the plugin chip in a message), and on ours it leads to the dead mode.
- **The plugin's switch** (STORY_040, `videoEnabled` off): a *text-only workstation* — the chip and the video controls hidden, Send answering the line above. The chip is hidden by the same condition, so the switch and this story meet.
- **The Showcase** (`components/composer/Showcase.tsx`, `lib/showcase.ts`, STORY_022's four scene cards under the card in video mode — a click types the scene's prompt and sets its parameters; × dismisses it for the page's life): the reducer's `scene` and `clear-scene` actions, `Composer.test`'s card case, `composer.spec`'s, `showcase.test`. The reference shows it on its home; ours has never produced a video from it that the owner kept.
- **The promo carousel** (`components/shell/PromoCard.tsx`, STORY_021; mounted by the Shell on the home, dismissable per `shell-prefs`): two pages — *H3 takes the stage. Let the show begin.* / the reference's credits offer — every control inert, kept for fidelity. It advertises the reference's cloud.
- **The heading** (`app/page.tsx`): *MiniMax makes your work easier* — the reference's slogan, 32 px/400 (STORY_022's measure). **The placeholder** (`Composer.tsx › PLACEHOLDER`): *Enter message... (use / for commands)* — there are no slash commands here.
- **Where the tests click it:** 33 places in the e2e and trial specs (`getByRole("button", { name: /Video generation/ }).click()`), the component tests' `renderReady`, and STORY_022/026's captures of the chips row.

## UI Mockup

**Reference capture:** `home-signed-in@1440` (the reference's home: the heading, the card, the chips row *Video generation · H3* under it) and `composer-video-mode@1440` (the reference after the chip: the tile, the tag, the parameters). Ours opens on the second, at the first's position, with no chips row. **A deliberate departure** (below).

**Before — New task today (`home-signed-in@1440`, ours as STORY_022/026 left it): a text box that can send nothing, and the one chip under the card that has to be clicked first:**

```
                         MiniMax makes your work easier
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │ ▏Enter message... (use / for commands)                                        │
   │                                                                               │
   │ [+]                                                       MiniMax-M3 ⌄   [↑]  │
   └───────────────────────────────────────────────────────────────────────────────┘
   [▣ Video generation  H3]                                    ← the click this story removes
```

**Before — after that click (`composer-video-mode@1440`): the tile, the tag with its ×, the parameters, the Agent chip, the Showcase:**

```
                         MiniMax makes your work easier
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │ [+ Reference]                                                                 │
   │ ● video-creator ×  ▏Enter message... (use / for commands)                     │
   │ [+] [◎ Agent] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 5s]      MiniMax-M3 ⌄ [Run at…] [↑] │
   └───────────────────────────────────────────────────────────────────────────────┘
   Showcase                                                                      ×
   [Neon Street Dolly] [Product Turntable] [Forest Dawn] [Portrait by a Rain Window]
                       ↑ the × on the tag drops back to the first picture, photo and all
```

**After — New task, as it opens (one state, no click): the second picture at the first's position, the chips row gone, the tag without its ×, nothing under the card (the Showcase goes too), nothing in the corner (the promo carousel goes), the heading *MiniMax*, the placeholder saying what to do:**

```
                                    MiniMax
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │ [+ Reference]                                                                 │
   │ ● video-creator   ▏Describe the video — or attach a photo and turn Agent on   │
   │ [+] [◎ Agent] [◉ MiniMax-H3 ⌄] [▭ 16:9 │ 768P │ ◷ 5s]      MiniMax-M3 ⌄ [Run at…] [↑] │
   └───────────────────────────────────────────────────────────────────────────────┘

                                                                (no card bottom-right)
```

The heading keeps STORY_022's type and position (32 px/400, top at y 231); the promo card's fixed corner is empty; the tag and the *MiniMax-M3* pill stay for STORY_059 to remove.

**After — the plugin off (Plugins › video-creator switched off, STORY_040's text-only workstation), before and after side by side:**

```
   before (today)                                    after
   ┌─────────────────────────────────────────┐       ┌─────────────────────────────────────────┐
   │ ▏Enter message... (use / for commands)  │       │ ▏Video generation is off — turn on      │
   │                                         │       │  video-creator under Plugins            │
   │ [+]                    MiniMax-M3 ⌄ [↑] │       │ [+]                    MiniMax-M3 ⌄ [↑] │
   └─────────────────────────────────────────┘       └─────────────────────────────────────────┘
   (no chip; Send answers "Text chat is not            (the placeholder says why; Send disabled)
    connected to the Spark yet — pick Video
    generation")
```

**Narrow (`narrow-video-mode@390`):** the after is today's narrow video composer with no chips row under it; the tag is glyph-only as STORY_050 made the bar wrap. **Both themes.** The task page's docked composer (already video mode) is unchanged.

## Acceptance Criteria

- [x] **The home composer opens in video mode** when the plugin is on: `initialComposer` starts in `"video"`; the *Video generation* chip and the `chips` row are removed; `/?skill=` (a template) fills the box in video mode.
- [x] **The Showcase is removed**: the component, `lib/showcase.ts`, the reducer's `scene` / `clear-scene` actions and their tests; nothing renders under the card on the home.
- [x] **The promo carousel is removed**: `PromoCard.tsx`, its CSS, its mount in the Shell and its dismissed-preference; nothing fixed in the home's corner at either width.
- [x] **The heading reads `MiniMax`** in the same type and place; **the placeholder reads** *Describe the video — or attach a photo and turn Agent on* (the docked composer on a task page keeps its own placeholder if it has one — read first).
- [x] **No way out of video mode**: the tag's × is gone (the tag is a label); `leave-video-mode` is dropped from the reducer, and `enter-video-mode` stays only for the docked and Edit paths that already use it (or is removed too if nothing needs it — said which in the Done note).
- [x] **The plugin off** (`videoEnabled: false`): the composer is the text-only workstation of STORY_040 with the placeholder above and Send disabled; turning the plugin on (Management › Plugins, or the setting arriving) puts the composer in video mode without a reload.
- [x] **The tests click nothing first:** the e2e, trial and component helpers that clicked the chip open video mode by loading the page; STORY_022/026's assertions on the chips row are updated to its absence and say so; STORY_040's *text-only* case asserts the placeholder and the disabled Send instead of the absent chip.
- [x] **Both widths, both themes**; every other spec stays green (the chip's click was in 33 of them).

## Departures from the reference

- The reference opens on a text chat and offers video generation as one mode among several; ours is a video workstation (STORY_026 removed the other modes), so the last chip — a click that could only lead here — goes too, and the tag loses the × that would lead back to a mode that answers nothing. The reference's chrome for video mode (the tile, the tag, the parameters — `composer-video-mode@1440`) is kept as it is.
- The reference's Showcase (the four sample scenes under the card, STORY_022) is removed: the owner's prompts come from his photos and the director, and the cards never produced a video he kept (the owner, 2026-09-18).
- The reference's promo carousel (STORY_021) is removed: it advertises the reference's cloud credits, which have no meaning here. The heading loses the reference's slogan for the one word *MiniMax* and the placeholder its slash-command hint — "simplicity and minimalism" (the owner, 2026-09-18).

## Technical Notes

- `lib/composer-state.ts`: `initialComposer(...)` → `mode: "video"`; remove `leave-video-mode`; keep `enter-video-mode` only if the docked/Edit init still needs it (it will not: the default is video) — remove and simplify `Composer.tsx`'s init.
- `Composer.tsx`: drop the chips row and the tag's ×; `video = state.mode === "video" && videoEnabled` stays the gate for the controls; when `!videoEnabled` the textarea's placeholder and `canSend` say so (the "Text chat is not connected" error goes with the text mode).
- `lib/composer-state.ts › canSend`: with the plugin off nothing sends.
- Remove `components/composer/Showcase.tsx`, `lib/showcase.ts` and their tests; the reducer loses `scene` and `clear-scene`; `Composer.tsx` loses `showcaseDismissed` and the mount.
- Remove `components/shell/PromoCard.tsx`, `promo.module.css`, the Shell's mount and the `promoDismissed` preference (`shell-prefs`); `app/page.tsx`'s heading; `Composer.tsx › PLACEHOLDER`.
- The e2e fixtures: a helper `openVideo(page, url)` replacing the click in the specs that had one; the component tests' `renderReady` stops clicking.

## Testing Plan

- **Unit (`composer-state.test.ts`)** — `initialComposer` opens in video mode; `canSend` is false with `videoEnabled` off (through the composer's gate) and true with a prompt; the removed actions (`enter-video-mode`, `leave-video-mode`, `scene`, `clear-scene`) are gone (a type-level change; their cases removed and said so); `showcase.test.ts` removed with its module.
- **Component (`Composer.test.tsx`, `AgentChip.test.tsx`, `AgentSettingsPanel.test.tsx`, …)** — `renderReady` no longer clicks; a case for the plugin off: the placeholder, no tile, no tag, no Agent chip, Send disabled; the tag has no ×; the Showcase card case removed and a check that nothing renders under the card; the new placeholder; the Shell's promo tests (`dialogs.test`, `UserMenu.test` name it) updated to its absence.
- **Integration** — none: no route changes (said so).
- **E2E (every spec that clicked the chip, both widths)** — the click removed; `manage.spec`'s STORY_040 case asserts the text-only placeholder and the disabled Send when the plugin is off and the video composer back when on; `home.spec`/`shell.spec`'s chips-row and promo-card assertions updated to their absence; `composer.spec`'s Showcase case removed and the home asserted to show nothing under the card; the heading and the placeholder asserted once. Regression cover: the whole suite (the click was everywhere).
- **Manual verification:** the deployed home at 1440 and 390, both themes — screenshots for the Done note beside `home-signed-in@1440` and `composer-video-mode@1440`. No GPU.

## Estimated Complexity

Small in code, wide in tests — the reducer's default, five removals (the chip, the ×, the Showcase, the promo card, the text mode's error), two strings; ≈ 50 test sites touched mechanically: ≈ 1 h 30 min of build and gate.

## Corrections found while building (2026-09-18)

1. **`enter-video-mode` went with `leave-video-mode`** — with video the default nothing needed it (the docked composer and an Edit start from `initialComposer`); the AC left the choice open and this is the answer.
2. **The Showcase's `scene` action was also STORY_041's Edit path** (an Edit applies its request's parameters through it). It is now `request` — the same clamp, no mode — so the Showcase's removal did not take the Edit with it; `composer-state.test`'s scene cases became request cases.
3. **The plugin-off state has no `canSend` change**: `canSend` is pure over the composer's state and knows no settings, so the gate is the composer's own `video` flag — Send is disabled and `send()` returns when it is false; the *+ › Skills* director rows carry the same sentence as their reason.
4. **The inert-control test of the Shell** (`UserMenu.test`) drove the promo card's *Download desktop*; with the card gone it renders an `Inert` inside the Shell's page instead — the notice mechanism it tests is the Shell's, not the card's.
5. **The docked composer keeps the true placeholder** (it is always video); the plugin-off placeholder shows only on the home.

## Done note (2026-09-18)

**Built** (13:25 → 13:45 EDT): `lib/composer-state.ts` (`mode: "video"` by default; `enter-video-mode`, `leave-video-mode`, `scene`, `clear-scene` removed; `request` for an Edit), `Composer.tsx` (the chips row, the tag's ×, the Showcase mount and the text-mode error gone; the placeholder *Describe the video — or attach a photo and turn Agent on*; with the plugin off the placeholder says so, Send is disabled and `send()` returns), `Showcase.tsx` / `lib/showcase.ts` / `PromoCard.tsx` / `promo.module.css` deleted, the Shell's mount and `shell-prefs`' `promoDismissed` gone, `app/page.tsx`'s heading *MiniMax*. Unit: `composer-state.test` (opens in video mode; the one mode; a request's clamp), `shell-prefs.test`, `submit-job.test`'s helpers. Component: `Composer.test` (the opening state, the plugin-off state with the disabled Send, no chips and no Showcase, the director rows' reason), `AgentChip.test`, `UserMenu.test`, `dialogs.test` (the card's cases removed), and every helper that clicked the chip. E2E: the click removed from 31 sites across 12 specs and the trial specs; `composer.spec` (the opening state — the tag without ×, the reference button, the placeholder, nothing under the card, no card in the corner, the heading; the chips-row and Showcase cases replaced), `shell.spec` (no chips, no promo), `manage.spec` (the plugin-off placeholder and the disabled Send), `smoke.spec` (the heading). **Gate** 6/6 by hand (e2e 139 — two cases fewer, the Showcase's and the promo's). **Deployed** after the Spark's draw; the screenshots at 1440 and 390 in both themes are the addendum below.
