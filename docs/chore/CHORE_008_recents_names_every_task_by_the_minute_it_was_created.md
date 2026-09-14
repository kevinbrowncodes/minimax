# CHORE_008 — Recents names every task by the minute it was created

**Status:** Done (2026-09-14)
**Created:** 2026-09-14 — owner: "under recents I would like for you to call the title it with a timestamp so instead of `[0:00-0:03] From the…` it should have a time stamp like `26-09-14-1200` where `26-09-14` is the date and `1200` is the time it was created"

## Summary

The sidebar's **Recents** rows (and the Search dialog's rows, which list the same entries) show the task's creation stamp as `YY-MM-DD-HHMM` in the browser's local time — `26-09-14-1200` for a task created on 14 September 2026 at 12:00 — instead of the prompt's first words. The prompt's first words move to the row's `title` attribute (the hover tooltip) and stay what Search matches on, so a task can still be found by what it said. The history entry's `title` field, the task page's bubble and the download filename (BUG_004 names the file after the title) are **unchanged** — this chore is the Recents label only, as asked; renaming downloads would be a separate decision.

## Why

Scripts start alike (`[0:00-0:03] From his standing stance…`), so a list of first words cannot tell three chain segments apart; the minute can.

## Changes

- [x] `app/lib/recents.ts`: `stampFor(createdAt: string, now?: Date): string` → `YY-MM-DD-HHMM` in local time, zero-padded; unit-tested for a known instant, midnight, and the year roll-over.
- [x] `app/components/shell/Sidebar.tsx` (and the Search dialog rows): the visible label is the stamp; `title={entry.title}` keeps the first words as the tooltip; `aria-label` reads "<stamp>, <first words>" so a screen reader gets both.
- [x] `Sidebar.test.tsx`: a row renders the stamp for its `createdAt`, the tooltip carries the title, and search by the prompt's words still finds it.
- [x] `e2e`: no spec edit was needed — both specs that find a Recents row (`task.spec.ts` "reopens from Recents", `shell.spec.ts` "Search finds a job by title") locate it by accessible name, which now reads "<stamp>, <title>" and still contains the title; they stay green as the regression cover. (`task.spec.ts` is also being edited for STORY_023 in the other session tonight.)
- [x] README → the UI section: one line saying Recents is named by creation minute.

## Testing

- **Unit** (`recents.test.ts`, `Sidebar.test.tsx`) and **e2e** (the sidebar spec) as above; **integration: not applicable** (no route changes).

## Note

`app/components/shell/` is being edited for STORY_023/EPIC_005 in another session on 2026-09-14; this chore is implemented after STORY_020 lands and after checking that Sidebar.tsx is not mid-edit there.

**Done (2026-09-14):** `stampFor` / `recentLabel` / `recentName` in `app/lib/recents.ts`; the Sidebar and Search rows show the stamp with the prompt as `title` and in `aria-label`; `RecentEntry` gained optional `createdAt` (the history API already returns it, so `Shell.tsx` — another session's file tonight — needed no change). Typecheck, lint and the three test files green in the gate container.
