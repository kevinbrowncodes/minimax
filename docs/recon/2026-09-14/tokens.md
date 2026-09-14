# Design tokens — https://agent.minimax.io/ — 2026-09-14

Measured from computed styles in our own browser (see STORY_003). Values are what the reference rendered that day; cite this file's date.

## Fonts

Body font stack: `ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"`  
Body background: `rgb(255, 255, 255)`

Loaded font faces: `KaTeX_AMS`, `KaTeX_Caligraphic`, `KaTeX_Fraktur`, `KaTeX_Main`, `KaTeX_Math`, `KaTeX_SansSerif`, `KaTeX_Script`, `KaTeX_Size1`, `KaTeX_Size2`, `KaTeX_Size3`, `KaTeX_Size4`, `KaTeX_Typewriter`, `Outfit`, `SourceSerif`, `SourceSerifItalic`

- Font families actually used on the 306 measured elements: `ui-sans-serif` (236).
- Outfit is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element.
- Source Serif is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element.
- KaTeX faces come from the maths renderer and are not part of the product's own type system.
- The body stack is a system sans-serif stack, so no substitute font is needed for the clone: the same stack renders the same on the owner's Mac.
- Both themes measured; the reference was found in light and put back.

## Breakpoints

From the stylesheets (min/max-width queries): 324px, 640px, 668px, 767px, 768px, 769px, 900px, 1050px, 1120px, 1536px, 1546px  
Observed layout changes when narrowing: at 820px, at 560px, at 360px

| width | sidebar expanded | composer width | showcase columns | params control visible |
| --- | --- | --- | --- | --- |
| 1440 | yes | 736 | 4 | yes |
| 1280 | yes | 736 | 4 | yes |
| 1100 | yes | 736 | 4 | yes |
| 1024 | yes | 732 | 4 | yes |
| 900 | yes | 608 | 4 | yes |
| 820 | no | 736 | 4 | yes |
| 768 | no | 684 | 4 | yes |
| 700 | no | 668 | 4 | yes |
| 640 | no | 608 | 4 | yes |
| 560 | no | 528 | 2 | yes |
| 480 | no | 448 | 2 | yes |
| 430 | no | 398 | 2 | yes |
| 390 | no | 358 | 2 | yes |
| 360 | no | 328 | 2 | no |

## Theme switch

Control: Settings › General › Appearance › "Dark mode" (was "light")  
Document before: `<html lang="en" translate="no" class="notranslate light" data-mavis-surface="web" style="color-scheme: light;"> color-scheme:light body.class=""`  
Document after: `<html lang="en" translate="no" class="notranslate dark" data-mavis-surface="web" style="color-scheme: dark;"> color-scheme:dark body.class=""`  
Body background light: `rgb(255, 255, 255)` · dark: `rgb(28, 28, 28)`

## Palette

| colour | seen on |
| --- | --- |
| `rgb(23, 23, 23)` | agent-model-button@1440, appearance-option@1440, asset-tile-name@1440, credits-buy@1440 +48 |
| `rgb(255, 255, 255)` | body@1440, composer-docked@1440, composer-video@1440, composer-video@390 +23 |
| `rgb(51, 51, 51)` | asset-tile:focus@1440, asset-tile:hover@1440, asset-tile@1440, body@1440 +23 |
| `rgba(10, 10, 10, 0.08)` | composer-docked@1440, composer-video@1440, composer-video@390, composer@1440 +18 |
| `rgb(173, 173, 173)` | appearance-card-selected@1440, appearance-card@1440, appearance-option-label@1440, footer-disclaimer@1440 +10 |
| `rgb(102, 102, 102)` | attach-button@1440, filter:focus@1440, filter@1440, page-tab@1440 +7 |
| `rgba(10, 10, 10, 0.04)` | credits-buy@1440, filter-active@1440, filter:hover@1440, mode-chip:hover@1440 +7 |
| `rgb(245, 245, 245)` | page-primary-button@1440, preference-row@1440, reference-tile@1440, reference-tile@390 +2 |
| `rgba(10, 10, 10, 0)` | mode-chip:focus@1440, mode-chip@1440, search-input@1440 |
| `rgb(0, 148, 252)` | preference-switch@1440 |

## Palette (dark)

| colour | seen on |
| --- | --- |
| `rgb(237, 237, 237)` | agent-model-button@1440, appearance-option@1440, asset-tile-name@1440, credits-buy@1440 +46 |
| `rgb(51, 51, 51)` | asset-tile:focus@1440, asset-tile:hover@1440, asset-tile@1440, body@1440 +22 |
| `rgba(255, 255, 255, 0.07)` | composer-docked@1440, composer-video@1440, composer-video@390, composer@1440 +19 |
| `rgb(148, 148, 148)` | attach-button@1440, filter:focus@1440, filter@1440, page-tab@1440 +11 |
| `rgb(38, 38, 38)` | composer-docked@1440, composer-video@1440, composer-video@390, composer@1440 +11 |
| `rgb(102, 102, 102)` | appearance-card-selected@1440, appearance-card@1440, appearance-option-label@1440, footer-disclaimer@1440 +6 |
| `rgb(28, 28, 28)` | body@1440, jump-button@1440, page@1440, primary-button:focus@1440 +5 |
| `rgba(255, 255, 255, 0.04)` | credits-buy@1440, filter-active@1440, filter:hover@1440, mode-chip:hover@1440 +5 |
| `rgb(23, 23, 23)` | credits-subscribe@1440, send-button:focus@1440, send-button:hover@1440, send-button@1440 +1 |
| `rgb(48, 48, 48)` | page-primary-button@1440, reference-tile@1440, reference-tile@390, sidebar-item-active@1440 |
| `rgba(255, 255, 255, 0)` | mode-chip:focus@1440, mode-chip@1440, search-input@1440 |
| `rgb(255, 255, 255)` | credits-subscribe@1440, send-button@390 |
| `rgb(0, 119, 217)` | preference-switch@1440 |
| `rgb(59, 59, 59)` | page-input@1440 |

## Type scale

| size | weight | line-height | family | seen on |
| --- | --- | --- | --- | --- |
| 32px | 400 | normal | `ui-sans-serif` | heading@1440, page-heading@1440, heading@1440 (dark), page-heading@1440 (dark) |
| 26px | 500 | 32px | `ui-sans-serif` | page-title@1440, page-title@1440 (dark) |
| 24px | 400 | 32px | `ui-sans-serif` | heading@390, heading@390 (dark) |
| 20px | 500 | 30px | `ui-sans-serif` | settings-title@1440, settings-title@1440 (dark) |
| 16px | 400 | 26px | `ui-sans-serif` | editor@1440, page-body-text@1440, result-card@1440, result-file-name@1440 +4 |
| 16px | 400 | 24px | `ui-sans-serif` | settings-modal@1440, appearance-option@1440, appearance-card-selected@1440, appearance-card@1440 +6 |
| 16px | 500 | 26px | `ui-sans-serif` | tab-active@1440, tab@1440, tab-active@1440 (dark), tab@1440 (dark) |
| 16px | 600 | 26px | `ui-sans-serif` | page-heading@1440, page-heading@1440 (dark) |
| 14px | 400 | 20px | `ui-sans-serif` | sidebar-item-active@1440, sidebar-item@1440, agent-model-button@1440, mode-chip-video@1440 +72 |
| 14px | 400 | 22px | `ui-sans-serif` | popover@1440, menu@1440, menu-item@1440, menu-item-selected@1440 +6 |
| 14px | 400 | 21px | `ui-sans-serif` | settings-nav-active@1440, settings-nav-item@1440, appearance-option-label@1440, page-input@1440 +6 |
| 14px | 400 | 16px | `ui-sans-serif` | preference-switch@1440, preference-switch@1440 (dark) |
| 14px | 400 | 18px | `ui-sans-serif` | credits-buy@1440, credits-subscribe@1440, credits-buy@1440 (dark), credits-subscribe@1440 (dark) |
| 14px | 500 | 20px | `ui-sans-serif` | settings-section-heading@1440, page-tab-active@1440, settings-section-heading@1440 (dark), page-tab-active@1440 (dark) |
| 13px | 400 | 19.5px | `ui-sans-serif` | body@1440, sidebar@1440, sidebar-section-label@1440, sidebar-user-chip@1440 +72 |
| 12px | 400 | 16px | `ui-sans-serif` | showcase-caption@1440, preference-description@1440, page-body-text@1440, showcase-caption@1440 (dark) +2 |
| 12px | 500 | 16px | `ui-sans-serif` | radio-selected@1440, radio@1440, radio-resolution@1440, radio-duration-selected@1440 +6 |
| 11px | 400 | 14px | `ui-sans-serif` | popover-section-label@1440, popover-section-label@1440 (dark) |
| 10px | 400 | 14px | `ui-sans-serif` | footer-disclaimer@1440, footer-disclaimer@1440 (dark) |

## Spacing (paddings and gaps)

`1px`, `2px`, `4px`, `6px`, `8px`, `10px`, `11px`, `12px`, `14px`, `16px`, `24px`, `32px`, `36px`, `64px`

## Radii

| radius | seen on |
| --- | --- |
| `6px` | page-tab-active@1440, page-tab@1440, radio-duration-selected@1440, radio-duration@1440 +3 |
| `8px` | credits-buy@1440, credits-subscribe@1440, empty-cta@1440, filter-active@1440 +24 |
| `10px` | agent-model-button@1440, attach-button@1440, mode-chip:focus@1440, mode-chip:hover@1440 +7 |
| `12px` | menu@1440, popover@1440, preference-row@1440, reference-tile@1440 +2 |
| `14px` | composer-docked@1440, composer-video@390 |
| `16px` | credits-notice@1440, user-bubble@1440 |
| `20px` | composer-video@1440, composer@1440 |
| `64px` | preference-switch@1440 |
| `9999px` | jump-button@1440 |

## Shadows

| shadow | seen on |
| --- | --- |
| `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px` | composer-video@1440, composer-video@390, composer@1440 |
| `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(10, 10, 10, 0.08) 0px 0px 20px 0px` | composer-docked@1440, credits-notice@1440 |

## Motion

