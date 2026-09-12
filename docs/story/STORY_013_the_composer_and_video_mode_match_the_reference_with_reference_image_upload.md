# STORY_013 — The composer and its video mode match the reference, with reference-image upload and the options the Spark supports

**Epic:** [EPIC_003](../epic/EPIC_003_the_video_generation_screen_is_rebuilt_to_match_the_reference.md)
**Status:** Ready (drafted 2026-09-12)
**Created:** 2026-09-12

As the owner, I want the home composer to look and behave like the reference's — the card, the mode chips, and in video mode the reference tile, the `video-creator` tag, the Model menu and the Video parameters popover — so that I type a prompt, attach up to two images, pick ratio, resolution and duration, and press Send exactly as I would on agent.minimax.io, with the options the Spark cannot honour visibly unavailable.

## Current state

STORY_012 renders the shell and the heading. No composer. The app's routes accept JSON or multipart jobs (STORY_009) and `GET /api/capabilities` says what the server offers.

## UI Mockup

**Reference captures:** `home-signed-in@1440.png` (composer card, mode chips), `composer-typed@1440.png` (text entered, Send enabled), `composer-video-mode@1440.png` (reference tile, plugin tag, Model and Video parameters buttons), `attach-menu-open@1440.png` (the + menu — inert here), `model-menu-open@1440.png`, `video-params-open@1440.png`, `scene-selected@1440.png` (a chosen reference image as a thumbnail with its remove ×), `narrow-video-mode@390.png`, `narrow-video-params@390.png`. Measured ([tokens.md](../recon/2026-09-12/tokens.md) › composer, chips, popover):

| Value | Committed |
| --- | --- |
| Composer card | 736 px wide (732 at 1024, 608 at 900, 358 at 390), radius 20 px (16 px at 390), `#fff`, shadow `rgba(10,10,10,0.08) 0 0 10px`; editor 16 px/26 px, placeholder "Enter message... (use / for commands)" in `rgb(173,173,173)` |
| Bottom bar | **+** icon button (radius 10 px), **Agent Team** switch (blue `rgb(0,148,252)` text, inert), **MiniMax-M3** selector (inert), **Send** round 32 px black button (`--gray_1000`) with an up arrow, grey `rgb(173,173,173)` and disabled while the editor is empty |
| Mode chips | 32 px tall, radius 8 px, 1 px border `rgba(10,10,10,0.08)`, 14 px text; **Video generation** carries an "H3" pill (violet `--violet_500` tint `--opacity_purple_500_10`); Document, Website, Image Generation, More rendered inert |
| Video mode | reference tile 90×90, radius 12 px, `rgb(245,245,245)`, "+" and "Reference" in `rgb(173,173,173)` 12 px; plugin tag `video-creator` purple pill (`--purple_50` fill, `--purple_500` text) inline before the text; Model button "MiniMax-H3" with chevron; Video parameters button showing ratio icon + "16:9", "2K"/"768P", clock + "5s" |
| Popover | radius 12 px, 14 px/22 px, section labels 11 px/14 px `rgb(173,173,173)`; Ratio tiles 67×44, radius 6 px, selected white on a grey track; Resolution two half-width segments; Duration segments 5s … 15s, 12 px/500 |
| Narrow (390) | composer 358 px, the bottom bar truncates and the Video parameters button leaves the viewport in the reference; ours wraps the bar onto two rows instead (Departures) |

**ASCII — states the captures do not show:**

```
video mode with two references and text          Model menu with the Spark's truth (from /api/capabilities)
┌──────────────────────────────────────────┐    ┌───────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐                     │    │ ● MiniMax-H3.0            │
│ │img1│×│img2│×│ +  │                     │    │   MiniMax-H3-Max  (not on the Spark)   ← disabled
│ └────┘ └────┘ │Ref.│                     │    │   Hailuo-2.3      (not on the Spark)   ← disabled
│ ▣ video-creator  A paper boat drifting…  │    └───────────────────────────┘
│                                          │
│ +  ▣ Agent Team  [◉ MiniMax-H3 ⌄] [▭ 16:9 768P ◷ 5s]     MiniMax-M3 ⌄  (●)│
└──────────────────────────────────────────┘
Video parameters (2K unavailable)                 Validation (an image the app refuses)
Resolution:  [  768P  ][  2K — not on the Spark ] │ ⓘ ref.gif: reference images must be PNG, JPEG or WebP │
```

## Acceptance Criteria

