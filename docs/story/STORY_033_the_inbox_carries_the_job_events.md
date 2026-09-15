# STORY_033 — The Inbox carries the job events

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md)
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6")
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

- [ ] Every terminal history entry yields one event (done → "Your video is ready", failed → "Generation failed" / "The prompt was refused", cancelled → "Cancelled at N %") and a done entry with `result.cuts` a second ("The shot changed at 00:11"), each naming the task by its stamp and title, with the event time; newest first; a click opens the task page and closes the popover.
- [ ] The bell shows the unread count (events newer than the browser's `inboxReadAt`, kept in the shell prefs); **Read all** sets it to now; opening a task marks its events read as well (the sidebar dot's rule).
- [ ] The tabs filter as sketched; both widths, both themes; the popover's existing tests and e2e stay green.

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
