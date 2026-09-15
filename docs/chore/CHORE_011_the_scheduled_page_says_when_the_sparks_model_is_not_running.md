# CHORE_011 — The Scheduled page says when the Spark's model is not running

**Status:** Done (2026-09-15)

## Summary

When the adapter reports ComfyUI unreachable (or the adapter itself does not answer), the Scheduled page shows one line above the sections: "The Spark's model is not running — the line waits; start it with spark/comfyui/run.sh" (or "The Spark's adapter is not reachable — on the Spark, run spark/comfyui/run.sh", the composer's BUG_001 wording). `GET /api/queue` gains `model: { adapter: boolean, comfyui: boolean }`, read from the adapter's `/health` on each poll (a local call; the stub's health has no `comfyui` field and counts as reachable).

## Why

The owner approved EPIC_007's closing path on 2026-09-15: candidate 043 (the runner starting ComfyUI) is withdrawn — starting the model means freeing ≈ 70 GiB by stopping the owner's other containers by name, which the Spark's rules reserve to the owner, and the app container would need the Docker socket — and this notice is what replaces it: the line already waits and goes when the model is up (verified in STORY_041/042); the owner should be told *why* it waits and what to run.

## Changes

- [x] `app/app/api/queue/route.ts`: `model` in the GET body, from `forward("/health")` (unreachable → `{ adapter: false, comfyui: false }`; a health body without `comfyui` → both true).
- [x] `components/pages/ScheduledPage.tsx`: the notice (`role="status"`, `data-testid="model-notice"`) when either flag is false; `lib/queue-view.ts` › `modelNotice(model)` decides the words.
- [x] Tests: `queue-view.test` (the words), `ScheduledPage.test` (the notice shown / absent), `test/integration/queue.test` (`model` from the stub; both false when the model server cannot be reached).

## Testing

- **Unit / component / integration:** as listed. **E2E:** none — the stub is always reachable in the gate; the words are proven at the component layer and the field at the integration layer.
