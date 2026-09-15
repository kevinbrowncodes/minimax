# STORY_035 — Environment variables are a local key / value store

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
**Created:** 2026-09-15, from [behaviour.md §5](../recon/2026-09-15/behaviour.md): the reference's dialog is an in-page key / value form backed by `GET secret`

As the owner, I want + › Environment variables to keep named values — a bot token, an API key — on the Spark, so that later integrations (the Telegram bot first) have somewhere to read them from.

## Current state

+ › Environment variables is an inert menu entry (STORY_022/026).

## UI Mockup

**Reference capture:** `behaviour-attach-env-01-environment-variables` (2026-09-15): a dialog "Environment variables — MiniMax will securely encrypt and store environment variables for sensitive data like API keys and credentials." with `key name` / `Key value` inputs (259 × 36 and 233 × 36), **Add Variables** (146 × 36), **Save** (80 × 36).

```
┌ Environment variables                                              × ┐
│ Values are stored on the Spark in app data (plain JSON — see the note).│
│ [TELEGRAM_BOT_TOKEN      ] [••••••••••••••  ] 🗑                      │
│ [key name                ] [Key value       ]                         │
│ [+ Add Variables]                                             [Save]  │
└──────────────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] The dialog lists the stored variables (values masked, a reveal on focus), adds rows, removes rows, and Save writes `PUT /api/env { vars: { KEY: value } }`; keys are `[A-Z_][A-Z0-9_]*`, refused otherwise, inline.
- [ ] `GET /api/env` returns the keys with masked values; `GET /api/env/:key` (server-side only, no route — a lib function) gives a value to another server module; the file is `/data/env.json` with mode 600.
- [ ] The dialog's copy says the values are stored unencrypted in app data on the Spark (honest, unlike the reference's "securely encrypt").
- [ ] Both widths (a sheet at 390), both themes.

## Departures from the reference

- No encryption; the app data volume is the Spark's own disk (the note says so).

## Technical Notes

- `lib/env-store.ts` (`/data/env.json`), `app/app/api/env/route.ts`; `components/composer/EnvDialog.tsx` opened from the + menu (`ComposerMenus.tsx`).

## Testing Plan

- **Unit** — `env-store.test.ts` (validation, masking, the file mode).
- **Integration** — `env.test.ts` (PUT / GET round-trip; a bad key is 400; values never echo unmasked).
- **Component** — `Composer.test.tsx`: the dialog opens, adds a row, Save PUTs.
- **E2E** — `composer.spec.ts`: add a variable, reload, it is listed masked.

## Estimated Complexity

Small.
