# STORY_010 — Playwright drives the built app against the stub, inside the gate container

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Done (2026-09-12, on the Spark)
**Created:** 2026-09-12

As the assistant, I want an e2e lane that builds the app for production, starts it and the stub itself, and drives it in a desktop and a narrow browser from the gate container, with fixtures that make the job scripts, terminal-status waits and video-playability checks one-liners, so that every clone story in EPIC_003 ships with e2e cover that is deterministic.

## Current state

The gate image has Chromium and WebKit (STORY_007). The stub and its scripts exist (STORY_008); the app's routes exist (STORY_009). No Playwright config, fixture or spec.

## UI Mockup

N/A (test infrastructure; the only page is STORY_007's placeholder).

## Acceptance Criteria

- [x] `app/playwright.config.ts`: two projects — `desktop` (Chromium, viewport 1440×900, the width the captures were taken at) and `narrow` (`devices["iPhone 13"]`, WebKit, never a bare `setViewportSize`); `webServer` is an array that starts the stub (`pnpm --filter stub-generation-server start`, port 4010) and the production app (`pnpm --filter app start`, port 3000) with `MODEL_BASE_URL=http://127.0.0.1:4010` passed explicitly in `webServer.env` ([CLAUDE.md → §6b](../../CLAUDE.md#6b-e2e-test-conventions)); `pnpm test:e2e` runs `playwright test` and assumes `pnpm build` ran (step 5 before step 6).
- [x] Fixtures in `app/e2e/fixtures/`: `stub.ts` (`useScript(name)`, `reset()`, `received(id)`, `openJobs()` over the `/__stub/` hooks), `job.ts` (`waitForTerminalStatus(page, id?)` registers a `waitForResponse` on the status route **before** the action and resolves on `done | failed | cancelled`), `video.ts` (`expectPlayable(video, resultUrl)`: readiness ≥ HAVE_CURRENT_DATA or the `canplay` event, and `currentSrc` ends with the result route), `settle.ts` (`settled(page)` waits for `document.getAnimations()` to be empty and two animation frames, so nothing is measured mid-transition), `upload.ts` (path to `fixture-reference.png`).
- [x] Every spec resets the stub in `beforeEach`; an `afterEach` in the shared `test` fixture asserts `openJobs()` has no non-terminal job, so no spec can end with a job running.
- [x] `app/e2e/fixture-codec.spec.ts` (the probe): in each project, an inline page loads `fixture.mp4` and `fixture.webm` from the stub and records which reach readiness; the outcome per browser is written into the story's Done note and README → Testing, and `STUB_FIXTURE` defaults to the format both play. If neither format plays in one browser, that browser's project asserts playability through the `loadedmetadata` event only, and the story says so.
- [x] `app/e2e/smoke.spec.ts`: (desktop and narrow) the home page shows the "MiniMax Local" heading; `GET /api/capabilities` through the built app returns the stub's capabilities (browser → app container → stub proven); the narrow project has `hasTouch` true.
- [x] `tools/gate/run.sh test:e2e` runs the lane in the gate container; the HTML report lands in `app/playwright-report/` and traces in `app/test-results/` (both gitignored) and the run's summary is printed.
- [x] Spec-side rules from [CLAUDE.md → §6b](../../CLAUDE.md#6b-e2e-test-conventions) are encoded in one ESLint rule set for `app/e2e/**`: `page.waitForTimeout` is an error; `setViewportSize` is an error.

## Technical Notes

- Both webServers use `reuseExistingServer: false` in the gate so a stale process can never serve a spec; ports are fixed because the app's build-time env must name the stub's URL.
- Run headless inside the container as the host user; Chromium needs `--no-sandbox` only if the image runs as root, which it does not.
- Traces `on-first-retry`, one retry in the gate; screenshots on failure only.
- The codec question exists because Playwright's Chromium has no H.264/AAC decoder and Playwright's WebKit on Linux has its own set; the probe settles it with evidence rather than a guess ([CLAUDE.md → §6b](../../CLAUDE.md#6b-e2e-test-conventions), "the testing-foundation epic records which").

## Testing Plan

- **Unit** — `app/e2e/fixtures/job.test.ts` and `video.test.ts` are N/A as unit tests: they wrap Playwright APIs. The pure helper that decides "is this status terminal" is `isTerminal` from STORY_009 and is already unit-tested.
- **Integration** — N/A: nothing server-side is added.
- **E2E** — this story *is* the lane. Specs: `fixture-codec.spec.ts` (evidence for the codec choice, both projects); `smoke.spec.ts` (heading visible at desktop and narrow; capabilities round trip; `hasTouch` on the narrow project). Regression cover from here on: `smoke.spec.ts` stays green until EPIC_003 replaces the placeholder, and every EPIC_003 spec uses these fixtures.
- **Gate** — all six steps green inside the container; the e2e step's duration is recorded in the Done note.

## Estimated Complexity

M

## Done note (2026-09-12)

- **Lane:** `app/playwright.config.ts` — projects `desktop` (Desktop Chrome descriptor at 1440×900) and `narrow` (`devices["iPhone 13"]`, WebKit, `hasTouch`); `webServer` starts the stub (`STUB_HOST=127.0.0.1`, port 4010) and `next start -H 127.0.0.1 -p 3000` with `MODEL_BASE_URL=http://127.0.0.1:4010` in `webServer.env`; one worker, `reuseExistingServer: false`, trace on first retry, screenshots on failure. `@playwright/test` 1.63.0 pinned to the browsers baked into the gate image.
- **Fixtures** in `app/e2e/fixtures/`: `stub.ts` (reset, received, jobs, openJobs, scriptQuery, fixtureUrl), `job.ts` (`waitForTerminalStatus`, registered before the action), `video.ts` (`expectPlayable`: readyState ≥ HAVE_CURRENT_DATA or `canplay`, src is the result route), `settle.ts`, `upload.ts`, and `test.ts` — the shared `test` whose `stubApi` fixture resets the stub before and asserts no open job after every test.
- **Specs:** `smoke.spec.ts` (heading at desktop and narrow; `/api/capabilities` through the built app from the browser and from the request context; touch only on `narrow`) and `fixture-codec.spec.ts` (the probe). **8 passed in 6.6 s**; full gate 17 s.
- **Codec verdict (measured):** Chromium 1243 and WebKit 2359 in the gate image both play `fixture.mp4` (H.264 baseline + AAC) *and* `fixture.webm` (VP9 + Opus) — `canplay`, readyState 4, for all four combinations. The AC's fallback (`loadedmetadata` only) was not needed. `STUB_FIXTURE` stays `mp4`, the container format the real server produces. Recorded in README → Testing.
- **Lint rules for specs** (`app/eslint.config.mjs`, `e2e/**`): `page.waitForTimeout` and `setViewportSize` are errors; the React hooks rule is off there (Playwright fixtures are not React).
- **Additions outside this story's files:** the stub gained `GET /__stub/fixtures/<file>` (any fixture regardless of `STUB_FIXTURE`, with a test and a README line) so the probe can compare formats from one server.
- **Detail worth knowing:** Playwright loads the app's specs as CommonJS (the app package is not `"type": "module"`), so the e2e files resolve paths from `process.cwd()` (Playwright runs from `app/`) instead of `import.meta`.