| duration | timing | seen on |
| --- | --- | --- |
| 0.15s | cubic-bezier(0.4, 0, 0.2, 1) | sidebar-item-active@1440, sidebar-item@1440, attach-button@1440, agent-model-button@1440 +92 |
| 0.2s | ease | menu-item@1440, menu-item-selected@1440, settings-nav-active@1440, settings-nav-item@1440 +6 |
| 0.3s | ease | credits-buy@1440, credits-subscribe@1440, credits-buy@1440, credits-subscribe@1440 |
| 0.27s, 0.27s, 0.27s | cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1) | sidebar@1440, sidebar@1440 |
| 0.2s | cubic-bezier(0.4, 0, 0.2, 1) | appearance-option@1440, appearance-option@1440 |
| 0.2s, 0.2s | ease, ease | page-input@1440, page-input@1440 |

## CSS custom properties on :root (light and dark)

Dark values declared under: `.dark`, `html[data-prefers-color-scheme=dark]`

| name | light | dark |
| --- | --- | --- |
| `--blue_25` | `#f5fbff` | `—` |
| `--blue_50` | `#e5f5ff` | `—` |
| `--blue_75` | `#c4e7ff` | `—` |
| `--blue_100` | `#93d2ff` | `—` |
| `--blue_200` | `#68c0ff` | `—` |
| `--blue_300` | `#3daeff` | `—` |
| `--blue_400` | `#0094fc` | `—` |
| `--blue_500` | `#0077d9` | `—` |
| `--blue_600` | `#005fb8` | `—` |
| `--blue_700` | `#004b96` | `—` |
| `--blue_800` | `#00244d` | `—` |
| `--blue_900` | `#001226` | `—` |
| `--blue_1000` | `#000c14` | `—` |
| `--cyan_25` | `#f0fbfb` | `—` |
| `--cyan_50` | `#dcf5f5` | `—` |
| `--cyan_75` | `#ace7e9` | `—` |
| `--cyan_100` | `#75dcdf` | `—` |
| `--cyan_200` | `#1ccdd2` | `—` |
| `--cyan_300` | `#00bdc1` | `—` |
| `--cyan_400` | `#00a8ae` | `—` |
| `--cyan_500` | `#008e94` | `—` |
| `--cyan_600` | `#00767d` | `—` |
| `--cyan_700` | `#005e63` | `—` |
| `--cyan_800` | `#003a3e` | `—` |
| `--cyan_900` | `#001d1f` | `—` |
| `--cyan_1000` | `#000f0f` | `—` |
| `--gray_0` | `#fff` | `—` |
| `--gray_50` | `#fafafa` | `—` |
| `--gray_75` | `#f5f5f5` | `—` |
| `--gray_100` | `#ededed` | `—` |
| `--gray_200` | `#ccc` | `—` |
| `--gray_300` | `#adadad` | `—` |
| `--gray_400` | `#949494` | `—` |
| `--gray_500` | `#666` | `—` |
| `--gray_600` | `#4a4a4a` | `—` |
| `--gray_700` | `#303030` | `—` |
| `--gray_800` | `#262626` | `—` |
| `--gray_900` | `#1c1c1c` | `—` |
| `--gray_1000` | `#171717` | `—` |
| `--green_25` | `#edfaf2` | `—` |
| `--green_50` | `#d9f4e4` | `—` |
| `--green_75` | `#a5e5bf` | `—` |
| `--green_100` | `#80e0a6` | `—` |
| `--green_200` | `#4ed082` | `—` |
| `--green_300` | `#28c567` | `—` |
| `--green_400` | `#04b54b` | `—` |
| `--green_500` | `#009c3d` | `—` |
| `--green_600` | `#008635` | `—` |
| `--green_700` | `#00692a` | `—` |
| `--green_800` | `#004f1f` | `—` |
| `--green_900` | `#082614` | `—` |
| `--green_1000` | `#001207` | `—` |
| `--opacity_black_1_0` | `#0a0a0a00` | `—` |
| `--opacity_black_1_2` | `#0a0a0a05` | `—` |
| `--opacity_black_1_4` | `#0a0a0a0a` | `—` |
| `--opacity_black_1_8` | `#0a0a0a14` | `—` |
| `--opacity_black_1_15` | `#0a0a0a26` | `—` |
| `--opacity_black_1_20` | `#0a0a0a33` | `—` |
| `--opacity_black_1_25` | `#0a0a0a40` | `—` |
| `--opacity_black_1_50` | `#0a0a0a80` | `—` |
| `--opacity_black_1_70` | `#0a0a0ab2` | `—` |
| `--opacity_black_1_80` | `#0a0a0acc` | `—` |
| `--opacity_black_1_90` | `#0a0a0ae5` | `—` |
| `--opacity_black_1_95` | `#0a0a0af2` | `—` |
| `--opacity_white_0_0` | `#ffffff00` | `—` |
| `--opacity_white_0_2` | `#ffffff05` | `—` |
| `--opacity_white_0_4` | `#ffffff0a` | `—` |
| `--opacity_white_0_8` | `#ffffff12` | `—` |
| `--opacity_white_0_15` | `#ffffff26` | `—` |
| `--opacity_white_0_20` | `#ffffff33` | `—` |
| `--opacity_white_0_25` | `#ffffff40` | `—` |
| `--opacity_white_0_50` | `#ffffff80` | `—` |
| `--opacity_white_0_70` | `#ffffffb2` | `—` |
| `--opacity_white_0_80` | `#ffffffcc` | `—` |
| `--opacity_white_0_90` | `#ffffffe5` | `—` |
| `--opacity_white_0_95` | `#fffffff2` | `—` |
| `--opacity_purple_500_10` | `#9a55c21a` | `—` |
| `--orange_25` | `#fff6f0` | `—` |
| `--orange_50` | `#ffeee3` | `—` |
| `--orange_75` | `#ffd0b2` | `—` |
| `--orange_100` | `#ffb485` | `—` |
| `--orange_200` | `#ff9452` | `—` |
| `--orange_300` | `#fa8237` | `—` |
| `--orange_400` | `#f56811` | `—` |
| `--orange_500` | `#e25507` | `—` |
| `--orange_600` | `#b9480d` | `—` |
| `--orange_700` | `#923b0f` | `—` |
| `--orange_800` | `#4d200b` | `—` |
| `--orange_900` | `#311908` | `—` |
| `--orange_1000` | `#1a0a00` | `—` |
| `--purple_25` | `#f9f8fe` | `—` |
| `--purple_50` | `#f3f0fc` | `—` |
| `--purple_75` | `#e1d7f9` | `—` |
| `--purple_100` | `#ceb9f5` | `—` |
| `--purple_200` | `#c29ff0` | `—` |
| `--purple_300` | `#b887ec` | `—` |
| `--purple_400` | `#b06add` | `—` |
| `--purple_500` | `#9a55c2` | `—` |
| `--purple_600` | `#8144a2` | `—` |
| `--purple_700` | `#693584` | `—` |
| `--purple_800` | `#331842` | `—` |
| `--purple_900` | `#1b0d27` | `—` |
| `--purple_1000` | `#090514` | `—` |
| `--violet_500` | `#8147f6` | `—` |
| `--red_25` | `#fef6f7` | `—` |
| `--red_50` | `#feedee` | `—` |
| `--red_75` | `#ffc9ce` | `—` |
| `--red_100` | `#ffa3ab` | `—` |
| `--red_200` | `#ff828c` | `—` |
| `--red_300` | `#ff5e6c` | `—` |
| `--red_400` | `#f73646` | `—` |
| `--red_500` | `#e31937` | `—` |
| `--red_600` | `#bf152f` | `—` |
| `--red_700` | `#9e0e24` | `—` |
| `--red_800` | `#4d0610` | `—` |
| `--red_900` | `#33030a` | `—` |
| `--red_1000` | `#140003` | `—` |
| `--yellow_25` | `#fff9ed` | `—` |
| `--yellow_50` | `#fff3d9` | `—` |
| `--yellow_75` | `#ffe9b8` | `—` |
| `--yellow_100` | `#ffdb8c` | `—` |
| `--yellow_200` | `#ffcf66` | `—` |
| `--yellow_300` | `#ffc340` | `—` |
| `--yellow_400` | `#ffae00` | `—` |
| `--yellow_500` | `#e09900` | `—` |
| `--yellow_600` | `#ba7f00` | `—` |
| `--yellow_700` | `#916300` | `—` |
| `--yellow_800` | `#4d3400` | `—` |
| `--yellow_900` | `#261a00` | `—` |
| `--yellow_1000` | `#120e00` | `—` |
| `--radius_4` | `4px` | `—` |
| `--radius_8` | `8px` | `—` |
| `--radius_12` | `12px` | `—` |
| `--radius_16` | `16px` | `—` |
| `--radius_20` | `20px` | `—` |
| `--radius_24` | `24px` | `—` |
| `--radius_32` | `32px` | `—` |
| `--radius_full` | `999px` | `—` |
| `--spacing_0` | `0px` | `—` |
| `--spacing_2` | `2px` | `—` |
| `--spacing_4` | `4px` | `—` |
| `--spacing_6` | `6px` | `—` |
| `--spacing_8` | `8px` | `—` |
| `--spacing_12` | `12px` | `—` |
| `--spacing_16` | `16px` | `—` |
| `--spacing_20` | `20px` | `—` |
| `--spacing_24` | `24px` | `—` |
| `--spacing_32` | `32px` | `—` |
| `--spacing_40` | `40px` | `—` |
| `--spacing_48` | `48px` | `—` |
| `--spacing_64` | `64px` | `—` |
| `--spacing_90` | `90px` | `—` |
| `--spacing_128` | `128px` | `—` |
| `--line_height_16` | `16px` | `—` |
| `--line_height_18` | `18px` | `—` |
| `--line_height_20` | `20px` | `—` |
| `--line_height_22` | `22px` | `—` |
| `--line_height_26` | `26px` | `—` |
| `--line_height_28` | `28px` | `—` |
| `--line_height_36` | `36px` | `—` |
| `--line_height_40` | `40px` | `—` |
| `--size_12` | `12px` | `—` |
| `--size_14` | `14px` | `—` |
| `--size_16` | `16px` | `—` |
| `--size_20` | `20px` | `—` |
| `--size_24` | `24px` | `—` |
| `--size_32` | `32px` | `—` |
| `--size_40` | `40px` | `—` |
| `--size_48` | `48px` | `—` |
| `--size_64` | `64px` | `—` |
| `--weight_regular` | `400px` | `—` |
| `--weight_medium` | `500px` | `—` |
| `--bg_default_primary` | `var(--gray_0)` | `var(--gray_1000)` |
| `--bg_default_primary_elevated` | `var(--gray_0)` | `var(--gray_900)` |
| `--bg_default_secondary` | `var(--gray_75)` | `var(--gray_900)` |
| `--bg_default_secondary_elevated` | `var(--gray_75)` | `var(--gray_800)` |
| `--bg_default_tertiary` | `var(--gray_0)` | `var(--gray_800)` |
| `--bg_default_tertiary_elevated` | `var(--gray_0)` | `var(--gray_700)` |
| `--bg_default_scrim` | `var(--gray_50)` | `var(--gray_1000)` |
| `--bg_grouped_primary` | `var(--gray_75)` | `var(--gray_1000)` |
| `--bg_grouped_primary_elevated` | `var(--gray_75)` | `var(--gray_900)` |
| `--bg_grouped_secondary` | `var(--gray_0)` | `var(--gray_900)` |
| `--bg_grouped_secondary_elevated` | `var(--gray_0)` | `var(--gray_800)` |
| `--bg_grouped_tertiary` | `var(--gray_75)` | `var(--gray_800)` |
| `--bg_grouped_tertiary_elevated` | `var(--gray_75)` | `var(--gray_700)` |
| `--bg_interaction_accent_default` | `var(--opacity_white_0_0)` | `var(--opacity_black_1_0)` |
| `--bg_interaction_accent_hover` | `#0094fc0a` | `#0064ab1a` |
| `--bg_interaction_accent_inactive` | `var(--opacity_white_0_0)` | `var(--opacity_black_1_0)` |
| `--bg_interaction_accent_press` | `#0094fc14` | `#0064ab26` |
| `--bg_interaction_accent_focus_blue` | `var(--blue_400)` | `var(--blue_400)` |
| `--bg_interaction_accent_focus_highlight` | `var(--blue_75)` | `var(--blue_800)` |
| `--bg_interaction_danger_primary_default` | `var(--red_400)` | `var(--red_500)` |
| `--bg_interaction_danger_primary_hover` | `var(--red_300)` | `var(--red_400)` |
| `--bg_interaction_danger_primary_inactive` | `var(--red_100)` | `var(--red_800)` |
| `--bg_interaction_danger_primary_press` | `var(--red_500)` | `var(--red_600)` |
| `--bg_interaction_danger_secondary_default` | `var(--red_50)` | `var(--red_900)` |
| `--bg_interaction_danger_secondary_hover` | `var(--red_25)` | `var(--red_800)` |
| `--bg_interaction_danger_secondary_inactive` | `var(--red_25)` | `var(--red_900)` |
| `--bg_interaction_danger_secondary_press` | `var(--red_75)` | `var(--red_900)` |
| `--bg_interaction_positive_default` | `var(--green_400)` | `var(--green_500)` |
| `--bg_interaction_positive_hover` | `var(--green_300)` | `var(--green_400)` |
| `--bg_interaction_positive_inactive` | `var(--green_400)` | `var(--green_500)` |
| `--bg_interaction_positive_press` | `var(--green_400)` | `var(--green_600)` |
| `--bg_interaction_primary_default` | `var(--gray_1000)` | `var(--gray_0)` |
| `--bg_interaction_primary_hover` | `var(--opacity_black_1_80)` | `var(--opacity_white_0_80)` |
| `--bg_interaction_primary_inactive` | `var(--gray_300)` | `var(--gray_400)` |
| `--bg_interaction_primary_press` | `var(--opacity_black_1_90)` | `var(--opacity_white_0_90)` |
| `--bg_interaction_primary_selected` | `var(--gray_1000)` | `var(--gray_0)` |
| `--bg_interaction_secondary_default` | `var(--opacity_black_1_4)` | `var(--opacity_white_0_4)` |
| `--bg_interaction_secondary_hover` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_8)` |
| `--bg_interaction_secondary_inactive` | `var(--opacity_black_1_0)` | `var(--opacity_white_0_0)` |
| `--bg_interaction_secondary_press` | `var(--opacity_black_1_15)` | `var(--opacity_white_0_4)` |
| `--bg_interaction_secondary_selected` | `var(--gray_50)` | `var(--gray_800)` |
| `--bg_interaction_tertiary_default` | `var(--opacity_black_1_0)` | `var(--opacity_white_0_0)` |
| `--bg_interaction_tertiary_hover` | `var(--opacity_black_1_4)` | `var(--opacity_white_0_4)` |
| `--bg_interaction_tertiary_inactive` | `var(--opacity_black_1_0)` | `var(--opacity_white_0_0)` |
| `--bg_interaction_tertiary_press` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_8)` |
| `--bg_interaction_tertiary_selected` | `var(--opacity_black_1_4)` | `var(--opacity_white_0_8)` |
| `--bg_interaction_video_generation_default` | `var(--opacity_black_1_0)` | `var(--opacity_white_0_0)` |
| `--bg_interaction_video_generation_hover` | `var(--violet_500)` | `var(--violet_500)` |
| `--bg_interaction_video_generation_selected` | `var(--violet_500)` | `var(--violet_500)` |
| `--bg_interaction_warning_default` | `var(--orange_300)` | `var(--orange_500)` |
| `--bg_interaction_warning_hover` | `var(--orange_200)` | `var(--orange_400)` |
| `--bg_interaction_warning_inactive` | `var(--orange_300)` | `var(--orange_500)` |
| `--bg_interaction_warning_press` | `var(--orange_300)` | `var(--orange_600)` |
| `--bg_status_blue` | `var(--blue_50)` | `#0078ff1a` |
| `--bg_status_error` | `var(--red_50)` | `var(--red_900)` |
| `--bg_status_positive` | `var(--green_50)` | `var(--green_900)` |
| `--bg_status_tag` | `var(--gray_1000)` | `var(--gray_0)` |
| `--bg_status_video_generation` | `var(--opacity_purple_500_10)` | `var(--opacity_purple_500_10)` |
| `--bg_status_warning` | `var(--orange_50)` | `var(--orange_900)` |
| `--border_accent` | `var(--blue_400)` | `var(--blue_500)` |
| `--border_default` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_8)` |
| `--border_heavy` | `var(--opacity_black_1_95)` | `var(--opacity_white_0_95)` |
| `--border_light` | `var(--opacity_black_1_4)` | `var(--opacity_white_0_4)` |
| `--border_danger_default` | `var(--red_500)` | `var(--red_500)` |
| `--border_danger_hover` | `var(--red_300)` | `var(--red_400)` |
| `--border_danger_inactive` | `var(--red_75)` | `var(--red_700)` |
| `--border_danger_press` | `var(--red_500)` | `var(--red_600)` |
| `--border_status_blue` | `var(--blue_50)` | `var(--blue_700)` |
| `--border_status_error` | `var(--red_50)` | `var(--red_900)` |
| `--border_status_success` | `var(--green_50)` | `var(--green_900)` |
| `--border_status_warning` | `var(--orange_50)` | `var(--orange_900)` |
| `--border_tertiary_default` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_8)` |
| `--border_tertiary_hover` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_15)` |
| `--border_tertiary_inactive` | `var(--opacity_black_1_8)` | `var(--opacity_white_0_15)` |
| `--border_tertiary_press` | `var(--opacity_black_1_15)` | `var(--opacity_white_0_8)` |
| `--icon_default_accent` | `var(--blue_400)` | `var(--blue_500)` |
| `--icon_default_inverted` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_default_inverted_static` | `var(--opacity_white_0_95)` | `var(--opacity_white_0_95)` |
| `--icon_default_primary` | `var(--gray_1000)` | `var(--gray_100)` |
| `--icon_default_quaternary` | `var(--gray_200)` | `var(--gray_600)` |
| `--icon_default_secondary` | `var(--gray_500)` | `var(--gray_400)` |
| `--icon_default_tertiary` | `var(--gray_300)` | `var(--gray_500)` |
| `--icon_interaction_accent_accent` | `var(--blue_400)` | `var(--blue_500)` |
| `--icon_interaction_accent_default` | `var(--blue_400)` | `var(--blue_200)` |
| `--icon_interaction_accent_hover` | `var(--blue_400)` | `var(--blue_200)` |
| `--icon_interaction_accent_inactive` | `var(--gray_300)` | `var(--gray_500)` |
| `--icon_interaction_accent_press` | `var(--blue_400)` | `var(--blue_200)` |
| `--icon_interaction_danger_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_inactive` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_danger_secondary_default` | `var(--red_400)` | `var(--red_500)` |
| `--icon_interaction_danger_secondary_hover` | `var(--red_300)` | `var(--red_400)` |
| `--icon_interaction_danger_secondary_inactive` | `var(--red_100)` | `var(--red_700)` |
| `--icon_interaction_danger_secondary_press` | `var(--red_500)` | `var(--red_600)` |
| `--icon_interaction_positive_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_inactive` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_positive_secondary_default` | `var(--green_500)` | `var(--green_400)` |
| `--icon_interaction_positive_secondary_hover` | `var(--green_400)` | `var(--green_300)` |
| `--icon_interaction_positive_secondary_inactive` | `var(--green_100)` | `var(--green_700)` |
| `--icon_interaction_positive_secondary_press` | `var(--green_600)` | `var(--green_500)` |
| `--icon_interaction_primary_default` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_interaction_primary_hover` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_interaction_primary_inactive` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_interaction_primary_press` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_interaction_primary_selected` | `var(--gray_0)` | `var(--gray_1000)` |
| `--icon_interaction_secondary_default` | `var(--gray_500)` | `var(--gray_75)` |
| `--icon_interaction_secondary_hover` | `var(--opacity_black_1_50)` | `var(--opacity_white_0_90)` |
| `--icon_interaction_secondary_inactive` | `var(--gray_300)` | `var(--gray_500)` |
| `--icon_interaction_secondary_press` | `var(--opacity_black_1_70)` | `var(--opacity_white_0_80)` |
| `--icon_interaction_secondary_selected` | `var(--gray_800)` | `var(--gray_75)` |
| `--icon_interaction_tertiary_default` | `var(--gray_300)` | `var(--gray_400)` |
| `--icon_interaction_tertiary_hover` | `var(--gray_500)` | `var(--gray_300)` |
| `--icon_interaction_tertiary_inactive` | `var(--gray_200)` | `var(--gray_600)` |
| `--icon_interaction_tertiary_press` | `var(--gray_500)` | `var(--gray_300)` |
| `--icon_interaction_tertiary_selected` | `var(--gray_400)` | `var(--gray_400)` |
| `--icon_interaction_warning_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_inactive` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--icon_interaction_warning_secondary_default` | `var(--orange_400)` | `var(--orange_500)` |
| `--icon_interaction_warning_secondary_hover` | `var(--orange_300)` | `var(--orange_400)` |
| `--icon_interaction_warning_secondary_inactive` | `var(--orange_400)` | `var(--orange_500)` |
| `--icon_interaction_warning_secondary_press` | `var(--orange_400)` | `var(--orange_600)` |
| `--icon_status_error` | `var(--red_400)` | `var(--red_500)` |
| `--icon_status_success` | `var(--green_400)` | `var(--green_500)` |
| `--icon_status_warning` | `var(--orange_400)` | `var(--orange_500)` |
| `--shadow_default` | `var(--opacity_black_1_8)` | `var(--opacity_black_1_50)` |
| `--text_default_accent` | `var(--blue_400)` | `var(--blue_500)` |
| `--text_default_inverted` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_default_inverted_static` | `var(--opacity_white_0_95)` | `var(--opacity_white_0_95)` |
| `--text_default_primary` | `var(--gray_1000)` | `var(--gray_100)` |
| `--text_default_quaternary` | `var(--gray_200)` | `var(--gray_600)` |
| `--text_default_secondary` | `var(--gray_500)` | `var(--gray_400)` |
| `--text_default_tertiary` | `var(--gray_300)` | `var(--gray_500)` |
| `--text_label_accent_default` | `var(--blue_400)` | `var(--blue_500)` |
| `--text_label_accent_hover` | `var(--blue_300)` | `var(--blue_400)` |
| `--text_label_accent_inactive` | `var(--blue_200)` | `var(--blue_700)` |
| `--text_label_accent_press` | `var(--blue_500)` | `var(--blue_500)` |
| `--text_label_danger_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_danger_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_danger_primary_inactive` | `var(--gray_0)` | `var(--opacity_white_0_50)` |
| `--text_label_danger_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_danger_secondary_default` | `var(--red_400)` | `var(--red_500)` |
| `--text_label_danger_secondary_hover` | `var(--red_300)` | `var(--red_400)` |
| `--text_label_danger_secondary_inactive` | `var(--red_100)` | `var(--red_700)` |
| `--text_label_danger_secondary_press` | `var(--red_500)` | `var(--red_600)` |
| `--text_label_positive_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_positive_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_positive_primary_inactive` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_positive_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_positive_secondary_default` | `var(--green_500)` | `var(--green_400)` |
| `--text_label_positive_secondary_hover` | `var(--green_400)` | `var(--green_300)` |
| `--text_label_positive_secondary_inactive` | `var(--green_500)` | `var(--green_400)` |
| `--text_label_positive_secondary_press` | `var(--green_600)` | `var(--green_500)` |
| `--text_label_primary_default` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_label_primary_hover` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_label_primary_inactive` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_label_primary_press` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_label_primary_selected` | `var(--gray_0)` | `var(--gray_1000)` |
| `--text_label_secondary_default` | `var(--gray_500)` | `var(--gray_75)` |
| `--text_label_secondary_hover` | `var(--opacity_black_1_50)` | `var(--opacity_white_0_90)` |
| `--text_label_secondary_inactive` | `var(--gray_300)` | `var(--gray_500)` |
| `--text_label_secondary_press` | `var(--opacity_black_1_70)` | `var(--opacity_white_0_80)` |
| `--text_label_secondary_selected` | `var(--gray_800)` | `var(--gray_75)` |
| `--text_label_tertiary_default` | `var(--gray_300)` | `var(--gray_400)` |
| `--text_label_tertiary_hover` | `var(--gray_500)` | `var(--gray_300)` |
| `--text_label_tertiary_inactive` | `var(--gray_200)` | `var(--gray_600)` |
| `--text_label_tertiary_press` | `var(--gray_500)` | `var(--gray_300)` |
| `--text_label_tertiary_selected` | `var(--gray_400)` | `var(--gray_400)` |
| `--text_label_warning_primary_default` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_warning_primary_hover` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_warning_primary_inactive` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_warning_primary_press` | `var(--gray_0)` | `var(--gray_0)` |
| `--text_label_warning_secondary_default` | `var(--orange_400)` | `var(--orange_500)` |
| `--text_label_warning_secondary_hover` | `var(--orange_300)` | `var(--orange_400)` |
| `--text_label_warning_secondary_inactive` | `var(--orange_400)` | `var(--orange_500)` |
| `--text_label_warning_secondary_press` | `var(--orange_400)` | `var(--orange_600)` |
| `--text_status_blue` | `var(--blue_400)` | `var(--blue_500)` |
| `--text_status_error` | `var(--red_400)` | `var(--red_500)` |
| `--text_status_success` | `var(--green_400)` | `var(--green_500)` |
| `--text_status_banana` | `var(--yellow_400)` | `var(--yellow_500)` |
| `--text_status_video_generation` | `var(--purple_500)` | `var(--purple_500)` |
| `--text_status_warning` | `var(--orange_400)` | `var(--orange_500)` |
| `--utility_overlay` | `#00000040` | `#0000003d` |
| `--utility_popover` | `var(--opacity_black_1_90)` | `var(--opacity_white_0_95)` |
| `--utility_scrim` | `#ffffff80` | `#00000080` |
| `--utility_scrollbar` | `var(--opacity_black_1_15)` | `var(--opacity_white_0_15)` |
| `--utility_tootip` | `var(--opacity_black_1_95)` | `var(--opacity_black_1_95)` |
| `--code-theme-addition-background` | `var(--green_25)` | `var(--green_900)` |
| `--code-theme-addition-foreground` | `var(--green_500)` | `var(--green_400)` |
| `--code-theme-attribute` | `var(--blue_500)` | `var(--blue_200)` |
| `--code-theme-builtin` | `var(--orange_700)` | `var(--orange_200)` |
| `--code-theme-class` | `var(--code-theme-type)` | `var(--code-theme-type)` |
| `--code-theme-comment` | `var(--gray_500)` | `var(--gray_400)` |
| `--code-theme-constant` | `var(--orange_700)` | `var(--orange_200)` |
| `--code-theme-decorator` | `var(--purple_600)` | `var(--purple_300)` |
| `--code-theme-default` | `var(--gray_800)` | `var(--gray_100)` |
| `--code-theme-deletion-background` | `var(--red_50)` | `var(--red_900)` |
| `--code-theme-deletion-foreground` | `var(--red_500)` | `var(--red_400)` |
| `--code-theme-enum-member` | `var(--code-theme-number)` | `var(--code-theme-number)` |
| `--code-theme-function` | `var(--purple_600)` | `var(--purple_300)` |
| `--code-theme-invalid` | `var(--red_500)` | `var(--red_400)` |
| `--code-theme-keyword` | `var(--red_500)` | `var(--red_300)` |
| `--code-theme-method` | `var(--code-theme-function)` | `var(--code-theme-function)` |
| `--code-theme-muted` | `var(--gray_500)` | `var(--gray_400)` |
| `--code-theme-namespace` | `var(--code-theme-property)` | `var(--code-theme-property)` |
| `--code-theme-number` | `var(--blue_500)` | `var(--blue_200)` |
| `--code-theme-operator` | `var(--code-theme-muted)` | `var(--code-theme-muted)` |
| `--code-theme-parameter` | `var(--code-theme-muted)` | `var(--code-theme-muted)` |
| `--code-theme-property` | `var(--orange_700)` | `var(--orange_200)` |
| `--code-theme-punctuation` | `var(--code-theme-muted)` | `var(--code-theme-muted)` |
| `--code-theme-regex` | `var(--blue_700)` | `var(--blue_300)` |
| `--code-theme-string` | `var(--green_700)` | `var(--green_300)` |
| `--code-theme-tag` | `var(--red_500)` | `var(--red_300)` |
| `--code-theme-type` | `var(--purple_600)` | `var(--purple_300)` |
| `--code-theme-variable` | `var(--code-theme-property)` | `var(--code-theme-property)` |
| `--code-theme-variable-constant` | `var(--code-theme-constant)` | `var(--code-theme-constant)` |
| `--code-theme-variable-default-library` | `var(--code-theme-builtin)` | `var(--code-theme-builtin)` |
| `--terminal_foreground` | `var(--gray_700)` | `var(--gray_100)` |
| `--terminal_cursor` | `var(--gray_700)` | `var(--gray_100)` |
| `--terminal_cursor_accent` | `var(--gray_0)` | `var(--gray_900)` |
| `--terminal_ansi_black` | `var(--gray_400)` | `var(--gray_400)` |
| `--terminal_ansi_red` | `var(--red_500)` | `var(--red_300)` |
| `--terminal_ansi_green` | `var(--green_500)` | `var(--green_300)` |
| `--terminal_ansi_yellow` | `var(--yellow_500)` | `var(--yellow_400)` |
| `--terminal_ansi_blue` | `var(--blue_500)` | `var(--blue_300)` |
| `--terminal_ansi_magenta` | `var(--purple_500)` | `var(--purple_400)` |
| `--terminal_ansi_cyan` | `var(--cyan_500)` | `var(--cyan_400)` |
| `--terminal_ansi_white` | `var(--gray_700)` | `var(--gray_100)` |
| `--terminal_ansi_bright_black` | `var(--gray_500)` | `var(--gray_300)` |
| `--terminal_ansi_bright_red` | `var(--red_500)` | `var(--red_300)` |
| `--terminal_ansi_bright_green` | `var(--green_500)` | `var(--green_300)` |
| `--terminal_ansi_bright_yellow` | `var(--yellow_500)` | `var(--yellow_400)` |
| `--terminal_ansi_bright_blue` | `var(--blue_500)` | `var(--blue_300)` |
| `--terminal_ansi_bright_magenta` | `var(--purple_500)` | `var(--purple_400)` |
| `--terminal_ansi_bright_cyan` | `var(--cyan_500)` | `var(--cyan_400)` |
| `--terminal_ansi_bright_white` | `var(--gray_800)` | `var(--gray_0)` |
| `--terminal_selection` | `var(--blue_50)` | `var(--blue_800)` |
| `--shimmer-duration` | `3s` | `—` |
| `--skeleton-highlight` | `#fafafa` | `#262626` |
| `--adm-radius-s` | `4px` | `—` |
| `--adm-radius-m` | `8px` | `—` |
| `--adm-radius-l` | `12px` | `—` |
| `--adm-font-size-1` | `9px` | `—` |
| `--adm-font-size-2` | `10px` | `—` |
| `--adm-font-size-3` | `11px` | `—` |
| `--adm-font-size-4` | `12px` | `—` |
| `--adm-font-size-5` | `13px` | `—` |
| `--adm-font-size-6` | `14px` | `—` |
| `--adm-font-size-7` | `15px` | `—` |
| `--adm-font-size-8` | `16px` | `—` |
| `--adm-font-size-9` | `17px` | `—` |
| `--adm-font-size-10` | `18px` | `—` |
| `--adm-color-primary` | `#1677ff` | `#3086ff` |
| `--adm-color-success` | `#00b578` | `#34b368` |
| `--adm-color-warning` | `#ff8f1f` | `#ffa930` |
| `--adm-color-danger` | `#ff3141` | `#ff4a58` |
| `--adm-color-yellow` | `#ff9f18` | `#ffa930` |
| `--adm-color-orange` | `#ff6430` | `#e65a2b` |
| `--adm-color-wathet` | `#e7f1ff` | `#0d2543` |
| `--adm-color-text` | `#333` | `#e6e6e6` |
| `--adm-color-text-secondary` | `#666` | `#b3b3b3` |
| `--adm-color-weak` | `#999` | `grey` |
| `--adm-color-light` | `#ccc` | `#4d4d4d` |
| `--adm-color-border` | `#eee` | `#2b2b2b` |
| `--adm-color-background` | `#fff` | `#1a1a1a` |
| `--adm-color-highlight` | `var(--adm-color-danger)` | `—` |
| `--adm-color-white` | `#fff` | `—` |
| `--adm-color-box` | `#f5f5f5` | `#0a0a0a` |
| `--adm-color-text-light-solid` | `var(--adm-color-white)` | `—` |
| `--adm-color-text-dark-solid` | `#000` | `—` |
| `--adm-color-fill-content` | `var(--adm-color-box)` | `—` |
| `--adm-font-size-main` | `var(--adm-font-size-5)` | `—` |
| `--adm-font-family` | `-apple-system,blinkmacsystemfont,"Helvetica Neue",helvetica,segoe ui,arial,roboto,"PingFang SC","miui","Hiragino Sans GB","Microsoft Yahei",sans-serif` | `—` |
| `--adm-border-color` | `var(--adm-color-border)` | `var(--adm-color-border)` |
| `--adm-color-background-body` | `—` | `var(--adm-color-background)` |
| `--red-btn` | `—` | `#ff5d52` |
| `--blue-btn` | `—` | `#5fabfc` |
| `--red-btn-hover` | `—` | `#e5544a` |

