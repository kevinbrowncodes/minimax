# Behaviour notes — agent.minimax.io, the surfaces STORY_026 kept — 2026-09-15

What each kept surface **does** on the reference: performed once on the owner's account from the Spark with his approval of 2026-09-15 ("yes" to the reversible changes; credits from the daily budget), through the saved profile, headless, 1440 × 900 light. Every step is a screenshot in this folder (`behaviour-<action>-<n>-<label>@1440.png`) with its state dump and API calls in [behaviour.json](behaviour.json); the day's calls are reduced in [endpoints.md](endpoints.md); request bodies (redacted) are in the gitignored `recon/out/2026-09-15/network-behaviour.jsonl`. The runner is `recon/run.sh behaviour` (STORY_027). API paths below drop the `/minimax-cloud/api/v1` prefix; ids are placeholders.

**The account as left:** everything the runs changed was undone by the runs themselves — see "Left as found" at the end, and check it once: Recents (the session's title, no Pinned section, both "Paper boat on rain puddle" rows present), Assets › Star (empty), Projects (no "Recon test project"), Plugins › Manage › Agents (no "Recon test agent"), Settings › General (both switches on, as found).

**Seen since 2026-09-14, uncaptured then:** a **Daily check-in** card sits in the sidebar above the footer (heading "Daily check-in", an ⓘ "About check-in Credits", "1-day streak this cycle", seven day tiles with credit amounts — 400 / 400 / 400 / 1000 / 400 / 400 / 1000 — and a primary **Check in for 400 Credits** button; a "Close daily check-in" ×). The runs never pressed it. `GET …/user/renewal` is polled with the rest.

## 1. Recents ⋯ (the row's own menu)

The row's ⋯ appears on hover as an icon-only control; the menu is a real `ul[role=menu]` of `li[role=menuitem]`s, 232 × 204 px, 32 px entries: **Rename, Pin, Copy conversation ID, Move to project ›**, a separator, **Archive, Delete** (`behaviour-recents-rename-01-menu`, `behaviour-project-move-01-recents-move-submenu`). Delete was not pressed (ours already deletes from history). Each of Rename / Pin / Copy / Archive answers with a toast at the top of the page ("Task pinned", "…copied", "…archived tasks in Settings") with a **Close toast** ×.

| Entry | What happens on screen | What is sent |
| --- | --- | --- |
| **Rename** | The row becomes an **inline text input** holding the current title (`…-02-after-rename-click`: `input "Paper boat on rain puddle" @20,451 219×26`); typing and Enter commit it, the row shows the new title (`…-03-renamed`), Escape would cancel. No dialog. | `PATCH session/:id` `{ "title": "<new title>" }` → `{ session: { session_id, title, archived, model, team_mode, session_type, status, created_at, updated_at, … } }`, then `GET session/:id`. Renaming back sends the same PATCH with the old title. |
| **Pin** | A toast "Task pinned". A new folding sidebar section **Pinned** appears **above Projects** holding the row (`…-pin-01-pinned`: rows read New task · Search · Plugins · Scheduled · Assets · Connect mobile · More · **Pinned** · Paper boat on rain puddle · Projects · Recents); the row stays in Recents too. The menu's entry reads **Unpin** while pinned (`…-02-menu-while-pinned`); Unpin removes the section again (`…-03-unpinned`). | `POST pin/session` `{ "session_id": ":id", "pinned": true }` → `{ success, item: { item_type: 1, id, type: "session", session: {…} }, items: [...] }`; Unpin: the same with `"pinned": false`. The order lives at `GET preferences/pinned-items-order` (polled). |
| **Copy conversation ID** | Nothing visible. The clipboard receives the session id: a **15-digit number**. | No request. |
| **Move to project ›** | A submenu (`behaviour-project-move-01-recents-move-submenu`) — see §2. | — |
| **Archive** | No confirmation. The row **leaves Recents** at once (`…-archive-02-archived`: the two matching rows became one). Settings › **Archived tasks** lists it (`…-03-archived-tasks`): rows grouped under a folder heading **No project** (the project filter's grouping), each with the title, the archive date/time ("Sep 15, 2026, 12:11 PM"), a **trash** icon and an **Unarchive** button; the panel's head carries a red **Delete all**; the search field filters live (`…-04-archived-tasks-search`, `…-05-…-no-match`); the **All projects ▾** filter is next to it. Unarchive puts the row back in Recents (`…-06-recents-after-restore`). | `POST session/:id/archive` `{ "archived": true }` → `{ success }`; the list is `GET session/archived-items` → `{ items: [{ type, session, archived_at }], has_more }`; Unarchive: `POST session/:id/archive` `{ "archived": false }`. |

## 2. Projects

| Action | What happens | What is sent |
| --- | --- | --- |
| Projects › **Add new project** | The **Create project** dialog: "Projects keep your tasks, files, and Agent Team in one place — perfect for long-running work.", a **Project name** field, **Create** (`behaviour-project-create-01-dialog`, `…-02-named`). Create closes it and the page stays `/`; the Projects section now lists the project as a folding row **"Recon test project — No tasks"** (`…-04-projects-section`) whose hover shows two icon buttons: **Project actions** (⋯) and **New task** (`behaviour-project-move-04-project-row-hover`). Clicking the row expands it ("No tasks"); the project's own page is at `/mavis` with the project name as its h1 (`behaviour-project-delete-01` of the second run). | `POST project` `{ "name": "Recon test project" }` → `{ project: { id: <n>, name, pinned: false, extra_data_json: "", created_at, updated_at } }`; the list is `GET project` (polled) and `GET sidebar/session` |
| Recents ⋯ › **Move to project ›** | A submenu: **Add new project**, then one entry per project (`behaviour-project-move-01-recents-move-submenu`: "Add new project", "Recon test project"). Not followed. | — |
| + › **Add to project ›** (composer) | A submenu of buttons: **No project** (checked), **Add new project**, then the projects (`behaviour-project-move-02-attach-add-to-project-submenu`). Not followed. | — |
| The project's ⋯ › **Delete** | The row's hover ⋯ (**Project actions**) opened nothing to a click, a dispatched click, Space or Enter (`behaviour-project-delete-01..02`); a **right-click on the row** opens the project's menu — **New task, Rename, Pin**, a separator, **Delete** (`…-03-project-menu-right-click`); Delete asks **Cancel / Delete** (no dialog role, `…-04-after-delete-click`); confirming removes the row (the sidebar caught up on the next load). The row's other hover control, **New task**, opens the composer for a task inside the project. | `POST project/:id/delete` (no body) |

## 3. Assets

| Action | What happens | What is sent |
| --- | --- | --- |
| **Star** (tile ⋯) | The tile's ⋯ entry is **Star**; the **Star** tab then lists the tile (`behaviour-assets-star-02-star-tab`); the ⋯ reads **Unstar** while starred (`…-03-menu-while-starred`). The Star tab keeps showing the tile until the page reloads (`…-04-star-tab-after-unstar` after a reload: "No assets yet"). | `POST drive/file/:id/favorite` → `{ base_resp }`; Unstar: `DELETE drive/file/:id/favorite`. `GET drive/file` nodes carry `is_favorited`. |
| **Upload** (+ › Add files or photos on the home composer) | The chooser accepts the image; it appears attached in the composer (`behaviour-assets-upload-01-attached`). It does **not** appear under Assets › From you or the Images chip (`…-02-from-you`, `…-03-from-you-images`: "No assets yet") — an attachment becomes an asset only once a message carrying it is sent. Nothing to delete afterwards; the draft is dropped on leaving the page. | `GET /v1/api/files/request_policy` → short-lived object-storage credentials (`dir`, `endpoint`, `bucketName`, an STS key — redacted in our log); the browser then PUTs the file straight to that bucket; `POST /v1/api/files/policy_callback` `{ fileName: "<uuid>.png", originFileName, dir, endpoint, bucketName, size, mimeType, fileMd5 }` → `{ data: { fileID, ossPath, coverUrl } }`. |

## 4. Plugins › Manage (the agents)

**Management** (`behaviour-manage-tabs-01-management`) has four counted tabs and a search field per tab:

| Tab | Contents | What is sent |
| --- | --- | --- |
| **Plugins 1** | one row, **video-creator** — "Create videos with H3.0, H3 Max, or H2.3 through the mcode-tools Connector, with text-to-video, keyframes, and full multimodal references. H3 Max generates in about 20 seconds." — with a **video-creator details** button and an **Enable or disable video-creator** switch, on (`…-02-tab-plugins`). | `GET plugins/installed` → `{ plugins: [{ name, version, description, source, enabled, category, installation_policy, display_name, author, icon_url, capabilities }] }`, `GET connectors/connected/list` |
| **Skills 10** | ten skill rows, e.g. `deep-research` marked **Built-in** with a long description; **Search skills** (`…-03-tab-skills`). | `POST /matrix/api/v1/skill/list_my_skill`, `GET skill` → `{ skills: [{ name, description, enabled, scope, source_type, location_uri, … }] }` |
| **Apps 0** | "No matching results"; **Search apps** (`…-04-tab-apps`). | — |
| **Agents 3** | "All agents": **General**, **Coder**, **Verifier** (each a 220 × 36 button with an avatar) and **Create agent**; the editor at the right: **Portrait** (an **Edit Agent portrait** upload), **Name \*** (`input "Agent display name"`), **Model** (a **Auto** select), **System prompt** (a 528 × 240 textarea), and **Save** / **Chat with it** at the bottom; a custom agent's editor also has **Delete** (`…-05-tab-agents`, `behaviour-manage-agents-01..03`, `behaviour-manage-create-agent-01`). | `POST agent/config/get` per agent → `{ config: { name, meta: { owner_kind: "builtin" \| "custom", persistence: "cloud", applies_to: "new_subsession", editable_fields: ["model"] for a built-in, ["display_name", "description", "system_prompt", "model", "tool_capabilities", "skill_selectors", "plugin_names"] for a custom one, supported_actions: ["chat", "reset_model"] \| ["chat", "delete"], supported_tool_capabilities: ["shell", "mavis_base", "file", "memory", "web", "other", "base", "connector"], model_fallback }, configured: { display_name, description, system_prompt, permission_policy }, effective_for_new_subsession: {…} } }`; `POST agent/legacy-history-notice/get` |

The built-in agents' effective prompts came back in `effective_for_new_subsession.system_prompt` (General: "## Your Role — You are a general-purpose agent…", the text STORY_025 shows; Coder: "## How You Work — 1. Understand first…"; Verifier: an "adversarial verification specialist"); their `configured.system_prompt` is empty and only `model` is editable.

**Create agent** opens an empty editor (Name \* required). Save: `POST agent` `{ "source": "manual", "display_name", "avatar": "mavis-agent-avatar://default/v1/0", "configured": { "display_name", "system_prompt": "" } }` → `{ name: "<id>" }`; the new agent joins the list and is selected (`behaviour-manage-create-agent-05-saved`). The row's hover ⋯ opens a menu **Chat with it / Pin / Delete** (`…-06-agent-menu`); Delete asks **Cancel / Delete** in a confirmation without a dialog role (`…-07-delete-confirmation`); confirming sends `POST agent/delete` and the row goes (`…-08-after-delete`).

Reaching it: on 2026-09-15 a direct load of `/plugins/manage` bounced to `/plugins` (the marketplace); the page's top-bar **Manage** button and the composer's + › Skills › **Manage skills** both navigate to `/plugins/manage` client-side.

## 5. One click each

| Control | What it does | What is sent |
| --- | --- | --- |
| + › **Skills › Manage skills** | Navigates to `/plugins/manage` with the **Skills 10** tab open: ten skills, the first `deep-research` marked **Built-in** with a long description; a **Search skills** field (`behaviour-attach-skills-01-manage-skills`). | `POST /matrix/api/v1/skill/list_my_skill`, `GET skill` |
| + › **Skills › Add skill** | Navigates to `/plugins` (the marketplace) (`…-02-add-skill`). | `GET marketplace/plugins` |
| + › **Environment variables** | An in-page dialog "Environment variables — MiniMax will securely encrypt and store environment variables for sensitive data like API keys and credentials." with **key name** / **Key value** inputs, **Add Variables** and **Save** (`behaviour-attach-env-01-environment-variables`). | `GET secret` (the stored variables; empty) |
| Connect mobile › **Connect** (empty token) | Nothing changes (`behaviour-connect-mobile-01-connect-empty-token`); the button is disabled until a token is typed. | — |
| Connect mobile › **Create IM Bot** | A one-entry menu: **Telegram** (`…-02-create-im-bot`). | — |
| MaxHermes / MaxClaw › **Start now** | Nothing: no navigation, no new tab, no dialog (`behaviour-product-start-01/02`); the three **Get MaxHermes** / **Get MaxClaw** rows are `div[pointer]`s. | `POST /matrix/api/v1/commerce/get_membership_info` only |
| Settings › General › **Remove an "AI-generated" watermark** switch | Toggles (aria-checked true → false → true). **This one matters locally:** on the reference downloads carry a visible AI watermark unless it is off. | `POST /matrix/api/v1/user/update_water_mark_setting` `{ "enable_water_mark": false | true }`; read back by `GET /matrix/api/v1/user/get_water_mark_setting` → `{ water_mark_enabled }` |
| Settings › General › **Help improve our services** switch | Toggles. | `POST /matrix/api/v1/user/update_data_contribution_setting` `{ "data_contribution_enabled": … }`; `GET …/get_data_contribution_setting` |
| **Inbox** bell | The popover: tabs **All / Updates / Messages**, **Read all**, "No messages yet" on every tab (`behaviour-inbox-01..03`). | `GET notifications` (polled app-wide) |
| The finished task's preview pane **⋯** | A menu of four: **Download, Copy, Refresh, Star** (`behaviour-preview-more-03-preview-more-menu`; 170 × 152, 36 px entries). Opening the pane fetched the file URL as on 2026-09-14. | `GET drive/file/:id/download-url` |

## 6. One text turn (MiniMax-M3)

Typed on the home composer in its default text mode, Thinking as found (on), Enter to send (`behaviour-chat-01-typed`). **One turn, 1 credit-spending call**, from the owner's daily budget.

| Moment | On screen | On the wire |
| --- | --- | --- |
| Send | The page becomes a task page at `/mavis`, titled **Unnamed session**; the prompt as the user bubble at the right; under it the agent's avatar and a status word that changes as it works — **Thinking…**, **Planning…**, **Aligning…** (`…-02-streaming-1` … `-05-streaming-4`); the docked composer's Send is a **Stop generation** square; the Work Area panel reads "Track progress on longer tasks."; the low-credits notice and the "MiniMax Agent is AI and can make mistakes" line are there as on any task page. | `POST agent/:id/session` `{ "model": { "provider_id": "minimax", "model_id": "MiniMax-M3", "reasoning": true } }` → `{ agent_name, session_id }` (the session is made for the default agent **Mavis** — `GET agent` lists it first: "A partner with judgment and warmth \| Powered By MiniMax", `agent_role: "mavis"`); then `POST https://agent-stream.minimax.io/minimax-cloud/api/v1/session/:id/message` `{ "content": "<the text>", "model": {…the same…}, "turn_id": "<uuid>", "worktreeMode": false }` answered as **`text/event-stream`** — the reply streams on that response; alongside, `GET agent-stream…/events` is held open and re-requested (a long-poll of session events), and `session/:id`, `session/:id/queue`, `session/:id/message`, `session/:id/input-summaries` are polled as on 2026-09-14. |
| Done (30 s) | The status row becomes **Processed 24s ›**; the reply renders as prose; under it Copy · Like · Dislike and the time (`…-08-streaming-7`); Send returns. The session is titled from the exchange — **What can you help make** — in the top bar and in Recents (`…-09-reloaded`). `session/:id.model` reads `{ provider_id: "minimax", model_id: "MiniMax-M3", variant: "thinking", context_limit: 450000, supported_variants: ["", "thinking"], reasoning: true }`. | `GET session/:id/message` → `messages[]`: the user turn `{ role: "user", msg_type: 1, msg_content, turn_id, msg_id, timestamp, source: "api" }` and the assistant turn `{ role: "assistant", msg_type: 1, msg_content: "<the prose>", thinking_content: "<the reasoning>", thinking_duration_ms: 2242, finish_reason: "stop", usage: { input_tokens, output_tokens, total_tokens, context_window: 450000, cache_read }, query_key: "turn:<uuid>", … }`, plus `query_collapse_views`, `next_cursor`, `has_more`. |

The reply itself (verbatim, the persona's): "I'm Mavis — I can help you build all kinds of stuff: docs (Word, PDF, decks, spreadsheets), websites and web apps, research reports with sources, code projects, data analysis, even visual HTML pages with diagrams and charts. Tell me what you're trying to make and I'll get going on it." Its `thinking_content` starts "The user is asking what I can help them make … I should reply in the persona of Mavis: warm, casual, direct…". No Stop was pressed. **This is the record BACKLOG_006 needs:** a session per agent with a model object, one streamed POST per turn, the thread as `role` / `msg_type` / `msg_content` / `thinking_content`, the title made after the first turn.

## Left as found

Seven runs (`recon/run.sh behaviour`, then `--only` reruns after each fix, the last with `--chat 1`); [behaviour.json](behaviour.json) was rebuilt from the state dumps and the log afterwards, since each run wrote only its own actions. Per change:

| Change | Undone | How |
| --- | --- | --- |
| Rename | yes | renamed back, `PATCH session/:id` |
| Pin | yes | Unpin, `POST pin/session { pinned: false }` |
| Archive | yes | Unarchive under Settings › Archived tasks (the first run's archive by the second run, then the second run's own) — 4 matching Recents rows before and after |
| Test project | yes | `POST project/:id/delete` from the right-click menu (run 6; the sidebar showed it once more until the next load, so run 6 reported it left — run 7 found nothing to delete) |
| Star | yes | Unstar, `DELETE drive/file/:id/favorite`; the Star tab empty after a reload |
| Upload | nothing to undo | never became an asset |
| Test agent | yes | `POST agent/delete` — twice: the first run's leftover (its confirmation had no dialog role) and the last run's own |
| Preferences switches | yes | each toggled back; both read `true` as found |
| Text turn | left | the session **What can you help make** stays in Recents (it is the owner's record; 1 turn of credits) |

**For the owner to eyeball once:** Recents — "Paper boat on rain puddle" twice, no Pinned section, the new "What can you help make"; Projects — only "Add new project"; Assets › Star — empty; Plugins › Manage › Agents — General, Coder, Verifier only; Settings › General — both switches on.
