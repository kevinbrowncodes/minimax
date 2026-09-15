# CHORE_010 — The Connect mobile row and page go with the withdrawn Telegram story

**Status:** Done (2026-09-15)

## Summary

Remove the sidebar's **Connect mobile** row (and its rail pill), the `/connect-mobile` route and `ConnectMobilePage`, their tests and the README's mention — STORY_025's inert rendering of the reference's bot page, which led nowhere once the owner withdrew STORY_039.

## Why

The owner, 2026-09-15: "I really didn't want connect mobile", and, asked whether to remove the row and page: "Remove the row and page". With STORY_039 withdrawn the page could never do anything (CLAUDE.md §6 rule 11's spirit: nothing left in the UI should answer "Not part of MiniMax Local" for ever).

## Changes

- [x] `app/app/connect-mobile/page.tsx` and `components/pages/ConnectMobilePage.tsx` deleted; the `.connectPage … .botSelectPlain` styles removed from `pages.module.css`; `IconPhone` removed.
- [x] `lib/route-title.ts`: `/connect-mobile` leaves `REFERENCE_PAGES` and `ActiveRow`; the Sidebar's row and rail pill go.
- [x] Tests: `pages.test` (the Connect test goes), `Sidebar.test` (the row lists), `route-title.test`; `removed.test` names "Connect mobile"; `e2e/shell.spec` drops the Connect row from the STORY_025 walk and asserts `/connect-mobile` answers 404 with the other removed routes.
- [x] README: the STORY_025 row and the "What was removed" row.

## Testing

- **Unit / component:** the tests above (the removal asserted where the other removals are).
- **Integration:** none — no route handler is involved.
- **E2E:** the STORY_025 / 026 / 028 shell tests (the 404 sweep gains `/connect-mobile`); the full suite in the gate and the pre-push hook.
