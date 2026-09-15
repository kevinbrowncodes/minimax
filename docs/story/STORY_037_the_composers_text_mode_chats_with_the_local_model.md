# STORY_037 — The composer's text mode chats with the local model

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — BACKLOG_006's wiring, after STORY_036
**Status:** Deferred (2026-09-15 — the text model it chats with (STORY_036) is deferred; the owner: "if that's not possible then we can defer this one"). The story is unchanged and waits for a text model on the Spark
**Created:** 2026-09-15, from [behaviour.md §6](../recon/2026-09-15/behaviour.md)

As the owner, I want to type in the composer's text mode and get a streamed answer from the model on my Spark, rendered the way the reference renders a turn — the working words, the prose, Processed N s, Copy and the time — so that MiniMax Local is also a place to think a clip through.

## Current state

Text mode's Send says "Text chat is not connected to the Spark yet" (STORY_026); the MiniMax-M3 menu and Thinking switch are inert. STORY_036 serves a model behind an OpenAI-compatible API on the `minimax` network.

## UI Mockup

**Reference captures:** `behaviour-chat-01-typed` … `-09-reloaded` (2026-09-15): after Send the page is a task page titled **Unnamed session**, the prompt bubble at the right, then the agent's avatar and a status word — **Thinking…**, **Planning…**, **Aligning…** — while the reply streams, Send as a **Stop generation** square; when done, **Processed 24s ›**, the reply as prose, Copy · Like · Dislike · time; the session is titled from the exchange (**What can you help make**) in the bar and in Recents; the Work Area reads "Track progress on longer tasks.".

```
/task/:id (a chat)                                            ┌ Work Area ─────────┐
   ┌ In one short paragraph, what can you help me make? ┐     │ Progress ⌄         │
                                     (user bubble, right)│     │ Track progress on  │
 ▣ Thinking…            ← the status while streaming    │     │ longer tasks.      │
                                                         │     └────────────────────┘
 Processed 24s ›
 I'm the local assistant — I can help you … (streamed prose, Markdown)
 ⧉  12:24
 ┌ docked composer (text mode: Enter message… · + · Model ⌄ · Thinking (●) · ⬆/■) ┐
```

## Acceptance Criteria

- [ ] **Send in text mode** creates a chat (`POST /api/chats { agentId?, model, reasoning }` → a history entry of `kind: "chat"`, titled "Unnamed session") and navigates to its task page; the turn is sent as `POST /api/chats/:id/messages { content }` answered as `text/event-stream` (deltas of `thinking` and `content`, then `done` with `usage`); the page renders the status words while streaming (Thinking… while thinking deltas arrive, then Planning… / Writing… as prose starts — ours), the prose as Markdown, then Processed N s ›, Copy and the time; a second turn appends below.
- [ ] **Stop generation** aborts the stream (the partial reply stays, marked "Stopped"); Escape does not.
- [ ] **The title** is set after the first completed turn (the model asked for a five-word title in a second, non-streamed call; the first words of the prompt as the fallback) and follows into Recents, Search and the bar.
- [ ] **The model menu** (the MiniMax-M3 pill) lists the served model(s) from `GET /api/chat-capabilities` (name, reasoning support); **Thinking** toggles `reasoning` for the next turn; a chat's thread is read back with `GET /api/chats/:id` (messages with `role`, `content`, `thinking`, `thinkingMs`, `createdAt`).
- [ ] Chats appear in Recents and Search like tasks (their rows carry the creation stamp), in the Inbox's Messages tab when a turn completes while the page is elsewhere (STORY_033), and can be renamed / pinned / archived / deleted (STORY_029/030); Assets ignores them.
- [ ] The stub gains a scripted chat (`chat-short`, `chat-long`, `chat-fails`) so every layer runs without the model; both widths, both themes.

## Departures from the reference

- The status words after "Thinking…" are ours (the reference's "Planning… / Aligning…" belong to its agent loop); no tool use; no Like / Dislike.
- Reasoning is shown folded under a "Thought for N s ›" row (the reference hides it; ours shows it on demand).

## Technical Notes

- `lib/chat-store.ts` (messages per chat in `/data/chats/<id>.json`; the history entry carries `kind`, `title`, `model`); `lib/llm-client.ts` (OpenAI-compatible `/v1/chat/completions` with `stream: true`, `LLM_BASE_URL` / `LLM_MODEL` env, the stub's URL in the gate); routes `POST /api/chats`, `GET /api/chats/:id`, `POST /api/chats/:id/messages` (SSE via a `ReadableStream`), `GET /api/chat-capabilities`.
- `TaskPage.tsx` branches on `kind`; `components/chat/ChatThread.tsx` renders the turns; `lib/chat-view.ts` (status words, Markdown to safe HTML with a small renderer, times).
- `tools/stub-generation-server`: `/v1/chat/completions` scripted streams.

## Testing Plan

- **Unit** — `chat-store.test.ts`, `chat-view.test.ts` (status words from the stream state, the title fallback, the Markdown subset), `llm-client.test.ts` (SSE parsing, abort).
- **Integration** — `chats.test.ts` against the stub: create, a streamed turn arrives as SSE with thinking then content then done, the thread reads back, the title is set, abort stops the stream.
- **Component** — `ChatThread.test.tsx` (streaming states under StrictMode with fake timers, Stop), `Composer.test.tsx` (Send in text mode creates and navigates; the model menu from capabilities; Thinking toggles).
- **E2E** — `chat.spec.ts` (new): type, Send → the chat page shows Thinking… then the prose and Processed N s; the title appears in Recents; a second turn; Stop on `chat-long`; both widths.

## Estimated Complexity

Large.
