# STORY_004 — The component inventory and interaction notes say what the flow does on the network

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Draft
**Created:** 2026-09-12

As the assistant designing the stub generation server and the clone, I want a written inventory of every component in the video generation flow and notes on what each interaction sends and receives, so that EPIC_002's stub speaks a realistic protocol and EPIC_003's stories are cut along real seams.

## UI Mockup

N/A (no UI change; the deliverables are `docs/recon/<date>/inventory.md` and `interactions.md`).

## Acceptance Criteria

- [ ] `inventory.md` lists every visible component of the flow with its states, its capture references, and its children — a tree, not a flat list.
- [ ] `interactions.md` records, for submit / poll / cancel / download / history load: method, path (no query string, no ids — replaced by placeholders), request shape, response shape, polling cadence, and how progress and completion are signalled. Ids, tokens and the owner's content are replaced by placeholders before the file is written.
- [ ] Third-party analytics and pixel traffic is excluded.
- [ ] The notes state explicitly which of the reference's options map onto a local model's capabilities and which do not (input for EPIC_003's Departures sections).

## Testing Plan

- **Unit** — the HAR-to-notes reducer (pure): analytics hosts are dropped; ids in paths become placeholders; a query string never survives into the output.
- **Integration / E2E** — N/A (third-party site behind a login). Manual: the owner reads `interactions.md` and confirms it contains nothing that identifies their account.

## Estimated Complexity

M
