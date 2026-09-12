# Interaction notes — agent.minimax.io video generation — 2026-09-12

What the reference does on the network for the MVP flow, reduced from the day's raw logs (six runs: the state capture, one completed Hailuo-2.3 job, a revisit, and three refused jobs). Per-endpoint counts, statuses, cadence and redacted response shapes are in [endpoints.md](endpoints.md) (generated). Ids, tokens and the owner's content are replaced by placeholders throughout; nothing here identifies the account.

## 1. The shape of the thing

Video generation on the reference is **not a video API call from the browser**. It is an **agent session**: the browser creates a session for an agent, posts the user's message (the prompt with a `@video-creater` plugin mention and the chosen video parameters) to a streaming endpoint, and the agent, running server-side, submits the actual video job to the provider, waits, and is supposed to post the result back into the thread. The finished file lands in the user's **drive**, which the Assets page lists. Everything the UI shows during a job — "Merging…", "Thinking…", "Improving…", the Progress panel's step list, the agent's prose — comes over the message stream as agent events, not from a video-job status endpoint.

Consequences for our clone and its stub (EPIC_002): the job API we expose can stay create → status → result, but the *reference UI's* progress surface is a **thread of agent messages plus a to-do list**, and the result surface is **Assets**. A faithful clone renders a thread; a minimal one renders the to-do list and the result card. EPIC_003 decides which under Departures.

## 2. Endpoints by role

All on `https://agent.minimax.io` unless noted. Every JSON response carries `base_resp: { status_code, status_msg }`; `status_code` 0 means success.

