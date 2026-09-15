# STORY_036 — The text model for the Spark is chosen: licence read, memory measured

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — [BACKLOG_006](../backlog/BACKLOG_006_text_chat_with_a_minimax_text_model_on_the_spark.md)'s first story
**Status:** Deferred (owner, 2026-09-15 — see "The owner's pick" below); the research (candidates, licences, sizes, the memory arithmetic) is done and stays in this story
**Created:** 2026-09-15

As the owner, I want a text model served on the Spark — MiniMax's own if one fits, otherwise the smallest capable open model that does — chosen from licences read that day and memory measured on the box, so that the chat and the agents run locally.

## Current state

Nothing serves text on the Spark. The video model (ComfyUI, started per run) peaks at 64–97 GiB of the 121 GiB; the owner's other containers stay stopped. BACKLOG_006 lists what is known from memory: MiniMax's M2-line text models are ≈ 230B-parameter MoEs (≈ 115 GB at 4-bit), the reference's M2.7 / M3 are of unknown availability.

## UI Mockup

N/A (no UI change) — this story produces a decision, a serving container and measurements; STORY_037 consumes them.

## Acceptance Criteria

- [ ] **Candidates, read that day from their own repositories:** MiniMax-M2.5 / M2.1 / M2 (and M2.7 / M3 if published), plus two smaller open models that fit beside the video model (e.g. a Qwen3 30B-A3B / 14B class and a Gemma/Llama class — the story names them); for each: licence name and terms (territory, commercial use), parameter count, weight size at the quantisation that fits, the serving stack that runs it on arm64 + CUDA 13, and whether it can run beside a video job or only between jobs. The table goes in the story and the README's Running the Model section.
- [ ] **The owner picks** (a line in this story with the date). Nothing is fetched before that line exists.
- [ ] **Served and measured:** the pick runs in a container defined in `spark/llm/` (Dockerfile, `run.sh` / `stop.sh` like ComfyUI's, weights under `spark/data/models`, gitignored) behind an OpenAI-compatible HTTP API on `127.0.0.1` and the `minimax` docker network; measured on the Spark: memory at rest and at 8k context, tokens/s, time to first token, and whether a video job and the model coexist — written in the README's memory split.
- [ ] The gate stays model-free (no test touches the LLM container).

## Candidates (read 2026-09-15, from each model's own repository — CLAUDE.md §3.8 and §4a)

The Spark: **121 GiB unified memory**, arm64 (GB10), driver 580.142, CUDA 13.0. A video job peaks at **64 GiB** (5 s), **71 GiB** (10 s image-to-video) and **87–97 GiB** (extensions) — README › Running the Model. Sizes are the quantised weight files as listed by the Hugging Face API on 2026-09-15 (`?blobs=true`, summed per quantisation); the KV cache at 8k context adds ≈ 1–3 GB for these architectures and is measured in the served row below.

| Candidate | Licence (read today) | Parameters | Weights that could fit | Serving on arm64 + CUDA 13 | Beside a video job? |
| --- | --- | --- | --- | --- | --- |
| **MiniMax-M3** (`MiniMaxAI/MiniMax-M3`, June 2026) | **MiniMax Community License** (`LICENSE`): free for non-commercial use; any Commercial Use must display "Built with MiniMax M3" and send a one-time notice (a prior written authorization above US$20M yearly revenue); worldwide | ≈ 428B total, ≈ 23B active, 1M context | **None** — the smallest GGUF (`unsloth/MiniMax-M3-GGUF` UD-IQ1_M) is **128 GB**, above the box's 121 GiB; BF16 852 GB | vLLM / SGLang (their images on the box are the owner's), llama.cpp | No — it does not fit the box at all |
| **MiniMax-M2.7** (`MiniMaxAI/MiniMax-M2.7`) | **Non-commercial licence** (`LICENSE`): MIT-style for non-commercial use; **any Commercial Use prohibited without prior written authorization** from MiniMax; "personal use, including self-hosted deployment for coding, development of applications, agents, tools, integrations, research, experimentation" expressly permitted free; worldwide | 229B total (MoE), BF16 230 GB | Only ≤ 3-bit and only alone (its GGUFs were not summed; the M2.5 line below is the same size class) | llama.cpp / vLLM | No |
| **MiniMax-M2.5** (`MiniMaxAI/MiniMax-M2.5`, 2026-02-13) | **MiniMax Model License** (`LICENSE-MODEL`): a non-exclusive, worldwide, royalty-free licence to use, reproduce, distribute and modify, commercial use included; redistribution carries the Agreement and a "MiniMax AI model is licensed under the MiniMax Model License" notice; a use policy (no unlawful, harmful or PII-harvesting use); Singapore law, SIAC arbitration | 229B total, ≈ 10B active | `unsloth/MiniMax-M2.5-GGUF`: UD-IQ2_M **78 GB**, UD-Q2_K_XL **86 GB**, UD-Q3_K_XL **101 GB**, Q4_K_M 138 GB (does not fit) | llama.cpp (`server-cuda13`, arm64) | **No** — even the 2-bit files leave no room for a video job (78 + 64 > 121); alone, at 2–3 bits, with the quality loss that implies, and started / stopped around video jobs like ComfyUI |
| MiniMax-M2.1 / M2 | The repositories carry **no licence file** on 2026-09-15 (the card metadata says "other"; the M2 card text says "modified-mit") — not readable, so not a candidate under §4a; superseded by M2.5 anyway | 230B | as M2.5 | — | No |
| **Qwen3-30B-A3B-Instruct-2507** (`Qwen/Qwen3-30B-A3B-Instruct-2507`) | **Apache-2.0** (card metadata and LICENSE): worldwide, commercial, no attribution beyond the notice | 30.5B total, **3.3B active**, 262k native context | `unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF`: Q4_K_M **18.6 GB**, Q5_K_M 21.7 GB, Q6_K 25.1 GB, Q8_0 32.5 GB | llama.cpp `ghcr.io/ggml-org/llama.cpp:server-cuda13` — its manifest lists `linux/arm64` today | **Yes** — Q4_K_M 18.6 GB + KV ≈ 21 GB beside a 64–71 GiB fresh job (≈ 92 GiB); beside a 97 GiB extension it is ≈ 118 GiB, too tight — the model is stopped for extensions, or the extension waits |
| **Gemma 3 27B it** (`google/gemma-3-27b-it`) | **Gemma Terms of Use** (ai.google.dev/gemma/terms): use, modify and distribute under the Agreement; the Prohibited Use Policy is incorporated and must travel with any redistribution; no territorial clause; Google claims no rights in outputs | 27B dense, 128k context | `unsloth/gemma-3-27b-it-GGUF`: Q4_K_M **16.5 GB**, Q6_K 22.2 GB, Q8_0 28.7 GB | llama.cpp `server-cuda13` (arm64) | Yes (as Qwen3), but dense: every token runs all 27B weights, so several times slower per token than a 3B-active MoE on this box |

