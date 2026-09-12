# STORY_003 — The reference's design tokens are measured, not eyeballed

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Done (2026-09-12)
**Created:** 2026-09-12

As the assistant building the clone, I want the reference's colours, type scale, spacing, radii, shadows, breakpoints and motion timings extracted from computed styles, so that clone stories commit to numbers rather than impressions.

## UI Mockup

N/A (no UI change; the deliverables are `docs/recon/<date>/tokens.json` and the readable `tokens.md`).

## Acceptance Criteria

- [x] `pnpm recon:tokens` reuses the session, opens the video-mode composer, and for a named list of elements (body, sidebar and its items, heading, composer and editor, every bottom-bar control, mode chips, reference tile, plugin tag, ShowCase title/card/caption, the parameters popover and its radios, the model menu and its items, the Assets page's title, tabs, filters, search, empty state and call to action, plus the narrow composer) records computed font family/size/weight/line-height, colours (text, background, border), padding, gap, radius, shadow, and transition durations.
- [x] Distinct values are de-duplicated into a palette, a type scale, a spacing scale, radii, shadows and motion; each token records which elements it was seen on.
- [x] Breakpoints are found two ways: the min/max-width media queries in the reference's stylesheets, and by resizing from 1440 down to 360 with a reload at each width and recording where the sidebar, the ShowCase column count or the parameters control's visibility change.
- [x] Fonts: the tokens file names the loaded families, states their licence where it matters (Outfit and Source Serif — SIL Open Font License), and says which family the measured elements actually use and whether a substitute is needed.
- [x] Values are taken **after animations settle** (a stable-bounding-box check, twelve tries at 150 ms), never mid-transition.
- [x] The CSS custom properties declared on `:root` are extracted from the fetched stylesheets and included, and the raw stylesheets are saved under the gitignored `recon/out/`.

## Technical Notes

- A small measurement API is installed into the page as plain JavaScript (`window.__recon`: `measure`, `ancestor`) so container elements (sidebar, composer, popover, menu, promo card) can be found by walking up from a known control to the first ancestor that fits a size rule and has a border, shadow or fill.
- The owner's display name is masked to "Owner" in any recorded element text.
- Stylesheets are fetched with the page's own request context, so the versioned CDN URLs resolve the same way the app loads them.
- The "sidebar expanded" signal tests whether the New task item lies inside the viewport; a collapsed drawer still reports its item as visible off-canvas, which fooled the first run.

## Testing Plan

- **Unit** — `recon/src/tokens-model.test.ts` (10 cases): `parseCssVariables` reads `:root` and `html` blocks and ignores other selectors; `parseMediaBreakpoints` de-duplicates and converts rem; `palette` collapses identical colours, keeps alpha variants distinct and drops transparent; `typeScale` orders by size and records where each was seen; `spacingScale` is ascending and drops zero; `breakpointChanges` names the widths where a signal first differs and is empty when nothing changes; `boxesEqual` tolerates sub-pixel jitter; `buildTokens` + `renderTokensMarkdown` emit every section, notes, and missing elements.
- **Integration / E2E** — N/A (third-party site behind a login). Manual: the assistant spot-checks the measured palette against the STORY_002 screenshots (sidebar active item `rgb(245, 245, 245)`, primary text `rgb(23, 23, 23)`, accent `rgb(0, 148, 252)` on the Agent Team switch).

## Estimated Complexity

M

## Done note (2026-09-12)

Two runs. The first measured all 50 elements but reported the sidebar as expanded at every width because a collapsed drawer's item still has a bounding box; fixed by requiring the item to lie inside the viewport. Second run: **50 elements measured, 0 missing**, 449 custom properties and 11 media widths from 18 stylesheets, observed layout changes at 820px, 560px, 390px. Findings: the product runs on a system sans-serif stack (Outfit and Source Serif are loaded but unused on every measured element); the stylesheet declares a full token system (`--gray_0…1000`, `--blue_*`, `--radius_4…32/full`, semantic `--bg_interaction_*` and `--bg_default_*` names) that EPIC_003 can mirror by name; the standard transition is 0.15s cubic-bezier(0.4, 0, 0.2, 1); the ShowCase drops from four to two columns between 640 and 560 px and the parameters control leaves the viewport below 430 px. Gate: `pnpm typecheck` and `pnpm test` (34 cases) green; lint/build/e2e do not exist yet (EPIC_002).
