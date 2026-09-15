# STORY_033 — The Inbox carries the job events

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Done (2026-09-15)
**Created:** 2026-09-15, from [behaviour.md §5 Inbox](../recon/2026-09-15/behaviour.md) — the reference's Inbox was empty every time, so what it carries locally is ours to define

As the owner, I want the bell to tell me what happened while I looked elsewhere — a clip finished, a job failed or was cancelled, a shot changed — with an unread count, so that long generations do not need watching.

## Current state

The footer bell opens the STORY_021 popover (All / Updates / Messages tabs, Read all, "No messages yet"), all inert. Jobs already record `finishedAt`, `status`, `error` and `result.cuts` in history; the sidebar's unread dot uses `openedAt` vs `finishedAt`.

## UI Mockup

**Reference captures:** `inbox-open@1440` / `-dark`, `narrow-inbox-open@390` (2026-09-14), `behaviour-inbox-01..03` (2026-09-15) — the empty popover; the rows below are ours, drawn like the reference's list rows (a 40 px row, a dot for unread, 13 px title, 12 px tertiary time).

```
🔔 (badge: 2)
┌ [All] Updates  Messages                              Read all ┐
│ ● Your video is ready — 26-09-15-1224 Paper boat…    12:41   │  → the task page
│ ● The shot changed at 00:11 — 26-09-15-1224          12:41   │  → the task page
│ ○ Generation failed — 26-09-14-2300 …                22:58   │
│ ○ Cancelled at 41 % — …                                      │
└──────────────────────────────────────────────────────────────┘
Updates = the job events; Messages = empty until STORY_037 (chats); All = both. Empty tab: "No messages yet".
```

## Acceptance Criteria

- [x] Every terminal history entry yields one event (done → "Your video is ready", failed → "Generation failed" / "The prompt was refused", cancelled → "Cancelled at N %") and a done entry with `result.cuts` a second ("The shot changed at 00:11"), each naming the task by its stamp and title, with the event time; newest first; a click opens the task page and closes the popover.
- [x] The bell shows the unread count (events newer than the browser's `inboxReadAt`, kept in the shell prefs); **Read all** sets it to now; opening a task marks its events read as well (the sidebar dot's rule).
- [x] The tabs filter as sketched; both widths, both themes; the popover's existing tests and e2e stay green.

## Departures from the reference

- The reference's Inbox is MiniMax's product messages; ours is the job log. Read state is per browser (the shell prefs), not per account.

## Technical Notes

- `lib/inbox.ts` (pure): `eventsFor(entries)`, `unreadCount(events, readAt)`, `tabFilter`.
- `shell-prefs`: `inboxReadAt?: string`; `InboxPopover.tsx` takes `events`, `readAt`, `onReadAll`, `onOpen`; the Shell computes from its recents (already polled per navigation; the popover refetches on open).

## Testing Plan

- **Unit** — `inbox.test.ts`: events from a mixed history (order, wording, the cuts event), the unread count, the tabs.
- **Component** — `dialogs.test.tsx`: rows, the badge, Read all, a row click calls `onOpen`.
- **E2E** — `shell.spec.ts`: finish a `done-with-cut` job → the bell shows 2 → the popover lists both → a row opens the task → Read all clears the badge; at 390.

## Estimated Complexity

Small–medium.

## Done (2026-09-15)

**Landed:** `lib/inbox.ts` — `eventsFor` turns every terminal history entry into an event ("Your video is ready", "Generation failed", "The prompt was refused" for a moderated failure, "Cancelled at N %"), a finished job with `result.cuts` into a second ("The shot changed at 00:11"), each with the task's stamp and title and the finish time, newest first (a job's ready before its cut); `isEventRead` / `unreadCount` apply the two read rules (the browser's Read all stamp, or the task opened after the event — the sidebar dot's rule); `tabFilter`; `formatEventTime` (the clock today, "Sep 14, 22:58" otherwise). `RecentEntry` carries `status` / `progress` / `error` / `result` (the list was always the history entries). The shell prefs remember `inboxReadAt` (the `inbox-read` action; a stored non-date is dropped). `InboxPopover` has real tabs (Messages stays "No messages yet" until STORY_037), a Read all that is disabled when nothing is unread, and 40 px rows — the dot while unread, the event, the task, the time — each opening its task and closing the popover. The bell's name becomes "Inbox, N unread" with a red 16 px badge, and opening it refetches the recents. The Shell stamps Read all and routes a row's click.

**Tests:** `inbox.test` (the events from a mixed history incl. queued / running ignored, the wording, the order, the two read rules, the count, the tabs, the time format), `shell-prefs.test` (the stamp survives a round trip; garbage dropped), `InboxPopover.test` (rows with dot / task / time, Read all disabled when all read, a row's handler, the tabs, unread rows + the opened-task rule, the empty popover), `Sidebar.test` (the badge and name follow the count — the fixture's opened row reads as seen —, the popover's rows, Read all and the row handlers, the refetch on open, the count gone under a later stamp), `e2e/shell.spec` "the Inbox carries the job events…" at desktop and narrow (a `done-with-cut` job → "Inbox, 2 unread" and the badge → both rows unread → Messages empty → Read all → no badge, rows read → a row opens the task → the stamp survives a reload; the history cleared first so the count is the test's own) and the STORY_021 popover test now clears history first. Gate by hand: typecheck, lint, unit, integration (22), build + image, e2e 91 passed / 9 skipped; and again in the pre-push hook.

**Side by side:** inbox-open@1440 / narrow-inbox-open@390 — the popover's chrome is unchanged (tabs, Read all, the empty line); the rows are ours (Departures: the reference's Inbox is its product messages), drawn like its list rows. Read state is per browser.