## Computed custom properties that differ between the themes (read live on the root)

| name | light | dark |
| --- | --- | --- |
| `--bg_default_primary` | `#fff` | `#171717` |
| `--bg_default_primary_elevated` | `#fff` | `#1c1c1c` |
| `--bg_default_secondary` | `#f5f5f5` | `#1c1c1c` |
| `--bg_default_secondary_elevated` | `#f5f5f5` | `#262626` |
| `--bg_default_tertiary` | `#fff` | `#262626` |
| `--bg_default_tertiary_elevated` | `#fff` | `#303030` |
| `--bg_default_scrim` | `#fafafa` | `#171717` |
| `--bg_grouped_primary` | `#f5f5f5` | `#171717` |
| `--bg_grouped_primary_elevated` | `#f5f5f5` | `#1c1c1c` |
| `--bg_grouped_secondary` | `#fff` | `#1c1c1c` |
| `--bg_grouped_secondary_elevated` | `#fff` | `#262626` |
| `--bg_grouped_tertiary` | `#f5f5f5` | `#262626` |
| `--bg_grouped_tertiary_elevated` | `#f5f5f5` | `#303030` |
| `--bg_interaction_accent_default` | `#ffffff00` | `#0a0a0a00` |
| `--bg_interaction_accent_hover` | `#0094fc0a` | `#0064ab1a` |
| `--bg_interaction_accent_inactive` | `#ffffff00` | `#0a0a0a00` |
| `--bg_interaction_accent_press` | `#0094fc14` | `#0064ab26` |
| `--bg_interaction_accent_focus_highlight` | `#c4e7ff` | `#00244d` |
| `--bg_interaction_danger_primary_default` | `#f73646` | `#e31937` |
| `--bg_interaction_danger_primary_hover` | `#ff5e6c` | `#f73646` |
| `--bg_interaction_danger_primary_inactive` | `#ffa3ab` | `#4d0610` |
| `--bg_interaction_danger_primary_press` | `#e31937` | `#bf152f` |
| `--bg_interaction_danger_secondary_default` | `#feedee` | `#33030a` |
| `--bg_interaction_danger_secondary_hover` | `#fef6f7` | `#4d0610` |
| `--bg_interaction_danger_secondary_inactive` | `#fef6f7` | `#33030a` |
| `--bg_interaction_danger_secondary_press` | `#ffc9ce` | `#33030a` |
| `--bg_interaction_positive_default` | `#04b54b` | `#009c3d` |
| `--bg_interaction_positive_hover` | `#28c567` | `#04b54b` |
| `--bg_interaction_positive_inactive` | `#04b54b` | `#009c3d` |
| `--bg_interaction_positive_press` | `#04b54b` | `#008635` |
| `--bg_interaction_primary_default` | `#171717` | `#fff` |
| `--bg_interaction_primary_hover` | `#0a0a0acc` | `#ffffffcc` |
| `--bg_interaction_primary_inactive` | `#adadad` | `#949494` |
| `--bg_interaction_primary_press` | `#0a0a0ae5` | `#ffffffe5` |
| `--bg_interaction_primary_selected` | `#171717` | `#fff` |
| `--bg_interaction_secondary_default` | `#0a0a0a0a` | `#ffffff0a` |
| `--bg_interaction_secondary_hover` | `#0a0a0a14` | `#ffffff12` |
| `--bg_interaction_secondary_inactive` | `#0a0a0a00` | `#ffffff00` |
| `--bg_interaction_secondary_press` | `#0a0a0a26` | `#ffffff0a` |
| `--bg_interaction_secondary_selected` | `#fafafa` | `#262626` |
| `--bg_interaction_tertiary_default` | `#0a0a0a00` | `#ffffff00` |
| `--bg_interaction_tertiary_hover` | `#0a0a0a0a` | `#ffffff0a` |
| `--bg_interaction_tertiary_inactive` | `#0a0a0a00` | `#ffffff00` |
| `--bg_interaction_tertiary_press` | `#0a0a0a14` | `#ffffff12` |
| `--bg_interaction_tertiary_selected` | `#0a0a0a0a` | `#ffffff12` |
| `--bg_interaction_video_generation_default` | `#0a0a0a00` | `#ffffff00` |
| `--bg_interaction_warning_default` | `#fa8237` | `#e25507` |
| `--bg_interaction_warning_hover` | `#ff9452` | `#f56811` |
| `--bg_interaction_warning_inactive` | `#fa8237` | `#e25507` |
| `--bg_interaction_warning_press` | `#fa8237` | `#b9480d` |
| `--bg_status_blue` | `#e5f5ff` | `#0078ff1a` |
| `--bg_status_error` | `#feedee` | `#33030a` |
| `--bg_status_positive` | `#d9f4e4` | `#082614` |
| `--bg_status_tag` | `#171717` | `#fff` |
| `--bg_status_warning` | `#ffeee3` | `#311908` |
| `--border_accent` | `#0094fc` | `#0077d9` |
| `--border_default` | `#0a0a0a14` | `#ffffff12` |
| `--border_heavy` | `#0a0a0af2` | `#fffffff2` |
| `--border_light` | `#0a0a0a0a` | `#ffffff0a` |
| `--border_danger_hover` | `#ff5e6c` | `#f73646` |
| `--border_danger_inactive` | `#ffc9ce` | `#9e0e24` |
| `--border_danger_press` | `#e31937` | `#bf152f` |
| `--border_status_blue` | `#e5f5ff` | `#004b96` |
| `--border_status_error` | `#feedee` | `#33030a` |
| `--border_status_success` | `#d9f4e4` | `#082614` |
| `--border_status_warning` | `#ffeee3` | `#311908` |
| `--border_tertiary_default` | `#0a0a0a14` | `#ffffff12` |
| `--border_tertiary_hover` | `#0a0a0a14` | `#ffffff26` |
| `--border_tertiary_inactive` | `#0a0a0a14` | `#ffffff26` |
| `--border_tertiary_press` | `#0a0a0a26` | `#ffffff12` |
| `--icon_default_accent` | `#0094fc` | `#0077d9` |
| `--icon_default_inverted` | `#fff` | `#171717` |
| `--icon_default_primary` | `#171717` | `#ededed` |
| `--icon_default_quaternary` | `#ccc` | `#4a4a4a` |
| `--icon_default_secondary` | `#666` | `#949494` |
| `--icon_default_tertiary` | `#adadad` | `#666` |
| `--icon_interaction_accent_accent` | `#0094fc` | `#0077d9` |
| `--icon_interaction_accent_default` | `#0094fc` | `#68c0ff` |
| `--icon_interaction_accent_hover` | `#0094fc` | `#68c0ff` |
| `--icon_interaction_accent_inactive` | `#adadad` | `#666` |
| `--icon_interaction_accent_press` | `#0094fc` | `#68c0ff` |
| `--icon_interaction_danger_secondary_default` | `#f73646` | `#e31937` |
| `--icon_interaction_danger_secondary_hover` | `#ff5e6c` | `#f73646` |
| `--icon_interaction_danger_secondary_inactive` | `#ffa3ab` | `#9e0e24` |
| `--icon_interaction_danger_secondary_press` | `#e31937` | `#bf152f` |
| `--icon_interaction_positive_secondary_default` | `#009c3d` | `#04b54b` |
| `--icon_interaction_positive_secondary_hover` | `#04b54b` | `#28c567` |
| `--icon_interaction_positive_secondary_inactive` | `#80e0a6` | `#00692a` |
| `--icon_interaction_positive_secondary_press` | `#008635` | `#009c3d` |
| `--icon_interaction_primary_default` | `#fff` | `#171717` |
| `--icon_interaction_primary_hover` | `#fff` | `#171717` |
| `--icon_interaction_primary_inactive` | `#fff` | `#171717` |
| `--icon_interaction_primary_press` | `#fff` | `#171717` |
| `--icon_interaction_primary_selected` | `#fff` | `#171717` |
| `--icon_interaction_secondary_default` | `#666` | `#f5f5f5` |
| `--icon_interaction_secondary_hover` | `#0a0a0a80` | `#ffffffe5` |
| `--icon_interaction_secondary_inactive` | `#adadad` | `#666` |
| `--icon_interaction_secondary_press` | `#0a0a0ab2` | `#ffffffcc` |
| `--icon_interaction_secondary_selected` | `#262626` | `#f5f5f5` |
| `--icon_interaction_tertiary_default` | `#adadad` | `#949494` |
| `--icon_interaction_tertiary_hover` | `#666` | `#adadad` |
| `--icon_interaction_tertiary_inactive` | `#ccc` | `#4a4a4a` |
| `--icon_interaction_tertiary_press` | `#666` | `#adadad` |
| `--icon_interaction_warning_secondary_default` | `#f56811` | `#e25507` |
| `--icon_interaction_warning_secondary_hover` | `#fa8237` | `#f56811` |
| `--icon_interaction_warning_secondary_inactive` | `#f56811` | `#e25507` |
| `--icon_interaction_warning_secondary_press` | `#f56811` | `#b9480d` |
| `--icon_status_error` | `#f73646` | `#e31937` |
| `--icon_status_success` | `#04b54b` | `#009c3d` |
| `--icon_status_warning` | `#f56811` | `#e25507` |
| `--shadow_default` | `#0a0a0a14` | `#0a0a0a80` |
| `--text_default_accent` | `#0094fc` | `#0077d9` |
| `--text_default_inverted` | `#fff` | `#171717` |
| `--text_default_primary` | `#171717` | `#ededed` |
| `--text_default_quaternary` | `#ccc` | `#4a4a4a` |
| `--text_default_secondary` | `#666` | `#949494` |
| `--text_default_tertiary` | `#adadad` | `#666` |
| `--text_label_accent_default` | `#0094fc` | `#0077d9` |
| `--text_label_accent_hover` | `#3daeff` | `#0094fc` |
| `--text_label_accent_inactive` | `#68c0ff` | `#004b96` |
| `--text_label_danger_primary_inactive` | `#fff` | `#ffffff80` |
| `--text_label_danger_secondary_default` | `#f73646` | `#e31937` |
| `--text_label_danger_secondary_hover` | `#ff5e6c` | `#f73646` |
| `--text_label_danger_secondary_inactive` | `#ffa3ab` | `#9e0e24` |
| `--text_label_danger_secondary_press` | `#e31937` | `#bf152f` |
| `--text_label_positive_secondary_default` | `#009c3d` | `#04b54b` |
| `--text_label_positive_secondary_hover` | `#04b54b` | `#28c567` |
| `--text_label_positive_secondary_inactive` | `#009c3d` | `#04b54b` |
| `--text_label_positive_secondary_press` | `#008635` | `#009c3d` |
| `--text_label_primary_default` | `#fff` | `#171717` |
| `--text_label_primary_hover` | `#fff` | `#171717` |
| `--text_label_primary_inactive` | `#fff` | `#171717` |
| `--text_label_primary_press` | `#fff` | `#171717` |
| `--text_label_primary_selected` | `#fff` | `#171717` |
| `--text_label_secondary_default` | `#666` | `#f5f5f5` |
| `--text_label_secondary_hover` | `#0a0a0a80` | `#ffffffe5` |
| `--text_label_secondary_inactive` | `#adadad` | `#666` |
| `--text_label_secondary_press` | `#0a0a0ab2` | `#ffffffcc` |
| `--text_label_secondary_selected` | `#262626` | `#f5f5f5` |
| `--text_label_tertiary_default` | `#adadad` | `#949494` |
| `--text_label_tertiary_hover` | `#666` | `#adadad` |
| `--text_label_tertiary_inactive` | `#ccc` | `#4a4a4a` |
| `--text_label_tertiary_press` | `#666` | `#adadad` |
| `--text_label_warning_secondary_default` | `#f56811` | `#e25507` |
| `--text_label_warning_secondary_hover` | `#fa8237` | `#f56811` |
| `--text_label_warning_secondary_inactive` | `#f56811` | `#e25507` |
| `--text_label_warning_secondary_press` | `#f56811` | `#b9480d` |
| `--text_status_blue` | `#0094fc` | `#0077d9` |
| `--text_status_error` | `#f73646` | `#e31937` |
| `--text_status_success` | `#04b54b` | `#009c3d` |
| `--text_status_banana` | `#ffae00` | `#e09900` |
| `--text_status_warning` | `#f56811` | `#e25507` |
| `--utility_overlay` | `#00000040` | `#0000003d` |
| `--utility_popover` | `#0a0a0ae5` | `#fffffff2` |
| `--utility_scrim` | `#ffffff80` | `#00000080` |
| `--utility_scrollbar` | `#0a0a0a26` | `#ffffff26` |
| `--code-theme-addition-background` | `#edfaf2` | `#082614` |
| `--code-theme-addition-foreground` | `#009c3d` | `#04b54b` |
| `--code-theme-attribute` | `#0077d9` | `#68c0ff` |
| `--code-theme-builtin` | `#923b0f` | `#ff9452` |
| `--code-theme-class` | `#8144a2` | `#b887ec` |
| `--code-theme-comment` | `#666` | `#949494` |
| `--code-theme-constant` | `#923b0f` | `#ff9452` |
| `--code-theme-decorator` | `#8144a2` | `#b887ec` |
| `--code-theme-default` | `#262626` | `#ededed` |
| `--code-theme-deletion-background` | `#feedee` | `#33030a` |
| `--code-theme-deletion-foreground` | `#e31937` | `#f73646` |
| `--code-theme-enum-member` | `#0077d9` | `#68c0ff` |
| `--code-theme-function` | `#8144a2` | `#b887ec` |
| `--code-theme-invalid` | `#e31937` | `#f73646` |
| `--code-theme-keyword` | `#e31937` | `#ff5e6c` |
| `--code-theme-method` | `#8144a2` | `#b887ec` |
| `--code-theme-muted` | `#666` | `#949494` |
| `--code-theme-namespace` | `#923b0f` | `#ff9452` |
| `--code-theme-number` | `#0077d9` | `#68c0ff` |
| `--code-theme-operator` | `#666` | `#949494` |
| `--code-theme-parameter` | `#666` | `#949494` |
| `--code-theme-property` | `#923b0f` | `#ff9452` |
| `--code-theme-punctuation` | `#666` | `#949494` |
| `--code-theme-regex` | `#004b96` | `#3daeff` |
| `--code-theme-string` | `#00692a` | `#28c567` |
| `--code-theme-tag` | `#e31937` | `#ff5e6c` |
| `--code-theme-type` | `#8144a2` | `#b887ec` |
| `--code-theme-variable` | `#923b0f` | `#ff9452` |
| `--code-theme-variable-constant` | `#923b0f` | `#ff9452` |
| `--code-theme-variable-default-library` | `#923b0f` | `#ff9452` |
| `--terminal_foreground` | `#303030` | `#ededed` |
| `--terminal_cursor` | `#303030` | `#ededed` |
| `--terminal_cursor_accent` | `#fff` | `#1c1c1c` |
| `--terminal_ansi_red` | `#e31937` | `#ff5e6c` |
| `--terminal_ansi_green` | `#009c3d` | `#28c567` |
| `--terminal_ansi_yellow` | `#e09900` | `#ffae00` |
| `--terminal_ansi_blue` | `#0077d9` | `#3daeff` |
| `--terminal_ansi_magenta` | `#9a55c2` | `#b06add` |
| `--terminal_ansi_cyan` | `#008e94` | `#00a8ae` |
| `--terminal_ansi_white` | `#303030` | `#ededed` |
| `--terminal_ansi_bright_black` | `#666` | `#adadad` |
| `--terminal_ansi_bright_red` | `#e31937` | `#ff5e6c` |
| `--terminal_ansi_bright_green` | `#009c3d` | `#28c567` |
| `--terminal_ansi_bright_yellow` | `#e09900` | `#ffae00` |
| `--terminal_ansi_bright_blue` | `#0077d9` | `#3daeff` |
| `--terminal_ansi_bright_magenta` | `#9a55c2` | `#b06add` |
| `--terminal_ansi_bright_cyan` | `#008e94` | `#00a8ae` |
| `--terminal_ansi_bright_white` | `#262626` | `#fff` |
| `--terminal_selection` | `#e5f5ff` | `#00244d` |
| `--skeleton-highlight` | `#fafafa` | `#262626` |
| `--red-btn` | `#fe3666` | `#ff5d52` |
| `--red-btn-hover` | `#e5315c` | `#e5544a` |

