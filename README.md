# MiniMax Local

> A self-hosted video generation workstation: a web UI that recreates the video generation surface of [agent.minimax.io](https://agent.minimax.io), backed by a video generation model served on the owner's NVIDIA DGX Spark.

> This README is the source of truth for **what the project is**. How we work (tickets, testing bar, gates, guardrails) lives in [CLAUDE.md](CLAUDE.md).

**Status (2026-09-14):** the MVP works end to end on the Spark. All four epics are Done: the reference is captured, the UI is rebuilt, MiniMax-H3 runs on the GPU behind the job API, and a finished video can be extended. What is left is written down as bugs, chores and backlog items in `docs/`.

---

## Quick Start

**Open the UI:** **<http://spark-1.local:3000>** — from any browser on the LAN. The Spark's hostname is `spark-1` and it publishes itself over mDNS (Bonjour), so macOS, iOS and Linux find it by name; on a device that does not resolve `.local` (some Windows and Android setups, or a VPN that swallows mDNS) use the address it points at, **<http://192.168.1.33:3000>**. Both were checked on 2026-09-14 (`avahi-resolve -n spark-1.local` → `192.168.1.33`, and the UI answered `200` on the name). `APP_PORT` in `.env` changes the port. Nothing is installed on the machine you browse from, and the UI and adapter containers are `restart: unless-stopped`, so they come back when the Spark reboots; the GPU half does not — see below.

### Make a video

1. **New task** in the sidebar, then the **Video generation** chip under the message box.
2. Optional: **+ Reference** attaches a first frame (PNG, JPEG or WebP). A second image becomes the last frame.
3. Type the prompt. MiniMax's own prompt guides are in [docs/references/prompt-guides/](docs/references/prompt-guides/); three worked example scripts are in [docs/scripts/](docs/scripts/).
4. **Video parameters** sets the ratio, the resolution (768P — 2K is not open-sourced) and the duration (4–15 s).
5. **Send.** The task page follows the job from queued to a playable result, with **Stop generation** while it runs, then **Download** and **Copy prompt**. Everything finished is also in **Assets**.

### Extend a finished video

On a finished video, press **⤴ Extend** (on the result card, or **Extend** in an Assets tile's ⋯ menu). The composer then shows the clip being continued and the **overlap** — the last 0.9 / 1.6 / 2.3 s of it that become the new clip's own first frames, so the scene carries on rather than cutting — the duration means seconds **added** (+10 s by default), and **Send** returns the source and its continuation as one clip, which can be extended again. How it works and why: [STORY_017](docs/story/STORY_017_extending_a_video_keeps_the_scene_because_the_new_frames_are_generated_as_part_of_the_same_clip.md).

### The GPU half has to be running

The UI and the adapter are always up; **ComfyUI is started per session**, because a generation needs most of the Spark's memory. Run these on the Spark, from the repo root:

| Command | What it does |
| --- | --- |
| `spark/comfyui/run.sh` | Starts ComfyUI (GPU) and the adapter, and waits until both answer |
| `spark/comfyui/stop.sh` | Stops ComfyUI; the adapter stays up, so the UI keeps working up to Send |
| `spark/comfyui/verify.sh` | Proves the real chain — adapter, UI, validation — in seconds, without touching the GPU |
| `spark/comfyui/seam-check.sh <clip> <frame>` | Measures an extension's seam (the frame-to-frame change at the join against the footage's own), without the GPU |
| `docker ps` | Expect `minimax-app`, `minimax-adapter`, and `minimax-comfyui` while generating |

### What a run costs (measured on the Spark)

| Job | Time | Peak memory |
| --- | --- | --- |
| 5 s text-to-video | ≈ 17 min | 64 GiB |
| 10 s from a reference image | ≈ 50 min | 71 GiB |
| +10 s extension of a 10 s clip (STORY_017, 1.6 s overlap) | ≈ 67 min | 89 GiB |
| +10 s extension of a 20 s clip (STORY_017, 1.6 s overlap) | ≈ 71 min | 87 GiB |
| A 30 s chain: 10 s from an image, then +10 s twice (STORY_020, 2026-09-14/15) | ≈ 3 h 5 min | 82 GiB |
| Two 5 s text-to-video, one after another through the queue (STORY_041, 2026-09-15): the first at once, the second held by a run-at and submitted 17 s after its time by the runner, once the first was done | 17 min 17 s + 17 min 33 s | not sampled (a 5 s job is 64 GiB above) |
| A 5 s text-to-video clip and a +4 s extension of it queued together (STORY_043, 2026-09-15): the extension waited in the line while the clip ran and was submitted the same second the clip finished, no hand on the keyboard | 17 min 19 s + 21 min 33 s (38 min 52 s from the first Send to the 9.4 s video) | not sampled (an extension of a 5 s source is under the 89 GiB above) |

**Does extending hold the scene?** On the night of 2026-09-14/15 three 31 s chains were generated from `01.jpg` with the three scripts in [docs/scripts/](docs/scripts/) (the scene paragraph plus each script): ten generations for nine segments, one draw rejected by the shot-change check and regenerated with a new seed, every seam continuous, no set or framing change in any accepted segment ([STORY_020](docs/story/STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md) has the tables). Write the scene at the top of the script, keep the camera static in words, and let the check's Retry redraw the rare segment that still wanders.

The Spark has 121 GiB in total, so a generation needs the box mostly to itself: stop other memory-hungry containers first, by name, and start them again afterwards.

### If something looks wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| "The Spark's adapter is not reachable" under the composer | the adapter container is down | `spark/comfyui/run.sh` |
| Send answers "ComfyUI is not running on the Spark" | the GPU half is stopped — everything else is fine | `spark/comfyui/run.sh` |
| A job sits at "Queued…" for a minute or two | ComfyUI is loading a 34 GB checkpoint, or another job is ahead | wait; `docker logs -f minimax-comfyui` shows it |
| "The Spark is busy" | the open-job limit is reached | let the running job finish |

Deeper detail: [Running the UI](#running-the-ui), [Running the Model](#running-the-model), and [spark/README.md](spark/README.md) for the box itself.

---

## Purpose

Generate videos locally on a DGX Spark, through an interface that matches the MiniMax agent web app's video generation flow, instead of paying per generation in their cloud or using a generic frontend.

## MVP Scope

**In scope — the video generation flow, end to end:**

- Prompt entry, with reference image attachment (text-to-video and image-to-video)
- The generation options the reference exposes (model, duration, resolution, aspect ratio — enumerated by recon)
- Submit, with the job's progress shown while it runs, and cancel
- Result preview and playback in place, and download
- History / gallery of past generations, with reopen

**Out of scope until the MVP epic is Done** — chat, the media agent's other modalities, image generation, music, editing tools, anything else agent.minimax.io does. These live in `docs/backlog/` as they come up ([CLAUDE.md → §3c](CLAUDE.md#3c-how-backlog-is-tracked)) and are never built early.

## Architecture

One machine hosts everything (owner's decision, 2026-09-12): the **DGX Spark** runs the UI, the job-API adapter, ComfyUI with the model, the stub generation server and the whole test gate, each as a container defined in this repo. The owner's Mac, or any device on the LAN, is only a browser opening the UI's URL; development happens on the Spark through a VS Code tunnel. Nothing is installed on the Spark itself.

| Container | Role | Reached via |
| --- | --- | --- |
| UI (`app/`, EPIC_002) | The video generation screen | a URL on the LAN |
| Adapter (`spark/adapter/`, STORY_006) | Create → status → result job API in front of ComfyUI | the compose network; the UI's configured base URL |
| ComfyUI (`spark/comfyui/`, STORY_005) | Runs MiniMax-H3 on the GPU | 127.0.0.1:8188 and the compose network only |
| Stub generation server (`tools/`, EPIC_002) | Scripted outcomes and a fixture video for the test gate | the gate only |

The UI talks to the generation server through configuration only (base URL, optional key). The protocol is an async job: create a generation, poll its status, fetch the result file. Locally the same variables point at a **stub generation server** that returns scripted outcomes and a tiny fixture video, so nothing in the test gate depends on the Spark being reachable.

Work is planned as epics:

1. **EPIC_001** — the reference's video generation flow captured as a spec (Done 2026-09-12).
2. **EPIC_002** — the app skeleton, the stub generation server and the test gate (Done).
3. **EPIC_003** — the video generation screen rebuilt to match the reference (Done 2026-09-12; STORY_016/017 added Extend).
4. **EPIC_004** — MiniMax-H3 on the Spark behind the job API (Done 2026-09-12; later items open).
5. **[EPIC_005](docs/epic/EPIC_005_the_ui_looks_identical_to_the_reference_on_every_surface_in_both_themes.md)** — the UI looks identical to the reference on every surface, in both themes: a second recon pass, then one pixel-faithful rebuild story per surface, with out-of-scope controls rendered exactly and inert (Open 2026-09-14). Behaviours beyond video generation come later, in an epic of their own.

## Tech Stack

**Reference (observed 2026-09-12, logged out):** a Next.js App Router app served from a CDN; system sans-serif body text with **Outfit** and **Source Serif** loaded as web fonts (both SIL Open Font License) plus KaTeX; app API under `/v1/api/` on the same origin.

**Ours:** TypeScript everywhere, `strict: true` and `noUncheckedIndexedAccess`. Node 26 and pnpm 10 in the gate image (`tools/gate/Dockerfile`), never on the host. App (STORY_007): Next.js 16 App Router, React 19, TypeScript 5.9 (typescript-eslint does not support TS 7 yet; `recon/` keeps TS 7), ESLint 9 with typescript-eslint strict type-checked rules and `eslint-config-next`, Vitest 5 with jsdom and React Testing Library. E2E: Playwright 1.63 (the same as recon), browsers baked into the gate image. Production UI image: `app/Dockerfile`, Next standalone output on `node:26-bookworm-slim`.

## Project Structure

Present today: `app/` (skeleton), `tools/gate/`, `spark/`, `recon/`, `docs/`, the root `compose.yaml`, the workspace files. The rest is created by the stories that need it.

```
app/          the UI
tools/        gate/ (the toolchain image and the gate runner), the stub generation server with its fixtures (STORY_008), other dev tooling
spark/        the ComfyUI image (Dockerfile, compose) and scripts that run the model on the Spark; spark/data/ (gitignored) holds weights, outputs, logs
recon/        Playwright recon scripts (profile and raw output are gitignored)
agents/       skills/ — prompt-writing skills in the Agent Skills layout (agentskills.io); `minimax-single-script` turns one image into one MiniMax prompt (CHORE_012)
docs/
  epic/       EPIC_NNN_*.md
  story/      STORY_NNN_*.md
  bug/        BUG_NNN_*.md
  backlog/    BACKLOG_NNN_*.md
  chore/      CHORE_NNN_*.md
  recon/      dated captures, measured tokens, component inventory, interaction notes
  references/ the MiniMax H3 model card, license, prompt guides, MiniMax's and ComfyUI's H3 docs, the official workflow templates and the node sources from our ComfyUI image, with an index (CHORE_002)
```

## Features

What the UI does today, each matched to the reference capture the story cites ([docs/recon/2026-09-12/](docs/recon/2026-09-12/) for the flow, [docs/recon/2026-09-14/](docs/recon/2026-09-14/) for both themes and every surface):

| Feature | Story |
| --- | --- |
| The shell: sidebar, Recents with an unread dot (each row named by the minute the task was created, `26-09-14-1200`, the prompt as its tooltip — CHORE_008), top bar, the reference's measured tokens | STORY_012 |
| A Recents row's ⋯ menu works: **Rename** (an inline input holding the title; the top bar, the tooltip and Search follow, the label stays the stamp), **Pin / Unpin** (also the row's hover pin) into a **Pinned** section above Projects, newest pin first, remembered as a fold; **Copy conversation ID** (the job id, with a toast); Delete since STORY_021 | STORY_029 |
| **Archive** (⋯ › Archive, no confirm): the task leaves Recents, Pinned and Search; the toast reads "Undo or view archived tasks in Settings" with both as links. **Settings › Archived tasks** lists archived tasks newest first under **No project** — stamp, title, the archive time ("Sep 15, 2026, 12:11 PM"), a trash and **Unarchive** — with a live search and a **Delete all** (one confirm naming the count, one `DELETE /api/history?ids=…`). Assets keeps listing archived videos (a departure) | STORY_030 |
| **Projects**: Projects › Add new project creates one (`POST /api/projects`); its sidebar row opens `/project/:id` and expands to its tasks, with hover **New task** (the home composer with the project as a removable chip, also + › Add to project) and **Project actions** — New task · Rename (inline) · Pin (into the Pinned section) · Delete (the reference's "Delete project" dialog; the tasks stay in Recents, unassigned). Recents ⋯ › **Move to project** lists Add new project, the projects and No project (`PATCH /api/history/:id { projectId }`). Settings › Archived tasks groups by project and its All projects filter narrows to one. A job's `projectId` stays in our history and is never forwarded to the model | STORY_031 |
| Assets: **Star / Unstar** from the tile ⋯, the preview ⋯ and the task page's preview pane (`PATCH /api/history/:id { starred }`, a "Starred" toast) with the **Star** tab listing them; **From you** and the **Images** chip list the reference images kept with each job (`/data/uploads/<job>/`, served by `GET /api/history/:id/reference/:n`, previewable, deletable on their own); the preview's ⋯ and the pane's Download ▾ carry **Copy link** (the result's URL). No Refresh (a departure) | STORY_032 |
| The **Inbox** bell carries the job log: every finished, failed, refused or cancelled job is an event ("Your video is ready", "Generation failed", "The prompt was refused", "Cancelled at 41 %"), a measured shot change a second ("The shot changed at 00:11"); the bell counts the unread ones, **Read all** clears them (remembered per browser), opening a task reads its own, a row opens the task. Updates = the job events; Messages waits for STORY_037 | STORY_033 |
| Settings › General's **"Remove an AI-generated watermark"** switch is real and server-wide (`GET/PATCH /api/settings`, `/data/settings.json`, default on): off, every download (`?download`) is a copy with "AI-generated" burned in at the bottom-right, made once per job by ffmpeg in the adapter and cached; playback stays the clean file. The stub answers `x-watermark: 1` instead so the app's tests never need ffmpeg | STORY_034 |
| + › **Environment variables** is a local key / value store: the dialog lists the stored names (values masked — they never come back to the browser), adds and removes rows, checks names inline (`A-Z`, `0-9`, `_`), and Save writes `PUT /api/env { vars }` to `/data/env.json` (mode 600, plain JSON — the note says so; a departure from the reference's "securely encrypt"). Another server module reads a value with `envValue(key)` | STORY_035 |
| **Management** (the Plugins row): **Plugins** shows the one plugin, video-creator, described from `GET /api/capabilities` (model, resolution, durations, reachable or not) with its Details and a switch (`PATCH /api/settings { videoEnabled }`) that makes a text-only workstation when off (no Video generation chip, no video controls) and restores it when on; **Skills** are prompt recipes (`/data/skills.json`; a built-in Short-to-script whose template is the STORY_020 base prompt scaffold) with search, Create / Edit / Delete and **Use** — also listed under + › Skills, where a skill drops its template into the composer with `{{idea}}` replaced by what was typed; **Apps** says plainly there are none; the Agents tab stays the read-only editor (STORY_038 deferred) | STORY_040 |
| **Scheduled** — the queue of generations (the reference's page is its agent's timed tasks; ours is the owner's meaning): Send never fails as busy — beyond the adapter's five open jobs the request waits in the app's own queue (`/data/queue.json`, its images with it) as a history entry whose task page reads "Waiting — Nth in line", and the runner submits the next due request as slots free, in order — from the polled routes and, since STORY_042, from a 30 s ticker in the app server's start-up hook (`QUEUE_TICK_MS`, 0 disables), so a run-at goes with no browser open. The page lists Running (with Stop), Waiting (in order: ↑ ↓, **Run at…** a time, **Edit** — the composer prefilled, Send replaces the entry in place —, Remove), Done today and Failed, with a search and a status filter; Create and a **Run at…** beside Send on the composer. Since STORY_043 an extension of a clip that is still queued or running waits in the line ("Waiting · after <stamp>") and goes the moment its source is done, with the source's real job id (BUG_007); **Queue an extension** on the Running and Waiting rows and Extend on a pending task page (the tile shows the requested length) — a chain of clips is three Sends and an empty evening | STORY_041, STORY_043 |
| The composer: video mode, reference-image upload (0–2), the model menu and the parameters popover (ratio, resolution, duration) listing exactly what the Spark's adapter reports | STORY_013, STORY_026 |
| The task page: the prompt bubble, the working indicator, **Stop generation**, Retry, and history that survives a reload | STORY_014 |
| The task page as the reference draws it: the finished result as a file card (**Open preview**, More ▾ → Open preview / Download / Extend) with a preview pane at the right (opens by itself when the job finishes on the page), the **Work Area** panel (Progress, Deliverables) the top-bar button hides and shows, the Processed N s row that unfolds the steps, Copy and the time, the jump button | STORY_023, STORY_026 |
| Assets: every finished video as a poster tile, search and filter chips, a preview modal, Download, Open task, Delete from history | STORY_015 |
| Assets as the reference draws it: From agent / From you / Star tabs, the one "No assets yet" state, the All · Images · Videos · Audio chips, the 252 × 182 tile whose ⋯ menu reads Locate in task / Send to new task / Star / Delete, the preview's × · name · ⋯ head (Download in the ⋯), and at 390 the bar's Search and Filter buttons, scrolling chips and a full-screen preview sheet | STORY_024, STORY_026 |
| **Extend**: continue a finished video by +4…14 s (default +10), with the context the model watches as a setting, joined into one clip | STORY_016 |
| The page behind the sidebar — Plugins (the reference's Management page: Plugins / Skills / Apps / Agents tabs and the agent editor), rendered as the reference renders it and wired by STORY_040; MaxHermes / MaxClaw and the More section went with STORY_028, Connect mobile with CHORE_010 (the owner withdrew the Telegram story) | STORY_025, STORY_026, STORY_028, CHORE_010 |
| **Dark mode**, by the system preference or by user menu › Settings › General › Appearance (Light mode / Dark mode / System, remembered per browser), on the reference's own semantic tokens; and every control we do not implement answers a click with "Not part of MiniMax Local — video generation only" | STORY_019 |
| **What was removed** (2026-09-15, the owner's line-by-line decisions): Scheduled and the plugin marketplace, the user menu's plan / classic / check-in / usage / contact / learn / logout entries, Settings › Account and Usage, the home bar's Changelog and Download, the footer's Download desktop, the Document / Website / Image Generation / More modes, the + menu's Plugins submenu, the greyed 2K / H3-Max / H2.3 options, the credits notice, Like / Dislike, the "MiniMax Agent is AI…" line and the Websites / Documents / Excel / PPT chips. Text-mode Send says "Text chat is not connected to the Spark yet" until [BACKLOG_006](docs/backlog/BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md) ; then (STORY_028, after the behaviour recon) MaxHermes / MaxClaw with the More section and the "Help improve our services" switch; then (CHORE_010, the Telegram story withdrawn) the Connect mobile row and page. Scheduled came back with STORY_041 — as our queue, not the reference's timed tasks | STORY_026, STORY_028, CHORE_010, STORY_041 |

Deliberate departures from the reference (an agent thread we do not have, 2K the Spark cannot produce, an Extend the reference does not offer) are listed in each story under **Departures from the reference**.

## Testing

Three layers, all run inside the gate container against the [stub generation server](tools/stub-generation-server/README.md); no test depends on the model ([CLAUDE.md → §3](CLAUDE.md#3-how-features-are-built-important)).

| Layer | Command | What it is |
| --- | --- | --- |
| Unit | `tools/gate/run.sh test` | Vitest (jsdom) for `app/lib/**` and the stub's own logic — pure helpers, the job-status reducer, polling with fake timers, upload validation, the stub's scripts and multipart parser |
| Integration | `tools/gate/run.sh test:integration` | Vitest (node) calling the app's route handlers directly against a stub started in-process (`app/test/integration/`) |
| E2E | `tools/gate/run.sh test:e2e` | Playwright 1.63 against the production build (`pnpm build` first) with the stub started by the config; projects `desktop` (Chromium, 1440×900) and `narrow` (`devices["iPhone 13"]`, WebKit); fixtures in `app/e2e/fixtures/` for stub scripts, terminal-status waits, playability and settling |

**Fixture codec (measured 2026-09-12 in the gate image, Chromium 1243 and WebKit 2359 on arm64):** both browsers report `canplay` for `fixture.mp4` (H.264 baseline + AAC) and for `fixture.webm` (VP9 + Opus). The stub therefore serves `fixture.mp4` by default, the same container format the real server produces; `STUB_FIXTURE=webm` switches. The probe is `app/e2e/fixture-codec.spec.ts` and writes its verdict to `app/test-results/codec-probe-<project>.json` on every run.

**What the gate proves, and what it does not.** Every e2e spec in the gate drives the real UI build against the **stub** generation server, by design: the gate never depends on the model. It proves the UI, its routes and any contract-conformant server work together. The **real chain** — the UI container → the adapter → ComfyUI on the GPU — is proven by `spark/comfyui/verify.sh` (adapter health, the UI relaying the adapter's capabilities, the adapter refusing `2K` through the UI route; seconds, no GPU) and by `spark/comfyui/verify.sh --generate [seconds]`, which runs the real Playwright trial through the UI (`app/e2e-trial/`, minutes, needs ComfyUI up and the memory a run needs). Both are run by hand and recorded in the story or bug they belong to. **Extending a video (STORY_016)** follows the same split: `app/e2e/extend.spec.ts` drives Extend → the continuation tile → Send → the joined result against the stub, the frame arithmetic, the full-reference prompt and the graph are unit-tested in the adapter and mirrored in `app/lib/extend.ts`, and the real continuation is the story's manual verification (the owner's three-script chain, `docs/scripts/`).

**Coverage floors** (Vitest v8, enforced by the unit and integration lanes; set from the measured baseline minus 2 on 2026-09-12 and never lowered — [CLAUDE.md → §4](CLAUDE.md#4-dev-workflow)):

| Lane | lines | branches | functions | statements |
| --- | --- | --- | --- | --- |
| `app` unit (`app/lib/**`) | 87 | 84 | 90 | 87 |
| `app` integration (`app/app/api/**`, model client, config, upload validation) | 90 | 73 | 98 | 90 |
| stub generation server | 93 | 82 | 98 | 88 |
| gate helper (`tools/gate/src`) | 60 | 61 | 98 | 66 |

When a floor fails, `tools/gate/run.sh` prints the files with the most uncovered branches (`tools/gate/src/coverage-rank.ts`).

**The gate and the hook.** `tools/gate/run.sh` runs the six steps in order inside the gate container (step 5 also builds the production image, `docker compose build app`) and stops at the first failure, naming it; `--from N` restarts after a fix. `pnpm install` (inside the container) installs husky's `.husky/_` shims and points `core.hooksPath` at them through the bind mount (`tools/gate/install-hooks.sh` does the same by hand); `.husky/pre-push` runs the gate only when a ref is pushed to `develop`. Measured on the Spark on 2026-09-12: the whole gate takes **27 s** with a warm image cache and about 45 s when the lockfile changed (image dependency stage rebuilt). `--no-verify` skips everything and is for emergencies only, with the justification in the commit message.

## Running Recon

Recon captures the reference (agent.minimax.io) through the owner's own signed-in session, from the Spark, in the gate container — nothing is installed on the host ([CLAUDE.md → §3e](CLAUDE.md#3e-how-recon-is-recorded), [§4b](CLAUDE.md#4b-recon-with-playwright)).

```bash
recon/login.sh                       # sign in once (CHORE_005). With a display reachable (DISPLAY set — the desktop session, seen through
                                     # NoMachine or at the console) a headed Chromium window opens on it: sign in there with GitHub.
                                     # With no display (or RECON_LOGIN=remote) Chromium runs headless with its DevTools port on the LAN
                                     # for the few minutes of the login: on another machine open chrome://inspect/#devices → Configure… →
                                     # add 192.168.1.33:9222 (the IP, not the name) → inspect the agent.minimax.io target → sign in
recon/run.sh check                   # prints session: signed-in | signed-out | unknown (exit 0 / 1 / 2)
recon/run.sh capture                 # every surface, light and dark, 1440 and 390 (STORY_018) → docs/recon/<date>/ + recon/out/<date>/
       [--theme light|dark|both] [--width 1440|390|both]   # a subset of the four passes; the manifest merges over the day's
       [--only <regex>]              # only the steps whose state name matches (a re-run after a fix)
       [--restore-to light|dark|system]   # what to put the reference's Appearance setting back to at the end
       [--generate N [--wait-minutes M]] [--revisit --session <regex>]   # the generation path instead (credits!)
recon/run.sh tokens [--theme …]      # measured tokens, both themes, hover/focus, the pages, Settings → docs/recon/<date>/tokens.{md,json}
recon/run.sh interactions <date>     # the network reduction → docs/recon/<date>/endpoints.{md,json}; interactions.md is written by hand
```

The capture switches the reference's theme through its own control (user menu › Settings › General › Appearance) and puts it back at the end; if a run is interrupted, `recon/run.sh capture --theme light --width 1440 --only '^$' --restore-to light` restores it.

The session lives in `recon/.profile/` and raw captures in `recon/out/`; both are gitignored. Generations on the reference cost the owner credits: the count is agreed before a capture and written in the notes. The scripts never type credentials, never read cookies, and stop and ask when the session has expired.

## Running the UI

Everything runs in containers on the Spark (STORY_007). The host needs only `docker`, `jq` and a browser somewhere on the LAN.

```bash
cp .env.example .env            # once; set MODEL_BASE_URL to the adapter's URL for production (the stub URL is the default)
tools/gate/build.sh             # once (and after tools/gate/Dockerfile changes): the toolchain image, Node 26 + pnpm + Playwright browsers
tools/gate/run.sh               # the gate: install, typecheck, lint, unit, integration, build, e2e — inside the gate container
docker compose --profile dev up app-dev      # hot-reload dev server on port 3000 (Ctrl-C to stop)
docker compose up -d --build app             # production build served on port 3000, restarts with the box
```

Open `http://spark-1.local:3000` (or `http://192.168.1.33:3000`) from any browser on the LAN — see [Quick Start](#quick-start). The adapter stays up whenever the Spark is up (it needs no GPU); the model itself is started with `spark/comfyui/run.sh` when the memory is free and stopped with `spark/comfyui/stop.sh`; `spark/comfyui/verify.sh` proves the real chain in seconds. `tools/gate/run.sh lint build` runs only the named steps; `--from 4` restarts after a fix. Dependencies land in `node_modules/` inside the repo tree (written by the container, gitignored); the pnpm store persists in the `minimax_pnpm-store` volume; the UI's history in the `minimax_app-data` volume.

**A real run through the UI, driven by Playwright** (EPIC_003's trial; not part of the gate — it needs ComfyUI and the adapter up, `spark/comfyui/run.sh`):

```bash
docker compose run --rm --no-deps -T -e TRIAL_IMAGE=/work/spark/data/input/01.jpg -e TRIAL_PROMPT_FILE=/work/spark/data/input/01-prompt.txt -e TRIAL_DURATION=10 \
  gate pnpm --filter app exec playwright test --config playwright.trial.config.ts
```

## Running the Model

**Status (2026-09-12, measured on the Spark): STORY_005 is Done.** ComfyUI runs on the Spark in a container built from `spark/comfyui/Dockerfile`, with the Comfy-Org quantized MiniMax-H3 weights, and rendered one 5 s clip at 1344×768. STORY_006 adds the job-API adapter and the env vars the UI reads. Numbers below are from that one run; re-measure before relying on them ([spark/README.md](spark/README.md) has the box and the scripts).

| Item | Value (STORY_005, 2026-09-12) |
| --- | --- |
| Serving stack | **ComfyUI v0.35.1** in the image `minimax-spark/comfyui:v0.35.1` (base `nvidia/cuda:13.0.2-runtime-ubuntu24.04`, arm64, pinned by digest; Python 3.12.3; **PyTorch 2.11.0+cu130**; CUDA 13.0; driver 580.142). Launched with `--disable-mmap --disable-async-offload --disable-pinned-memory --cache-none`, published on 127.0.0.1:8188 only. Our job-API adapter in front of it is STORY_006. The image also carries one custom-node pack, **kijai's ComfyUI-KJNodes** at commit `d3cfe216` (GPL-3.0, CHORE_007, 2026-09-14), so reference workflows from the community run as published (the PR #15375 author's masked-extension example is STORY_020's control run); our own graphs use none of its nodes, and `run.sh` fails if the pack did not load. Nothing is installed on the host |
| Model / checkpoint | **MiniMax-H3 FL2VA, `minimax_h3_fl2va_int8_convrot` (34 GB)** for fresh jobs **and extensions** (STORY_017: an extension is the same clip continued on FL2VA, no checkpoint swap); `minimax_h3_ref2va_int8_convrot` (34 GB) is fetched and on disk for a future subject-reference story, unused today + text encoder `qwen3vl_32b_minimax_h3_nvfp4_awq` (16 GB) + video VAE fp16 + audio VAE fp32; Comfy-Org repackage, 52 GB in `spark/data/models` (gitignored) |
| Licence | MiniMax H3 Community License; the Spark is outside the excluded territories |
| Measured | **5 s, text-to-video** (STORY_005/006): 1344×768, 124 frames at 24 fps, 20 steps `res_multistep`/`simple`: **17 min 21 s submit → file** (text encoder ≈ 7 s, DiT load 51 s, sampling ≈ 47 s/step, VAE decode + mux 72 s), 1.0–1.5 MiB h264 + aac 32 kHz stereo. **10 s, image-to-video through the UI** (EPIC_003 trial): 243 frames, first step ≈ 155 s then ≈ 100 s/step, decode ≈ 3 min, **51 min submit → ready**, 2.3 MB, 10.125 s | **Extending a clip (STORY_016, 2026-09-13, Ref2VA, +10 s with a 5.2 s context):** 2 h 12 min and 2 h 17 min per step (≈ 6.4 min per sampling step against ≈ 2.4 for a fresh FL2VA clip — the reference clip rides through every step); a fresh 10 s image-to-video clip the same morning: 49.9 min. The owner's three-script chain came out as 753 frames = 31.375 s. **STORY_017 (2026-09-14, native masked continuation, 39-frame overlap):** +10 s on a 10 s clip in **66 min 50 s** (a 294-frame FL2VA generation, no checkpoint swap); 498 frames = 20.75 s; the scene continues across the seam (seam change 7.3 vs 6.1 for the clip's largest natural motion; the reference route's cut measured 32.2).
| Memory split | **Peak 64–68 GiB used** (VAE decode; 63.8 GiB for 5 s, 68.0 GiB for 10 s image-to-video); sampling plateau 61 GiB = DiT 32.4 GB staged + text encoder 15 GB resident + activations; no swap. The box's other services must leave ≈ 70 GiB free: on 2026-09-12 that meant stopping `spark-primary` (48 GB reserved by its `--gpu-memory-utilization 0.40`) and `cosmos3-api` (owner's call, by name) for each run. Coexistence needs one of them lowered — EPIC_004 → Later | **Extensions (2026-09-13):** peak 87.8 GiB for +10 s on a 10 s source, **96.7 GiB** for +10 s on a 20.75 s source (the join holds the whole source as frames: ≈ 12.4 MB per 1344×768 frame) — the reason `maxSourceSeconds` is 30. Swap stayed at 3.3 GiB. **STORY_017:** peak 88.7 GiB for +10 s on a 10 s source (the tail encode plus the 498-frame join).
| Text model (STORY_036) | **Deferred (owner, 2026-09-15): "I would like to use the existing minimax model already if that's not possible then we can defer this one" — the existing model, MiniMax-H3, generates video and cannot chat; no MiniMax text model fits the box.** Candidates read from their repositories that day — MiniMax-M3 (Community License, 428B, smallest GGUF 128 GB: does not fit), MiniMax-M2.7 (non-commercial without authorization), MiniMax-M2.5 (MiniMax Model License, 229B; 78–101 GB at 2–3 bits, alone only), Qwen3-30B-A3B-Instruct-2507 (Apache-2.0, 18.6 GB Q4_K_M, fits beside a video job), Gemma 3 27B (Gemma Terms, 16.5 GB Q4_K_M, dense) — with sizes, licences and the memory arithmetic in [STORY_036](docs/story/STORY_036_the_text_model_for_the_spark_is_chosen_licence_read_memory_measured.md). Serving: `ghcr.io/ggml-org/llama.cpp:server-cuda13` (arm64 manifest present) |
| Adapter (STORY_006) | `spark/adapter/`, the job-API contract ([docs/contracts/job-api.md](docs/contracts/job-api.md)) in front of ComfyUI: uploads references, submits the graph, follows progress over ComfyUI's websocket (with `/history` and `/queue` polling as the backstop), cancels through `/queue` or `/interrupt`, serves results and first-frame posters from the output mount with `Range` support, persists jobs to `spark/data/adapter/jobs.json`. No npm runtime dependencies; since STORY_034 the image carries Debian's ffmpeg (+ DejaVu fonts) for the download watermark, cached at `spark/data/adapter/watermarked/`; image `minimax-spark/adapter`; service `adapter` in `spark/comfyui/compose.yaml` |
| Ports / env vars | ComfyUI `127.0.0.1:8188`; adapter `127.0.0.1:4020` (`ADAPTER_PORT`) and `http://adapter:4020` on the shared docker network `minimax` that the UI's `app` service joins. The UI reads `MODEL_BASE_URL` (default `http://adapter:4020`) and `MODEL_API_KEY` (= the adapter's `ADAPTER_API_KEY`, optional). Set them in `.env` (see `.env.example`) |

The Spark facts (OS, CUDA, memory, disk, what was already installed and running) are in [spark/README.md](spark/README.md), read before anything was changed. Run order: `spark/comfyui/lint.sh`, `install.sh` (builds both images and creates the `minimax` network), `fetch-h3.sh`, `run.sh` (ComfyUI + adapter), `smoke.sh` (ComfyUI directly) or a job through the UI, `stop.sh`. The adapter's own tests: `pnpm --filter adapter test` inside the gate (unit + integration against a fake ComfyUI).

**Open question #1 (2026-09-12): which model.** The obvious candidate is MiniMax's own **MiniMax-H3** (Hailuo 3.0), open-weighted on 2026-08-03. Facts read from its Hugging Face model card and LICENSE file that day:

- 33B parameters. Two checkpoints: **H3-Base-FL2VA** (text and first/last-frame to audio-video, 0–2 input images) and **H3-Base-Ref2VA** (reference-driven, up to 9 images / 3 clips / 3 audio files). 4–15 s clips at 24 fps with 32 kHz stereo audio; short side defaults to 768 px, with 2K attributed to a separate H3-Regenerate-2K module whose availability is unverified. Inference via SGLang, vLLM, Diffusers, or ComfyUI.
- Weight size on disk and VRAM requirements are **not stated** on the card. 33B parameters at bf16 is roughly 66 GB of weights before activations, which is an estimate, not a measurement; the phase-2 epic measures the real footprint on the Spark.
- **License: MiniMax H3 Community License Agreement.** Its Excluded Territories are the European Union, the United Kingdom, the Republic of Korea, and the United States of America, and it states: "You may not use, reproduce, modify, distribute, or display the MiniMax H3 Works or any of their Outputs or results outside the Applicable Territory." Commercial use above 20 million USD yearly revenue needs separate authorization.

**Decided 2026-09-12: the Spark is used outside the excluded territories, so H3's open weights are licensed for it and phase 2 builds toward MiniMax-H3 on the Spark.** **Serving stack (owner's choice, 2026-09-12): ComfyUI on the Spark with Comfy-Org quantized H3 weights, fronted by our own small job-API adapter** so the UI keeps speaking create → status → result. Precision (int8 / fp8 / NVFP4) and the exact workflow are settled by the first EPIC_004 story, which measures them; see [EPIC_004](docs/epic/EPIC_004_a_video_model_runs_on_the_dgx_spark_behind_the_same_job_api.md) for the options that were weighed ([CLAUDE.md → §4a](CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

Sources: [MiniMaxAI/MiniMax-H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3), [MiniMax H3 LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE).

### What the model is told, and the shot-change check (STORY_020)

**The prompt.** Since 2026-09-14 the adapter builds MiniMax's documented prompt format around what you type (its [base prompt guide](docs/references/prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en.txt), read not recalled): for a first frame, the instruction line `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`; then `[Shot 1] Live-action. The camera holds a perfectly static shot throughout the entire S.SS-second duration: no cut, no dissolve, no transition and no change of framing; …` followed by your text as one paragraph (a line's leading `[0:03-0:07]` becomes `From 0:03 to 0:07,` — MiniMax's only timestamps mark cuts), then the soundscape and music fields. An extension gets no instruction line (its preserved head is not a picture). Text that already starts with `integrated_multimodal_description:` is sent as is. The prompt limit is 6,000 characters, room for MiniMax's own 350–700-word style. What the adapter cannot do is describe your scene: write it yourself at the top of the script — [docs/scripts/scene.txt](docs/scripts/scene.txt) is the paragraph for `01.jpg` — because the model's own examples spend most of their words on the set, the light and the subject, and a script that names only the action leaves the model to invent the rest ([STORY_020](docs/story/STORY_020_a_video_stays_in_one_shot_to_the_end_and_a_cut_the_model_makes_anyway_is_flagged_before_the_owner_sees_it.md) has the evidence). `docker logs minimax-adapter` prints every prompt as sent. To have an LLM write the whole prompt in MiniMax's format from one image — the scene, the camera, a single-shot timeline and the sound fields — use the skill in [agents/skills/minimax-single-script/](agents/skills/minimax-single-script/SKILL.md); its output starts with the instruction line, so the adapter sends it unchanged, and its `metadata` names the model, checkpoint and versions it was written against.

**The shot-change check.** Every finished clip is measured in the graph (our node `MiniMaxLocalFrameChanges`, [spark/comfyui/custom_nodes/minimax_local/](spark/comfyui/custom_nodes/minimax_local/)): the picture's outer border — the set, not the person — compared one second apart and three seconds apart. A border that moves by 30 or more (mean absolute RGB) over one second, or by 20 or more over three seconds (BUG_006: a slow dissolve of the set), is a shot change: a cut, a dissolve or a camera move; a held shot never moved it more than 11 over a second or 16 over three on the clips measured, and a squat moved the whole picture by 66 but the border by 16. The job's `result.cuts` lists where (`frame`, `seconds`; `[]` when the shot held), the adapter log says so, and the task page shows "The shot changed at 00:11 …" above the result card with a Retry that draws a new seed (mounted by CHORE_009 with STORY_023). Calibrated for static-camera prompts: a prompt that moves the camera trips it by design.

## Deployment

Local only, all on the Spark: the model container is started by `spark/comfyui/run.sh` (weights in `spark/data/`); the UI and adapter containers by the scripts EPIC_002 and STORY_006 add. The UI is opened from a browser on the LAN. There is no CI as of 2026-09-12.
