# Design tokens — https://agent.minimax.io/ — 2026-09-12

Measured from computed styles in our own browser (see STORY_003). Values are what the reference rendered that day; cite this file's date.

## Fonts

Body font stack: `ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"`  
Body background: `rgb(255, 255, 255)`

Loaded font faces: `KaTeX_AMS`, `KaTeX_Caligraphic`, `KaTeX_Fraktur`, `KaTeX_Main`, `KaTeX_Math`, `KaTeX_SansSerif`, `KaTeX_Script`, `KaTeX_Size1`, `KaTeX_Size2`, `KaTeX_Size3`, `KaTeX_Size4`, `KaTeX_Typewriter`, `Outfit`, `SourceSerif`, `SourceSerifItalic`

- Font families actually used on the 50 measured elements: `ui-sans-serif` (50).
- Outfit is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element.
- Source Serif is loaded (SIL Open Font License, usable as-is) but was not the first family on any measured element.
- KaTeX faces come from the maths renderer and are not part of the product's own type system.
- The body stack is a system sans-serif stack, so no substitute font is needed for the clone: the same stack renders the same on the owner's Mac.

## Breakpoints

From the stylesheets (min/max-width queries): 324px, 640px, 668px, 767px, 768px, 769px, 900px, 1050px, 1120px, 1536px, 1546px  
Observed layout changes when narrowing: at 820px, at 560px, at 390px

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
| 390 | no | 358 | 2 | no |
| 360 | no | 328 | 2 | no |

## Palette

| colour | seen on |
| --- | --- |
| `rgb(23, 23, 23)` | agent-model-button@1440, editor@1440, empty-cta@1440, empty-title@1440 +22 |
| `rgb(255, 255, 255)` | body@1440, composer-video@1440, composer-video@390, composer@1440 +13 |
| `rgba(10, 10, 10, 0.08)` | composer-video@1440, composer-video@390, composer@1440, mode-chip-video@1440 +7 |
| `rgb(51, 51, 51)` | body@1440, composer-video@1440, composer-video@390, composer@1440 +6 |
| `rgb(102, 102, 102)` | attach-button@1440, empty-subtitle@1440, filter@1440, plugin-tag@1440 +4 |
| `rgb(173, 173, 173)` | popover-section-label@1440, reference-tile@1440, reference-tile@390, send-button@1440 +1 |
| `rgb(245, 245, 245)` | reference-tile@1440, reference-tile@390, sidebar-item-active@1440 |
| `rgba(10, 10, 10, 0)` | mode-chip@1440, search-input@1440 |
| `rgb(0, 148, 252)` | agent-team-switch@1440 |
| `rgba(10, 10, 10, 0.04)` | filter-active@1440 |

## Type scale

| size | weight | line-height | family | seen on |
| --- | --- | --- | --- | --- |
| 32px | 400 | normal | `ui-sans-serif` | heading@1440 |
| 26px | 500 | 32px | `ui-sans-serif` | page-title@1440 |
| 24px | 400 | 32px | `ui-sans-serif` | heading@390 |
| 16px | 400 | 26px | `ui-sans-serif` | editor@1440 |
| 16px | 500 | 26px | `ui-sans-serif` | tab-active@1440, tab@1440, empty-title@1440 |
| 14px | 400 | 20px | `ui-sans-serif` | sidebar-item-active@1440, sidebar-item@1440, agent-team-switch@1440, agent-model-button@1440 +13 |
| 14px | 400 | 22px | `ui-sans-serif` | popover@1440, menu@1440 |
| 14px | 500 | 20px | `ui-sans-serif` | primary-button@1440, empty-cta@1440 |
| 13px | 400 | 19.5px | `ui-sans-serif` | body@1440, sidebar@1440, sidebar-section-label@1440, sidebar-user-chip@1440 +11 |
| 12px | 400 | 16px | `ui-sans-serif` | showcase-caption@1440 |
| 12px | 500 | 16px | `ui-sans-serif` | radio-selected@1440, radio@1440, radio-resolution@1440, radio-duration-selected@1440 +1 |
| 11px | 400 | 14px | `ui-sans-serif` | popover-section-label@1440 |

## Spacing (paddings and gaps)

