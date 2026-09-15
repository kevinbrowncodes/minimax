# BACKLOG_006 — Text chat with a MiniMax text model on the Spark

**Status:** Open — STORY_036 (its decision story) is deferred by the owner on 2026-09-15 after the candidates were read: MiniMax-M3 does not fit the Spark at any quantisation, MiniMax-M2.5 only alone at 2–3 bits, and the existing MiniMax-H3 is a video model that cannot chat (the table is in STORY_036) · **Priority:** Medium — the owner, deciding STORY_026's scope: keep "the text generation stuff"; "I thought MiniMax supported text generation as well … yes I agree we need to wire later but let me know if we can use MiniMax still or would that be too much effort?"

## Summary

The composer's default mode is the reference's agent chat (Enter message…, the MiniMax-M3 menu, a Thinking switch). STORY_026 keeps that surface and nothing behind it. This item wires it: a text model served on the Spark behind the adapter, a chat turn as a job (or a streamed route), the reply rendered in the task thread the way the reference renders the agent's prose, the model menu listing what the Spark actually serves.

## User impact

The owner can ask MiniMax Local for text — a script draft, a rewrite, a question — in the same window, on his own box. It is also the model BACKLOG_005 (the prompt rewriter) needs, so one serving decision covers both.

## Can it be MiniMax? (from memory on 2026-09-15 — **to be read from the model's own repository and measured on the Spark before anything is fetched**, CLAUDE.md §3 item 8 and §4a)

- MiniMax has published open-weight text models: MiniMax-Text-01 (2025-01, custom licence), MiniMax-M1 (2025-06, Apache-2.0), and the M2 line — M2 (2025-10), M2.1 (2025-12), M2.5 (2026-02) — under MIT. Whether the reference's own **M2.7 / M3** (the names in its menu on 2026-09-14) are open-weighted is unknown here.
- Size is the obstacle, not licence: the M2 line is a ≈ 230B-parameter MoE (≈ 10B active). At 4-bit that is roughly 115 GB of weights — the Spark has 121 GiB in total and ≈ 115 free with the owner's other containers stopped, and a video job peaks at 64–97 GiB. So a MiniMax text model cannot sit beside the video model; it would have to be quantised further and started / stopped around video jobs (ComfyUI already is), or a smaller non-MiniMax model chosen that fits beside it.

## Rough scope

1. **The decision story** (first): candidate models with licence, territory, weight size and measured memory on the Spark; the owner picks in writing.
2. A serving container (llama.cpp / vLLM / SGLang, whichever runs the pick on the Spark's arm64 + CUDA 13) with a start / stop script like ComfyUI's; the memory split re-derived in the README.
3. The adapter's chat route and its contract (streaming or a job); the stub grows a scripted text reply.
4. The UI: text-mode Send creates the turn, the reply streams into the thread, the M3 menu lists the served model(s), Thinking maps to the model's reasoning switch or goes.
5. BACKLOG_005's rewriter as a second consumer of the same model.

## Dependencies

STORY_026 (the surface it keeps); EPIC_004's memory arithmetic; the owner's licence reading for the chosen model.

## Open questions

Which model (MiniMax at heavy quantisation vs a smaller model that fits beside video); whether chats are history entries like jobs (they would show in Recents and Search); whether the Assets page should list anything a chat produces.
