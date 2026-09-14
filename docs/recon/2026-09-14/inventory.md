# Component inventory — agent.minimax.io, every surface a signed-in user sees — 2026-09-14

The second capture (STORY_018), taken from the Spark through the owner's own session, in **light and dark** at **1440 and 390**. Every surface is a tree of its visible components with the capture that shows it; a dark capture inserts `-dark` before the `@`, a narrow one carries `narrow-`. Measured styles are in [tokens.md](tokens.md); what the network does in [interactions.md](interactions.md); every screenshot with its state, theme, width and how it was reached in [manifest.json](manifest.json), which also carries the outcome of every click this capture made (`clicks`) and the states it could not reach (`skipped`). The [2026-09-12 inventory](../2026-09-12/inventory.md) covered the video generation flow alone; this one covers the whole app and records what moved in two days. **Generations on the reference today: 0** (one was approved; the 2026-09-12 job had finished on its own, so the finished thread needed none).

**The theme.** The reference has three appearance settings — **Light mode / Dark mode / System** — under **user menu › Settings › General › Appearance** (three preview cards; the chosen one is outlined in the accent blue): `settings-general@1440`, `settings-general-dark@1440`. Choosing one sets `class="light"` or `class="dark"` on the document element together with `style="color-scheme: light|dark"` (manifest › `theme`); nothing else on the document changes. Dark body background `rgb(28, 28, 28)`; light `rgb(255, 255, 255)`. The setting is remembered on the account: every capture here was made by switching it and the run put it back to **Light mode**, which is what the owner had.

**What moved since 2026-09-12** (same account, same viewport): the sidebar's **More** and **Projects** sections are now folded by default (their rows exist and unfold on click); the **Agent Team** section (General, Coder, Verifier) is **gone** from the sidebar — a card in its place says "You can now find Agents in Plugins" and the three agents live under **Plugins › Manage › Agents**; the composer's **Agent Team switch is gone** (the bottom bar is now +, model controls, MiniMax-M3, Send); the footer gained an **Inbox** bell; the ShowCase row is titled **"Showcase"** (was "ShowCase"); the video **Model menu's entries are renamed** — MiniMax-H3 ✓, MiniMax-H3-Max, MiniMax-H2.3 (were MiniMax-H3.0, MiniMax-H3-Max, Hailuo-2.3) and are `menuitemradio`s; the agent-model menu offers MiniMax-M3 ✓, MiniMax-M2.7, MiniMax-M2.7 HighSpeed and a Thinking switch; the 2026-09-12 "Paper boat" job **finished** after that day's 20-minute bound, so a finished thread with its result card was captured without a new generation.

## App shell

- **Sidebar** (260 px at 1440; a drawer at 390 behind an **Expand sidebar** button at the top-left of the page) — `home-signed-in@1440`, `home-signed-in-dark@1440`, `narrow-home-signed-in@390`, `narrow-sidebar-drawer-open@390`
  - Top row: logo mark (**Back to home**) left, **Collapse sidebar** icon button right. Collapsed, the sidebar becomes an icon rail — `sidebar-collapsed@1440`, `sidebar-collapsed-dark@1440`; the same button (now reading **Expand sidebar**) brings it back.
  - Primary rows (34 px, icon + label; the active row has the filled pill): **New task**, **Search**, **Plugins**, **Scheduled**, **Assets**, **Connect mobile**. Row hover: `hover-sidebar-row@1440`, `hover-sidebar-row-dark@1440`.
  - Section **More** (a folding header, `aria-expanded`; closed by default): **MaxHermes**, **MaxClaw** — `sidebar-more-expanded@1440`.
  - Section **Projects** (folding, closed by default): **Add new project** — `sidebar-projects-expanded@1440`.
  - Section **Recents** (folding, open): one row per session, title truncated with an ellipsis, a leading dot (red = unread / has a new message, hollow grey = read) or the agent's avatar when the session was with a named agent ("Verifier"); **Show more** at the bottom. On hover a row shows **Pin** and a **⋯** (its accessible name leaks an i18n key, `sidebar.action_more`); the ⋯ opens the row menu — `recents-row-menu-open@1440`, `recents-row-menu-open-dark@1440`: **Rename**, **Pin**, **Copy conversation ID**, **Move to project ›**, **Archive**, **Delete** (red). Entries were not clicked. **Show more** extends the list in place (no navigation) — `recents-show-more@1440`.
  - **Agents guide card** (below Recents; light grey card with a blue illustration): "You can now find Agents in Plugins", **View now** (→ `/plugins/manage`, the Agents tab — `agents-guide-view-now@1440`), a dismiss ×. It disappeared for the account after View now was followed once, so the dark and narrow passes could not re-capture it.
  - Footer: **user chip** (avatar + display name; masked "Owner" here), **Inbox** icon button (bell; tooltip "Inbox"; opens a popover — `inbox-open@1440`, `inbox-open-dark@1440`: tabs **All / Updates / Messages**, **Read all**, empty state "No messages yet"), **Download desktop** icon button (→ new tab `agent.minimax.io/download` — `download-desktop-open@1440`).
