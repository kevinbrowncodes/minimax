# CHORE_001 — The e2e lane runs the standalone server that production ships

**Status:** Done (2026-09-12)

## Summary

`app/playwright.config.ts` started the app with `next start`, which warns `"next start" does not work with "output: standalone"` (seen in the STORY_011 push's hook output) and serves a different code path from `app/Dockerfile`, which runs `node app/server.js` from the standalone bundle. The e2e lane now starts the standalone server the same way the image does.

## Why

The e2e lane exists to drive the production build; it should drive the artefact production runs, not a warning-emitting substitute.

## Changes

- [x] `app/playwright.config.ts`: the app `webServer` copies `.next/static` into the standalone bundle (what the Dockerfile's `COPY` does) and runs `node .next/standalone/app/server.js` with `PORT`, `HOSTNAME` and `MODEL_BASE_URL` in `env`.

## Testing

- **Unit / integration:** N/A — a test-runner config change with no product logic.
- **E2E:** the existing 8 specs are the test: they must stay green and the `next start` warning must be gone from the gate output.
