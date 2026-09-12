# STORY_002 — Every state of the video generation flow is captured as dated screenshots

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Draft (refine after STORY_001's first authenticated run)
**Created:** 2026-09-12

As the assistant building the clone, I want a dated screenshot of every state of the reference's video generation flow, at the wide and the narrow width, so that each clone story can cite the exact picture it must match.

## UI Mockup

N/A (no UI change; the deliverable is `docs/recon/<date>/` screenshots). The capture list is the mockup:

```
home-signed-in            composer with the Video generation chip selected
composer-empty            no prompt, no attachment
composer-typed            a prompt entered
composer-attach-open      the attach affordance open / image picker
composer-attached         a reference image attached
options-<each>            every option control opened (model, duration, resolution, aspect…)
job-queued                just after submit
job-generating            progress visible (several frames if it animates)
job-done                  result rendered, playable
job-failed                a failure state (if it can be provoked cheaply)
job-moderated             a blocked prompt (if the owner approves provoking one)
job-cancelled             after cancel
result-download           the download affordance
history-one, history-many the gallery/history with one and with several entries
narrow-*                  the same states at the reference's narrow breakpoint
```

## Acceptance Criteria

- [ ] `pnpm recon:capture` reuses the STORY_001 session, refuses to run when `recon:check` is not signed-in, dismisses the announcement modal, and walks the list above, saving each screenshot as `docs/recon/<YYYY-MM-DD>/<state>@<width>.png`.
- [ ] Each run writes a `manifest.json` next to the screenshots: state name, width, URL path (no query string), timestamp, and whether the state was reached automatically or by the owner stepping in.
- [ ] The script performs **no generation** unless started with an explicit `--generate N` flag; the story's Done note records N and the owner's approval.
- [ ] States that need a real job (queued, generating, done, download, history) are captured from the same run(s), so N is the minimum.
- [ ] The first authenticated run records what replaces the "Sign in" control; if a tighter signed-in signal exists, the STORY_001 classifier is tightened here and its unit tests extended.
- [ ] Raw material (DOM dumps, HAR, downloaded result videos) goes to `recon/out/`, never `docs/`.

## Technical Notes

- Steps that cannot be reliably automated (a file picker, a states that depends on a live job) pause and print what the owner should do, then continue on Enter.
- Widths: 1440 for wide; the narrow width is whatever breakpoint STORY_003 measures, defaulting to 390 until then.
- Frames of the generating state are taken every N seconds while the job runs so the progress presentation is captured, not just one instant.

## Testing Plan

- **Unit** — the manifest builder and the file-naming helper (pure): a state name and width produce the documented path; a manifest entry carries no query string even when given a URL with one.
- **Integration / E2E** — N/A (third-party site behind a login, and generations cost credits). Manual: the owner reviews the screenshot set and confirms every listed state is present or explicitly marked "not reachable" with the reason.

## Estimated Complexity

M