- **Top bar** — on the home a **Changelog** icon link (→ new tab `agent.minimax.io/docs/changelog` — `changelog-open@1440`) and a **Download** button (→ new tab `/download` — `download-open@1440`); on a task page the **session title** left and the **Work area** icon button right (see the task page).
- **User menu** (from the chip) — `user-menu-open@1440`, `user-menu-open-dark@1440`: **UID : …** (the account id; zeroed in the captures), plan row **Default** with a black **Subscribe** button, then **Switch to classic**, **Settings**, **Daily check-in ›**, **Usage ›**, **Contact us ›**, **Learn more ›**, **Logout**. Only Settings was followed (owner, 2026-09-14: classic mode and anything signed-out are not ours).
- **Settings modal** (from the user menu; ≈ 940 px wide, a left nav and a titled panel with an × top-right) — one capture per section, both themes:
  - **General** — `settings-general@1440`, `settings-general-dark@1440`: **Appearance** (Light mode / Dark mode / System cards, see above); **Preferences**: "Remove an "AI-generated" watermark" (switch, with a two-line explanation) and "Help improve our services" (switch).
  - **Account** — `settings-account@1440`, `settings-account-dark@1440`: the avatar (**Edit avatar**) and nickname (**Edit nickname** pencil) centred; a **Password** row ("You can update your password to better secure your account.") with **Manage**; **Delete account** (red, left) and **Cancel / Save** (right) at the bottom.
  - **Usage** — `settings-usage-dark@1440`: plan panel with **Subscribe**; credits panel with **Recharge** and **Manage**; "Use Credits after Token Plan limit" switch; a **Request** button; two "About …" info icons.
  - **Archived tasks** — `settings-archived-tasks-dark@1440`: a **Search archived tasks** field and an **All projects** filter.
