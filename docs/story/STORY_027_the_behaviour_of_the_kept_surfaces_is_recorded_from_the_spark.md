# STORY_027 — The behaviour of the kept surfaces is recorded, from the Spark

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — its recon story; the wiring stories are cut from what this records
**Status:** Done (2026-09-15) — the owner: "lets create a story to do the recon and then after that we should know what stories to create"; reversible account changes approved ("yes"); credits from the daily budget ("feel free to exhaust that as needed")
**Created:** 2026-09-15

As the owner, I want a dated record of what each surface STORY_026 kept actually **does** on agent.minimax.io — what Rename, Pin, Archive, Star, Move to project, Create project, Create agent, the uploads, the Inbox, the skills and environment-variable entries, the bot page and a text turn change on screen and send over the network — so that every wiring story in EPIC_006 is designed from a measured behaviour, not a guess at one.

## Current state

[docs/recon/2026-09-14/](../recon/2026-09-14/) has 204 captures of how the kept surfaces look and `interactions.md` for the video flow; the inventory states that the Recents menu's, the tile menu's and the editor's entries were never clicked. The recon profile (`recon/.profile/`, gitignored) is still signed in (`recon/run.sh check` → `session: signed-in` on 2026-09-15).

## UI Mockup

N/A (no UI change) — this story produces captures, a network record and notes; STORY_028+ consume them.

## Acceptance Criteria

**Where and how**

