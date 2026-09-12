# STORY_004 — The component inventory and interaction notes say what the flow does on the network

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Done (2026-09-12)
**Created:** 2026-09-12

As the assistant designing the stub generation server and the clone, I want a written inventory of every component in the video generation flow and notes on what each interaction sends and receives, so that EPIC_002's stub speaks a realistic protocol and EPIC_003's stories are cut along real seams.

## UI Mockup

N/A (no UI change; the deliverables are `docs/recon/2026-09-12/inventory.md`, `interactions.md`, and the generated `endpoints.md` / `endpoints.json`).

## Acceptance Criteria

- [x] `inventory.md` lists every visible component of the flow with its states, its capture references, and its children — a tree, not a flat list.
- [x] `interactions.md` records, for submit / poll / cancel / download / history load: method, path (no query string, no ids — replaced by placeholders), request and response shape, polling cadence, and how progress and completion are signalled. Ids, tokens and the owner's content are replaced by placeholders before the file is written.
- [x] Third-party analytics and pixel traffic is excluded.
- [x] The notes state explicitly which of the reference's options map onto a local model's capabilities and which do not (input for EPIC_003's Departures sections).
- [x] `pnpm recon:interactions <date>` regenerates the endpoint tables and redacted response shapes from the day's raw logs, offline.

## Technical Notes

- `endpoints.md` is generated (one row per method + host + path with counts, statuses, content types, median cadence; the first JSON body's shape with every value replaced by its type, strings included). `interactions.md` and `inventory.md` are written by hand from the captures, the page dumps and the generated tables.
- The request shape of the streaming message POST and the live event-stream body were **not captured** — the logger keeps JSON response bodies only. The message model is reconstructed from the stored history (`session/:id/message`), which carries the same messages after the fact. If EPIC_002's stub needs the live event format, one more job with a body-capturing logger is required.
- Placeholders: UUIDs → `:uuid`, long numeric ids → `:id` (also when used as a file name), long hex ids → `:hex`; query strings never survive.

## Testing Plan

- **Unit** — `recon/src/interactions-model.test.ts` (4 cases): `isApiEvent` keeps product API traffic and drops chunks, images, pages and CDN media; `shapeOf` replaces every value by its type and keeps no string content; `medianGapSeconds` handles the median and the fewer-than-two case; `groupEndpoints` groups, counts, records statuses and cadence, takes the first body's shape, and renders a row. `recon/src/network-log.test.ts` extended: ids used as file names and signed storage URLs reduce to placeholders with no query.
- **Integration / E2E** — N/A (offline reduction of a local log; no product code). Manual: the owner reads `interactions.md` and confirms nothing identifies the account.

## Estimated Complexity

M

## Done note (2026-09-12)

29 endpoints reduced from six raw logs (12,681 events). The central finding, written up in `interactions.md` §1: **the reference's video generation is an agent session, not a video API call from the browser** — a session is created, the prompt goes to a streaming host as an event stream, the agent submits the provider job server-side, progress reaches the UI as agent messages (a JSON `todos` event feeds the Progress panel; empty `msg_type` 2 events mark steps; `msg_type` 1 carries the prose), and the finished file surfaces in the drive listing that backs Assets. The billing and quota walls arrive as agent prose over HTTP 200. `inventory.md` gives the component tree for the shell, home, video-mode composer, task page and Assets, each node pointing at its capture. `pnpm typecheck` and `pnpm test` (50 cases) green; lint/build/e2e do not exist yet (EPIC_002).
