# STORY_007 — The app skeleton builds and serves a page from a container on the Spark

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Ready (drafted 2026-09-12)
**Created:** 2026-09-12
**Runs on:** the Spark, in containers. Nothing is installed on the host ([CLAUDE.md → §1](../../CLAUDE.md#1-project-overview), owner's "Containers first" rule).

As the owner, I want the UI to exist as a Next.js app that builds, type-checks and lints inside a container on the Spark and serves a page I can open from my Mac's browser, so that every later story starts from a working, gated skeleton instead of promising one.

## Current state

`app/` does not exist. The pnpm workspace lists `app`, `recon` and `tools/*` ([pnpm-workspace.yaml](../../pnpm-workspace.yaml)); `recon/` is the only package and it targets the Mac. The box has Node 18 and npm 9 on the host and no pnpm; per the owner's rule they are not used — the toolchain lives in an image.

## UI Mockup

N/A (no product UI yet). The only page is a placeholder so the container can be verified end to end:

```
┌──────────────────────────────────────────────┐
│ MiniMax Local                                │
│ Generation server: stub:4010                 │   ← host of MODEL_BASE_URL, nothing else
└──────────────────────────────────────────────┘
```

The real screen is EPIC_003 and replaces this page.

## Acceptance Criteria

- [ ] `app/` is a workspace package: Next.js (App Router, current major at implementation, pinned exactly), React, TypeScript with `strict: true`, `noUncheckedIndexedAccess: true`, and ESLint with the typescript-eslint strict preset where `@typescript-eslint/no-explicit-any` is an error. `pnpm typecheck`, `pnpm lint` and `pnpm build` pass from the repo root, run inside the gate container.
- [ ] `tools/gate/Dockerfile` defines the toolchain image `minimax/gate`: `node:26-bookworm` (arm64, pinned by tag and digest), pnpm from the root `packageManager` field via corepack, and Playwright's Chromium and WebKit with their OS dependencies (`playwright install --with-deps`), so the e2e lane (STORY_010) runs in the same image. `tools/gate/build.sh` builds it. Nothing Node-related is installed on the host.
- [ ] A root `compose.yaml` (project `minimax`) defines three services: `gate` (the gate image with the repo bind-mounted at `/work`, a named volume for the pnpm store, no ports), `app-dev` (same image, `pnpm --filter app dev`, port 3000 published on all interfaces so the owner's browser on the LAN can open it), and `app` (a production image built from `app/Dockerfile`: `pnpm build` then `next start`, port 3000 published on all interfaces, `restart: unless-stopped`). `MODEL_BASE_URL` and `MODEL_API_KEY` come from the environment or a gitignored `.env`; `.env.example` lists them.
- [ ] `tools/gate/run.sh` runs one named step or all of steps 1–6 of [CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow) inside the `gate` service (`typecheck`, `lint`, `test`, `test:integration`, `build`, `test:e2e`), in order, stopping at the first failure and naming it. Steps whose lane does not exist yet (`test:integration`, `test:e2e`) print "no lane yet" and pass until STORY_009/010 add them. `node_modules/` are created inside the repo tree by the container (already gitignored) and never on the host.
- [ ] `app/lib/config.ts` reads the environment the UI needs — `MODEL_BASE_URL` (required, absolute http(s) URL, trailing slash stripped) and `MODEL_API_KEY` (optional) — and throws an error naming the variable when it is missing or malformed. It is the only place the app reads these variables.
- [ ] The home route renders the placeholder above: an `h1` "MiniMax Local" and the host of `MODEL_BASE_URL`. No other UI.
- [ ] The Vitest unit lane exists: `pnpm test` runs `vitest run` for `app` (jsdom environment and React Testing Library installed for later component tests) and the config tests pass inside the gate container.
- [ ] README → Running the UI documents: build the gate image, run the gate, start dev, start prod, open from the LAN; README → Project Structure and Tech Stack updated with what was actually chosen and pinned.

## Technical Notes

- Gate image base: `node:26-bookworm` rather than Microsoft's Playwright image, so Node 26 matches the README and Playwright is pinned by the package (1.63, the same as `recon/`). `playwright install --with-deps chromium webkit` runs at build time; Firefox is not installed (not in the gate).
- The repo is bind-mounted into the gate container as the host user's uid/gid (`SPARK_UID`/`SPARK_GID`, as in `spark/comfyui/compose.yaml`) so files it writes are owned by the owner.
- The production `app` service is what the owner opens day to day; `app-dev` is for working on a story with hot reload. Only one of the two runs at a time (both publish 3000).
- The model endpoint is configuration ([CLAUDE.md → §4a](../../CLAUDE.md#4a-one-machine-many-containers)): on the compose network `MODEL_BASE_URL` is a service name (`http://stub:4010` in the gate, the adapter's service name in production, STORY_006); no LAN address appears in code, tests or fixtures.
- Keep the skeleton minimal: no UI library, no state library, no styling framework decision yet — EPIC_003's first clone story picks how tokens are applied, with the recon `tokens.md` as the source.

## Testing Plan

- **Unit** — `app/lib/config.test.ts`: (1) a valid `MODEL_BASE_URL` is returned with any trailing slash removed; (2) a missing `MODEL_BASE_URL` throws and the message names `MODEL_BASE_URL`; (3) a non-URL value throws; (4) `MODEL_API_KEY` is `undefined` when unset and passed through when set. These prove the only env reader fails loudly and predictably.
- **Integration** — N/A: no API route exists yet. STORY_009 adds the lane and the routes together.
- **E2E** — N/A in this story: the lane is STORY_010, whose smoke spec then covers the placeholder page (title present at desktop and narrow) and keeps covering it until EPIC_003 replaces the page. Until then the page is verified by hand: `tools/gate/run.sh build` green, `docker compose up -d app`, open the Spark's LAN address on port 3000 from the Mac and see the heading.
- **Gate** — `tools/gate/run.sh` all six steps green (two report "no lane yet").

## Estimated Complexity

M — mostly tooling: the gate image, compose wiring and getting Next.js to build under the bind mount as a non-root user.