**Recommendation (not a decision):** Qwen3-30B-A3B-Instruct-2507 at Q4_K_M (18.6 GB, Apache-2.0) on `llama.cpp:server-cuda13`. It is the only candidate that runs beside the video model, its licence has no strings, and at 3.3B active parameters it will answer at chat speed on the GB10. MiniMax's own text models cannot serve the chat here: M3 does not fit the box at any quantisation, M2.5 only alone at 2–3 bits (and M2.7's licence forbids anything commercial without a letter). The reference's menu name ("MiniMax-M3") becomes the served model's name in STORY_037.

**The owner's pick (2026-09-15, verbatim):** "I would like to use the existing minimax model already if that's not possible then we can defer this one". The existing MiniMax model on the Spark is **MiniMax-H3** — a video generation model (the FL2VA / Ref2VA checkpoints, README › Running the Model); the only text-shaped part of it is its Qwen3-VL *text encoder*, which conditions the video and cannot answer a chat turn. No MiniMax text model fits the box (the table above), so the story is **deferred** as the owner said, with STORY_037 and STORY_038 that depend on it. Nothing was fetched.

## Departures from the reference

- The reference's models are MiniMax-M3 / M2.7 in the cloud; ours is whatever fits the Spark.

## Technical Notes

- Serving: `llama.cpp` (server) or `vLLM` — whichever has a working arm64 CUDA 13 image; measured in the story.
- The memory arithmetic per CLAUDE.md §4a: weights + KV cache at the served context + headroom, beside the video model's 70 GiB or not.

## Testing Plan

- **Unit / Integration / E2E:** not applicable — no app code; the container's `run.sh` has a smoke test (`curl` a completion) like ComfyUI's `smoke.sh`.
- **Manual verification:** the measurements above, on the Spark, dated in the Done note.

## Estimated Complexity

Large (a serving stack on the Spark).