`1px`, `2px`, `4px`, `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, `32px`

## Radii

| radius | seen on |
| --- | --- |
| `6px` | radio-duration-selected@1440, radio-duration@1440, radio-resolution@1440, radio-selected@1440 +1 |
| `8px` | empty-cta@1440, filter-active@1440, filter@1440, mode-chip-video@1440 +7 |
| `10px` | agent-model-button@1440, agent-team-switch@1440, attach-button@1440, mode-chip@1440 +2 |
| `12px` | menu@1440, popover@1440, reference-tile@1440, reference-tile@390 |
| `16px` | composer-video@390, promo-card@1440 |
| `20px` | composer-video@1440, composer@1440 |

## Shadows

| shadow | seen on |
| --- | --- |
| `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(10, 10, 10, 0.08) 0px 0px 10px 0px` | composer-video@1440, composer-video@390, composer@1440 |
| `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px` | promo-card@1440 |

## Motion

| duration | timing | seen on |
| --- | --- | --- |
| 0.15s | cubic-bezier(0.4, 0, 0.2, 1) | sidebar-item-active@1440, sidebar-item@1440, attach-button@1440, agent-team-switch@1440 +20 |
| 0.27s, 0.27s, 0.27s | cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1) | sidebar@1440 |
| 0.3s | ease | primary-button@1440 |

## CSS custom properties on :root

| name | value |
| --- | --- |
| `--blue_25` | `#f5fbff` |
| `--blue_50` | `#e5f5ff` |
| `--blue_75` | `#c4e7ff` |
| `--blue_100` | `#93d2ff` |
| `--blue_200` | `#68c0ff` |
| `--blue_300` | `#3daeff` |
| `--blue_400` | `#0094fc` |
| `--blue_500` | `#0077d9` |
| `--blue_600` | `#005fb8` |
| `--blue_700` | `#004b96` |
| `--blue_800` | `#00244d` |
| `--blue_900` | `#001226` |
| `--blue_1000` | `#000c14` |
| `--cyan_25` | `#f0fbfb` |
| `--cyan_50` | `#dcf5f5` |
| `--cyan_75` | `#ace7e9` |
| `--cyan_100` | `#75dcdf` |
| `--cyan_200` | `#1ccdd2` |
| `--cyan_300` | `#00bdc1` |
| `--cyan_400` | `#00a8ae` |
| `--cyan_500` | `#008e94` |
| `--cyan_600` | `#00767d` |
| `--cyan_700` | `#005e63` |
| `--cyan_800` | `#003a3e` |
| `--cyan_900` | `#001d1f` |
| `--cyan_1000` | `#000f0f` |
| `--gray_0` | `#fff` |
| `--gray_50` | `#fafafa` |
| `--gray_75` | `#f5f5f5` |
| `--gray_100` | `#ededed` |
| `--gray_200` | `#ccc` |
| `--gray_300` | `#adadad` |
| `--gray_400` | `#949494` |
| `--gray_500` | `#666` |
| `--gray_600` | `#4a4a4a` |
| `--gray_700` | `#303030` |
| `--gray_800` | `#262626` |
| `--gray_900` | `#1c1c1c` |
| `--gray_1000` | `#171717` |
| `--green_25` | `#edfaf2` |
| `--green_50` | `#d9f4e4` |
| `--green_75` | `#a5e5bf` |
| `--green_100` | `#80e0a6` |
| `--green_200` | `#4ed082` |
| `--green_300` | `#28c567` |
| `--green_400` | `#04b54b` |
| `--green_500` | `#009c3d` |
| `--green_600` | `#008635` |
| `--green_700` | `#00692a` |
| `--green_800` | `#004f1f` |
| `--green_900` | `#082614` |
| `--green_1000` | `#001207` |
| `--opacity_black_1_0` | `#0a0a0a00` |
| `--opacity_black_1_2` | `#0a0a0a05` |
| `--opacity_black_1_4` | `#0a0a0a0a` |
| `--opacity_black_1_8` | `#0a0a0a14` |
| `--opacity_black_1_15` | `#0a0a0a26` |
| `--opacity_black_1_20` | `#0a0a0a33` |
| `--opacity_black_1_25` | `#0a0a0a40` |
| `--opacity_black_1_50` | `#0a0a0a80` |
| `--opacity_black_1_70` | `#0a0a0ab2` |
| `--opacity_black_1_80` | `#0a0a0acc` |
| `--opacity_black_1_90` | `#0a0a0ae5` |
| `--opacity_black_1_95` | `#0a0a0af2` |
| `--opacity_white_0_0` | `#ffffff00` |
| `--opacity_white_0_2` | `#ffffff05` |
| `--opacity_white_0_4` | `#ffffff0a` |
| `--opacity_white_0_8` | `#ffffff12` |
| `--opacity_white_0_15` | `#ffffff26` |
| `--opacity_white_0_20` | `#ffffff33` |
| `--opacity_white_0_25` | `#ffffff40` |
| `--opacity_white_0_50` | `#ffffff80` |
| `--opacity_white_0_70` | `#ffffffb2` |
| `--opacity_white_0_80` | `#ffffffcc` |
| `--opacity_white_0_90` | `#ffffffe5` |
| `--opacity_white_0_95` | `#fffffff2` |
| `--opacity_purple_500_10` | `#9a55c21a` |
| `--orange_25` | `#fff6f0` |
| `--orange_50` | `#ffeee3` |
| `--orange_75` | `#ffd0b2` |
| `--orange_100` | `#ffb485` |
| `--orange_200` | `#ff9452` |
| `--orange_300` | `#fa8237` |
| `--orange_400` | `#f56811` |
| `--orange_500` | `#e25507` |
| `--orange_600` | `#b9480d` |
| `--orange_700` | `#923b0f` |
| `--orange_800` | `#4d200b` |
| `--orange_900` | `#311908` |
| `--orange_1000` | `#1a0a00` |
| `--purple_25` | `#f9f8fe` |
| `--purple_50` | `#f3f0fc` |
| `--purple_75` | `#e1d7f9` |
| `--purple_100` | `#ceb9f5` |
| `--purple_200` | `#c29ff0` |
| `--purple_300` | `#b887ec` |
| `--purple_400` | `#b06add` |
| `--purple_500` | `#9a55c2` |
| `--purple_600` | `#8144a2` |
| `--purple_700` | `#693584` |
| `--purple_800` | `#331842` |
| `--purple_900` | `#1b0d27` |
| `--purple_1000` | `#090514` |
| `--violet_500` | `#8147f6` |
| `--red_25` | `#fef6f7` |
| `--red_50` | `#feedee` |
| `--red_75` | `#ffc9ce` |
| `--red_100` | `#ffa3ab` |
| `--red_200` | `#ff828c` |
| `--red_300` | `#ff5e6c` |
| `--red_400` | `#f73646` |
| `--red_500` | `#e31937` |
| `--red_600` | `#bf152f` |
| `--red_700` | `#9e0e24` |
| `--red_800` | `#4d0610` |
| `--red_900` | `#33030a` |
| `--red_1000` | `#140003` |
| `--yellow_25` | `#fff9ed` |
| `--yellow_50` | `#fff3d9` |
| `--yellow_75` | `#ffe9b8` |
| `--yellow_100` | `#ffdb8c` |
| `--yellow_200` | `#ffcf66` |
| `--yellow_300` | `#ffc340` |
| `--yellow_400` | `#ffae00` |
| `--yellow_500` | `#e09900` |
| `--yellow_600` | `#ba7f00` |
| `--yellow_700` | `#916300` |
| `--yellow_800` | `#4d3400` |
| `--yellow_900` | `#261a00` |
| `--yellow_1000` | `#120e00` |
| `--radius_4` | `4px` |
| `--radius_8` | `8px` |
| `--radius_12` | `12px` |
| `--radius_16` | `16px` |
| `--radius_20` | `20px` |
| `--radius_24` | `24px` |
| `--radius_32` | `32px` |
| `--radius_full` | `999px` |
| `--spacing_0` | `0px` |
| `--spacing_2` | `2px` |
| `--spacing_4` | `4px` |
| `--spacing_6` | `6px` |
| `--spacing_8` | `8px` |
| `--spacing_12` | `12px` |
| `--spacing_16` | `16px` |
| `--spacing_20` | `20px` |
| `--spacing_24` | `24px` |
| `--spacing_32` | `32px` |
| `--spacing_40` | `40px` |
| `--spacing_48` | `48px` |
| `--spacing_64` | `64px` |
| `--spacing_90` | `90px` |
| `--spacing_128` | `128px` |
| `--line_height_16` | `16px` |
| `--line_height_18` | `18px` |
| `--line_height_20` | `20px` |
| `--line_height_22` | `22px` |
| `--line_height_26` | `26px` |
| `--line_height_28` | `28px` |
| `--line_height_36` | `36px` |
| `--line_height_40` | `40px` |
| `--size_12` | `12px` |
| `--size_14` | `14px` |
| `--size_16` | `16px` |
| `--size_20` | `20px` |
| `--size_24` | `24px` |
| `--size_32` | `32px` |
| `--size_40` | `40px` |
| `--size_48` | `48px` |
| `--size_64` | `64px` |
| `--weight_regular` | `400px` |
| `--weight_medium` | `500px` |
| `--bg_default_primary` | `var(--gray_0)` |
| `--bg_default_primary_elevated` | `var(--gray_0)` |
| `--bg_default_secondary` | `var(--gray_75)` |
| `--bg_default_secondary_elevated` | `var(--gray_75)` |
| `--bg_default_tertiary` | `var(--gray_0)` |
| `--bg_default_tertiary_elevated` | `var(--gray_0)` |
| `--bg_default_scrim` | `var(--gray_50)` |
| `--bg_grouped_primary` | `var(--gray_75)` |
| `--bg_grouped_primary_elevated` | `var(--gray_75)` |
| `--bg_grouped_secondary` | `var(--gray_0)` |
| `--bg_grouped_secondary_elevated` | `var(--gray_0)` |
| `--bg_grouped_tertiary` | `var(--gray_75)` |
| `--bg_grouped_tertiary_elevated` | `var(--gray_75)` |
| `--bg_interaction_accent_default` | `var(--opacity_white_0_0)` |
| `--bg_interaction_accent_hover` | `#0094fc0a` |
| `--bg_interaction_accent_inactive` | `var(--opacity_white_0_0)` |
| `--bg_interaction_accent_press` | `#0094fc14` |
| `--bg_interaction_accent_focus_blue` | `var(--blue_400)` |
| `--bg_interaction_accent_focus_highlight` | `var(--blue_75)` |
| `--bg_interaction_danger_primary_default` | `var(--red_400)` |
| `--bg_interaction_danger_primary_hover` | `var(--red_300)` |
| `--bg_interaction_danger_primary_inactive` | `var(--red_100)` |
| `--bg_interaction_danger_primary_press` | `var(--red_500)` |
| `--bg_interaction_danger_secondary_default` | `var(--red_50)` |
| `--bg_interaction_danger_secondary_hover` | `var(--red_25)` |
| `--bg_interaction_danger_secondary_inactive` | `var(--red_25)` |
| `--bg_interaction_danger_secondary_press` | `var(--red_75)` |
| `--bg_interaction_positive_default` | `var(--green_400)` |
| `--bg_interaction_positive_hover` | `var(--green_300)` |
| `--bg_interaction_positive_inactive` | `var(--green_400)` |
| `--bg_interaction_positive_press` | `var(--green_400)` |
| `--bg_interaction_primary_default` | `var(--gray_1000)` |
| `--bg_interaction_primary_hover` | `var(--opacity_black_1_80)` |
| `--bg_interaction_primary_inactive` | `var(--gray_300)` |
| `--bg_interaction_primary_press` | `var(--opacity_black_1_90)` |
| `--bg_interaction_primary_selected` | `var(--gray_1000)` |
| `--bg_interaction_secondary_default` | `var(--opacity_black_1_4)` |
| `--bg_interaction_secondary_hover` | `var(--opacity_black_1_8)` |
| `--bg_interaction_secondary_inactive` | `var(--opacity_black_1_0)` |
| `--bg_interaction_secondary_press` | `var(--opacity_black_1_15)` |
| `--bg_interaction_secondary_selected` | `var(--gray_50)` |
| `--bg_interaction_tertiary_default` | `var(--opacity_black_1_0)` |
| `--bg_interaction_tertiary_hover` | `var(--opacity_black_1_4)` |
| `--bg_interaction_tertiary_inactive` | `var(--opacity_black_1_0)` |
| `--bg_interaction_tertiary_press` | `var(--opacity_black_1_8)` |
| `--bg_interaction_tertiary_selected` | `var(--opacity_black_1_4)` |
| `--bg_interaction_video_generation_default` | `var(--opacity_black_1_0)` |
| `--bg_interaction_video_generation_hover` | `var(--violet_500)` |
| `--bg_interaction_video_generation_selected` | `var(--violet_500)` |
| `--bg_interaction_warning_default` | `var(--orange_300)` |
| `--bg_interaction_warning_hover` | `var(--orange_200)` |
| `--bg_interaction_warning_inactive` | `var(--orange_300)` |
| `--bg_interaction_warning_press` | `var(--orange_300)` |
| `--bg_status_blue` | `var(--blue_50)` |
| `--bg_status_error` | `var(--red_50)` |
| `--bg_status_positive` | `var(--green_50)` |
| `--bg_status_tag` | `var(--gray_1000)` |
| `--bg_status_video_generation` | `var(--opacity_purple_500_10)` |
| `--bg_status_warning` | `var(--orange_50)` |
| `--border_accent` | `var(--blue_400)` |
| `--border_default` | `var(--opacity_black_1_8)` |
| `--border_heavy` | `var(--opacity_black_1_95)` |
| `--border_light` | `var(--opacity_black_1_4)` |
| `--border_danger_default` | `var(--red_500)` |
| `--border_danger_hover` | `var(--red_300)` |
| `--border_danger_inactive` | `var(--red_75)` |
| `--border_danger_press` | `var(--red_500)` |
| `--border_status_blue` | `var(--blue_50)` |
| `--border_status_error` | `var(--red_50)` |
| `--border_status_success` | `var(--green_50)` |
| `--border_status_warning` | `var(--orange_50)` |
| `--border_tertiary_default` | `var(--opacity_black_1_8)` |
| `--border_tertiary_hover` | `var(--opacity_black_1_8)` |
| `--border_tertiary_inactive` | `var(--opacity_black_1_8)` |
| `--border_tertiary_press` | `var(--opacity_black_1_15)` |
| `--icon_default_accent` | `var(--blue_400)` |
| `--icon_default_inverted` | `var(--gray_0)` |
| `--icon_default_inverted_static` | `var(--opacity_white_0_95)` |
| `--icon_default_primary` | `var(--gray_1000)` |
| `--icon_default_quaternary` | `var(--gray_200)` |
| `--icon_default_secondary` | `var(--gray_500)` |
| `--icon_default_tertiary` | `var(--gray_300)` |
| `--icon_interaction_accent_accent` | `var(--blue_400)` |
| `--icon_interaction_accent_default` | `var(--blue_400)` |
| `--icon_interaction_accent_hover` | `var(--blue_400)` |
| `--icon_interaction_accent_inactive` | `var(--gray_300)` |
| `--icon_interaction_accent_press` | `var(--blue_400)` |
| `--icon_interaction_danger_primary_default` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_hover` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_inactive` | `var(--gray_0)` |
| `--icon_interaction_danger_primary_press` | `var(--gray_0)` |
| `--icon_interaction_danger_secondary_default` | `var(--red_400)` |
| `--icon_interaction_danger_secondary_hover` | `var(--red_300)` |
| `--icon_interaction_danger_secondary_inactive` | `var(--red_100)` |
| `--icon_interaction_danger_secondary_press` | `var(--red_500)` |
| `--icon_interaction_positive_primary_default` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_hover` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_inactive` | `var(--gray_0)` |
| `--icon_interaction_positive_primary_press` | `var(--gray_0)` |
| `--icon_interaction_positive_secondary_default` | `var(--green_500)` |
| `--icon_interaction_positive_secondary_hover` | `var(--green_400)` |
| `--icon_interaction_positive_secondary_inactive` | `var(--green_100)` |
| `--icon_interaction_positive_secondary_press` | `var(--green_600)` |
| `--icon_interaction_primary_default` | `var(--gray_0)` |
| `--icon_interaction_primary_hover` | `var(--gray_0)` |
| `--icon_interaction_primary_inactive` | `var(--gray_0)` |
| `--icon_interaction_primary_press` | `var(--gray_0)` |
| `--icon_interaction_primary_selected` | `var(--gray_0)` |
| `--icon_interaction_secondary_default` | `var(--gray_500)` |
| `--icon_interaction_secondary_hover` | `var(--opacity_black_1_50)` |
| `--icon_interaction_secondary_inactive` | `var(--gray_300)` |
| `--icon_interaction_secondary_press` | `var(--opacity_black_1_70)` |
| `--icon_interaction_secondary_selected` | `var(--gray_800)` |
| `--icon_interaction_tertiary_default` | `var(--gray_300)` |
| `--icon_interaction_tertiary_hover` | `var(--gray_500)` |
| `--icon_interaction_tertiary_inactive` | `var(--gray_200)` |
| `--icon_interaction_tertiary_press` | `var(--gray_500)` |
| `--icon_interaction_tertiary_selected` | `var(--gray_400)` |
| `--icon_interaction_warning_primary_default` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_hover` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_inactive` | `var(--gray_0)` |
| `--icon_interaction_warning_primary_press` | `var(--gray_0)` |
| `--icon_interaction_warning_secondary_default` | `var(--orange_400)` |
| `--icon_interaction_warning_secondary_hover` | `var(--orange_300)` |
| `--icon_interaction_warning_secondary_inactive` | `var(--orange_400)` |
| `--icon_interaction_warning_secondary_press` | `var(--orange_400)` |
| `--icon_status_error` | `var(--red_400)` |
| `--icon_status_success` | `var(--green_400)` |
| `--icon_status_warning` | `var(--orange_400)` |
| `--shadow_default` | `var(--opacity_black_1_8)` |
| `--text_default_accent` | `var(--blue_400)` |
| `--text_default_inverted` | `var(--gray_0)` |
| `--text_default_inverted_static` | `var(--opacity_white_0_95)` |
| `--text_default_primary` | `var(--gray_1000)` |
| `--text_default_quaternary` | `var(--gray_200)` |
| `--text_default_secondary` | `var(--gray_500)` |
| `--text_default_tertiary` | `var(--gray_300)` |
| `--text_label_accent_default` | `var(--blue_400)` |
| `--text_label_accent_hover` | `var(--blue_300)` |
| `--text_label_accent_inactive` | `var(--blue_200)` |
| `--text_label_accent_press` | `var(--blue_500)` |
| `--text_label_danger_primary_default` | `var(--gray_0)` |
| `--text_label_danger_primary_hover` | `var(--gray_0)` |
| `--text_label_danger_primary_inactive` | `var(--gray_0)` |
| `--text_label_danger_primary_press` | `var(--gray_0)` |
| `--text_label_danger_secondary_default` | `var(--red_400)` |
| `--text_label_danger_secondary_hover` | `var(--red_300)` |
| `--text_label_danger_secondary_inactive` | `var(--red_100)` |
| `--text_label_danger_secondary_press` | `var(--red_500)` |
| `--text_label_positive_primary_default` | `var(--gray_0)` |
| `--text_label_positive_primary_hover` | `var(--gray_0)` |
| `--text_label_positive_primary_inactive` | `var(--gray_0)` |
| `--text_label_positive_primary_press` | `var(--gray_0)` |
| `--text_label_positive_secondary_default` | `var(--green_500)` |
| `--text_label_positive_secondary_hover` | `var(--green_400)` |
| `--text_label_positive_secondary_inactive` | `var(--green_500)` |
| `--text_label_positive_secondary_press` | `var(--green_600)` |
| `--text_label_primary_default` | `var(--gray_0)` |
| `--text_label_primary_hover` | `var(--gray_0)` |
| `--text_label_primary_inactive` | `var(--gray_0)` |
| `--text_label_primary_press` | `var(--gray_0)` |
| `--text_label_primary_selected` | `var(--gray_0)` |
| `--text_label_secondary_default` | `var(--gray_500)` |
| `--text_label_secondary_hover` | `var(--opacity_black_1_50)` |
| `--text_label_secondary_inactive` | `var(--gray_300)` |
| `--text_label_secondary_press` | `var(--opacity_black_1_70)` |
| `--text_label_secondary_selected` | `var(--gray_800)` |
| `--text_label_tertiary_default` | `var(--gray_300)` |
| `--text_label_tertiary_hover` | `var(--gray_500)` |
| `--text_label_tertiary_inactive` | `var(--gray_200)` |
| `--text_label_tertiary_press` | `var(--gray_500)` |
| `--text_label_tertiary_selected` | `var(--gray_400)` |
| `--text_label_warning_primary_default` | `var(--gray_0)` |
| `--text_label_warning_primary_hover` | `var(--gray_0)` |
| `--text_label_warning_primary_inactive` | `var(--gray_0)` |
| `--text_label_warning_primary_press` | `var(--gray_0)` |
| `--text_label_warning_secondary_default` | `var(--orange_400)` |
| `--text_label_warning_secondary_hover` | `var(--orange_300)` |
| `--text_label_warning_secondary_inactive` | `var(--orange_400)` |
| `--text_label_warning_secondary_press` | `var(--orange_400)` |
| `--text_status_blue` | `var(--blue_400)` |
| `--text_status_error` | `var(--red_400)` |
| `--text_status_success` | `var(--green_400)` |
| `--text_status_banana` | `var(--yellow_400)` |
| `--text_status_video_generation` | `var(--purple_500)` |
| `--text_status_warning` | `var(--orange_400)` |
| `--utility_overlay` | `#00000040` |
| `--utility_popover` | `var(--opacity_black_1_90)` |
| `--utility_scrim` | `#ffffff80` |
| `--utility_scrollbar` | `var(--opacity_black_1_15)` |
| `--utility_tootip` | `var(--opacity_black_1_95)` |
| `--code-theme-addition-background` | `var(--green_25)` |
| `--code-theme-addition-foreground` | `var(--green_500)` |
| `--code-theme-attribute` | `var(--blue_500)` |
| `--code-theme-builtin` | `var(--orange_700)` |
| `--code-theme-class` | `var(--code-theme-type)` |
| `--code-theme-comment` | `var(--gray_500)` |
| `--code-theme-constant` | `var(--orange_700)` |
| `--code-theme-decorator` | `var(--purple_600)` |
| `--code-theme-default` | `var(--gray_800)` |
| `--code-theme-deletion-background` | `var(--red_50)` |
| `--code-theme-deletion-foreground` | `var(--red_500)` |
| `--code-theme-enum-member` | `var(--code-theme-number)` |
| `--code-theme-function` | `var(--purple_600)` |
| `--code-theme-invalid` | `var(--red_500)` |
| `--code-theme-keyword` | `var(--red_500)` |
| `--code-theme-method` | `var(--code-theme-function)` |
| `--code-theme-muted` | `var(--gray_500)` |
| `--code-theme-namespace` | `var(--code-theme-property)` |
| `--code-theme-number` | `var(--blue_500)` |
| `--code-theme-operator` | `var(--code-theme-muted)` |
| `--code-theme-parameter` | `var(--code-theme-muted)` |
| `--code-theme-property` | `var(--orange_700)` |
| `--code-theme-punctuation` | `var(--code-theme-muted)` |
| `--code-theme-regex` | `var(--blue_700)` |
| `--code-theme-string` | `var(--green_700)` |
| `--code-theme-tag` | `var(--red_500)` |
| `--code-theme-type` | `var(--purple_600)` |
| `--code-theme-variable` | `var(--code-theme-property)` |
| `--code-theme-variable-constant` | `var(--code-theme-constant)` |
| `--code-theme-variable-default-library` | `var(--code-theme-builtin)` |
| `--terminal_foreground` | `var(--gray_700)` |
| `--terminal_cursor` | `var(--gray_700)` |
| `--terminal_cursor_accent` | `var(--gray_0)` |
| `--terminal_ansi_black` | `var(--gray_400)` |
| `--terminal_ansi_red` | `var(--red_500)` |
| `--terminal_ansi_green` | `var(--green_500)` |
| `--terminal_ansi_yellow` | `var(--yellow_500)` |
| `--terminal_ansi_blue` | `var(--blue_500)` |
| `--terminal_ansi_magenta` | `var(--purple_500)` |
| `--terminal_ansi_cyan` | `var(--cyan_500)` |
| `--terminal_ansi_white` | `var(--gray_700)` |
| `--terminal_ansi_bright_black` | `var(--gray_500)` |
| `--terminal_ansi_bright_red` | `var(--red_500)` |
| `--terminal_ansi_bright_green` | `var(--green_500)` |
| `--terminal_ansi_bright_yellow` | `var(--yellow_500)` |
| `--terminal_ansi_bright_blue` | `var(--blue_500)` |
| `--terminal_ansi_bright_magenta` | `var(--purple_500)` |
| `--terminal_ansi_bright_cyan` | `var(--cyan_500)` |
| `--terminal_ansi_bright_white` | `var(--gray_800)` |
| `--terminal_selection` | `var(--blue_50)` |
| `--skeleton-highlight` | `#fafafa` |
| `--adm-radius-s` | `4px` |
| `--adm-radius-m` | `8px` |
| `--adm-radius-l` | `12px` |
| `--adm-font-size-1` | `9px` |
| `--adm-font-size-2` | `10px` |
| `--adm-font-size-3` | `11px` |
| `--adm-font-size-4` | `12px` |
| `--adm-font-size-5` | `13px` |
| `--adm-font-size-6` | `14px` |
| `--adm-font-size-7` | `15px` |
| `--adm-font-size-8` | `16px` |
| `--adm-font-size-9` | `17px` |
| `--adm-font-size-10` | `18px` |
| `--adm-color-primary` | `#1677ff` |
| `--adm-color-success` | `#00b578` |
| `--adm-color-warning` | `#ff8f1f` |
| `--adm-color-danger` | `#ff3141` |
| `--adm-color-yellow` | `#ff9f18` |
| `--adm-color-orange` | `#ff6430` |
| `--adm-color-wathet` | `#e7f1ff` |
| `--adm-color-text` | `#333` |
| `--adm-color-text-secondary` | `#666` |
| `--adm-color-weak` | `#999` |
| `--adm-color-light` | `#ccc` |
| `--adm-color-border` | `#eee` |
| `--adm-color-background` | `#fff` |
| `--adm-color-highlight` | `var(--adm-color-danger)` |
| `--adm-color-white` | `#fff` |
| `--adm-color-box` | `#f5f5f5` |
| `--adm-color-text-light-solid` | `var(--adm-color-white)` |
| `--adm-color-text-dark-solid` | `#000` |
| `--adm-color-fill-content` | `var(--adm-color-box)` |
| `--adm-font-size-main` | `var(--adm-font-size-5)` |
| `--adm-font-family` | `-apple-system,blinkmacsystemfont,"Helvetica Neue",helvetica,segoe ui,arial,roboto,"PingFang SC","miui","Hiragino Sans GB","Microsoft Yahei",sans-serif` |
| `--adm-border-color` | `var(--adm-color-border)` |

