# Component inventory — agent.minimax.io video generation — 2026-09-12

Every visible component of the MVP flow as a tree, with its states and the capture that shows it. Captures are in this folder; measured styles are in [tokens.md](tokens.md); network behaviour in [interactions.md](interactions.md). Widths: 1440 unless a file name says 390.

## App shell

- **Sidebar** (left, 260 px; collapses to an icon rail below ~900 px, becomes a drawer at 390) — `home-signed-in`, `narrow-home@390`, `tokens.md` › sidebar
  - Logo mark (top-left) and **Collapse sidebar** icon button (top-right of the sidebar)
  - Primary items: **New task** (active on home), **Search**, **Plugins**, **Scheduled**, **Assets**, **Connect Mobile** — 34 px rows, icon + label, active row `rgb(245,245,245)` fill
  - Section **More**: MaxHermes, MaxClaw
  - Section **Projects**: **Add new project**
  - Section **Recents**: empty state ("No task history." + "Switch to classic mode in the user menu to view older conversations. Desktop and web don't sync.") — `home-signed-in`; populated with session titles, an unread red dot on a session with a new message — `home-with-recents`
  - Section **Agent Team**: General, Coder, Verifier (each a row; visible when the sidebar is tall enough)
  - Footer: **user chip** (avatar + display name, masked "Owner" in captures) and a **Download desktop** icon button
- **Top bar** (over the main area): on home a document icon (Changelog link) and **Download** button, top-right — `home-signed-in`; on a task page the **session title** left and a **Work Area** icon button right — `task-submitted`
- **Promo carousel card** (bottom-right of the home, two pages with dots; close control labelled in Chinese "关闭"): "H3 takes the stage" / "New MiniMax Desktop" — `home-signed-in`, `composer-video-mode`
- **Announcement modal** (first visit only; not `role=dialog`; "Try it now" call to action, icon-only close) — seen logged out only (EPIC_001 peek); dismissed by every script
- **Low-credits notice** (pinned above the task-page composer): info icon, "Fewer than 1,000 Credits remain.", **Buy Credits** (secondary), **Subscribe** (primary), dismiss × — `task-submitted`, `task-timeout`

## Home

- **Heading** "MiniMax makes your work easier" — 32 px / 400 — `home-signed-in`
- **Composer card** (736 px wide, 20 px radius, soft shadow `rgba(10,10,10,0.08) 0 0 10px`) — `home-signed-in`, `tokens.md` › composer
  - **Editor** (contenteditable, placeholder "Enter message... (use / for commands)", 16 px / 26 px line-height) — `composer-typed`
  - **Bottom bar**: **+ Add attachment** (icon button → menu: Add files or photos, Add to project, Skills ›, Plugins ›, Environment variables — `attach-menu-open`), **Agent Team** switch (blue when on, `rgb(0,148,252)`), **MiniMax-M3** agent-model selector (menu — `agent-model-menu-open`), **Send message** (round black button, up arrow; grey/disabled while the editor is empty)
- **Mode chips** row below the composer: **Video generation** (with an "H3" pill), Document, Website, Image Generation, More — 8 px radius, 32 px tall — `home-signed-in`

## Composer in video mode (after the Video generation chip)

`composer-video-mode`, `narrow-video-mode@390`

- **Reference tile** ("+ Reference", 90×90, 12 px radius, `rgb(245,245,245)` fill, grey label) — opens the file chooser; a chosen image renders as a thumbnail beside the tile with a **Remove Reference image N** × — `scene-selected`
- **Plugin tag** `video-creator` (purple pill inline at the start of the editor text, with the plugin icon) — the mode is implemented as a plugin mention; removing the tag leaves video mode
- **Bottom bar** gains, between the Agent Team switch and the agent-model selector:
  - **Model** button ("MiniMax-H3" with a chevron; reads "Model: MiniMax-H3" / "Model: MiniMax-H2.3" to assistive tech) → menu: **MiniMax-H3.0** (checked by default), MiniMax-H3-Max, Hailuo-2.3 — `model-menu-open`
  - **Video parameters** button (ratio icon "16:9", "2K", clock "5s"; reads "Video parameters: 16:9 2K 5s") → popover with three radio groups — `video-params-open`, `narrow-video-params@390`:
    - **Ratio**: 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 (each with a small frame glyph; 67×44 tiles, 6 px radius, selected = white on grey track)
    - **Resolution**: 768P, 2K (two half-width segments)
    - **Duration**: 5s … 15s (H3); Hailuo-2.3 offers 6s and 10s only (smallest 6s)