- **Promo carousel card** (fixed, bottom-right; two pages with dot buttons named "1" and "2"; close labelled "关闭") — `home-signed-in@1440` (page 1: "H3 takes the stage. Let the show begin."), `promo-carousel-page-2@1440` (page 2: "New MiniMax Desktop" with a **Download desktop** button). At 390 it covers the lower half of the screen; the narrow passes dismissed it after the first shot so it would not swallow clicks.
- **Low-credits notice** (pinned above a task page's composer): ⓘ "Fewer than 1,000 Credits remain." · **Buy Credits** (secondary) · **Subscribe** (primary) · **Dismiss usage notice** × — `task-page@1440`.

## Home

`home-signed-in@1440`, `home-signed-in-dark@1440`, `narrow-home-signed-in@390`, `narrow-home-signed-in-dark@390`

- **Heading** "MiniMax makes your work easier".
- **Composer card** (736 px, 20 px radius, soft shadow): **Editor** ("Enter message... (use / for commands)"), bottom bar **+ Add attachment**, **MiniMax-M3** agent-model button (menu — `agent-model-menu-open@1440`), **Send message** (round; grey while empty).
  - **Add attachment** menu — `attach-menu-open@1440`: **Add files or photos**, **Add to project ›**, **Skills ›**, **Plugins ›**, **Environment variables**. The entries carry no ARIA role. Submenus on hover: `attach-add-to-project-submenu-open@1440`, `attach-skills-submenu-open@1440`, `attach-plugins-submenu-open@1440`.
- **Mode chips**: **Video generation** (with the "H3" pill), **Document**, **Website**, **Image Generation**, **More** (a menu — `mode-more-open@1440`: **Spreadsheet**, **AI PPT**, **Research Report**, **Education**, **Scheduled Tasks**). Chip hover: `hover-mode-chip@1440`.
  - Each mode chip puts a **Clear selected scene** pill at the composer's left and swaps in that mode's **Showcase** (title, dismiss ×, four cards with **Preview example** on hover): Document — `mode-document@1440` (report showcases); Website — `mode-website@1440` (site showcases); Image Generation — `mode-image-generation@1440` (image prompts as cards). Each in dark and at 390 too.
- **Search** (sidebar row) opens a **Search tasks** dialog over the home, not a page — `page-search@1440`, `page-search-dark@1440`: a **Search task titles** field, **Close**, and the recent sessions as rows.

## Composer in video mode

`composer-video-mode@1440`, `composer-video-mode-dark@1440`, `narrow-composer-video-mode@390` (+ dark)

Unchanged from 2026-09-12 except the missing Agent Team switch and the renamed model entries: **+ Reference** tile (90×90), the **video-creator** plugin tag (with **Remove video-creator** ×), **Model: MiniMax-H3** button (menu — `model-menu-open@1440`: MiniMax-H3 ✓, MiniMax-H3-Max, MiniMax-H2.3), **Video parameters: 16:9 2K 5s** button (popover — `video-params-open@1440`, `narrow-video-params-open@390`: Ratio 21:9 … 9:16, Resolution 768P / 2K, Duration 5s … 15s), **MiniMax-M3**, **Send message**; the **Showcase** row (four video cards) — `scene-selected@1440` after a card, `composer-typed@1440` with a prompt typed and never sent.

## The pages behind the sidebar

Every row was clicked as a user would (manifest › `clicks` has each outcome). Both themes at 1440; the narrow captures carry the `narrow-` prefix.

- **Plugins** → `/plugins` — `page-plugins@1440`, `page-plugins-dark@1440`: top bar tabs **Market** (active) / **Personal**, right-aligned **Refresh** icon, **Manage**, **Create ▾**; category chips **All · Office · Studio · Design & sites · Code · Biz · Sales · Prod · Sci & health · Edu · Other**; a **Search plugins or skills...** field; **Plugins** section (two-column cards: icon, name, one-line description, **Details**, **Install**; "View all 27"); **Skills** section (same cards, a **Filter skills** icon). **Personal** tab — `page-plugins-tab-personal@1440`: a **Search skills...** field and "No matching plugins or skills".
  - **Plugins › Manage** (`/plugins/manage`, reached through the Agents guide's View now) — `agents-guide-view-now@1440`: **Back to plugin marketplace**, heading **Management**, tabs **Plugins 1 · Skills 10 · Apps 0 · Agents 3**; the Agents tab lists **General / Coder / Verifier** (each with **More actions**) and **Create agent**, with an editor on the right (Portrait, Name, Model "Auto", System prompt, **Save**, **Chat with it**). This is where the 2026-09-12 sidebar's Agent Team went.
- **Scheduled** → `/scheduled` — `page-scheduled@1440`, `page-scheduled-dark@1440`: heading **Schedules**, a **Search scheduled tasks** field with a **Scheduled task status** filter ("All"), **Create** + **More create actions ▾** top-right, empty state "No scheduled tasks yet." with a **Create** button.
- **Connect mobile** → `/connect-mobile` — `page-connect-mobile@1440`, `page-connect-mobile-dark@1440`: a left list (**New Bot · Telegram**, **Create IM Bot**) and a form: heading **New Bot**, "Not bound", **Connect Telegram** with an **Enter Bot Token** field and **Connect**, "Get a token from @BotFather on Telegram", **Choose an Agent** (**Default ▾**), **Working directory** (**No project ▾**), **Delete Bot** (**Delete**).
- **MaxHermes** → `/max-hermes` — `page-maxhermes@1440`, `page-maxhermes-dark@1440`: a marketing page — hero "MaxHermes — An Agent That Grows With You." with **Start now**, then three feature rows each with a **Get MaxHermes** button.
- **MaxClaw** → `/max-claw` — `page-maxclaw@1440`, `page-maxclaw-dark@1440`: the same layout — "MaxClaw — Your 24/7 personal assistant.", **Start now**, three **Get MaxClaw** rows, "Available on Telegram".
- **Add new project** → a **Create project** dialog over the home (name field with the placeholder "Final Essay", **Create**, **Close**) — `page-add-new-project@1440`, `page-add-new-project-dark@1440`. Not submitted.
- **Search** → the Search tasks dialog (see Home).

## Task page (a finished session, reopened from Recents)

`task-page@1440`, `task-page-dark@1440`, `task-thread-top@1440`, `narrow-task-page@390` (+ dark). The route stays `/mavis`.

- **Top bar**: session title ("Paper boat on rain puddle"), an icon button beside it, and **Work area** (icon, tooltip "Work area") at the right.
- **Thread** (centred column ≈ 740 px), scrolled to the bottom on open; a floating round button between thread and composer reads **Click to jump to start of answer, double-click to jump to top** (and **Click to jump to bottom** once scrolled up):
  - **User message bubble** (grey, 12 px radius; long messages clamp with a **View all** button; a **Copy** icon on hover). The agent's own scheduled follow-ups appear as user-side bubbles with a **Schedules** pill above them.
  - **Processed N s ›** row (collapsible summary of the agent's steps) — `task-processed-expanded@1440`.
  - **Assistant message** (Markdown) with **Copy / Like / Dislike** and a timestamp ("Sep 12, 15:41") beneath.
  - **Scheduled-task card** inside a turn: a description row (**View details**), **Run now**, **View details**, and a `schedule.view_scheduled_task` pill (another leaked i18n key).
  - **Result file card** — `task-result-card-hover@1440`: a play-icon tile, the file name **441031527284814.mp4**, the type **MP4**, an **Open preview** button and a **More ▾** chevron beside it. The chevron's menu — `task-result-menu-open@1440`: **Open preview**, **Download**. **Open preview** — `task-result-preview-open@1440`: the thread narrows to the left and a **preview pane** opens at the right (title bar: an eye icon, **Preview** · the file name, a **Download ▾** button, ×; a native `<video>` 556×313 with the browser controls).
  - Footer line "MiniMax Agent is AI and can make mistakes".
- **Work Area panel** (right column, open by default on a finished session): **Progress ▾** ("Track progress on longer tasks." when it has no steps) and **Deliverables ▾** listing the result file (a click opens the same preview — `work-area-deliverable-open@1440`). The top-bar button **hides** the panel and re-centres the thread — `work-area-closed@1440`; a second click brings it back.
- **Docked composer** (same anatomy as the home composer, no mode chips), with the low-credits notice pinned above it.
- No **extend**, **regenerate** or **edit** control exists anywhere on the result card, its menu, the preview or the Work Area — download and preview only.

## Assets (`/assets`)

`assets-all@1440`, `assets-videos-filter@1440`, `assets-video-tile-hover@1440`, `assets-tile-menu-open@1440`, `assets-video-preview@1440`, `assets-tab-from-you@1440`, `assets-tab-star@1440`, `assets-filter-<chip>@1440` (light only), each also `-dark`, and `narrow-…@390`

- **Title** "Assets"; **tabs** From agent (active, underlined) / From you / Star; **filter chips** All · Websites · Documents · Excel · PPT · Images · Videos · Audio (the active one filled); **Search by file or task name** field right-aligned.
- **Video tile** (254×184: a grey poster area with a camera glyph, then the file name with a camera icon and a **⋯** kebab): hover reveals **Preview <file>.mp4**; the kebab (**More actions for <file>.mp4**) opens — `assets-tile-menu-open@1440`: **Locate in task**, **Send to new task**, **Star**, **Delete** (red). Entries were not clicked.
- **Preview modal** (1120 px): title bar with the file name and three icon buttons (download, open in new, close); a native `<video>` with the browser control bar.
- **From you** and **Star** tabs: the same chrome with their own empty states. The other filter chips show the shared empty state ("No assets yet", "Files generated by AI and uploaded by you will appear here", **+ New task**).

## Narrow (390)

The same persistent context resized to 390×844 (layout only, no touch semantics). Captures carry the `narrow-` prefix; `narrow-home-signed-in@390`, `narrow-sidebar-drawer-open@390`, `narrow-user-menu-open@390`, `narrow-settings-general@390`, `narrow-page-plugins@390`, `narrow-composer-video-mode@390`, `narrow-agent-model-menu-open@390`, `narrow-task-page@390`, `narrow-task-result-preview-open@390`, `narrow-assets-video-preview@390`, each also `-dark`. What differs from 1440:

- **Sidebar → drawer.** The page shows an **Expand sidebar** icon top-left (the sidebar's own Collapse/Expand button exists off-canvas too); the drawer slides in over the page with a full-screen scrim (a button also named "Collapse sidebar") and the sidebar's own **Collapse sidebar** icon closes it. **The drawer stays open** over a destination reached from it (the task page renders behind it) until that icon is tapped. Tapping the **More** or **Projects** header closes the drawer instead of unfolding the section, and the fold state does not survive a reload — so MaxHermes, MaxClaw and Add new project cannot be reached from the drawer at 390; the two pages were captured by their paths.
- **Top bar** keeps Changelog and Download; the heading wraps to two lines; the **composer** fills the width; in video mode its bottom bar **overlaps** (the MiniMax-M3 button sits over the Video parameters chip). The **mode chips** row shows three chips (Video generation, Document, Website); Image Generation and More are not rendered. The **Showcase** is a two-column grid.
- **Bottom sheets instead of popovers.** The agent-model menu is a **Select model** sheet (MiniMax-M3 ✓, MiniMax-M2.7, MiniMax-M2.7 HighSpeed; a **Thinking** switch; an unnamed ×) — `narrow-agent-model-menu-open@390`; **Settings** is a sheet with the four sections as horizontal tabs and no close control (a tap on the backdrop above it dismisses it) — `narrow-settings-*@390`; the Assets preview is a full-screen **Asset preview** dialog with **Close asset preview** — `narrow-assets-video-preview@390`. Escape closes none of them.
- **Task page:** no Work Area panel and no Work area button; the result card shows the file, **MP4** and a full-width **Open preview** (no More ▾); Open preview opens the preview as a sheet — `narrow-task-result-preview-open@390`. The low-credits notice stacks its buttons under the text.
- **Assets:** a page-level × (**Close**) at the top-right leaves the page; the tile's ⋯ does not appear on hover at 390. The tabs and chips scroll horizontally.
- **Promo card** covers the lower half of the screen (`narrow-home-signed-in@390`); the narrow passes dismissed it after that shot and the reference then kept it dismissed for the rest of the day (`frequency_cap.dismiss_period` in `common_config`), so it is absent from the later narrow captures.

## What a click does on every control MiniMax Local renders inert today

| Control (ours, STORY_012–015) | On the reference (2026-09-14) | Capture |
| --- | --- | --- |
| Search | opens the Search tasks dialog over the current page | `page-search@1440` |
| Plugins | navigates to `/plugins` (Market / Personal) | `page-plugins@1440` |
| Scheduled | navigates to `/scheduled` | `page-scheduled@1440` |
| Connect Mobile | navigates to `/connect-mobile` | `page-connect-mobile@1440` |
| More › MaxHermes | navigates to `/max-hermes` (marketing page) | `page-maxhermes@1440` |
| More › MaxClaw | navigates to `/max-claw` (marketing page) | `page-maxclaw@1440` |
| Projects › Add new project | opens the Create project dialog | `page-add-new-project@1440` |
| Agent Team › General / Coder / Verifier | **not in the sidebar any more**; the agents are under Plugins › Manage › Agents | `agents-guide-view-now@1440` |
| Changelog (top bar) | new tab: `agent.minimax.io/docs/changelog` | `changelog-open@1440` |
| Download (top bar) | new tab: `agent.minimax.io/download` | `download-open@1440` |
| Download desktop (footer) | new tab: `agent.minimax.io/download` | `download-desktop-open@1440` |
| User chip | opens the user menu | `user-menu-open@1440` |
| Add attachment (+) | opens the attach menu | `attach-menu-open@1440` |
| Add attachment › Skills / Plugins / Add to project | submenus | `attach-*-submenu-open@1440` |
| Agent Team switch (composer) | **gone from the reference** | `composer-video-mode@1440` |
| MiniMax-M3 (agent-model) | opens the agent-model menu | `agent-model-menu-open@1440` |
| Document / Website / Image Generation chips | switch the composer into that mode with its Showcase | `mode-*@1440` |
| More chip | opens a menu of five more modes | `mode-more-open@1440` |
| Work Area (task page) | hides / shows the right-hand Progress + Deliverables panel | `work-area-closed@1440` |

## What we lack

Everything in the tree above that MiniMax Local does not render at all, grouped as [EPIC_005](../../epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md) groups its rebuild stories. (Controls we render but leave inert are in the table above and are STORY_019's.)

- **Shell:** the dark theme; the folding More / Projects / Recents section headers; the Recents row's dot / avatar, its hover Pin + ⋯ and the row menu; Show more; the Agents guide card; the Inbox button and its popover; the user menu (UID, plan + Subscribe, and its eight entries); the Settings modal and its four sections; the promo carousel card (both pages, dots, close); the collapsed icon rail; the narrow drawer's Expand sidebar button; the Search tasks dialog; the Create project dialog.
- **Home:** the attach menu and its three submenus; the More chip's menu; the Showcase for Document / Website / Image Generation modes and the Clear selected scene pill for those modes; the agent-model menu's contents.
- **Task page:** the session-title row's second icon; the jump-to-top/bottom floating button; the View all clamp on long user bubbles; the Schedules pill and the scheduled-task card (Run now / View details); Copy / Like / Dislike + timestamp under assistant messages; the result **file card** with Open preview + More ▾ (ours plays the video inline); the split **preview pane**; the Work Area panel with Progress + Deliverables (ours has a Progress panel only); the low-credits notice; the footer disclaimer; the Processed N s row.
- **Assets:** the From you / Star tabs; the filter chips' empty states; the tile's ⋯ menu (Locate in task, Send to new task, Star, Delete — ours has Open task / Download / Extend / Delete from history); the preview modal's three title-bar icons.
- **Sidebar destinations (whole pages):** Plugins (Market / Personal, categories, search, plugin and skill cards, Manage with its four tabs and the agent editor); Scheduled; Connect mobile; MaxHermes; MaxClaw.
- **Not captured, by decision:** classic mode (the user menu's "Switch to classic" is listed, never followed); anything signed-out; the pages behind Subscribe / Buy Credits / Recharge / Manage / Daily check-in / Usage › / Contact us / Learn more (their entry points are captured, the destinations are billing and account surfaces).
