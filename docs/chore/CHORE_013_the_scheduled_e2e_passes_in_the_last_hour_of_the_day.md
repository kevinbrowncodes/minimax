# CHORE_013 — The Scheduled e2e passes in the last hour of the day

**Status:** Done (2026-09-16)

## Summary

`app/e2e/scheduled.spec.ts` › "two prompts wait in line, reorder, one is timed; …" times a queued job one hour from now and expects the row to read `Not before HH:MM`. Between 23:00 and 23:59 in the browser's clock — the gate container runs on UTC, so 19:00–19:59 EDT on the Spark — "one hour from now" is tomorrow, and the page correctly renders the date form (`formatNotBefore` in `lib/queue-view.ts`: "Not before Sep 17, 00:43"), so the case fails on both projects, twice each (the retry too) — it refused BUG_010's push at 23:43 UTC (19:43 EDT) on 2026-09-16. The product is right; the expectation is not day-proof.

## Why

CLAUDE.md §6b: "A fixed calendar DATE rots the same way and fails on a day nobody is expecting: derive dates from the clock and write the shelf life down at the constant." This one was derived from the clock but assumed the derived time stays on today's date. Attributed before fixing (§4c): the failing commit touches no app code (a Python node, docs), the same spec passed in two gates earlier that evening, and the received text in the failure shows the tomorrow form.

## Changes

- [x] The expectation asserts `Not before` and the `HH:MM` as two containments, so the row's date form (another day) and time form (today) both pass; a comment names the midnight case.
- [x] No product code changes.

## Testing

- **Unit / integration:** none — no runtime code changes. `formatNotBefore`'s two forms are already unit-tested in `lib/queue-view.test.ts`.
- **E2E:** the changed case itself, run at both widths by hand in the gate container at 23:55 UTC (inside the failing hour) before the push, then the whole suite by the pre-push hook.
