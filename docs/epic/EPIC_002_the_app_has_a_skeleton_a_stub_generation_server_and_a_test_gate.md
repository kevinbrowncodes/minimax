# EPIC_002 — The app has a skeleton, a stub generation server, and a test gate before any screen is built

**Status:** Not started (after EPIC_001)

## Goal

The testing foundation CLAUDE.md refers to: a Next.js + TypeScript app skeleton with `strict: true`, the stub generation server (async job API: create → status → result, with scripted outcomes and a tiny fixture video), Vitest unit and integration lanes, a Playwright e2e lane that starts the stub itself, coverage floors, and the Husky pre-push hook that runs the seven-step gate from [CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow).

## Why here

Stack choice waits for EPIC_001's confirmation of what the reference is built with (Next.js App Router, observed 2026-09-12). The gate must exist before the first clone story so that story ships with tests rather than promising them.

## Stories

Drafted when EPIC_001 closes. Expected shape: app skeleton and tooling; stub generation server; unit + integration lanes; e2e lane with fixtures (video, image); coverage floors and the pre-push hook.
