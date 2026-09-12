# STORY_003 — The reference's design tokens are measured, not eyeballed

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Draft
**Created:** 2026-09-12

As the assistant building the clone, I want the reference's colours, type scale, spacing, radii, shadows, breakpoints and motion timings extracted from computed styles, so that clone stories commit to numbers rather than impressions.

## UI Mockup

N/A (no UI change; the deliverable is `docs/recon/<date>/tokens.json` and a readable `tokens.md`).

## Acceptance Criteria

- [ ] `pnpm recon:tokens` reuses the session, opens the video-mode composer, and for a named list of elements (sidebar, sidebar item, mode chip, composer, prompt field, primary button, option control, job card, result player, history tile) records computed font family/size/weight/line-height, colours (text, background, border), padding, gap, radius, shadow, and transition durations.
- [ ] Distinct values are de-duplicated into a palette, a type scale and a spacing scale; the file records which element each token was seen on.
- [ ] Breakpoints are found by resizing from 1440 down to 360 and recording the widths at which the sidebar and composer layouts change.
- [ ] Fonts: the tokens file names the loaded families and their licence (Outfit and Source Serif — SIL OFL — observed 2026-09-12) and the substitute for any that cannot be used.
- [ ] Values are taken **after animations settle** (a fixed wait plus a stable-bounding-box check), never mid-transition.

## Testing Plan

- **Unit** — the de-duplication and scale builders (pure): identical computed values collapse to one token; near-identical colours (rgba with alpha) are kept distinct; the breakpoint finder reports a change only when a layout signal actually differs between adjacent widths.
- **Integration / E2E** — N/A (third-party site behind a login). Manual: spot-check three tokens against the screenshots with a colour picker.

## Estimated Complexity

M