## Elements

| element | state | width | theme | box (x,y,w,h) | font | colour | background | radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| body | home | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| sidebar | home | 1440 | light | 0,0,260,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| sidebar-item-active | home | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgb(245, 245, 245)` | 8px |
| sidebar-item | home | 1440 | light | 8,135,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| sidebar-section-label | home | 1440 | light | 8,286,243,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-user-chip | home | 1440 | light | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| heading | home | 1440 | light | 588,231,524,38 | 32px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| composer | home | 1440 | light | 482,301,736,128 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 20px |
| editor | home | 1440 | light | 499,318,702,52 | 16px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| attach-button | home | 1440 | light | 495,386,30,30 | 13px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 10px |
| agent-team-switch | home | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| agent-model-button | home | 1440 | light | 1045,386,122,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 10px |
| send-button | home | 1440 | light | 1175,386,30,30 | 13px/400 | `rgb(255, 255, 255)` | `rgb(173, 173, 173)` | 10px |
| mode-chip-video | home | 1440 | light | 509,462,193,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| mode-chip | home | 1440 | light | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(10, 10, 10, 0)` | 10px |
| top-download-button | home | 1440 | light | 1308,16,116,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| promo-card | home | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| primary-button | home | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| composer-video | video-mode | 1440 | light | 482,301,736,230 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 20px |
| reference-tile | video-mode | 1440 | light | 499,314,90,90 | 13px/400 | `rgb(173, 173, 173)` | `rgb(245, 245, 245)` | 12px |
| plugin-tag | video-mode | 1440 | light | 503,421,114,20 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| model-button | video-mode | 1440 | light | 533,486,142,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| params-button | video-mode | 1440 | light | 683,486,145,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| showcase-title | video-mode | 1440 | light | 494,577,70,20 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-card | video-mode | 1440 | light | 494,615,169,128 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-caption | video-mode | 1440 | light | 506,727,145,16 | 12px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| popover | params-open | 1440 | light | 683,522,444,226 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 12px |
| popover-section-label | params-open | 1440 | light | 696,535,418,14 | 11px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| radio-selected | params-open | 1440 | light | 767,559,67,44 | 12px/500 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 6px |
| radio | params-open | 1440 | light | 837,559,67,44 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-resolution | params-open | 1440 | light | 698,641,206,30 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-duration-selected | params-open | 1440 | light | 698,709,36,24 | 12px/500 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 6px |
| radio-duration | params-open | 1440 | light | 850,709,36,24 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| menu | model-open | 1440 | light | 534,523,268,100 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 12px |
| menu-item | model-open | 1440 | light | 538,589,260,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| menu-item-selected | model-open | 1440 | light | 538,527,260,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| page-title | assets | 1440 | light | 324,64,1042,32 | 26px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| tab-active | assets | 1440 | light | 324,136,99,32 | 16px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| tab | assets | 1440 | light | 443,136,82,32 | 16px/500 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| filter-active | assets | 1440 | light | 324,193,49,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| filter | assets | 1440 | light | 838,193,79,32 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 8px |
| search-input | assets | 1440 | light | 1115,192,252,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0)` | 8px |
| empty-title | assets | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| empty-subtitle | assets | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| empty-cta | assets | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| asset-tile | assets | 1440 | light | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| asset-tile-name | assets | 1440 | light | 361,398,172,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| settings-modal | settings | 1440 | light | 250,146,940,600 | 16px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 0px |
| settings-nav-active | settings | 1440 | light | 258,199,204,37 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| settings-nav-item | settings | 1440 | light | 258,240,204,37 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| settings-title | settings | 1440 | light | 494,170,79,30 | 20px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| settings-section-heading | settings | 1440 | light | 494,241,672,20 | 14px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-option-label | settings | 1440 | light | 805,407,77,21 | 14px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-option | settings | 1440 | light | 955,273,211,154 | 16px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-card-selected | settings | 1440 | light | 546,408,20,20 | 16px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-card | settings | 1440 | light | 1021,407,20,20 | 16px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| preference-row | settings | 1440 | light | 494,484,672,165 | 16px/400 | `rgb(23, 23, 23)` | `rgb(245, 245, 245)` | 12px |
| preference-switch | settings | 1440 | light | 1114,522,40,20 | 14px/400 | `rgb(23, 23, 23)` | `rgb(0, 148, 252)` | 64px |
| preference-description | settings | 1440 | light | 510,621,580,16 | 12px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-item:hover | home | 1440 | light | 8,135,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| sidebar-item:focus | home | 1440 | light | 8,135,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| mode-chip:hover | home | 1440 | light | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(10, 10, 10, 0.04)` | 10px |
| mode-chip:focus | home | 1440 | light | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(10, 10, 10, 0)` | 10px |
| primary-button:hover | home | 1440 | light | 1308,16,116,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| primary-button:focus | home | 1440 | light | 1308,16,116,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| send-button:hover | home | 1440 | light | 1175,386,30,30 | 13px/400 | `rgb(255, 255, 255)` | `rgb(173, 173, 173)` | 10px |
| send-button:focus | home | 1440 | light | 1175,386,30,30 | 13px/400 | `rgb(255, 255, 255)` | `rgb(173, 173, 173)` | 10px |
| sidebar-user-chip:hover | home | 1440 | light | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-user-chip:focus | home | 1440 | light | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| top-download-button:hover | home | 1440 | light | 1308,16,116,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| top-download-button:focus | home | 1440 | light | 1308,16,116,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| asset-tile:hover | assets | 1440 | light | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| asset-tile:focus | assets | 1440 | light | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| filter:hover | assets | 1440 | light | 747,193,83,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| filter:focus | assets | 1440 | light | 747,193,83,32 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 8px |
| page | page-search | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| page-heading | page-search | 1440 | light | 588,231,524,38 | 32px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-search | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-search | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-search | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-search | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-search | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgb(245, 245, 245)` | 8px |
| page-card | page-search | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-search | 1440 | light | 499,318,702,26 | 16px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-plugins | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| page-heading | page-plugins | 1440 | light | 466,226,768,26 | 16px/600 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-plugins | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-plugins | 1440 | light | 278,16,72,28 | 14px/500 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 6px |
| page-tab | page-plugins | 1440 | light | 352,16,84,28 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| page-input | page-plugins | 1440 | light | 466,142,768,40 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 10px |
| page-primary-button | page-plugins | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-plugins | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-plugins | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page | page-scheduled | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| page-heading | page-scheduled | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-scheduled | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-scheduled | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-scheduled | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-scheduled | 1440 | light | 324,152,979,40 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 10px |
| page-primary-button | page-scheduled | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-scheduled | 1440 | light | 0,840,259,60 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| page-body-text | page-scheduled | 1440 | light | 324,212,1052,80 | 12px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-connect-mobile | 1440 | light | 394,40,912,820 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| page-heading | page-connect-mobile | 1440 | light | 642,64,136,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-connect-mobile | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-connect-mobile | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-connect-mobile | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-connect-mobile | 1440 | light | 642,221,648,36 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| page-primary-button | page-connect-mobile | 1440 | light | 394,40,220,62 | 13px/400 | `rgb(51, 51, 51)` | `rgba(10, 10, 10, 0.04)` | 8px |
| page-card | page-connect-mobile | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-connect-mobile | 1440 | light | 642,121,244,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-maxhermes | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| page-heading | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-maxhermes | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-maxhermes | 1440 | light | 0,840,259,60 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| page-body-text | page-maxhermes | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page | page-maxclaw | 1440 | light | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| page-heading | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-maxclaw | 1440 | light | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-maxclaw | 1440 | light | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| top-bar-title | task | 1440 | light | 42,481,177,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-button | task | 1440 | light | 1400,12,32,32 | 13px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 8px |
| user-bubble | task | 1440 | light | 537,54,537,295 | 13px/400 | `rgb(51, 51, 51)` | `rgb(245, 245, 245)` | 16px |
| processed-row | task | 1440 | light | 338,400,116,28 | 14px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| result-card | task | 1440 | light | 338,533,736,79 | 16px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 12px |
| result-file-name | task | 1440 | light | 355,550,520,45 | 16px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| result-open-preview | task | 1440 | light | 884,558,139,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| message-actions | task | 1440 | light | 364,630,26,26 | 13px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 8px |
| jump-button | task | 1440 | light | 688,640,36,36 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 9999px |
| credits-notice | task | 1440 | light | 322,688,768,50 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 16px |
| credits-buy | task | 1440 | light | 828,697,105,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| credits-subscribe | task | 1440 | light | 940,697,93,32 | 14px/400 | `rgb(255, 255, 255)` | `rgb(23, 23, 23)` | 8px |
| composer-docked | task | 1440 | light | 322,750,768,128 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 14px |
| footer-disclaimer | task | 1440 | light | 334,882,744,14 | 10px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-panel | task | 1440 | light | 1128,32,324,892 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-section | task | 1440 | light | 1159,63,262,28 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-deliverable | task | 1440 | light | 1159,152,262,30 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 10px |
| result-open-preview:hover | task | 1440 | light | 884,558,139,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 0px |
| result-open-preview:focus | task | 1440 | light | 884,558,139,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| heading | narrow-video-mode | 390 | light | 16,210,358,64 | 24px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| composer-video | narrow-video-mode | 390 | light | 16,294,358,230 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 14px |
| reference-tile | narrow-video-mode | 390 | light | 33,307,90,90 | 13px/400 | `rgb(173, 173, 173)` | `rgb(245, 245, 245)` | 12px |
| send-button | narrow-video-mode | 390 | light | 331,480,30,30 | 13px/400 | `rgb(255, 255, 255)` | `rgb(23, 23, 23)` | 10px |
| showcase-card | narrow-video-mode | 390 | light | 16,592,175,155 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| body | home | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| sidebar | home | 1440 | dark | 0,0,260,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| sidebar-item-active | home | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgb(48, 48, 48)` | 8px |
| sidebar-item | home | 1440 | dark | 8,135,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| sidebar-section-label | home | 1440 | dark | 8,286,243,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-user-chip | home | 1440 | dark | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| heading | home | 1440 | dark | 588,231,524,38 | 32px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| composer | home | 1440 | dark | 482,301,736,128 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 20px |
| editor | home | 1440 | dark | 499,318,702,52 | 16px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| attach-button | home | 1440 | dark | 495,386,30,30 | 13px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 10px |
| agent-team-switch | home | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| agent-model-button | home | 1440 | dark | 1045,386,122,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 10px |
| send-button | home | 1440 | dark | 1175,386,30,30 | 13px/400 | `rgb(23, 23, 23)` | `rgb(148, 148, 148)` | 10px |
| mode-chip-video | home | 1440 | dark | 509,462,193,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| mode-chip | home | 1440 | dark | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(255, 255, 255, 0)` | 10px |
| top-download-button | home | 1440 | dark | 1308,16,116,32 | 14px/400 | `rgb(237, 237, 237)` | `rgb(28, 28, 28)` | 8px |
| promo-card | home | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| primary-button | home | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| composer-video | video-mode | 1440 | dark | 482,301,736,230 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 20px |
| reference-tile | video-mode | 1440 | dark | 499,314,90,90 | 13px/400 | `rgb(102, 102, 102)` | `rgb(48, 48, 48)` | 12px |
| plugin-tag | video-mode | 1440 | dark | 503,421,114,20 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 0px |
| model-button | video-mode | 1440 | dark | 533,486,142,32 | 14px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 8px |
| params-button | video-mode | 1440 | dark | 683,486,145,32 | 14px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 8px |
| showcase-title | video-mode | 1440 | dark | 494,577,70,20 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-card | video-mode | 1440 | dark | 494,615,169,128 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-caption | video-mode | 1440 | dark | 506,727,145,16 | 12px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| popover | params-open | 1440 | dark | 683,522,444,226 | 14px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 12px |
| popover-section-label | params-open | 1440 | dark | 696,535,418,14 | 11px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| radio-selected | params-open | 1440 | dark | 767,559,67,44 | 12px/500 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 6px |
| radio | params-open | 1440 | dark | 837,559,67,44 | 12px/500 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-resolution | params-open | 1440 | dark | 698,641,206,30 | 12px/500 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-duration-selected | params-open | 1440 | dark | 698,709,36,24 | 12px/500 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 6px |
| radio-duration | params-open | 1440 | dark | 850,709,36,24 | 12px/500 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 6px |
| menu | model-open | 1440 | dark | 534,523,268,100 | 14px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 12px |
| menu-item | model-open | 1440 | dark | 538,589,260,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| menu-item-selected | model-open | 1440 | dark | 538,527,260,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| page-title | assets | 1440 | dark | 324,64,1042,32 | 26px/500 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| tab-active | assets | 1440 | dark | 324,136,99,32 | 16px/500 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| tab | assets | 1440 | dark | 443,136,82,32 | 16px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| filter-active | assets | 1440 | dark | 324,193,49,32 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| filter | assets | 1440 | dark | 838,193,79,32 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 8px |
| search-input | assets | 1440 | dark | 1115,192,252,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0)` | 8px |
| empty-title | assets | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| empty-subtitle | assets | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| empty-cta | assets | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| asset-tile | assets | 1440 | dark | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| asset-tile-name | assets | 1440 | dark | 361,398,172,20 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| settings-modal | settings | 1440 | dark | 250,146,940,600 | 16px/400 | `rgb(237, 237, 237)` | `rgb(28, 28, 28)` | 0px |
| settings-nav-active | settings | 1440 | dark | 258,199,204,37 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.07)` | 8px |
| settings-nav-item | settings | 1440 | dark | 258,240,204,37 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| settings-title | settings | 1440 | dark | 494,170,79,30 | 20px/500 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| settings-section-heading | settings | 1440 | dark | 494,241,672,20 | 14px/500 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-option-label | settings | 1440 | dark | 805,407,77,21 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-option | settings | 1440 | dark | 955,273,211,154 | 16px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-card-selected | settings | 1440 | dark | 777,408,20,20 | 16px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| appearance-card | settings | 1440 | dark | 1021,407,20,20 | 16px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| preference-row | settings | 1440 | dark | 494,484,672,165 | 16px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 12px |
| preference-switch | settings | 1440 | dark | 1114,522,40,20 | 14px/400 | `rgb(237, 237, 237)` | `rgb(0, 119, 217)` | 64px |
| preference-description | settings | 1440 | dark | 510,621,580,16 | 12px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-item:hover | home | 1440 | dark | 8,135,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| sidebar-item:focus | home | 1440 | dark | 8,135,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| mode-chip:hover | home | 1440 | dark | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(255, 255, 255, 0.04)` | 10px |
| mode-chip:focus | home | 1440 | dark | 714,461,117,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(255, 255, 255, 0)` | 10px |
| primary-button:hover | home | 1440 | dark | 1308,16,116,32 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| primary-button:focus | home | 1440 | dark | 1308,16,116,32 | 14px/400 | `rgb(237, 237, 237)` | `rgb(28, 28, 28)` | 8px |
| send-button:hover | home | 1440 | dark | 1175,386,30,30 | 13px/400 | `rgb(23, 23, 23)` | `rgb(148, 148, 148)` | 10px |
| send-button:focus | home | 1440 | dark | 1175,386,30,30 | 13px/400 | `rgb(23, 23, 23)` | `rgb(148, 148, 148)` | 10px |
| sidebar-user-chip:hover | home | 1440 | dark | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-user-chip:focus | home | 1440 | dark | 52,855,191,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| top-download-button:hover | home | 1440 | dark | 1308,16,116,32 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| top-download-button:focus | home | 1440 | dark | 1308,16,116,32 | 14px/400 | `rgb(237, 237, 237)` | `rgb(28, 28, 28)` | 8px |
| asset-tile:hover | assets | 1440 | dark | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| asset-tile:focus | assets | 1440 | dark | 324,246,252,182 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| filter:hover | assets | 1440 | dark | 747,193,83,32 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| filter:focus | assets | 1440 | dark | 747,193,83,32 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 8px |
| page | page-search | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| page-heading | page-search | 1440 | dark | 588,231,524,38 | 32px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-search | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-search | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-search | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-search | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-search | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgb(48, 48, 48)` | 8px |
| page-card | page-search | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-search | 1440 | dark | 499,318,702,26 | 16px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-plugins | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| page-heading | page-plugins | 1440 | dark | 466,226,768,26 | 16px/600 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-plugins | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-plugins | 1440 | dark | 278,16,72,28 | 14px/500 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 6px |
| page-tab | page-plugins | 1440 | dark | 352,16,84,28 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 6px |
| page-input | page-plugins | 1440 | dark | 466,142,768,40 | 14px/400 | `rgb(237, 237, 237)` | `rgb(59, 59, 59)` | 10px |
| page-primary-button | page-plugins | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-plugins | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-plugins | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page | page-scheduled | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| page-heading | page-scheduled | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-scheduled | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-scheduled | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-scheduled | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-scheduled | 1440 | dark | 324,152,979,40 | 14px/400 | `rgb(237, 237, 237)` | `rgb(59, 59, 59)` | 10px |
| page-primary-button | page-scheduled | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-scheduled | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-scheduled | 1440 | dark | 324,212,1052,80 | 12px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-connect-mobile | 1440 | dark | 394,40,912,820 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| page-heading | page-connect-mobile | 1440 | dark | 642,64,136,20 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| page-subheading | page-connect-mobile | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-connect-mobile | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-connect-mobile | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-connect-mobile | 1440 | dark | 642,221,648,36 | 14px/400 | `rgb(237, 237, 237)` | `rgb(38, 38, 38)` | 8px |
| page-primary-button | page-connect-mobile | 1440 | dark | 394,40,220,62 | 13px/400 | `rgb(51, 51, 51)` | `rgba(255, 255, 255, 0.07)` | 8px |
| page-card | page-connect-mobile | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-connect-mobile | 1440 | dark | 642,121,244,20 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| page | page-maxhermes | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| page-heading | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-maxhermes | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-maxhermes | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page | page-maxclaw | 1440 | dark | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 0px |
| page-heading | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-subheading | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab-active | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-tab | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-input | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-primary-button | page-maxclaw | 1440 | dark | 8,64,243,34 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 8px |
| page-card | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| page-body-text | page-maxclaw | 1440 | dark | not found: locator.waitFor: Timeout 6000ms exceeded. | | | | |
| top-bar-title | task | 1440 | dark | 42,481,177,20 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-button | task | 1440 | dark | 1400,12,32,32 | 13px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 8px |
| user-bubble | task | 1440 | dark | 537,54,537,295 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 16px |
| processed-row | task | 1440 | dark | 338,400,116,28 | 14px/400 | `rgb(148, 148, 148)` | `rgba(0, 0, 0, 0)` | 0px |
| result-card | task | 1440 | dark | 338,533,736,79 | 16px/400 | `rgb(237, 237, 237)` | `rgb(28, 28, 28)` | 12px |
| result-file-name | task | 1440 | dark | 355,550,520,45 | 16px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| result-open-preview | task | 1440 | dark | 884,558,139,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| message-actions | task | 1440 | dark | 364,630,26,26 | 13px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 8px |
| jump-button | task | 1440 | dark | 688,640,36,36 | 13px/400 | `rgb(51, 51, 51)` | `rgb(28, 28, 28)` | 9999px |
| credits-notice | task | 1440 | dark | 322,688,768,50 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 16px |
| credits-buy | task | 1440 | dark | 828,697,105,32 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 8px |
| credits-subscribe | task | 1440 | dark | 940,697,93,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| composer-docked | task | 1440 | dark | 322,750,768,128 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 14px |
| footer-disclaimer | task | 1440 | dark | 334,882,744,14 | 10px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-panel | task | 1440 | dark | 1128,32,324,892 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-section | task | 1440 | dark | 1159,63,262,28 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| work-area-deliverable | task | 1440 | dark | 1159,152,262,30 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 10px |
| result-open-preview:hover | task | 1440 | dark | 884,558,139,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(255, 255, 255, 0.04)` | 0px |
| result-open-preview:focus | task | 1440 | dark | 884,558,139,30 | 14px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| heading | narrow-video-mode | 390 | dark | 16,210,358,64 | 24px/400 | `rgb(237, 237, 237)` | `rgba(0, 0, 0, 0)` | 0px |
| composer-video | narrow-video-mode | 390 | dark | 16,294,358,230 | 13px/400 | `rgb(51, 51, 51)` | `rgb(38, 38, 38)` | 14px |
| reference-tile | narrow-video-mode | 390 | dark | 33,307,90,90 | 13px/400 | `rgb(102, 102, 102)` | `rgb(48, 48, 48)` | 12px |
| send-button | narrow-video-mode | 390 | dark | 331,480,30,30 | 13px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 10px |
| showcase-card | narrow-video-mode | 390 | dark | 16,592,175,155 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