- [x] `docs/recon/2026-09-15/` holds `behaviour.json` (one entry per action: the steps taken, each step's screenshot, the path, what appeared — dialog / menu / input / navigation — the API calls the action made, and whether it was undone), the screenshots `behaviour-<action>-<n>-<label>@1440.png`, `endpoints.md` / `endpoints.json` reduced from the day's raw log with the existing `interactions` pass, and `behaviour.md`, the narrative written from them. Raw states and the network log (with request bodies, redacted) stay in `recon/out/2026-09-15/`.
- [x] The account is left as found: the renamed task carries its old title, nothing stays pinned, archived or starred, the test project, test agent and uploaded image are deleted; `behaviour.json` says so per action, and anything the script could not undo is named at the top of `behaviour.md` for the owner.
- [x] Nothing personal is committed: the owner's display name and ids are masked in screenshots and dumps as in STORY_018; no cookie, token or auth header reaches the raw log (request bodies are redacted of anything named like one).

**The actions recorded** (each: before, every step, after; the network per step)

- [x] **Recents ⋯** on the recon's own session: **Rename** (what opens, a new title typed, the request sent, the row after; renamed back), **Pin** (the row's new place, the entry's new name; unpinned), **Copy conversation ID** (what lands on the clipboard), **Move to project ›** (the submenu with a project present), **Archive** (the row leaves Recents; Settings › **Archived tasks** listing it, its search, its own row menu, the restore; restored).
- [x] **Projects**: Add new project → Create with a test name (what appears — a section row, a page, a route; the request), the + › Add to project submenu and Recents › Move to project with that project, the project's own controls, and its deletion.
- [x] **Assets**: **Star** a tile → the Star tab shows it (the request; unstarred); one image uploaded through + › Add files or photos on the home composer → whether it appears under **From you** / **Images** and what the upload sent (deleted afterwards through the tile's Delete).
- [x] **Plugins › Manage**: the Plugins, Skills and Apps tabs' contents; Coder's and Verifier's editor (their prompts and models); **Create agent** with a test name → what the editor offers, Save's request; the agent's More actions and its deletion.
- [x] **One click each, captured:** + › Skills › Manage skills and Add skill, + › Environment variables, the preview pane's ⋯ on the finished task, Connect mobile's Create IM Bot and Connect with an empty token, MaxHermes / MaxClaw Start now (a new tab: where it goes), Settings › General's two Preferences switches (toggled and toggled back; the request), the Inbox with whatever it holds.
- [x] **One text turn** to MiniMax-M3 with Thinking as found: the composer while it streams, the thread as it renders (thinking, prose, any tool use), Stop if a control exists, the finished turn, and the transport (the request that starts it, the stream's shape, the messages read back) — the record BACKLOG_006 needs. Credits spent are counted in `behaviour.md`.

## Departures from the reference

None — a recon records; it changes nothing of ours.

## Technical Notes

- `recon/src/behaviour-plan.ts` (pure, tested): the action list with each step's label and undo, the request-body redaction (`redactBody`), the per-action network summary (`summarizeCalls`), the test names (`RECON_PROJECT`, `RECON_AGENT`, the rename suffix) so the undo can find what the run created.
- `recon/src/behaviour.ts`: the runner — `recon/run.sh behaviour [--only <regex>] [--chat 1] [--session <regex>]`, headless on the saved profile, 1440 light (the looks are already captured in both themes and widths); every action is a `step` that records a skip with its reason rather than aborting the run; `--chat` is off unless given, so the credit-spending turn runs only when asked.
- The image uploaded is `tools/stub-generation-server/fixtures/fixture-reference.png` (already in the repo); nothing of the owner's is uploaded.
- `network-log.ts` gains `requestBody` on `NetworkEvent` for POST / PUT / PATCH / DELETE requests (redacted); the `interactions` reducer ignores it.

## Testing Plan

- **Unit** — `recon/src/behaviour-plan.test.ts`: the action list is complete and every action that changes state has an undo; `redactBody` removes token / uid / cookie-like keys and long ids and leaves the rest; `summarizeCalls` groups a run's events by method + path with counts. The recon package's existing tests stay green (`pnpm --filter recon test` in the gate).
- **Integration / E2E:** not applicable — the recon runs against the reference from the Spark and is not part of the gate; the gate's own steps are unchanged (nothing in `app/` changes).
- **Manual verification:** the owner opens agent.minimax.io after the run and confirms Recents, Assets, Projects and the agents are as they were; `behaviour.md` lists what to check.

## Estimated Complexity

Medium — one Playwright pass with many defensive steps; the unknown is what each entry opens, so a probe-and-fix loop like STORY_018's is expected. No app code.

## Done (2026-09-15)

**Recorded** in [docs/recon/2026-09-15/](../recon/2026-09-15/): 85 screenshots across 20 actions, `behaviour.json` (steps, what each showed, the API calls per step), `endpoints.md` / `.json` (55 endpoints from 18,727 events), and [behaviour.md](../recon/2026-09-15/behaviour.md) — the narrative every EPIC_006 story is cut from. Seven runs of `recon/run.sh behaviour` (the first pass, then `--only` reruns after each locator fix, the last with `--chat 1`); the session profile stayed signed in, so no login window was needed.

**What the record settles** (the headlines; behaviour.md has the requests and screenshots): Rename is an inline input + `PATCH session/:id { title }`; Pin makes a **Pinned** section above Projects (`POST pin/session`); Copy conversation ID copies a 15-digit id; Archive removes the row without asking and files it under Settings › Archived tasks (grouped by project, Unarchive + trash per row, Delete all) via `POST session/:id/archive { archived }`; the Recents menu also has **Delete**. Projects: `POST project { name }`, a folding row with **Project actions** / **New task** on hover and a right-click menu (New task, Rename, Pin, Delete → Cancel / Delete → `POST project/:id/delete`); Move to project and + › Add to project list the projects. Assets: Star is `POST/DELETE drive/file/:id/favorite`; an attachment uploads to object storage (`files/request_policy` → PUT → `files/policy_callback`) but becomes an asset only when sent. Management (reached through the Plugins page's Manage button; `/plugins/manage` bounces on a direct load): Plugins 1 (video-creator, with an enable switch), Skills 10, Apps 0, Agents 3 — built-in agents editable in model only, a custom agent (`POST agent`) editable in name / description / prompt / model / tools / skills / plugins with Chat with it / Pin / Delete (`POST agent/delete`). + › Environment variables is an in-page key/value dialog (`GET secret`); Skills › Manage skills → the Skills tab, Add skill → the marketplace. Connect mobile's Create IM Bot offers Telegram only; MaxHermes / MaxClaw's Start now does nothing. Settings › General's two switches are `update_water_mark_setting` and `update_data_contribution_setting` — the watermark one matters for our downloads. The Inbox was empty. A **Daily check-in** card now sits in the sidebar (new since 2026-09-14; never pressed). **The text turn:** `POST agent/:id/session { model }` then a streamed `POST session/:id/message` (`text/event-stream` on `agent-stream.minimax.io`), the thread read back with `thinking_content` / `msg_content`, the title made after the first turn; the default agent is **Mavis**.

**Credits:** 1 text turn. **The account:** every change undone by the runs (the table at the end of behaviour.md); the chat session stays as the owner's record.

**Tooling:** `recon/src/behaviour.ts` + `behaviour-plan.ts` (tested); the plan's `NetworkEvent.requestBody`; the reruns taught it three things worth keeping — the reference's confirmations have no dialog role (a visible Cancel with a sibling Delete), its menus sometimes open only on a right-click, and a rerun must undo a previous run's leftovers before it starts.