| Role | Call | Notes |
| --- | --- | --- |
| Boot (every page) | `GET /v1/api/config/web/common_config` | Feature/UI config; several calls per page load with different `filter` query keys (query stripped here). |
| Boot | `GET /v1/api/user/info`, `POST /v1/api/user/renewal` | Account basics; `renewal` is a POST made on every load. |
| Boot | `GET /minimax-cloud/api/v1/config` | Returns `models[]` — **the agent models** (MiniMax-M3, M2.7, M2.7 HighSpeed, with `context_limit`, `supported_variants`, `thinking_config`), not the video models. Feeds the composer's MiniMax-M3 selector. |
| Boot | `GET /minimax-cloud/api/v1/signin/status` | Session validity. |
| Boot | `POST /matrix/api/v1/user/get_user_extra_info`, `POST /matrix/api/v1/commerce/get_membership_info` | Plan and membership (`plan_name`, `next_plan_name`, `daily_login_gift_credit_remaining`, `pending_credit`, `can_upgrade`); polled every few seconds while a page is open. |
| Credits | `GET https://platform.minimax.io/backend/account/token_plan_credit` | `total_credits`, `used_credits`, `remaining_credits`, `balance_breakdown`, `token_plan_credit_fallback_enabled`. Drives the "Fewer than 1,000 Credits remain" banner. Polled roughly every 2–3 minutes on a task page. |
| Sidebar | `GET /minimax-cloud/api/v1/sidebar/session/tree` | `sessions[].session { session_id, agent_name, session_type, title, status { status_type, message }, model, team_mode, archived, created_at, updated_at, parent_session_id }`, `has_more`, `next_cursor`. **This is Recents.** `status_type` 0 = fine; 2 with `message: "Connection error."` was seen on a failed session. |
| Sidebar | `GET /minimax-cloud/api/v1/project`, `/cron`, `/channel`, `/skill`, `/agent`, `/plugins/enabled`, `/preferences/pinned-items-order` | Projects, Scheduled, channels, skills, the Agent Team list, enabled plugins, pinned order — all sidebar sections. Out of MVP scope but loaded on every page. |
| Plugin | `GET /minimax-cloud/api/v1/marketplace/plugins/video-creater` | The video plugin's manifest: `plugin.summary { name, display_name, version, description, icon_url, enabled, capabilities }`, `plugin.skills[] { name, description, content }`, `example_queries[]`. **The video model list and parameter options are not in any config endpoint we saw; they come with this plugin** (its skill content) and are rendered by the composer's video mode. |
| **Submit** | `POST /minimax-cloud/api/v1/agent/:id/session` → `{ session_id, agent_name }` | Creates the session (path id is the agent's). Once per job. |
| **Submit** | `POST https://agent-stream.minimax.io/minimax-cloud/api/v1/session/:id/message` → `text/event-stream` | The user message goes here and **the agent's events stream back on the same response** (Server-Sent Events). The stream body was not captured (the logger keeps JSON bodies only); the reconstructed history below shows what it carries. Held open for the length of the agent's turn (about 45 s on the completed job). |
| Thread | `GET /minimax-cloud/api/v1/session/:id` | `session { session_id, agent_name, title, status { status_type, message }, model { provider_id, model_id, variant }, team_mode, session_type, … }`. Polled about **every 40 s** while a task page is open. |
| Thread | `GET /minimax-cloud/api/v1/session/:id/message` | History: `messages[] { turn_id, msg_id, timestamp, role, msg_type, msg_content, source }`, `has_more`, `next_cursor`, `last_msg_id`, `query_collapse_views`. Fetched on open and on revisit. |
| Thread | `GET /minimax-cloud/api/v1/session/:id/queue`, `/input-summaries` | Empty on our sessions; fetched on open and on a ~10-minute cadence. |
| Thread | `GET /matrix/api/v1/user/get_water_mark_setting` | `water_mark_enabled` — whether outputs are watermarked. |
| **Assets** | `GET /minimax-cloud/api/v1/drive/file` | `nodes[] { node_id, parent_id, node_type, category, name, file_ext, mime_type, size_bytes, cdn_url, front_page_screenshot, source, session_id, created_at, is_favorited }`, `total`, `has_more`. The finished video appeared here as `node_type` 2, `category` "videos", `file_ext` "mp4", `mime_type` "video/mp4", ~1.05 MB, with a poster image and the originating `session_id`. |
| **Result file** | `GET <cdn_url>` on an Alibaba Cloud OSS host (`*.oss-us-east-1.aliyuncs.com`) | The MP4 itself, `video/mp4`, fetched by the preview player and by our recon. Not on the app origin. |

## 3. The message model (what the stream carries, as it is stored)

From the stored history of a job (16 entries for one prompt):

- `role: "user", msg_type: 1` — the prompt as typed, with the plugin mention (`@video-creater …`). Plain text.
- `role: "assistant", msg_type: 3` — a JSON event: `{ eventType, todos: [{ content, status, priority }] }`. **This is the Progress panel**: the step list ("Validate live submit…", "Draft and review H3 prompt", "Submit generation task…", "Report…", "Query, download, validate…") with per-step status. Two per job (initial plan, then updated).
- `role: "assistant", msg_type: 2` — events with empty `msg_content` (twelve per job). These are the tool/step markers the UI renders as "Thinking…", "Improving…", "Processed 45s", "Thought 1 time(s), Viewed 2 file(s)"; their payload is not in the stored content, so it either lives in fields the history omits or only in the live stream.
- `role: "assistant", msg_type: 1` — the agent's final prose (Markdown: headings, bullets, inline code), e.g. "Submitted. Task … is queued for MiniMax-Hailuo-2.3 (silent, 6s, 768P). I'll check back in ~10 minutes…" or the billing-wall explanation. Rendered with Copy / Like / Dislike and a timestamp.

The billing and quota walls are **agent prose**, not HTTP errors the browser sees: the browser got 200s throughout; the provider's HTTP 402 was reported inside a `msg_type: 1` message. "Request failed" (plain) and "No conversation resources are available. Subscribe to continue." are the two cases where the thread itself shows a terminal state with a **Retry** or **Subscribe** control.

## 4. Cadence and lifecycle, as measured

| Moment | What happens |
| --- | --- |
| Send | session created → message POST opens the event stream → the composer's Send control becomes **"Stop generation"** (a role-button div) → thread shows "Merging…" then "Thinking…", "Improving…". |
| ~45 s | The agent's turn ends ("Processed 42s"): a `msg_type: 1` message says the job is queued and promises to check back; Send control returns; Copy / Like / Dislike appear under the message. Progress panel shows the to-do list. |
| 45 s → done | The browser polls `session/:id` (~40 s), `commerce/get_membership_info` and `get_user_extra_info` (~2–3 s), `token_plan_credit` (~150 s). Nothing about the video job itself is polled from the browser. |
| ≤ 20 min | The file appears in `drive/file` (Assets). **The agent did not post the result in the thread within 20 minutes** on the one completed job, so the thread never reached a "done" state we could capture; Assets is where the result was found. |
| Cancel | Not observed. The Stop control is present only while the agent's turn is running (the first ~45 s). |

## 5. What maps onto a local model, and what does not

| Reference option | Local (ComfyUI + H3 on the Spark, EPIC_004) | Departure? |
| --- | --- | --- |
| Models: MiniMax-H3.0 (default), H3-Max, Hailuo-2.3 | One local model (H3-Base); H3-Max and Hailuo-2.3 do not exist locally | Yes — menu shows what the Spark serves |
| Resolution 768P / 2K | 768P only; the 2K upscaler is not open-sourced | Yes — 2K absent or marked unavailable |
| Duration 5–15 s (H3), 6/10 s (Hailuo-2.3) | 4–15 s per the H3 model card | No |
| Ratios 21:9 … 9:16 | Supported by H3 | No |
| Reference images (Add reference tile, up to 2 for FL2VA) | FL2VA first/last frame | No |
| Agent thread, to-do list, plugin mention, Agent Team switch, agent-model selector | No agent locally; our job runs directly | Yes — the biggest one; EPIC_003 decides how much thread scaffolding to keep |
| Credits banner, Subscribe, Buy Credits | No billing locally | Yes — omitted |
| Assets drive with categories, poster images, favourites | Our job store | Partly — same shape, local storage |

## 6. Files

- `endpoints.md` / `endpoints.json` — generated tables and shapes (`pnpm recon:interactions 2026-09-12`).
- Raw logs, page dumps, frames and the fetched MP4 stay in `recon/out/2026-09-12/` (gitignored).
