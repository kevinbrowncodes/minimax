# STORY_039 — Connect mobile is a Telegram bot that makes videos

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — after STORY_035
**Status:** Approved (2026-09-15 — the owner's "proceed with … completing epic 6"); **needs a bot token from the owner (@BotFather) to verify end to end**
**Created:** 2026-09-15, from [behaviour.md §5](../recon/2026-09-15/behaviour.md): the reference's page binds a Telegram bot by token (Create IM Bot offers Telegram only)

As the owner, I want to text my Spark from my phone — a prompt, or a photo with a caption — and get the finished clip back in the chat, so that I can start and collect generations away from the desk.

## Current state

Connect mobile is the reference's form, inert (STORY_025/026): New Bot · Telegram, Create IM Bot, Connect Telegram with a token field, Choose an Agent, Working directory, Delete Bot.

## UI Mockup

**Reference captures:** `page-connect-mobile@1440` / `-dark` (2026-09-14), `behaviour-connect-mobile-01..02` (2026-09-15).

```
┌ ● New Bot      ┐   ┌ New Bot  ● Telegram  Bound as @minimax_local_bot          ┐
│   Telegram     │   │ Connect Telegram          [Enter Bot Token   ] [Connect]  │  (the token is saved as TELEGRAM_BOT_TOKEN — STORY_035)
└────────────────┘   │ Choose an Agent           Scriptwriter ▾                   │  (which agent answers plain text — STORY_038; "None" = every message is a video prompt)
+ Create IM Bot      │ Working directory         No project ▾                    │  (the project new jobs go to — STORY_031)
                     │ Delete Bot                                   [Delete]     │
                     └────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] **Connect** validates the token with Telegram's `getMe`, stores it in the environment variables (STORY_035) and shows "Bound as @name"; **Delete** forgets it; Create IM Bot › Telegram creates the one bot row (one bot is enough).
- [ ] **The worker** (a Node process in the app container, started with the server) long-polls `getUpdates` while a token is bound: a text message becomes a video job with the defaults (or, with an agent chosen, a chat turn whose reply is sent back); a photo with a caption becomes an image-to-video job with the photo as the first frame; the bot replies with the job's stamp, then sends the finished mp4 (`sendVideo`) or the failure; jobs are created through the app's own `/api/jobs` and land in history / Recents / the Inbox like any other.
- [ ] Only the chat that sent a message gets its replies; unknown commands answer with a one-line help.
- [ ] The stub gains a fake Telegram (`/bot<token>/getMe`, `getUpdates`, `sendMessage`, `sendVideo`) so the worker is tested without Telegram; both widths, both themes for the page.

## Departures from the reference

- One bot; no Discord / Slack. The "Working directory" is the project.

## Technical Notes

- `tools/telegram-worker/` in the app image (`node worker.js` beside `server.js`, `TELEGRAM_API_BASE` env for the stub); `lib/telegram.ts` (API calls, update parsing); `components/pages/ConnectMobilePage.tsx` becomes real over `GET/PUT /api/bot`.

## Testing Plan

- **Unit** — `telegram.test.ts` (update parsing: text, photo + caption, commands).
- **Integration** — `bot.test.ts` against the stub's fake Telegram: a text update creates a job; the finished job is sent back; a bad token is refused by Connect.
- **Component** — `pages.test.tsx`: Connect, Bound, Delete, the agent and project selects.
- **E2E** — `connect-mobile.spec.ts` (new): Connect with the stub's token → Bound → the fake Telegram receives a video after `done-after-1-poll`.
- **Manual verification:** the owner's real bot token, one message from his phone, the clip back — dated in the Done note.

## Estimated Complexity

Large.