- **ShowCase** row: title "ShowCase" with a dismiss ×, four scene cards (169×128 thumbnail, caption below, 12 px / 400) each with a hover **Preview example** icon — clicking a card loads its prompt, reference image and parameters into the composer and shows a **Clear selected scene** × at the composer's right; at 390 px the row is a two-column grid — `composer-video-mode`, `scene-selected`, `narrow-video-mode@390`
- Overflow at 390 px: the bottom bar's controls truncate and the Video parameters control leaves the viewport — `narrow-video-mode@390`, `tokens.md` › breakpoints

## Task page (after Send)

Path stays under one route (`/mavis`, the session id is not in the path). `task-submitted`, `task-generating-*`, `task-timeout`, `task-request-failed`, `task-rejected-insufficient-credits`, `task-no-conversation-resources`, `task-revisited-pending`

- **Session title** in the top bar ("Unnamed Session" until the agent names it; then e.g. the prompt's gist) and in Recents
- **Thread** (centred column, ~740 px):
  - **User message bubble** (light grey, 12 px radius): the plugin mention rendered as `@video-creater` text followed by the prompt; a **Copy** icon on hover
  - **Working indicator**: agent avatar + status text "Merging…", "Thinking…", "Improving…" — `task-generating-000s`, `task-generating-030s`
  - **Processed N s** chevron row (collapsible summary of the agent's steps: "Thought 1 time(s), Viewed 2 file(s)") — `task-generating-090s`, `task-request-failed`
  - **Assistant message** (Markdown: headings, bullets, inline code chips): the "Submitted… queued…" note or the billing-wall explanation; **Copy / Like / Dislike** icons and a timestamp beneath — `task-timeout`, `task-rejected-insufficient-credits`
  - **Failure rows**: "ⓘ Request failed" + **Retry** (black pill) — `task-request-failed`; "No conversation resources are available. Subscribe to continue." + **Subscribe** — `task-no-conversation-resources`
  - Footer line "MiniMax Agent is AI and can make mistakes"
- **Progress panel** (right column, card, "Progress" header with chevron, "Track progress on longer tasks." when empty; a numbered to-do list with ticks and strike-through for done steps when populated) — `task-timeout` (empty), `task-rejected-insufficient-credits` (populated)
- **Docked composer** (bottom of the thread, same anatomy as the home composer minus the mode chips; the plugin tag is not shown again). While the agent works, **Send message** becomes **Stop generation** (black square icon, same position) — `task-generating-000s`; it reverts when the turn ends
- **Work Area** icon button (top-right) — opens a side workspace (not explored; out of MVP)

## Assets (`/assets`)

`assets-empty`, `assets-videos-filter`, `assets-one-video`, `assets-video-tile-hover`, `assets-video-preview`, `assets-video-preview-hover`, `narrow-assets@390`

- **Title** "Assets" (26 px / 500)
- **Tabs**: From Agent (active, underlined), From You, Star (16 px / 500)
- **Filter chips**: All (active, `rgba(10,10,10,0.04)` fill), Websites, Documents, Excel, PPT, Images, Videos, Audio (8 px radius)
- **Search field** "Search by file or task name" (right-aligned, 34 px)
- **Empty state**: "No assets yet" (16 px / 500), "Files generated by AI and uploaded by you will appear here", **+ New task** primary button — `assets-empty`
- **Video tile** (254×184; poster image; file name below; hover reveals a **Preview <file>.mp4** overlay and a **More actions for <file>.mp4** kebab) — `assets-one-video`, `assets-video-tile-hover`
- **Preview modal** (1120 px wide): title bar with the file name and three icon buttons (download, open in new, close); a native HTML5 `<video>` with the browser control bar (play, 0:00 / 0:05, volume, fullscreen, more) — `assets-video-preview`, `assets-video-preview-hover`
- **Actions menu** (from the kebab) — not captured (click timed out once; fixed, not re-run)

## Not part of the MVP, seen in passing

Search, Plugins, Scheduled, Connect Mobile, MaxHermes, MaxClaw, Projects, Agent Team roster, Skills, Environment variables, the Work Area, Document / Website / Image Generation modes, Changelog. Each is a backlog candidate ([CLAUDE.md → §3c](../../../CLAUDE.md#3c-how-backlog-is-tracked)) and none has more than a screenshot here.
