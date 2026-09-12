# MiniMax Local

> A self-hosted video generation workstation: a web UI that recreates the video generation surface of [agent.minimax.io](https://agent.minimax.io), backed by a video generation model served on the owner's NVIDIA DGX Spark.

> This README is the source of truth for **what the project is**. How we work (tickets, testing bar, gates, guardrails) lives in [CLAUDE.md](CLAUDE.md).

**Status (2026-09-12):** greenfield. Nothing below the MVP Scope and Architecture sections is decided yet; each `TBD` is filled in by the story that settles it.

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

Two machines:

| Machine | Role | Reached via |
| --- | --- | --- |
| **Mac** | Development, the UI, the whole test gate | local |
| **DGX Spark** | Runs the video model behind an async job API | SSH on the LAN |

The UI talks to the generation server through configuration only (base URL, optional key). The protocol is an async job: create a generation, poll its status, fetch the result file. Locally the same variables point at a **stub generation server** that returns scripted outcomes and a tiny fixture video, so nothing in the test gate depends on the Spark being reachable.

Work is planned as two epics:

1. **UI recon and rebuild** — capture the reference's video generation surface with Playwright through the owner's own logged-in session (see [CLAUDE.md → §3e](CLAUDE.md#3e-how-recon-is-recorded) and [§4b](CLAUDE.md#4b-recon-with-playwright)), then recreate it as our own code.
2. **Video model on the Spark** — choose a model whose license permits it, install a serving stack, fetch the weights, fit them in the Spark's unified memory at a usable resolution and clip length, run the server as a service, and point the UI at it. See [Running the Model](#running-the-model) for the open question this epic starts with.

## Tech Stack

**Reference (observed 2026-09-12, logged out):** a Next.js App Router app served from a CDN; system sans-serif body text with **Outfit** and **Source Serif** loaded as web fonts (both SIL Open Font License) plus KaTeX; app API under `/v1/api/` on the same origin.

**Ours:** TypeScript everywhere, `strict: true`. Node 26, pnpm 10 workspaces. Recon: Playwright 1.63 + tsx + Vitest. App stack is chosen in EPIC_002 with Next.js App Router as the working assumption, matching the reference.

## Project Structure

Present today: `recon/`, `docs/`, the workspace files. The rest is created by the epics that need it.

```
app/          the UI
tools/        the stub generation server, its fixture video and image, other dev tooling
spark/        scripts and unit files that set up and run the model on the Spark
recon/        Playwright recon scripts (profile and raw output are gitignored)
docs/
  epic/       EPIC_NNN_*.md
  story/      STORY_NNN_*.md
  bug/        BUG_NNN_*.md
  backlog/    BACKLOG_NNN_*.md
  chore/      CHORE_NNN_*.md
  recon/      dated captures, measured tokens, component inventory, interaction notes
```

## Features

TBD — enumerated by the recon component inventory of the video generation surface. The MVP Scope section above is the outline.

## Testing

TBD — defined by the testing-foundation epic. The bar itself (70/20/10 pyramid, stub generation server, no test may depend on the real model) is in [CLAUDE.md → §3](CLAUDE.md#3-how-features-are-built-important).

## Running Recon

```bash
pnpm install
pnpm recon:login    # opens a Chromium window; sign in to agent.minimax.io with GitHub yourself
pnpm recon:check    # prints session: signed-in | signed-out | unknown (exit 0 / 1 / 2)
```

The session lives in `recon/.profile/` and raw captures in `recon/out/`; both are gitignored. Curated captures land in `docs/recon/<date>/`. See [CLAUDE.md → §4b](CLAUDE.md#4b-recon-with-playwright).

## Running the UI

TBD (EPIC_002). Dev server on port 3000.

## Running the Model

TBD — this section records the serving stack, the exact model and checkpoint currently on the Spark, its license and the terms that apply, the memory split (weights + activations at the served resolution and clip length + headroom), the port, and the env vars the UI reads. It is a description, not evidence: verify on the Spark before relying on it.

**Open question #1 (2026-09-12): which model.** The obvious candidate is MiniMax's own **MiniMax-H3** (Hailuo 3.0), open-weighted on 2026-08-03. Facts read from its Hugging Face model card and LICENSE file that day:

- 33B parameters. Two checkpoints: **H3-Base-FL2VA** (text and first/last-frame to audio-video, 0–2 input images) and **H3-Base-Ref2VA** (reference-driven, up to 9 images / 3 clips / 3 audio files). 4–15 s clips at 24 fps with 32 kHz stereo audio; short side defaults to 768 px, with 2K attributed to a separate H3-Regenerate-2K module whose availability is unverified. Inference via SGLang, vLLM, Diffusers, or ComfyUI.
- Weight size on disk and VRAM requirements are **not stated** on the card. 33B parameters at bf16 is roughly 66 GB of weights before activations, which is an estimate, not a measurement; the phase-2 epic measures the real footprint on the Spark.
- **License: MiniMax H3 Community License Agreement.** Its Excluded Territories are the European Union, the United Kingdom, the Republic of Korea, and the United States of America, and it states: "You may not use, reproduce, modify, distribute, or display the MiniMax H3 Works or any of their Outputs or results outside the Applicable Territory." Commercial use above 20 million USD yearly revenue needs separate authorization.

If the Spark sits in an excluded territory, H3's open weights are not licensed for it. The phase-2 epic then chooses between (a) MiniMax's hosted video API behind the same job interface, which keeps the MiniMax model but not the "on the Spark" half, and (b) a different open-weight video model on the Spark whose license permits it. That choice is the owner's and is recorded in the epic before any weights are fetched ([CLAUDE.md → §4a](CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

Sources: [MiniMaxAI/MiniMax-H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3), [MiniMax H3 LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE).

## Deployment

Local only. The UI is started on the Mac and the model on the Spark by the scripts under `spark/` and `app/`. There is no CI as of 2026-09-12.
