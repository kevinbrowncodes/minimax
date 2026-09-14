# CHORE_005 — Recon signs in from the Spark through Chromium's remote-debugging screencast

**Status:** Done (2026-09-14)
**Created:** 2026-09-14 — the owner asked for another recon pass (dark mode, the surfaces never captured) and granted the credits; the recon profile lived on the Mac and the Spark has no display

## Summary

The recon scripts assume a headed browser the owner can see (`recon:login`). On the Spark there is no display, so the profile that holds the owner's agent.minimax.io session cannot be created the old way. This chore adds `recon/login.sh`: it runs the same persistent-profile Chromium headless in the gate container with the DevTools protocol published on the LAN for the few minutes of the login, and the owner signs in from the Mac through `chrome://inspect`'s screencast (Chrome's built-in remote-target inspector, which shows the page and takes keyboard and mouse). `recon/run.sh <script>` then runs every recon script headless in the gate container with that profile. Nothing is installed on the host; the profile stays in `recon/.profile/` (gitignored); the port is open only while `login.sh` runs.

## Why

CLAUDE.md §4b: the owner logs in, the assistant never types credentials, the session is a persistent profile at a gitignored path. All of that holds; only the window moves from the Spark (which has none) to the owner's Mac.

## Changes

- [x] `recon/src/browser.ts` — `openReferenceRemote(port)`: the persistent profile, headless, `--remote-debugging-port`/`--remote-debugging-address=0.0.0.0`.
- [x] `recon/src/login-remote.ts` + `pnpm --filter recon login-remote` — the login loop of `login.ts` on that browser, with the chrome://inspect instructions printed.
- [x] `recon/login.sh` — runs it in the gate container with the port published; `recon/run.sh <check|capture|tokens|interactions>` runs the other scripts headless.
- [x] README → Running Recon: the Spark procedure.
- [x] `recon/login.sh` — a **display route** added the same day: when `DISPLAY` names an X socket that exists (the owner's desktop session, seen through NoMachine), the headed `recon:login` window is opened on it from the gate container (`/tmp/.X11-unix` and the session's Xauthority mounted read-only); the screencast stays as the no-display route and `RECON_LOGIN=remote` forces it. README → Running Recon says so.
- [x] Verified: `recon/run.sh check` prints `session: signed-in` after the owner signed in once — through the **display route**, not the screencast: the owner had a NoMachine session into the Spark's desktop (`DISPLAY=:1`, Xorg), so the headed window was the shorter path. The screencast route (`login-remote`) is written and shellcheck-clean but has not been exercised end to end.

## Resolution (2026-09-14)

Signed in once through the display route; `recon/run.sh check` → `session: signed-in`; `git status --short` shows nothing under `recon/.profile` or `recon/out`. Both wrappers pass shellcheck (official image). The screencast route remains the fallback for a Spark with no desktop session.

## Testing

- **Unit / integration / e2e: not applicable** — no runtime code of the product changes; the recon package's own unit tests (`session`, `capture-plan`, `network-log`, `tokens-model`, `interactions-model`) stay green in the gate. The procedure is verified by doing it once and recording the outcome above; shellcheck covers the two wrappers.
