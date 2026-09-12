# STORY_001 — The owner signs in to the reference once and every recon run reuses that session

**Epic:** [EPIC_001](../epic/EPIC_001_the_reference_video_generation_flow_is_captured_as_a_spec.md)
**Status:** Implemented — awaiting the owner's manual verification (login + check)
**Created:** 2026-09-12

As the owner, I want to sign in to agent.minimax.io once, in a browser the recon scripts control, so that every later capture runs against my account without the assistant ever handling my credentials.

## Current state

Nothing exists. An unauthenticated headless visit on 2026-09-12 shows the home page with a visible **Sign in** control (sidebar bottom and top right) and a first-visit announcement modal that blocks clicks until closed.

## UI Mockup

N/A (no UI change in our product). The only screens involved are the reference's own sign-in flow inside a Chromium window the script opens. What the owner sees in the terminal:

```
$ pnpm recon:login
A Chromium window is opening on https://agent.minimax.io/.
Sign in there with GitHub. This script never reads what you type.
Waiting for the session to read as signed in (up to 10 minutes)…
Signed in. The session is saved in recon/.profile/ (gitignored). You can close this.

$ pnpm recon:check
session: signed-in
```

## Acceptance Criteria

- [ ] `pnpm recon:login` opens a **headed** Chromium on the reference using a **persistent profile at `recon/.profile/`**, prints the instructions above, polls until the session reads as signed in (up to 10 minutes), then closes the browser so the profile is flushed, and prints that it is signed in. On timeout it says so and exits non-zero.
- [x] `pnpm recon:check` opens the reference **headless** with the same profile and prints exactly one of `session: signed-in`, `session: signed-out`, `session: unknown`, exiting 0 / 1 / 2 respectively.
- [x] Signed-out is detected by a visible control whose text is exactly "Sign in" on the reference origin (observed 2026-09-12). Absence of that control on the reference origin reads as signed in. A page that is not on the reference origin (e.g. mid-OAuth on github.com) reads as unknown.
- [x] Both scripts dismiss the reference's first-visit announcement modal before reading the page, and do nothing when no modal is shown.
- [x] Neither script types into any form, reads a cookie value, or prints a cookie name, a token, or a URL with a query string. `recon/.profile/` and `recon/out/` are gitignored and `git status --short` shows neither after a login and a check.
- [x] Root `pnpm typecheck` and `pnpm test` exist, cover the `recon` package, and pass.

## Technical Notes

- Playwright 1.63 in a `recon` workspace package; `chromium.launchPersistentContext(PROFILE_DIR, { channel: "chromium", … })` so the headed login and the headless check use the **same browser binary** and therefore the same profile format.
- The session classifier is a pure function over two signals — the page's final URL and whether the "Sign in" control is visible — so it is unit-tested without a browser. **The signed-in signal is inferred from the logged-out capture only** (no "Sign in" control ⇒ signed in). The first authenticated run confirms what actually replaces that control; if a tighter signal exists (an avatar, an account menu), STORY_002 records it and tightens the classifier under its own AC.
- The announcement modal is not `role="dialog"`. It is found by its "Try it now" call to action; Escape is tried first, then the icon-only close button at the modal's top right.
- The login loop tolerates navigation to github.com during OAuth (reads as unknown, keeps polling) and evaluation errors while a page is mid-navigation.
- Nothing prints a URL: the check prints only the verdict.

## Testing Plan

- **Unit** — `recon/src/session.test.ts`: `classifySession` returns `signed-out` when the Sign in control is visible on the reference origin; `signed-in` when it is not; `unknown` on a different origin (github.com mid-OAuth) and on an unparsable URL; the reference origin with a path or trailing slash still counts as the reference. `exitCodeFor` maps the three states to 0/1/2. These prove the only logic that decides the verdict.
- **Integration** — N/A. The only thing to integrate with is a third-party site behind a login; putting it in the gate would hit their service on every push and needs a live session the gate cannot have ([CLAUDE.md → §3e](../../CLAUDE.md#3e-how-recon-is-recorded), read-only and polite).
- **E2E** — N/A, same reason. **Manual verification** (recorded in Done): the owner runs `pnpm recon:login`, signs in with GitHub, then runs `pnpm recon:check` and reports the one-line verdict. Then `git status --short` shows no profile.

## Estimated Complexity

S — two scripts, one pure module, one test file.

## Done note (partial, 2026-09-12)

Verified by the assistant, logged out, headless: the announcement modal is dismissed (probe: visible before, gone after), the "Sign in" control is detected, `pnpm recon:check` prints `session: signed-out` and exits 1, `git status` shows no profile, `pnpm typecheck` and `pnpm test` (6 unit cases) pass. **Not yet verified:** `pnpm recon:login` end to end and the signed-in verdict — that needs the owner at the keyboard. Gate steps that do not exist yet (lint, integration, build, e2e) were not run; they arrive with EPIC_002.