## Elements

| element | state | width | box (x,y,w,h) | font | colour | background | radius |
| --- | --- | --- | --- | --- | --- | --- | --- |
| body | home | 1440 | 0,0,1440,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| sidebar | home | 1440 | 0,0,260,900 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 0px |
| sidebar-item-active | home | 1440 | 8,64,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgb(245, 245, 245)` | 8px |
| sidebar-item | home | 1440 | 8,135,243,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| sidebar-section-label | home | 1440 | 8,286,243,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| sidebar-user-chip | home | 1440 | 48,855,195,32 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| heading | home | 1440 | 628,231,444,38 | 32px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| composer | home | 1440 | 482,301,736,130 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 20px |
| editor | home | 1440 | 499,318,702,52 | 16px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| attach-button | home | 1440 | 495,386,32,32 | 13px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 10px |
| agent-team-switch | home | 1440 | 531,386,115,32 | 14px/400 | `rgb(0, 148, 252)` | `rgba(0, 0, 0, 0)` | 10px |
| agent-model-button | home | 1440 | 1043,386,118,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 10px |
| send-button | home | 1440 | 1173,386,32,32 | 13px/400 | `rgb(255, 255, 255)` | `rgb(173, 173, 173)` | 10px |
| mode-chip-video | home | 1440 | 525,464,183,30 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 8px |
| mode-chip | home | 1440 | 720,463,111,32 | 14px/400 | `rgb(51, 51, 51)` | `rgba(10, 10, 10, 0)` | 10px |
| top-download-button | home | 1440 | 1314,16,110,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| promo-card | home | 1440 | 1212,614,204,262 | 13px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 16px |
| primary-button | home | 1440 | 1221,831,186,36 | 14px/500 | `rgb(255, 255, 255)` | `rgb(23, 23, 23)` | 8px |
| composer-video | video-mode | 1440 | 482,301,736,230 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 20px |
| reference-tile | video-mode | 1440 | 499,314,90,90 | 13px/400 | `rgb(173, 173, 173)` | `rgb(245, 245, 245)` | 12px |
| plugin-tag | video-mode | 1440 | 503,422,108,20 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| model-button | video-mode | 1440 | 654,486,139,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| params-button | video-mode | 1440 | 800,486,141,32 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 8px |
| showcase-title | video-mode | 1440 | 494,577,68,20 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-card | video-mode | 1440 | 494,615,169,128 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
| showcase-caption | video-mode | 1440 | 506,727,145,16 | 12px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| popover | params-open | 1440 | 800,522,444,226 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 12px |
| popover-section-label | params-open | 1440 | 813,535,418,14 | 11px/400 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| radio-selected | params-open | 1440 | 884,559,67,44 | 12px/500 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 6px |
| radio | params-open | 1440 | 954,559,67,44 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-resolution | params-open | 1440 | 815,641,206,30 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| radio-duration-selected | params-open | 1440 | 815,709,36,24 | 12px/500 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 6px |
| radio-duration | params-open | 1440 | 967,709,36,24 | 12px/500 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 6px |
| menu | model-open | 1440 | 654,523,268,100 | 14px/400 | `rgb(23, 23, 23)` | `rgb(255, 255, 255)` | 12px |
| menu-item | model-open | 1440 | 666,594,212,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| menu-item-selected | model-open | 1440 | 666,532,212,20 | 14px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| page-title | assets | 1440 | 324,64,1052,32 | 26px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| tab-active | assets | 1440 | 324,136,94,32 | 16px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| tab | assets | 1440 | 438,136,78,32 | 16px/500 | `rgb(173, 173, 173)` | `rgba(0, 0, 0, 0)` | 0px |
| filter-active | assets | 1440 | 324,193,48,32 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0.04)` | 8px |
| filter | assets | 1440 | 820,193,76,32 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 8px |
| search-input | assets | 1440 | 1122,192,254,34 | 14px/400 | `rgb(23, 23, 23)` | `rgba(10, 10, 10, 0)` | 8px |
| empty-title | assets | 1440 | 800,475,100,26 | 16px/500 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| empty-subtitle | assets | 1440 | 660,505,380,20 | 14px/400 | `rgb(102, 102, 102)` | `rgba(0, 0, 0, 0)` | 0px |
| empty-cta | assets | 1440 | 795,549,109,36 | 14px/500 | `rgb(255, 255, 255)` | `rgb(23, 23, 23)` | 8px |
| heading | narrow-video-mode | 390 | 28,210,334,32 | 24px/400 | `rgb(23, 23, 23)` | `rgba(0, 0, 0, 0)` | 0px |
| composer-video | narrow-video-mode | 390 | 16,262,358,222 | 13px/400 | `rgb(51, 51, 51)` | `rgb(255, 255, 255)` | 16px |
| reference-tile | narrow-video-mode | 390 | 29,271,90,90 | 13px/400 | `rgb(173, 173, 173)` | `rgb(245, 245, 245)` | 12px |
| send-button | narrow-video-mode | 390 | 333,443,32,32 | 13px/400 | `rgb(255, 255, 255)` | `rgb(23, 23, 23)` | 10px |
| showcase-card | narrow-video-mode | 390 | 16,552,175,155 | 13px/400 | `rgb(51, 51, 51)` | `rgba(0, 0, 0, 0)` | 0px |
