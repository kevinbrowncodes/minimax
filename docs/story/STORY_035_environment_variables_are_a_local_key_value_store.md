# STORY_035 — Environment variables are a local key / value store

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
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

- [x] The dialog lists the stored variables (values masked, a reveal on focus), adds rows, removes rows, and Save writes `PUT /api/env { vars: { KEY: value } }`; keys are `[A-Z_][A-Z0-9_]*`, refused otherwise, inline.
- [x] `GET /api/env` returns the keys with masked values; `GET /api/env/:key` (server-side only, no route — a lib function) gives a value to another server module; the file is `/data/env.json` with mode 600.
- [x] The dialog's copy says the values are stored unencrypted in app data on the Spark (honest, unlike the reference's "securely encrypt").
- [x] Both widths (a sheet at 390), both themes.

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

## Done (2026-09-15)

**Landed:** `lib/env.ts` (the pure part the browser shares: the name rule `[A-Z_][A-Z0-9_]*` and the mask) and `lib/env-store.ts` (`env.json` beside the history file — `/data/env.json` in the container — written atomically with mode 600, then `chmod 600` again to be sure; `envValue(key)` for other server modules; `maskedEnv` for the browser). `GET /api/env` returns keys with the mask and never a value; `PUT /api/env { vars }` replaces the set — a string replaces, **null keeps the stored value** (the browser never holds it, so it cannot send it back), an absent key removes; a bad name, a null for nothing stored, a non-string or a malformed body is a 400 and changes nothing. `EnvDialog` (opened by + › Environment variables, now a real entry) lists the stored names with the masked placeholder and an empty password field (typing replaces, the eye reveals what is typed, the placeholder stays a mask), adds rows, upper-cases names as typed, checks them inline on Save (the rule, duplicates, a missing value), removes rows with the trash, and Save PUTs and closes; the note says the values are plain JSON in the app's data directory and not encrypted (Departures). A sheet at 390 with the key over the value.

**Tests:** `env.test` (the name rule), `env-store.test` (the file beside history, mode 600, round trip, keep-on-null, removal, refusals, garbage on disk), `test/integration/env.test` (PUT / GET with the mask and no value anywhere in a response, null keeps, absence removes, six bad bodies and a malformed one are 400s that change nothing, an empty set), `Composer.test` (the entry opens the dialog and closes the menu; the stored key masked as a password field; Add Variables; a bad name refused inline with no PUT; upper-casing; Save PUTs `{ TELEGRAM_BOT_TOKEN: null, API_KEY: "secret" }` and closes; a trash removes and Save sends the set without it), `e2e/composer.spec` "a variable added through + › Environment variables survives a reload, listed by name and masked…" at desktop and narrow (the PUT observed, the API lists the key masked, after a reload the dialog shows the name with the mask and an empty value, Remove + Save clears it; the set emptied first and last). Gate by hand: typecheck, lint, unit, integration (25), build + image, e2e 95 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** behaviour-attach-env-01-environment-variables@1440 — the same 600-wide dialog, title and ×, the note, key / value rows with the eye and the trash, "+ Add Variables", Save bottom-right; the note's words are ours (honest about storage), and stored values never come back (the reference's dialog was empty during recon, so how it shows a stored value is unrecorded).