- [ ] `components/composer/Composer.tsx` renders the card, editor (a textarea styled as the reference's contenteditable; Enter sends, Shift+Enter breaks a line), the bottom bar and the mode chips, matching the values above at 1440 and 390.
- [ ] The **Video generation** chip toggles video mode: the reference tile, the `video-creator` tag, the Model button and the Video parameters button appear; removing the tag (its ×) or clicking the chip again leaves video mode. Other chips are inert.
- [ ] Reference tile: click opens the file chooser (`accept="image/png,image/jpeg,image/webp"`, up to 2); a chosen image renders as a 90×90 thumbnail with **Remove Reference image N**; a third file, a wrong type or a file over 10 MB is refused with the inline message from `lib/upload-validation.ts` before anything is sent. Drag-and-drop onto the card does the same.
- [ ] Model menu lists the reference's three models; only the ids in `capabilities.models` are enabled (MiniMax-H3.0), the others show "not on the Spark" and cannot be chosen.
- [ ] Video parameters popover: Ratio (six tiles, from `capabilities.ratios`), Resolution (768P, 2K; 2K disabled with "not on the Spark" when absent from `capabilities.resolutions`), Duration (from `capabilities.durationsSeconds`, one segment per second; default 5 s); the button's label reflects the choice; the popover closes on outside click and Escape and settles before it can be measured.
- [ ] **Send** is disabled until the editor has non-blank text; in video mode it `POST`s `/api/jobs` (JSON, or multipart with the images) with `{ prompt, ratio, resolution, durationSeconds, model }`, then navigates to `/task/<id>` (STORY_014). The request starts before any local state is cleared ([CLAUDE.md → §4c](../../CLAUDE.md#4c-lessons-carried-over)). A `400` from the server shows its `message` under the composer with the field highlighted; a `503 busy` says "The Spark is busy; try again in a moment".
- [ ] Outside video mode, Send does nothing but show "MiniMax Local only generates videos — pick Video generation" (Departures).
- [ ] Capabilities are fetched once on mount through `/api/capabilities`; until they arrive the video-mode controls render disabled; if the fetch fails the composer shows "The generation server is unreachable" and Send stays disabled.

## Departures from the reference

- ShowCase row omitted: its sample videos and images are the reference's assets, which we neither lift nor own.
- The **+** attachment menu, **Agent Team** switch and **MiniMax-M3** agent selector are inert: there is no agent locally.
- Non-video modes are inert; Send outside video mode explains why instead of doing nothing silently.
- The Duration row follows `capabilities.durationsSeconds` (4–15 s on the Spark, per the model card) rather than the reference's 5–15 s.
- At 390 the bottom bar wraps onto two rows so the Video parameters control stays reachable; the reference lets it leave the viewport ([tokens.md → breakpoints](../recon/2026-09-12/tokens.md)).

## Technical Notes

- Composer state is a reducer (`lib/composer-state.ts`): mode, text, images (File + object URL), model, ratio, resolution, duration, error. Pure and unit-tested; the component is thin.
- The submit path builds `FormData` when images are present, JSON otherwise (mirrors STORY_009's route contract). The `/task/<id>` navigation happens after the `202`.
- Object URLs are revoked on remove/unmount.

## Testing Plan

- **Unit** — `lib/composer-state.test.ts`: entering video mode sets defaults from capabilities; leaving clears images; adding a third image is refused with the validation message; wrong type refused; choosing a disabled model/resolution is a no-op; `canSend` is false for blank text. `components/composer/Composer.test.tsx` (jsdom + RTL): the chip toggles the video controls; Send disabled/enabled with text; the popover opens/closes on Escape; 2K is disabled when capabilities omit it; a `400` response renders the server's message.
- **Integration** — N/A: the routes are STORY_009's; this story adds no server code.
- **E2E** — `e2e/composer.spec.ts` (desktop + narrow): open `/`, choose Video generation, open Video parameters, pick 9:16 and 10 s, see the button label change; open the Model menu and see the two disabled models; upload `fixture-reference.png` through the tile (via `setInputFiles`), see the thumbnail, remove it; type a prompt, register `waitForResponse` on `POST /api/jobs`, click Send, assert the request body/multipart the stub received (`received(id)`: prompt, ratio, duration) and that the URL becomes `/task/<id>`; the created job is left in `done-after-1-poll` and finished by the `afterEach` guard. Regression: `shell.spec.ts` and `smoke.spec.ts` stay green.

## Estimated Complexity

L
