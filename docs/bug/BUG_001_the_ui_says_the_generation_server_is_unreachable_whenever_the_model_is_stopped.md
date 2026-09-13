# BUG_001 — The UI says "The generation server is unreachable" whenever the model side is stopped, and offers no way forward

**Status:** Resolved (2026-09-13)
**Found by:** the owner, opening the UI the morning after the EPIC_003 trial

## Summary

With ComfyUI stopped (as it must be when the owner's vLLM containers are running), the adapter is stopped too, so the composer's first call — `GET /api/capabilities` — answers `502 unreachable` and the composer shows a red "The generation server is unreachable" under the card, with Send disabled and no hint of what to do. The UI is unusable until someone runs `spark/comfyui/run.sh`, and nothing tells them so.

## Steps to Reproduce

1. `spark/comfyui/stop.sh` (or any state where `minimax-adapter` is not running).
2. Open `http://<spark>:3000`, click **New task**.
3. Read the red line under the composer.

## Expected vs Actual Behaviour

- **Expected:** the UI loads its options (the adapter is cheap and can always run), and when the model itself is not running, pressing Send says so and names the command that starts it.
- **Actual:** `502 { error: { code: "unreachable" } }` from `/api/capabilities`; the message "The generation server is unreachable"; Send disabled.

## Root Cause

Three decisions in STORY_006 and STORY_013, each defensible alone, together produce this:

1. `spark/comfyui/compose.yaml` gives the `adapter` service `depends_on: [comfyui]` and `restart: "no"`, and `stop.sh` stops both containers; the adapter's `start()` also gives up after 120 s if ComfyUI never answers. So the adapter is only ever up while ComfyUI is.
2. The composer's capabilities failure message is generic and names no remedy (`components/composer/Composer.tsx`).
3. `lib/submit-job.ts` replaces every `503` message from the server with "The Spark is busy; try again in a moment", so even when the adapter is up and says "ComfyUI is not running", the UI would not show it.

## Acceptance Criteria

- [x] The adapter starts and serves `/capabilities` and `/health` whether or not ComfyUI is reachable; `health.comfyui.reachable` says which; the node-class check runs on the first successful contact instead of at start; `POST /jobs` answers `503 busy` with the message "ComfyUI is not running on the Spark — start it with spark/comfyui/run.sh" while ComfyUI is unreachable. Covered by an integration case where the fake ComfyUI starts after the adapter.
- [x] `compose.yaml` (spark side): the adapter has `restart: unless-stopped` and no `depends_on`; `stop.sh` stops ComfyUI only and keeps the adapter up (`stop.sh --all` stops both); `run.sh` unchanged; README says so.
- [x] The composer's capabilities failure reads "The Spark's adapter is not reachable — on the Spark, run spark/comfyui/run.sh"; a `503` from the server shows the server's own message; both covered by unit tests.
- [x] `spark/comfyui/verify.sh` checks the real chain without generating: adapter health on `127.0.0.1:4020`, the UI container's `/api/capabilities` answering with the adapter's capabilities, and a `2K` request refused by the adapter through the UI route; `verify.sh --generate [seconds]` additionally runs the real Playwright trial (default 4 s) so the owner can prove the whole chain on demand. README → Testing states plainly what the gate proves (UI against the stub) and what `verify.sh` proves (the real chain).

## Resolution (2026-09-13)

- **Adapter** (`spark/adapter/src/server.ts`): listens first; ComfyUI is probed in the background (up to 10 s at start, then by the poll loop every 5 s), `health.comfyui.reachable` / `nodesVerified` say the state, the node-class check runs on the first successful contact, and `POST /jobs` answers `503 busy` with "ComfyUI is not running on the Spark — start it with spark/comfyui/run.sh" (or the missing node classes) until both are true. The websocket reconnect log speaks once, then about once a minute. Tests: the fake ComfyUI can bind to a known port and omit node classes; two new integration cases (adapter up before ComfyUI, then ComfyUI appears and a job completes; ComfyUI lacking `ImageFromBatch`); 28 adapter tests pass.
- **Compose / scripts**: the `adapter` service has no `depends_on` and `restart: unless-stopped`; `stop.sh` stops ComfyUI only (`--all` for both, `--down` to remove); `run.sh` still starts both. New `spark/comfyui/verify.sh` proves the real chain in seconds (adapter health, the UI container relaying the adapter's capabilities, a 2K request refused through the UI route) and `--generate [seconds]` runs the real Playwright trial through the UI.
- **UI**: the capabilities failure reads "The Spark's adapter is not reachable — on the Spark, run spark/comfyui/run.sh"; a `503` shows the adapter's own message (a bare 503 keeps "The Spark is busy"). Unit tests for both.
- **Verified live on the Spark, 2026-09-13 morning**, with ComfyUI off and the owner's vLLM containers up: `verify.sh` passed all three checks; `POST /api/jobs` through the UI answered `503 busy` with the start command. The adapter now stays up across `stop.sh` and reboots. Gate green (40 e2e).
- **Answer to the owner's second question, recorded here:** the gate's e2e specs prove the UI against the stub only; `verify.sh` (and `--generate`) is the check of the real backend, run by hand.
